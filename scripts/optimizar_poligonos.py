"""Optimiza polígonos de colonias para el mapa web y agrega las faltantes."""
import json
from pathlib import Path

from shapely.geometry import shape, Point

POLIGONOS_PATH = Path("data/colonias_zmg_poligonos.json")
CENTROIDES_PATH = Path("data/colonias_semilla.json")
OUTPUT_PATH = Path("web/data/colonias_zmg_poligonos.json")
OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

# Colonias que no tienen match en el shapefile (usar centroides con buffer)
SIN_MATCH = ["Mariano Azuela", "Lafayette", "Jaime Carrillo", "Valle de Loira"]

SIMPLIFY_TOLERANCE = 0.0001  # grados (~10m)

def main():
    poligonos = json.loads(POLIGONOS_PATH.read_text(encoding="utf-8"))
    print(f"Poligonos cargados: {len(poligonos['features'])}")

    validos = []
    for f in poligonos["features"]:
        try:
            geom = shape(f["geometry"])
            geom = geom.simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)
            if geom.is_empty:
                continue
            f["geometry"] = json.loads(json.dumps(geom.__geo_interface__))
            validos.append(f)
        except Exception as e:
            print(f"  Error en {f['properties']['nombre']}: {e}")

    print(f"Poligonos validos: {len(validos)}")

    # Agregar las 3 sin match como buffers desde centroides (~500m)
    centroides = json.loads(CENTROIDES_PATH.read_text(encoding="utf-8"))
    for f in centroides["features"]:
        nombre = f["properties"]["nombre"]
        if nombre not in SIN_MATCH:
            continue
        lon, lat = f["geometry"]["coordinates"]
        point = Point(lon, lat)
        buffer_geom = point.buffer(0.005)  # ~500m en grados
        validos.append({
            "type": "Feature",
            "geometry": json.loads(json.dumps(buffer_geom.__geo_interface__)),
            "properties": {
                "nombre": nombre,
                "municipio": f["properties"]["municipio"],
                "poblacion": f["properties"]["poblacion"],
            }
        })
        print(f"  Buffer para: {nombre}")

    geojson = {"type": "FeatureCollection", "features": validos}
    OUTPUT_PATH.write_text(json.dumps(geojson, ensure_ascii=False), encoding="utf-8")

    size_kb = len(json.dumps(geojson)) / 1024
    print(f"Guardado: {OUTPUT_PATH} ({len(validos)} features, {size_kb:.1f} KB)")


if __name__ == "__main__":
    main()

