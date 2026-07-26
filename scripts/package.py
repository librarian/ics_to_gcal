#!/usr/bin/env python3
"""Create a deterministic Firefox XPI archive from dist/."""

from __future__ import annotations

import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
ARTIFACTS = ROOT / "artifacts"
PACKAGE = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
OUTPUT = ARTIFACTS / f"ics-to-gcal-{PACKAGE['version']}.xpi"
FIXED_TIMESTAMP = (2026, 1, 1, 0, 0, 0)


def main() -> None:
    if not (DIST / "manifest.json").is_file():
        raise SystemExit("dist/ is missing; run npm run build first")

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUTPUT, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(item for item in DIST.rglob("*") if item.is_file()):
            relative = path.relative_to(DIST).as_posix()
            info = ZipInfo(relative, FIXED_TIMESTAMP)
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)

    print(f"Packaged extension: {OUTPUT}")


if __name__ == "__main__":
    main()
