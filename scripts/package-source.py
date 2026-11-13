from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
excluded = {".git", "node_modules", "dist", "var", "output", "__pycache__", ".gradle", "test-results", "playwright-report", "Pods", "build"}
out = root / "output" / "Meta-Tracker-source.zip"
out.parent.mkdir(exist_ok=True)
with ZipFile(out, "w", ZIP_DEFLATED) as archive:
    for path in root.rglob("*"):
        rel = path.relative_to(root)
        if not path.is_file() or excluded.intersection(rel.parts):
            continue
        if path.name in {".env", "local.properties"} or path.suffix in {".jks", ".keystore", ".pyc"}:
            continue
        archive.write(path, rel.as_posix())
with ZipFile(out) as archive:
    assert archive.testzip() is None
    for name in ("index.html", "app.mjs", "icons/icon-192.png", ".github/workflows/pages.yml", "src/app.mjs"):
        assert name in archive.namelist(), name
    print(f"{out}: {len(archive.namelist())} files, archive verified")
