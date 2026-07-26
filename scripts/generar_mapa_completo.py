"""Genera capa de puntos con todas las 2053 colonias del catalogo.
Esto permite que cualquier colonia con reportes aparezca en el mapa,
incluso si no tiene poligono matcheado aun."""
import json
from pathlib import Path
from shapely.geometry import shape

CATALOGO = Path("data/colonias_zmg_todas.json")
OUTPUT = Path("web/data/colonias_zmg_puntos.json")

catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
features = []

for f in catalogo["features"]:
    geom = shape(f["geometry"])
    centroid = geom.centroid
    features.append({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [centroid.x, centroid.y]
        },
        "properties": {
            "nombre": f["properties"]["nombre"],
            "municipio": f["properties"]["municipio"],
            "poblacion": f["properties"]["poblacion"],
        }
    })

geojson = {"type": "FeatureCollection", "features": features}
OUTPUT.write_text(json.dumps(geojson, ensure_ascii=False), encoding="utf-8")
size_kb = len(json.dumps(geojson)) / 1024
print(f"Puntos: {len(features)} colonias ({size_kb:.0f} KB)")
print(f"Guardado: {OUTPUT}")
