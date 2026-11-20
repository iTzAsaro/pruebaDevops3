"""Read only the root LCOV member, without extracting any archive paths."""
import io
import stat
import sys
import zipfile

MAX_ZIP = 64 * 1024 * 1024
MAX_LCOV = 8 * 1024 * 1024


def main():
    archive = sys.stdin.buffer.read(MAX_ZIP + 1)
    if len(archive) > MAX_ZIP:
        raise ValueError('ZIP too large')
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        entries = [entry for entry in z.infolist() if entry.filename == 'lcov.info']
        if len(entries) != 1:
            raise ValueError('expected exactly one root lcov.info')
        entry = entries[0]
        kind = stat.S_IFMT(entry.external_attr >> 16)
        if kind not in (0, stat.S_IFREG) or not 0 < entry.file_size <= MAX_LCOV:
            raise ValueError('invalid LCOV member')
        with z.open(entry) as report:
            data = report.read(MAX_LCOV + 1)
        if len(data) != entry.file_size or len(data) > MAX_LCOV:
            raise ValueError('invalid LCOV length')
        data.decode('utf-8', errors='strict')
        sys.stdout.buffer.write(data)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        sys.exit('ZIP LCOV rejected')
