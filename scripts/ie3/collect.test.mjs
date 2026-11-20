import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collect, coverage, victoriaEndpoint } from './collect.mjs';

const stamp = n => new Date(1700000000000 + n * 1000).toISOString();
const lcov = 'SF:a.js\nLF:3\nLH:2\nend_of_record\nSF:b.js\nLF:5\nLH:4\nend_of_record\n';
const job = (name, start, end, steps, conclusion = 'success') => ({ name, started_at: stamp(start), completed_at: stamp(end), steps, status: 'completed', conclusion });
const step = (name, start, end, conclusion = 'success') => ({ name, started_at: stamp(start), completed_at: stamp(end), conclusion });
const fixture = () => ({
  run: { head_branch: 'main', conclusion: 'failure', status: 'completed' },
  jobs: [
    job('tests backend', 0, 20, [step('Generar cobertura LCOV (backend)', 2, 8), step('Publicar cobertura (backend)', 9, 12)]),
    job('Despliegue en Entorno Cloud Simulado', 30, 42, [step('Levantar Servicios con Docker Compose', 31, 35, 'failure')], 'failure'),
    job('Despliegue en la Nube (AWS EC2)', 30, 31, [step('Desplegar y orquestar stack en AWS EC2', 30, 30, 'skipped')]),
  ],
  artifacts: [{ id: 5, name: 'coverage-backend', created_at: stamp(10), archive_download_url: 'https://example.org/zip', expired: false }],
  allowCoverage: true,
  readReport: async () => lcov,
});

test('LCOV: pondera por líneas y rechaza reportes rotos', () => {
  assert.equal(coverage(lcov), 75);
  for (const text of ['', lcov + lcov, 'SF:x\nLF:2\nLH:3\nend_of_record', 'SF:x\nLF:2\nLH:1']) assert.throws(() => coverage(text));
});

test('duraciones y cobertura históricas, sin AWS omitido ni IDs en labels', async () => {
  const result = await collect(fixture());
  assert.deepEqual(result.lines, [
    'vicity_ci_pipeline_duration_seconds{branch="main",result="failure"} 42 1700000042000',
    'vicity_ci_deployment_duration_seconds{branch="main",result="failure",environment="simulated"} 12 1700000042000',
    'vicity_ci_test_coverage_percent{branch="main",service="backend"} 75 1700000008000',
  ]);
  assert.equal(result.reports[0].artifactId, 5);
  assert.match(result.omissions[0], /aws/);
});

test('no mezcla reintentos, artefactos previos, expirados, ambiguos ni uploads omitidos', async () => {
  for (const mutate of [
    x => { x.allowCoverage = false; },
    x => { x.artifacts[0].created_at = stamp(1); },
    x => { x.artifacts[0].expired = true; },
    x => { x.artifacts.push({ ...x.artifacts[0], id: 8 }); },
    x => { x.jobs[0].steps[1].conclusion = 'skipped'; },
    x => { x.jobs[0].steps[0].conclusion = 'failure'; },
  ]) {
    const input = fixture();
    mutate(input);
    input.readReport = async () => assert.fail('unexpected artifact read');
    assert.equal((await collect(input)).lines.length, 2);
  }
});

test('un job omitido no infla la duración; AWS ejecutado sí emite una muestra', async () => {
  const input = fixture();
  input.jobs.push(job('skipped', 90, 100, [], 'skipped'));
  input.jobs[2].steps[0].conclusion = 'success';
  const result = await collect(input);
  assert.match(result.lines[0], / 42 1700000042000$/);
  assert.match(result.lines[2], /environment="aws"/);
});

test('endpoint estricto sin credenciales embebidas', () => {
  const path = '/api/v1/import/prometheus';
  assert.equal(victoriaEndpoint(`https://vm.example.org${path}`).pathname, path);
  for (const value of [`http://vm.example.org${path}`, `https://token@vm.example.org${path}`, `https://vm.example.org${path}?secret=1`, 'https://vm.example.org/']) assert.throws(() => victoriaEndpoint(value));
});
