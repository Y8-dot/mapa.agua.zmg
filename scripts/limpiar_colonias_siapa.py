"""Limpia y normaliza los registros de colonias de SIAPA para agregar al dataset."""
import fitz, json, re
from pathlib import Path
from collections import defaultdict

PDF_DIR = Path("data/siapa_pdfs")
CATALOGO_PATH = Path("data/colonias_zmg_todas.json")
REPORTES_PATH = Path("data/reportes_semilla.json")

# Cargar catalogo
catalogo = json.loads(CATALOGO_PATH.read_text(encoding="utf-8"))
# Indice: {nombre_norm: (nombre_original, municipio)}
col_index = {}
for f in catalogo["features"]:
    n = f["properties"]["nombre"].lower().strip()
    m = f["properties"]["municipio"]
    col_index[n] = (f["properties"]["nombre"], m)

def normalizar(s):
    s = s.lower().strip()
    for a, b in [("á","a"),("é","e"),("í","i"),("ó","o"),("ú","u"),("ü","u"),("ñ","n")]:
        s = s.replace(a,b)
    return re.sub(r"[^\w\s]", "", s).strip()

# Cargar dataset existente
existentes = json.loads(REPORTES_PATH.read_text(encoding="utf-8"))
colonias_ya = set((r["colonia"], r["municipio"]) for r in existentes)

pdfs = sorted(PDF_DIR.glob("*.pdf"))
nuevos_registros = []

for pdf_path in pdfs:
    year = pdf_path.stem.split("_")[-1] if "_" in pdf_path.stem else pdf_path.stem
    doc = fitz.open(pdf_path)
    
    for page_num in range(doc.page_count):
        text = doc[page_num].get_text()
        
        for line in text.split('\n'):
            line = line.strip()
            
            # Extraer "COL. NOMBRE" o "COLONIA NOMBRE"
            m = re.search(r'(?:col\.?|colonia)\s+([\w\s]+?)(?:\s+\d{8,}|\s*$)', line, re.I)
            if not m:
                continue
            
            colonia_raw = m.group(1).strip()
            if len(colonia_raw) < 3:
                continue
            
            col_norm = normalizar(colonia_raw)
            
            # Buscar en catalogo
            encontrado = False
            for cat_norm, (cat_orig, muni) in col_index.items():
                if col_norm == cat_norm:
                    nuevos_registros.append({
                        'colonia': cat_orig,
                        'municipio': muni,
                        'year': year,
                        'line': line[:150],
                        'match': 'exacto'
                    })
                    encontrado = True
                    break
                # Contiene (abreviaturas)
                if len(col_norm) >= 5 and (col_norm in cat_norm or cat_norm in col_norm):
                    nuevos_registros.append({
                        'colonia': cat_orig,
                        'municipio': muni,
                        'year': year,
                        'line': line[:150],
                        'match': 'parcial'
                    })
                    encontrado = True
                    break
            
            if not encontrado:
                nuevos_registros.append({
                    'colonia': colonia_raw,
                    'municipio': '?',
                    'year': year,
                    'line': line[:150],
                    'match': 'sin_match'
                })
    
    doc.close()

print(f"Total registros limpios: {len(nuevos_registros)}")

# Agrupar por colonia unica (sin duplicados)
colonias_unicas = {}
for r in nuevos_registros:
    key = (r['colonia'], r['municipio'])
    if key not in colonias_unicas:
        colonias_unicas[key] = r

print(f"Colonias unicas (con municipio): {len([k for k in colonias_unicas if k[1] != '?'])}")

# Filtrar solo las NUEVAS (no en dataset actual)
realmente_nuevas = []
for (col, muni), r in sorted(colonias_unicas.items()):
    if muni == '?':
        continue
    if (col, muni) not in colonias_ya:
        realmente_nuevas.append(r)
        print(f"  NUEVA: {col} ({muni}) [{r['year']}] match={r['match']}")

print(f"\nREALMENTE NUEVAS para agregar: {len(realmente_nuevas)}")

# Guardar para revision
Path("data/siapa_colonias_extraidas.json").write_text(
    json.dumps(realmente_nuevas, ensure_ascii=False, indent=2), encoding="utf-8"
)
