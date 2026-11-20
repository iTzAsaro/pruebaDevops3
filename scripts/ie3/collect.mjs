import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const deploy = new Map([
  ['Despliegue en Entorno Cloud Simulado', ['simulated', 'Levantar Servicios con Docker Compose']],
  ['Despliegue en la Nube (AWS EC2)', ['aws', 'Desplegar y orquestar stack en AWS EC2']],
]);
const services = ['backend', 'frontend'];
const time = Date.parse;
const bounds = j => {
  const start = time(j.started_at), end = time(j.completed_at);
  return j.status === 'completed' && !['skipped', 'neutral', null, undefined].includes(j.conclusion)
    && Number.isFinite(start) && end >= start ? [start, end] : null;
};
const escapeLabel = s => String(s).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
const series = (name, labels, value, timestamp) =>
  `${name}{${Object.entries(labels).map(([k, v]) => `${k}="${escapeLabel(v)}"`).join(',')}} ${value} ${timestamp}`;

export function coverage(text) {
  let found = 0, hit = 0, record;
  const seen = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('SF:')) {
      const file = line.slice(3);
      if (record || !file || seen.has(file)) throw new Error('Registro LCOV inválido o duplicado');
      seen.add(file);
      record = {};
    } else if (/^L[FH]:/.test(line)) {
      const key = line.slice(0, 2), value = Number(line.slice(3));
      if (!record || key in record || !/^\d+$/.test(line.slice(3)) || !Number.isSafeInteger(value)) throw new Error('Total LCOV inválido');
      record[key] = value;
    } else if (line === 'end_of_record') {
      if (!record || record.LF === undefined || record.LH === undefined || record.LH > record.LF) throw new Error('Registro LCOV incompleto');
      found += record.LF;
      hit += record.LH;
      record = undefined;
    }
  }
  if (record || !found || !Number.isSafeInteger(found)) throw new Error('LCOV sin total de líneas válido');
  return 100 * (hit / found);
}

export async function collect({ run, jobs, artifacts, readReport, allowCoverage }) {
  const lines = [], omissions = [], reports = [];
  const branch = run.head_branch;
  if (!branch || !run.conclusion || run.status !== 'completed') throw new Error('El intento debe estar completado y tener rama');
  const active = jobs.map(job => ({ job, range: bounds(job) })).filter(item => item.range);
  if (active.length && !jobs.some(job => !['skipped', 'neutral'].includes(job.conclusion) && !bounds(job))) {
    const start = Math.min(...active.map(i => i.range[0])), end = Math.max(...active.map(i => i.range[1]));
    lines.push(series('vicity_ci_pipeline_duration_seconds', { branch, result: run.conclusion }, (end - start) / 1000, end));
  } else omissions.push('pipeline: timestamps insuficientes');
  for (const [name, [environment, stepName]] of deploy) {
    const matches = active.filter(i => i.job.name === name);
    const { job, range } = matches.length === 1 ? matches[0] : {};
    const step = job?.steps?.find(s => s.name === stepName);
    // A successful secrets-check job does not imply that the AWS deployment ran.
    if (!step || !['success', 'failure', 'cancelled', 'timed_out'].includes(step.conclusion)
        || !(time(step.started_at) >= range[0] && time(step.started_at) <= range[1])) {
      omissions.push(`${environment}: sin paso de despliegue ejecutado verificable`);
      continue;
    }
    lines.push(series('vicity_ci_deployment_duration_seconds', { branch, result: job.conclusion, environment }, (range[1] - range[0]) / 1000, range[1]));
  }
  for (const service of services) {
    if (!allowCoverage) {
      omissions.push(`${service}: artefactos de run no identifican el intento tras un rerun`);
      continue;
    }
    const reportStep = `Generar cobertura LCOV (${service})`;
    const uploadStep = `Publicar cobertura (${service})`;
    const matches = active.filter(i => i.job.steps?.some(s => s.name === reportStep));
    const { job, range } = matches.length === 1 ? matches[0] : {};
    const report = job?.steps.find(s => s.name === reportStep);
    const upload = job?.steps.find(s => s.name === uploadStep);
    const ts = time(report?.completed_at);
    const candidates = artifacts.filter(a => {
      const created = time(a.created_at);
      return a.name === `coverage-${service}` && !a.expired && upload?.conclusion === 'success'
        && created >= time(upload.started_at) && created <= range[1];
    });
    if (report?.conclusion !== 'success' || !(ts >= range[0] && ts <= range[1]) || candidates.length !== 1) {
      omissions.push(`${service}: sin LCOV vigente y atribuible al intento`);
      continue;
    }
    const artifact = candidates[0];
    try {
      lines.push(series('vicity_ci_test_coverage_percent', { branch, service }, coverage(await readReport(artifact)), ts));
      reports.push({ service, artifactId: artifact.id, url: artifact.archive_download_url });
    } catch (error) {
      omissions.push(`${service}: ${error.message}`);
    }
  }
  return { lines, omissions, reports };
}

const limit = 64 * 1024 * 1024;
async function bounded(response, max) {
  let length = 0;
  const parts = [];
  for await (const part of response.body) {
    length += part.length;
    if (length > max) throw new Error('ZIP supera límite de descarga');
    parts.push(part);
  }
  return Buffer.concat(parts, length);
}

export function victoriaEndpoint(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
      || url.pathname !== '/api/v1/import/prometheus') throw new Error('VM_IMPORT_URL debe ser HTTPS y terminar en /api/v1/import/prometheus');
  return url;
}

async function main(env) {
  const { GITHUB_REPOSITORY: repo, GH_TOKEN: token, SOURCE_RUN_ID: id, SOURCE_ATTEMPT: attempt } = env;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? '') || !token || !/^[1-9]\d*$/.test(id ?? '') || !/^[1-9]\d*$/.test(attempt ?? '')) throw new Error('Se requieren GITHUB_REPOSITORY, GH_TOKEN, SOURCE_RUN_ID y SOURCE_ATTEMPT válidos');
  const base = `https://api.github.com/repos/${repo}/actions`;
  const request = (url, options = {}) => fetch(url, { ...options, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  const gh = path => request(base + path, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
  const json = async path => {
    const response = await gh(path);
    if (!response.ok) throw new Error(`GitHub API HTTP ${response.status}`);
    return response.json();
  };
  const list = async (path, key) => {
    const rows = [];
    for (let page = 1; page <= 100; page++) {
      const payload = await json(`${path}?per_page=100&page=${page}`);
      rows.push(...payload[key]);
      if (payload[key].length < 100 || rows.length >= payload.total_count) return rows;
    }
    throw new Error('Paginación de GitHub excedió límite');
  };
  const run = await json(`/runs/${id}/attempts/${attempt}`);
  if (!/^\.github\/workflows\/ci\.yml(?:@.*)?$/.test(run.path) || run.repository?.full_name?.toLowerCase() !== repo.toLowerCase()
      || String(run.id) !== id || String(run.run_attempt) !== attempt || run.status !== 'completed') throw new Error('Intento completado de ci.yml no verificable');
  const jobs = await list(`/runs/${id}/attempts/${attempt}/jobs`, 'jobs');
  if (jobs.some(job => String(job.run_id) !== id || (job.run_attempt != null && String(job.run_attempt) !== attempt))) throw new Error('Jobs no corresponden al intento');
  const isFirstAndCurrent = async () => attempt === '1' && (await json(`/runs/${id}`)).run_attempt === 1;
  const allowCoverage = await isFirstAndCurrent();
  const artifacts = allowCoverage ? await list(`/runs/${id}/artifacts`, 'artifacts') : [];
  const readReport = async artifact => {
    if (!Number.isSafeInteger(artifact.id) || !(artifact.size_in_bytes > 0 && artifact.size_in_bytes <= limit)) throw new Error('Tamaño o ID de artefacto inválido');
    const redirect = await gh(`/artifacts/${artifact.id}/zip`);
    if (redirect.status !== 302 || !redirect.headers.get('location')) throw new Error(`Descarga GitHub HTTP ${redirect.status}`);
    const location = new URL(redirect.headers.get('location'));
    if (location.protocol !== 'https:' || location.username || location.password) throw new Error('URL de descarga no segura');
    let bytes;
    try {
      const zip = await request(location);
      if (!zip.ok) throw new Error('bad response');
      bytes = await bounded(zip, limit);
    } catch {
      throw new Error('Descarga ZIP fallida o demasiado grande');
    }
    try {
      const pythonBin = process.platform === 'win32' ? 'python' : '/usr/bin/python3';
      return execFileSync(pythonBin, [fileURLToPath(new URL('./read-lcov.py', import.meta.url))], {
        input: bytes, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 15000, windowsHide: true,
        env: { PATH: '/usr/local/bin:/usr/bin:/bin' }
      });
    } catch {
      throw new Error('ZIP rechazado o lector LCOV no disponible');
    }
  };
  let data = await collect({ run, jobs, artifacts, readReport, allowCoverage });
  if (allowCoverage && !(await isFirstAndCurrent())) data = await collect({ run, jobs, artifacts: [], readReport, allowCoverage: false });
  const body = data.lines.length ? `${data.lines.join('\n')}\n` : '';
  const audit = {
    repository: repo, runId: id, attempt, sha: run.head_sha, runUrl: run.html_url, branch: run.head_branch,
    result: run.conclusion, jobs: jobs.map(j => ({ id: j.id, name: j.name, url: j.html_url, result: j.conclusion, startedAt: j.started_at, completedAt: j.completed_at })),
    reports: data.reports, omissions: data.omissions, samples: data.lines.length, publication: 'dry-run',
  };
  await writeFile('ie3-metrics.prom', body);
  if (env.PUBLISH === 'true') audit.publication = body ? 'pending' : 'no-samples';
  try {
    if (audit.publication === 'pending') {
      const headers = { 'Content-Type': 'text/plain; charset=utf-8' };
      if (env.VM_TOKEN) headers.Authorization = `Bearer ${env.VM_TOKEN}`;
      try {
        const response = await request(victoriaEndpoint(env.VM_IMPORT_URL), { method: 'POST', headers, body });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        audit.publication = 'accepted';
      } catch (error) {
        audit.publication = 'failed-or-unconfirmed';
        throw error;
      }
    }
  } finally {
    await writeFile('ie3-metadata.json', `${JSON.stringify(audit, null, 2)}\n`);
  }
  console.log(`IE3: ${audit.samples} muestras; publicación ${audit.publication}; ${audit.omissions.length} omisiones (ver metadatos)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.env).catch(error => { console.error(error.message); process.exitCode = 1; });
}
