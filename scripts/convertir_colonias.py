"""
convertir_colonias.py
Convierte el shapefile de colonias del IIEG a GeoJSON,
filtra solo colonias de la ZMG, y cruza con nuestro dataset.
"""

import json
import re
from pathlib import Path

import fiona
from shapely.geometry import shape, mapping
from shapely.ops import unary_union, transform
from pyproj import Transformer

# Transformador de UTM 13N (EPSG:32613) a WGS84 (EPSG:4326)
transformer = Transformer.from_crs("EPSG:32613", "EPSG:4326", always_xy=True)

# ─── Config ────────────────────────────────────────────────────────────────
SHP_PATH = Path("data/raw_shapefiles/colonias_ine2024/ISDC2020_2024.shp")
REPORTES_PATH = Path("data/reportes_semilla.json")
OUTPUT_PATH = Path("data/colonias_zmg_poligonos.json")
OUTPUT_SIMPLIFIED = Path("web/data/colonias_zmg_poligonos.json")

# Municipios de la ZMG (como aparecen en el shapefile)
MUNICIPIOS_ZMG = [
    "Guadalajara",
    "Zapopan",
    "San Pedro Tlaquepaque",
    "Tonalá",
    "El Salto",
    "Tlajomulco de Zúñiga",
]

# Mapeo de municipios del shapefile a nuestro formato
MUNICIPIO_MAP = {
    "Guadalajara": "Guadalajara",
    "Zapopan": "Zapopan",
    "San Pedro Tlaquepaque": "Tlaquepaque",
    "Tonalá": "Tonalá",
    "El Salto": "El Salto",
    "Tlajomulco de Zúñiga": "Tlajomulco",
}


def normalizar(texto: str) -> str:
    """Normaliza texto para comparación: minúsculas, sin acentos, sin puntuación extra."""
    texto = texto.lower().strip()
    # Quitar acentos
    replacements = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ü": "u", "ñ": "n"}
    for acc, noacc in replacements.items():
        texto = texto.replace(acc, noacc)
    # Quitar puntuación extra y espacios múltiples
    texto = re.sub(r"[^\w\s]", "", texto)
    texto = re.sub(r"\s+", " ", texto)
    return texto.strip()


def main():
    print("Leyendo shapefile de colonias del IIEG...")
    
    # 1. Leer shapefile y filtrar por municipios ZMG
    colonias_zmg = []
    with fiona.open(SHP_PATH) as src:
        print(f"  CRS: {src.crs}")
        print(f"  Campos: {list(src.schema['properties'].keys())[:15]}...")
        print(f"  Total features: {len(src)}")
        
        for feature in src:
            props = feature["properties"]
            municipio = props.get("MUNICIPIO", props.get("NOM_MUN", ""))
            
            if municipio in MUNICIPIOS_ZMG:
                # Convertir geometría de fiona a dict GeoJSON, reproyectando a WGS84
                geom_utm = shape(feature["geometry"])
                geom_wgs84 = transform(transformer.transform, geom_utm)
                colonias_zmg.append({
                    "nombre": props.get("NOMCOL1", props.get("COLONIA", "")),
                    "municipio": MUNICIPIO_MAP.get(municipio, municipio),
                    "municipio_original": municipio,
                    "geometry": mapping(geom_wgs84),
                    "poblacion": props.get("POBTOT", props.get("P_TOTAL", 0)),
                })
    
    print(f"  Colonias en ZMG: {len(colonias_zmg)}")
    
    # 2. Cargar nombres de colonias de nuestro dataset
    reportes = json.loads(REPORTES_PATH.read_text(encoding="utf-8"))
    nuestras_colonias = set()
    for r in reportes:
        nuestras_colonias.add((normalizar(r["colonia"]), r["municipio"]))
    
    print(f"  Nuestras colonias (dataset): {len(nuestras_colonias)}")
    
    # 3. Cruzar: encontrar match entre nuestras colonias y las del shapefile
    matches = []
    sin_match = []
    
    for nombre_nuestro, municipio_nuestro in nuestras_colonias:
        nombre_norm = normalizar(nombre_nuestro)
        encontrado = False
        
        for c in colonias_zmg:
            nombre_shp_norm = normalizar(c["nombre"])
            
            # Match exacto
            if nombre_norm == nombre_shp_norm and c["municipio"] == municipio_nuestro:
                matches.append(c)
                encontrado = True
                break
            
            # Match parcial (una contiene a la otra)
            if (nombre_norm in nombre_shp_norm or nombre_shp_norm in nombre_norm) and \
               c["municipio"] == municipio_nuestro:
                matches.append(c)
                encontrado = True
                break
        
        if not encontrado:
            # Intentar match sin restricción de municipio
            for c in colonias_zmg:
                nombre_shp_norm = normalizar(c["nombre"])
                if nombre_norm == nombre_shp_norm:
                    matches.append(c)
                    encontrado = True
                    break
            
            if not encontrado:
                sin_match.append((nombre_nuestro, municipio_nuestro))
    
    print(f"  Matches encontrados: {len(matches)}")
    print(f"  Sin match: {len(sin_match)}")
    if sin_match:
        print("  Colonias sin match en shapefile:")
        for n, m in sin_match:
            print(f"    - {n} ({m})")
    
    # 4. Guardar GeoJSON con los polígonos encontrados
    features = []
    seen = set()
    for c in matches:
        key = f"{c['nombre']}|{c['municipio']}"
        if key in seen:
            continue
        seen.add(key)
        features.append({
            "type": "Feature",
            "geometry": c["geometry"],
            "properties": {
                "nombre": c["nombre"],
                "municipio": c["municipio"],
                "poblacion": c["poblacion"],
            }
        })
    
    geojson = {"type": "FeatureCollection", "features": features}
    OUTPUT_PATH.write_text(json.dumps(geojson, ensure_ascii=False), encoding="utf-8")
    print(f"\nGuardado: {OUTPUT_PATH} ({len(features)} features)")
    
    # 5. También guardar TODAS las colonias de la ZMG como referencia
    todas_features = []
    todas_vistas = set()
    for c in colonias_zmg:
        key = f"{c['nombre']}|{c['municipio']}"
        if key in todas_vistas:
            continue
        todas_vistas.add(key)
        todas_features.append({
            "type": "Feature",
            "geometry": c["geometry"],
            "properties": {
                "nombre": c["nombre"],
                "municipio": c["municipio"],
                "poblacion": c["poblacion"],
            }
        })
    
    todas_geojson = {"type": "FeatureCollection", "features": todas_features}
    todas_path = Path("data/colonias_zmg_todas.json")
    todas_path.write_text(json.dumps(todas_geojson, ensure_ascii=False), encoding="utf-8")
    print(f"Todas las colonias ZMG: {todas_path} ({len(todas_features)} features)")


if __name__ == "__main__":
    main()
