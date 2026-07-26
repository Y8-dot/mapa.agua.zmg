"""
descargar_colonias_zmg.py
Usa Playwright para scrapear portales de datos geoespaciales de Jalisco
y descargar los shapefiles de colonias de la ZMG.

Fuentes:
  - IIEG (iieg.gob.mx) -> Distribucion Territorial
  - datos.jalisco.gob.mx -> Catalogo de colonias AMG
  - INEGI -> Marco Geoestadistico

Estrategia:
  1. Navegar a los portales con Playwright (renderizan JS)
  2. Buscar enlaces de descarga (.zip, .shp, .kml, .geojson)
  3. Descargar y convertir a GeoJSON con ogr2ogr
"""

import re
import json
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from playwright.sync_api import sync_playwright

OUTPUT_DIR = Path("data/raw_shapefiles")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
GEOJSON_OUTPUT = Path("data/colonias_zmg_raw.geojson")

HEADERS = {
    "User-Agent": "MapaAguaZMG-bot/1.0 (interes publico; https://github.com/mapa-agua-zmg)"
}


def scrape_iieg():
    """Scrapea la pagina de Distribucion Territorial del IIEG buscando links de descarga."""
    links = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(user_agent=HEADERS["User-Agent"])

        print("[IIEG] Navegando a la pagina de Distribucion Territorial...")
        try:
            page.goto("https://iieg.gob.mx/ns/?page_id=881", timeout=30000, wait_until="networkidle")
            time.sleep(2)

            # Buscar todos los enlaces de descarga
            all_links = page.evaluate("""() => {
                const links = document.querySelectorAll('a[href]');
                return Array.from(links).map(a => ({
                    text: a.textContent.trim(),
                    href: a.href
                }));
            }""")

            for link in all_links:
                href = link["href"]
                text = link["text"].lower()
                # Filtrar por palabras clave de colonias/shapefiles
                if any(kw in href.lower() + text for kw in [
                    ".zip", ".shp", ".kml", ".geojson", "shapefile",
                    "colonia", "shape", "cartografia", "geografia",
                    "marco", "limite", "asentamiento", "localidad"
                ]):
                    links.append({"text": link["text"], "href": href, "source": "IIEG"})

            browser.close()
        except Exception as e:
            print(f"[IIEG] Error: {e}")
            browser.close()

    return links


def scrape_datos_jalisco():
    """Scrapea datos.jalisco.gob.mx buscando el catalogo de colonias."""
    links = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(user_agent=HEADERS["User-Agent"])

        # Probar varias URLs
        urls = [
            "https://datos.jalisco.gob.mx/datos/catalogo-de-colonias-del-area-metropolitana-de-guadalajara",
            "https://datos.jalisco.gob.mx/dataset/colonias-amg",
            "https://datos.jalisco.gob.mx/dataset?q=colonias",
        ]

        for url in urls:
            try:
                print(f"[datos.jalisco] Intentando: {url}")
                page.goto(url, timeout=15000, wait_until="networkidle")
                time.sleep(1)

                all_links = page.evaluate("""() => {
                    const links = document.querySelectorAll('a[href]');
                    return Array.from(links).map(a => ({
                        text: a.textContent.trim(),
                        href: a.href
                    }));
                }""")

                for link in all_links:
                    href = link["href"]
                    text = link["text"].lower()
                    if any(kw in href.lower() + text for kw in [
                        ".zip", ".shp", ".kml", ".geojson", ".csv",
                        "descargar", "download", "recurso", "shapefile",
                        "colonia", "shape"
                    ]):
                        links.append({"text": link["text"], "href": href, "source": "datos.jalisco"})
            except Exception as e:
                print(f"[datos.jalisco] Error en {url}: {e}")

        browser.close()
    return links


def descargar_archivo(url: str, nombre: str):
    """Descarga un archivo y lo guarda en OUTPUT_DIR."""
    out_path = OUTPUT_DIR / nombre
    if out_path.exists():
        print(f"  [cache] {nombre} ya existe, saltando")
        return out_path

    print(f"  Descargando {nombre}...")
    try:
        resp = requests.get(url, headers=HEADERS, timeout=60)
        resp.raise_for_status()
        out_path.write_bytes(resp.content)
        print(f"  Guardado: {out_path} ({len(resp.content)} bytes)")
        return out_path
    except Exception as e:
        print(f"  Error descargando {url}: {e}")
        return None


def main():
    print("=" * 60)
    print("SCRAPER DE SHAPEFILES DE COLONIAS ZMG")
    print("=" * 60)

    # 1. Scrapear IIEG
    print("\n[1] Scrapeando IIEG...")
    iieg_links = scrape_iieg()
    print(f"  Encontrados {len(iieg_links)} enlaces potenciales en IIEG")
    for l in iieg_links:
        print(f"    - {l['text'][:80]}: {l['href'][:100]}")

    # 2. Scrapear datos.jalisco
    print("\n[2] Scrapeando datos.jalisco.gob.mx...")
    dj_links = scrape_datos_jalisco()
    print(f"  Encontrados {len(dj_links)} enlaces potenciales en datos.jalisco")
    for l in dj_links:
        print(f"    - {l['text'][:80]}: {l['href'][:100]}")

    # 3. Guardar resultados para inspeccion manual
    all_links = iieg_links + dj_links
    result = {"fecha": time.strftime("%Y-%m-%d"), "links": all_links}
    Path("data/links_shapefiles.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"\n[3] Total: {len(all_links)} enlaces guardados en data/links_shapefiles.json")
    print("Revisa ese archivo para identificar los shapefiles correctos.")
    print("Luego usa ogr2ogr para convertir .shp/.kml a GeoJSON.")

    # 4. Si hay enlaces .zip o .shp, intentar descargar
    for link in all_links:
        href = link["href"]
        if any(href.lower().endswith(ext) for ext in [".zip", ".shp", ".kml", ".geojson"]):
            nombre = href.split("/")[-1].split("?")[0] or f"file_{hash(href)}.zip"
            descargar_archivo(href, nombre)


if __name__ == "__main__":
    main()
