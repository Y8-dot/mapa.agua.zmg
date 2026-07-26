"""
generar_voronoi.py
Genera polígonos de Voronoi a partir de los centroides de colonias
para crear un mapa de coropletas (zonas) en vez de círculos.

Usa scipy.spatial.Voronoi para la teselación y shapely para
recortar al bounding box de la ZMG.
"""

import json
from pathlib import Path

import numpy as np
from scipy.spatial import Voronoi
from shapely.geometry import Polygon, Point, box
from shapely.ops import unary_union

# ─── Config ────────────────────────────────────────────────────────────────
BBOX_ZMG = [-103.55, 20.45, -103.10, 20.85]  # [min_lon, min_lat, max_lon, max_lat]
BUFFER_DEG = 0.05  # Expansión del bbox para que los bordes tengan celdas completas
INPUT_GEOJSON = Path("data/colonias_semilla.json")
OUTPUT_GEOJSON = Path("data/colonias_voronoi.json")


def voronoi_polygons(points: np.ndarray, bbox: list[float]) -> list[Polygon]:
    """
    Genera polígonos de Voronoi recortados al bounding box.
    points: array (N, 2) de [lon, lat]
    bbox: [min_lon, min_lat, max_lon, max_lat]
    """
    # Expandir bounding box para celdas de borde
    min_lon, min_lat, max_lon, max_lat = bbox
    pad = BUFFER_DEG
    bbox_poly = box(min_lon - pad, min_lat - pad, max_lon + pad, max_lat + pad)

    # Voronoi en el plano (lon=x, lat=y)
    vor = Voronoi(points)

    polygons = []
    for region_idx in vor.point_region:
        region = vor.regions[region_idx]
        if not region or -1 in region:
            # Región infinita o inválida — aproximo con punto buffer
            continue
        verts = vor.vertices[region]
        if len(verts) < 3:
            continue
        poly = Polygon(verts)
        # Recortar al bbox expandido
        poly = poly.intersection(bbox_poly)
        if poly.is_empty:
            continue
        polygons.append(poly)

    return polygons


def main():
    # Cargar centroides
    geojson = json.loads(INPUT_GEOJSON.read_text(encoding="utf-8"))
    features = geojson["features"]

    points = []
    props_list = []
    for f in features:
        coords = f["geometry"]["coordinates"]
        points.append(coords)
        props_list.append(f["properties"])

    points_arr = np.array(points)

    # Generar Voronoi
    print(f"Generando Voronoi para {len(points)} colonias...")
    polys = voronoi_polygons(points_arr, BBOX_ZMG)
    print(f"  {len(polys)} polígonos generados (de {len(points)} puntos)")

    # Crear GeoJSON de salida
    out_features = []
    for i, poly in enumerate(polys):
        if poly.geom_type == "Polygon":
            coords = [list(poly.exterior.coords)]
        elif poly.geom_type == "MultiPolygon":
            # Tomar el polígono más grande
            largest = max(poly.geoms, key=lambda g: g.area)
            coords = [list(largest.exterior.coords)]
        else:
            continue

        props = props_list[i] if i < len(props_list) else {}
        out_features.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": coords},
            "properties": props,
        })

    out_geojson = {"type": "FeatureCollection", "features": out_features}
    OUTPUT_GEOJSON.write_text(json.dumps(out_geojson, ensure_ascii=False), encoding="utf-8")
    print(f"Guardado: {OUTPUT_GEOJSON} ({len(out_features)} features)")


if __name__ == "__main__":
    main()
