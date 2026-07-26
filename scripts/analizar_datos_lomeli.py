"""Analiza los archivos de Jonathan Lomeli: CSV COPRISJAL + DOCX analisis tecnico."""
import csv, json, re
from pathlib import Path
from collections import defaultdict

# ===== 1. ANALIZAR CSV DE COPRISJAL =====
# Buscar archivos con glob (evita problemas de encoding)
csv_path = list(Path(".").glob("*Análisis*.csv"))[0]
docx_path = list(Path(".").glob("*Análisis Técnico*.docx"))[0]
print(f"CSV: {csv_path}")
print(f"DOCX: {docx_path}\n")
print("=" * 70)
print("CSV COPRISJAL - Análisis Físico-Químicos")
print("=" * 70)

with open(csv_path, encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f"Total registros: {len(rows)}")
print(f"Columnas: {list(rows[0].keys())}")

# Estadisticas por municipio
por_muni = defaultdict(int)
fuera_norma = defaultdict(lambda: defaultdict(int))
for r in rows:
    muni = r.get("Municipio", "?").strip()
    por_muni[muni] += 1
    for campo in ["Coliformes Fecales", "Color", "pH", "Ion Fluoruro", "Cloro Libre Residual"]:
        val = r.get(campo, "").strip()
        if "Fuera" in val:
            fuera_norma[muni][campo] += 1

print(f"\nPor municipio:")
for muni, count in sorted(por_muni.items()):
    print(f"  {muni}: {count} pruebas")
    if muni in fuera_norma:
        for campo, n in fuera_norma[muni].items():
            print(f"    {campo}: {n} fuera de norma")

# Fechas
fechas = set()
for r in rows:
    fechas.add(r.get("Fecha", ""))
print(f"\nRango de fechas: {min(fechas)} a {max(fechas)}")

# NOTA: El CSV NO tiene columna "Colonia", solo "Municipio"
print("\n⚠️  El CSV NO tiene columna 'Colonia', solo 'Municipio'.")
print("   Las colonias deben estar en el DOCX o en otro archivo complementario.")

# ===== 2. ANALIZAR DOCX =====
print("\n" + "=" * 70)
print("DOCX - Análisis Técnico COPRISJAL (Juan Pablo Macías)")
print("=" * 70)

try:
    from docx import Document
    doc = Document(docx_path)
    
    full_text = []
    for para in doc.paragraphs:
        if para.text.strip():
            full_text.append(para.text.strip())
    
    print(f"Párrafos con texto: {len(full_text)}")
    print(f"Primeras 10 líneas:")
    for line in full_text[:10]:
        print(f"  {line[:150]}")
    
    # Buscar nombres de colonias en el DOCX
    # Cargar catalogo
    catalogo = json.loads(Path("data/colonias_zmg_todas.json").read_text(encoding="utf-8"))
    colonias_cat = {}
    for f in catalogo["features"]:
        n = f["properties"]["nombre"].lower().strip()
        m = f["properties"]["municipio"]
        colonias_cat[n] = (f["properties"]["nombre"], m)
    
    def normalizar(s):
        s = s.lower().strip()
        for a,b in [("á","a"),("é","e"),("í","i"),("ó","o"),("ú","u"),("ü","u"),("ñ","n")]:
            s = s.replace(a,b)
        return re.sub(r"[^\w\s]", "", s)
    
    encontradas = set()
    for line in full_text:
        line_norm = normalizar(line)
        for cat_norm, (cat_orig, muni) in colonias_cat.items():
            if len(cat_norm) >= 5 and cat_norm in line_norm:
                encontradas.add((cat_orig, muni, line[:100]))
    
    print(f"\nColonias del catalogo encontradas en el DOCX: {len(encontradas)}")
    for col, muni, ctx in sorted(encontradas):
        print(f"  {col} ({muni})")
        print(f"    -> {ctx}")
    
except Exception as e:
    print(f"Error leyendo DOCX: {e}")

# ===== 3. COMPARAR CON DATASET ACTUAL =====
print("\n" + "=" * 70)
print("COMPARACIÓN CON DATASET ACTUAL")
print("=" * 70)

reportes = json.loads(Path("data/reportes_semilla.json").read_text(encoding="utf-8"))
colonias_actuales = set()
for r in reportes:
    colonias_actuales.add((r["colonia"], r["municipio"]))

print(f"Colonias en dataset actual: {len(colonias_actuales)}")
