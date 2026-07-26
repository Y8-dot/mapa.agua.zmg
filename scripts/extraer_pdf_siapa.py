"""Extrae tablas del PDF de muestreos SIAPA."""
import fitz, json, re
from pathlib import Path

pdf_path = Path("data/siapa_pdfs/muestreos_domiciliarios_-_enero-marzo_2026.pdf")
doc = fitz.open(pdf_path)
print(f"Paginas: {doc.page_count}")

all_rows = []
for i in range(doc.page_count):
    page = doc[i]
    tabs = page.find_tables()
    if tabs and tabs.tables:
        for t in tabs.tables:
            extracted = t.extract()
            print(f"  Pagina {i+1}: tabla con {len(extracted)} filas")
            for row in extracted:
                clean = [str(c).strip() if c else "" for c in row]
                all_rows.append(clean)
            # Mostrar primeras 3 filas
            for row in extracted[:3]:
                print(f"    {[str(c)[:40] if c else '' for c in row]}")

doc.close()

print(f"\nTotal filas extraidas: {len(all_rows)}")
if all_rows:
    print(f"Columnas de la primera fila: {all_rows[0]}")
    print(f"Columnas de la segunda fila: {all_rows[1][:8]}")

# Buscar nombres de colonias conocidas en los datos
from pathlib import Path
import json
reportes = json.loads(Path("data/reportes_semilla.json").read_text(encoding="utf-8"))
colonias_known = set(r["colonia"].lower() for r in reportes)

found = []
for row in all_rows:
    for cell in row:
        for col in colonias_known:
            if col in cell.lower():
                found.append(cell)
                break

print(f"\nColonias conocidas encontradas: {len(set(found))}")
for f in set(found):
    print(f"  {f}")
