"""Agrega estadísticas COPRISJAL por municipio al dataset.

Uso (desde la raíz del repo):
    python scripts/generar_stats_coprisjal.py

Lee el CSV "Análisis Coprisjal SIAPA 2026.xlsx - Análisis Físico-Químicos.csv"
y escribe web/data/coprisjal_municipios.json.

Las fechas del CSV vienen como texto en español ("16 de enero de 2024"), así
que se convierten a fecha antes de calcular el periodo. Comparar el texto
directamente da rangos invertidos ("10 de febrero de 2026 – 9 de julio de 2024").
"""
import csv
import json
from collections import defaultdict
from datetime import date
from pathlib import Path

MESES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12,
}
NOMBRE_MES = {v: k for k, v in MESES.items()}

FUENTE = "COPRISJAL (datos obtenidos por Jonathan Lomeli, El Informador)"
FUENTE_URL = "https://drive.google.com/drive/folders/1BNQH242dMRr0bMRZnBJjFrIRcUNlGjfq"


def parse_fecha(s: str) -> date:
    """'16 de enero de 2024' -> date(2024, 1, 16)"""
    partes = s.strip().lower().split()
    # ['16', 'de', 'enero', 'de', '2024']
    return date(int(partes[4]), MESES[partes[2]], int(partes[0]))


def fecha_larga(d: date) -> str:
    return f"{d.day} de {NOMBRE_MES[d.month]} de {d.year}"


csv_path = next(Path(".").glob("*Análisis*.csv"))
with open(csv_path, encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))

stats = defaultdict(lambda: {"total": 0, "fuera_norma": defaultdict(int), "fechas": []})

for r in rows:
    muni = r["Municipio"].strip()
    stats[muni]["total"] += 1
    stats[muni]["fechas"].append(parse_fecha(r["Fecha"]))
    for campo in ["Color", "Ion Fluoruro", "Cloro Libre Residual"]:
        if "Fuera" in r.get(campo, ""):
            stats[muni]["fuera_norma"][campo] += 1

total = sum(d["total"] for d in stats.values())
resultado = {}
for muni, data in stats.items():
    t = data["total"]
    ini, fin = min(data["fechas"]), max(data["fechas"])
    resultado[muni] = {
        "total_pruebas": t,
        "periodo": f"{fecha_larga(ini)} – {fecha_larga(fin)}",
        "fecha_inicio": ini.isoformat(),
        "fecha_fin": fin.isoformat(),
        "fuera_norma": {
            "cloro_residual_pct": round(data["fuera_norma"].get("Cloro Libre Residual", 0) / t * 100),
            "ion_fluoruro_pct": round(data["fuera_norma"].get("Ion Fluoruro", 0) / t * 100),
            "color_pct": round(data["fuera_norma"].get("Color", 0) / t * 100),
        },
        "fuente": FUENTE,
        "fuente_url": FUENTE_URL,
        "nota": f"{total} pruebas fisico-quimicas realizadas por COPRISJAL. Datos obtenidos via periodista Jonathan Lomeli (El Informador). No incluyen desglose por colonia.",
    }

out = Path("web/data/coprisjal_municipios.json")
out.write_text(json.dumps(resultado, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Guardado: {out}")
for muni, d in resultado.items():
    print(f"  {muni}: {d['total_pruebas']} pruebas ({d['periodo']}), cloro fuera={d['fuera_norma']['cloro_residual_pct']}%, "
          f"fluoruro={d['fuera_norma']['ion_fluoruro_pct']}%, color={d['fuera_norma']['color_pct']}%")
