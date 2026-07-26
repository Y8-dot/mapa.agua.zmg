"""Procesa los 4 PDFs de SIAPA buscando direcciones y colonias."""
import fitz, json, re
from pathlib import Path

PDF_DIR = Path("data/siapa_pdfs")
REPORTES_PATH = Path("data/reportes_semilla.json")
CATALOGO_PATH = Path("data/colonias_zmg_todas.json")

# Cargar catalogo de 2053 colonias ZMG
catalogo = json.loads(CATALOGO_PATH.read_text(encoding="utf-8"))
colonias_catalogo = set()
for f in catalogo["features"]:
    nombre = f["properties"]["nombre"].lower().strip()
    colonias_catalogo.add(nombre)

# Cargar colonias ya en nuestro dataset
reportes = json.loads(REPORTES_PATH.read_text(encoding="utf-8"))
colonias_ya = set(r["colonia"].lower().strip() for r in reportes)

def normalizar(s):
    s = s.lower().strip()
    for a, b in [("á","a"),("é","e"),("í","i"),("ó","o"),("ú","u"),("ü","u"),("ñ","n")]:
        s = s.replace(a,b)
    return s

pdfs = sorted(PDF_DIR.glob("*.pdf"))
print(f"PDFs encontrados: {len(pdfs)}")

todas_colonias_encontradas = set()

for pdf_path in pdfs:
    year = pdf_path.stem.split("_")[-1] if "_" in pdf_path.stem else pdf_path.stem
    print(f"\n{'='*60}")
    print(f"PDF: {pdf_path.name} ({pdf_path.stat().st_size/1024:.0f} KB)")
    print(f"{'='*60}")

    doc = fitz.open(pdf_path)

    # Extraer TODO el texto
    full_text = ""
    for page in doc:
        full_text += page.get_text() + "\n"

    # Buscar patrones de direccion (calle + numero, colonia, etc.)
    # Patrones comunes en direcciones mexicanas
    patrones_direccion = [
        r'(?:calle|av\.?|avenida|prolongación|prol\.?|privada|priv\.?|cerrada|c\.|andador)\s+[\w\s]+(?:#|no\.?|número|num\.?)?\s*\d+',
        r'(?:col\.?|colonia|fracc\.?|fraccionamiento)\s+[\w\s]+',
    ]

    # Buscar colonias del catalogo en el texto
    encontradas = set()
    for colonia in colonias_catalogo:
        # Buscar palabra completa (no substrings)
        pattern = r'\b' + re.escape(normalizar(colonia)) + r'\b'
        if re.search(pattern, normalizar(full_text)):
            encontradas.add(colonia)

    print(f"  Colonias del catalogo encontradas: {len(encontradas)}")
    if encontradas:
        for c in sorted(encontradas):
            ya = "YA EN DATASET" if c in colonias_ya else "NUEVA"
            print(f"    [{ya}] {c}")

    todas_colonias_encontradas.update(encontradas)

    # Buscar texto que parezca direcciones
    lines = full_text.split('\n')
    direcciones = [l.strip() for l in lines if len(l.strip()) > 15 and any(
        kw in l.lower() for kw in ['calle', 'colonia', 'col.', 'av.', 'avenida', 'fracc', 'domicilio', '#']
    )]
    if direcciones:
        print(f"  Lineas con posible direccion: {len(direcciones)}")
        for d in direcciones[:5]:
            print(f"    > {d[:120]}")

    # Paginas totales y estructura
    print(f"  Paginas: {doc.page_count}, Caracteres: {len(full_text)}")

    doc.close()

print(f"\n{'='*60}")
print(f"TOTAL colonias encontradas en PDFs: {len(todas_colonias_encontradas)}")

nuevas = todas_colonias_encontradas - colonias_ya
print(f"NUEVAS (no estan en dataset actual): {len(nuevas)}")
for c in sorted(nuevas):
    print(f"  + {c}")
