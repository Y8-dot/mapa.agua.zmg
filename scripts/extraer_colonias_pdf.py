"""Extrae registros con colonia de los PDFs SIAPA."""
import fitz, json, re
from pathlib import Path
from collections import defaultdict

PDF_DIR = Path("data/siapa_pdfs")
CATALOGO_PATH = Path("data/colonias_zmg_todas.json")

catalogo = json.loads(CATALOGO_PATH.read_text(encoding="utf-8"))
colonias_dict = {}
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
registros = []

for pdf_path in pdfs:
    year = pdf_path.stem.split("_")[-1] if "_" in pdf_path.stem else pdf_path.stem
    doc = fitz.open(pdf_path)
    
    for page_num in range(doc.page_count):
        text = doc[page_num].get_text()
        
        # Buscar lineas con "COL." explicito o con formato DIRECCION + COLONIA
        for line in text.split('\n'):
            line = line.strip()
            
            # Patron: "CALLE # COL. NOMBRE" o "CALLE # NOMBRE_COLONIA FOLIO"
            m = re.search(r'(?:col\.?|colonia)\s+([\w\s]+?)(?:\s+\d{8,}|\s*$)', line, re.I)
            if m:
                colonia_raw = m.group(1).strip()
                if len(colonia_raw) > 2:
                    registros.append({
                        'year': year, 'page': page_num + 1,
                        'line': line, 'colonia_raw': colonia_raw,
                        'source': 'COL_EXPLICITO'
                    })
                    continue
            
            # Patron: direccion que termina con nombre de colonia (sin COL.)
            # Formato: STREET # [NOMBRE_COLONIA] FOLIO
            m2 = re.search(r'([\w\s]+?)\s+(\d{11})', line)
            if m2:
                rest = m2.group(1).strip()
                folio = m2.group(2)
                # Buscar si alguna parte de 'rest' coincide con catalogo
                for (col_norm, muni), col_orig in colonias_dict.items():
                    pattern = r'\b' + re.escape(col_norm) + r'\b'
                    if re.search(pattern, normalizar(rest)):
                        registros.append({
                            'year': year, 'page': page_num + 1,
                            'line': line, 'colonia_raw': col_orig,
                            'municipio': muni, 'source': 'CATALOGO_MATCH'
                        })
    
    doc.close()

print(f"Registros con colonia: {len(registros)}")

# Agrupar por colonia
por_colonia = defaultdict(list)
for r in registros:
    col = r.get('colonia_raw', '?')
    por_colonia[col].append(r)

print(f"Colonias unicas: {len(por_colonia)}")
for col in sorted(por_colonia.keys()):
    regs = por_colonia[col]
    years = set(r['year'] for r in regs)
    print(f"  {col}: {len(regs)} registros, años: {sorted(years)}")
    for r in regs[:2]:
        print(f"    [{r['year']}] {r['line'][:100]}")
