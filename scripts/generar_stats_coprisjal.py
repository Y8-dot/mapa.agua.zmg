"""Agrega estadisticas COPRISJAL por municipio al dataset."""
import csv, json
from pathlib import Path
from collections import defaultdict

# Cargar CSV
csv_path = list(Path(".").glob("*Análisis*.csv"))[0]
with open(csv_path, encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))

# Estadisticas por municipio
stats = defaultdict(lambda: {"total": 0, "fuera_norma": defaultdict(int), "fechas": []})

for r in rows:
    muni = r["Municipio"].strip()
    stats[muni]["total"] += 1
    stats[muni]["fechas"].append(r["Fecha"])
    for campo in ["Color", "Ion Fluoruro", "Cloro Libre Residual"]:
        if "Fuera" in r.get(campo, ""):
            stats[muni]["fuera_norma"][campo] += 1

# Formatear para el mapa
resultado = {}
for muni, data in stats.items():
    t = data["total"]
    resultado[muni] = {
        "total_pruebas": t,
        "periodo": f"{min(data['fechas'])} – {max(data['fechas'])}",
        "fuera_norma": {
            "cloro_residual_pct": round(data["fuera_norma"].get("Cloro Libre Residual", 0) / t * 100),
            "ion_fluoruro_pct": round(data["fuera_norma"].get("Ion Fluoruro", 0) / t * 100),
            "color_pct": round(data["fuera_norma"].get("Color", 0) / t * 100),
        },
        "fuente": "COPRISJAL",
        "fuente_url": "https://www.siapa.gob.mx/transparencia",
        "nota": "211 pruebas fisico-quimicas realizadas por COPRISJAL. Datos obtenidos via periodista Jonathan Lomeli (El Informador). No incluyen desglose por colonia.",
    }

out = Path("web/data/coprisjal_municipios.json")
out.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Guardado: {out}")
for muni, d in resultado.items():
    print(f"  {muni}: {d['total_pruebas']} pruebas, cloro fuera={d['fuera_norma']['cloro_residual_pct']}%, fluoruro={d['fuera_norma']['ion_fluoruro_pct']}%, color={d['fuera_norma']['color_pct']}%")
