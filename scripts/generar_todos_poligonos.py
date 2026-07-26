"""Genera poligonos simplificados para TODAS las 2053 colonias de la ZMG.
Asi cualquier colonia con reportes muestra su zona delimitada, no un circulo."""
import json
from pathlib import Path
from shapely.geometry import shape

INPUT = Path("data/colonias_zmg_todas.json")  # 2053 poligonos completos
OUTPUT = Path("web/data/colonias_zmg_poligonos.json")

data = json.loads(INPUT.read_text(encoding="utf-8"))
simplify_tolerance = 0.00015  # ~15m

features = []
for f in data["features"]:
    try:
        geom = shape(f["geometry"])
        geom = geom.simplify(simplify_tolerance, preserve_topology=True)
        if geom.is_empty:
            continue
        features.append({
            "type": "Feature",
            "geometry": json.loads(json.dumps(geom.__geo_interface__)),
            "properties": {
                "nombre": f["properties"]["nombre"],
                "municipio": f["properties"]["municipio"],
                "poblacion": f["properties"]["poblacion"],
            }
        })
    except Exception:
        continue

geojson = {"type": "FeatureCollection", "features": features}
json_str = json.dumps(geojson, ensure_ascii=False)
size_kb = len(json_str) / 1024

OUTPUT.write_text(json_str, encoding="utf-8")
print(f"Poligonos: {len(features)} colonias ({size_kb:.0f} KB)")
print(f"Guardado: {OUTPUT}")

# Ahora quitar la capa de puntos del Map.tsx (ya no es necesaria)
print("\nTODAS las colonias tienen poligono. La capa de puntos ya no se necesita.")
