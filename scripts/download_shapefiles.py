"""Descarga y convierte shapefiles de colonias del IIEG."""
import sys, zipfile, shutil
from pathlib import Path
import requests

URL = "https://iieg.gob.mx/ns/wp-content/uploads/2024/11/SHAPEColonias20202024.zip"
OUT_DIR = Path("data/raw_shapefiles")
ZIP_PATH = OUT_DIR / "colonias_ine2024.zip"
EXTRACT_DIR = OUT_DIR / "colonias_ine2024"

OUT_DIR.mkdir(parents=True, exist_ok=True)

if ZIP_PATH.exists():
    print(f"Ya existe: {ZIP_PATH} ({ZIP_PATH.stat().st_size} bytes)")
else:
    print(f"Descargando {URL}...")
    resp = requests.get(URL, headers={"User-Agent": "MapaAguaZMG/1.0"}, timeout=300)
    resp.raise_for_status()
    ZIP_PATH.write_bytes(resp.content)
    print(f"Descargado: {len(resp.content)} bytes")

if EXTRACT_DIR.exists():
    shutil.rmtree(EXTRACT_DIR)

print("Extrayendo...")
with zipfile.ZipFile(ZIP_PATH) as zf:
    names = zf.namelist()
    print(f"  {len(names)} archivos en el zip:")
    for n in names[:10]:
        print(f"    {n}")
    if len(names) > 10:
        print(f"    ... y {len(names)-10} mas")
    zf.extractall(EXTRACT_DIR)

print(f"Extraido en: {EXTRACT_DIR}")
