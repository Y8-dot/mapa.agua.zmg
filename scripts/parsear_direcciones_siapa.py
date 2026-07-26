"""Extrae direcciones reales de los PDFs SIAPA y parsea colonias."""
import fitz, json, re
from pathlib import Path

PDF_DIR = Path("data/siapa_pdfs")
CATALOGO_PATH = Path("data/colonias_zmg_todas.json")

# Cargar catalogo con municipio
catalogo = json.loads(CATALOGO_PATH.read_text(encoding="utf-8"))
colonias_dict = {}  # {(nombre_norm, municipio): nombre_original}
for f in catalogo["features"]:
    n = f["properties"]["nombre"].lower().strip()
    m = f["properties"]["municipio"]
    colonias_dict[(n, m)] = f["properties"]["nombre"]

def normalizar(s):
    s = s.lower().strip()
    for a, b in [("á","a"),("é","e"),("í","i"),("ó","o"),("ú","u"),("ü","u"),("ñ","n")]:
        s = s.replace(a,b)
    return re.sub(r"[^\w\s]", "", s)

pdfs = sorted(PDF_DIR.glob("*.pdf"))
todas_direcciones = []

for pdf_path in pdfs:
    year = pdf_path.stem.split("_")[-1] if "_" in pdf_path.stem else pdf_path.stem
    doc = fitz.open(pdf_path)
    
    for page_num in range(doc.page_count):
        page = doc[page_num]
        text = page.get_text()
        
        # Buscar bloques que parezcan direcciones: calle Y calle, o calle + numero
        # Patron: "CALLE1 Y CALLE2, COLONIA" o "CALLE #NUM, COLONIA"
        for line in text.split('\n'):
            line = line.strip()
            if len(line) < 15:
                continue
            
            # Detectar lineas con intersecciones (formato comun en SIAPA)
            if re.search(r'(?:av\.?|avenida|calle|prol\.?|privada|c\.|cerrada)\s+.+', line, re.I):
                todas_direcciones.append({
                    'year': year,
                    'page': page_num + 1,
                    'line': line
                })
    
    doc.close()

print(f"Total direcciones extraidas: {len(todas_direcciones)}")

# Ahora buscar colonias DENTRO de estas direcciones, no en todo el texto
encontradas_validas = set()
for d in todas_direcciones:
    line_norm = normalizar(d['line'])
    for (col_norm, muni), col_orig in colonias_dict.items():
        # Buscar la colonia como palabra completa en la linea
        pattern = r'\b' + re.escape(col_norm) + r'\b'
        if re.search(pattern, line_norm):
            encontradas_validas.add((col_orig, muni, d['year']))

print(f"\nColonias ENCONTRADAS EN DIRECCIONES (con municipio del catalogo):")
print(f"Total: {len(encontradas_validas)}")

# Agrupar por año
from collections import defaultdict
por_ano = defaultdict(list)
for col, muni, year in sorted(encontradas_validas):
    por_ano[year].append((col, muni))

for year in sorted(por_ano.keys()):
    print(f"\n  {year}: {len(por_ano[year])} colonias")
    for col, muni in por_ano[year][:10]:
        print(f"    - {col} ({muni})")
    if len(por_ano[year]) > 10:
        print(f"    ... y {len(por_ano[year])-10} mas")

# Mostrar algunas direcciones de ejemplo
print(f"\nEjemplos de direcciones extraidas:")
for d in todas_direcciones[:5]:
    print(f"  [{d['year']}] {d['line'][:120]}")
