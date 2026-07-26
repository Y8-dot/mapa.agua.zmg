"""
scraper_agua_zmg.py
Extrae texto limpio de URLs (con o sin JavaScript) para pasárselo
al LLM investigador, quien aplica el protocolo anti-alucinación.
NO extrae hechos ni estructura datos — solo entrega texto plano + metadata.

Uso:
  python scripts/scraper_agua_zmg.py
  
Requisitos:
  pip install -r scripts/requirements_scraper.txt
  playwright install chromium  (una sola vez)
"""

import json
import time
import hashlib
from pathlib import Path

import requests
import trafilatura
from playwright.sync_api import sync_playwright

CACHE_DIR = Path("cache_paginas")
CACHE_DIR.mkdir(exist_ok=True)

HEADERS = {
    "User-Agent": "MapaAguaZMG-bot/1.0 (uso de interes publico; https://github.com/mapa-agua-zmg)"
}

RATE_LIMIT_SECONDS = 3


def _cache_path(url: str) -> Path:
    h = hashlib.sha256(url.encode()).hexdigest()[:16]
    return CACHE_DIR / f"{h}.json"


def fetch_static(url: str) -> str | None:
    """Intento 1: petición simple, sin navegador. Rápido y ligero."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        texto = trafilatura.extract(resp.text, include_comments=False, favor_precision=True)
        return texto
    except Exception:
        return None


def fetch_rendered(url: str) -> str | None:
    """Intento 2: navegador headless (para páginas que necesitan JS)."""
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(user_agent=HEADERS["User-Agent"])
            page.goto(url, timeout=30000, wait_until="networkidle")
            html = page.content()
            browser.close()
        texto = trafilatura.extract(html, include_comments=False, favor_precision=True)
        return texto
    except Exception:
        return None


def obtener_texto(url: str) -> dict:
    """
    Devuelve {"url": ..., "texto": ..., "metodo": "static"|"rendered"|"fallido", "fecha_extraccion": ...}
    Usa caché local para no volver a pedir la misma URL en corridas futuras.
    """
    cache_file = _cache_path(url)
    if cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))

    texto = fetch_static(url)
    metodo = "static"

    if not texto or len(texto) < 200:
        time.sleep(RATE_LIMIT_SECONDS)
        texto = fetch_rendered(url)
        metodo = "rendered"

    resultado = {
        "url": url,
        "texto": texto or "",
        "metodo": metodo if texto else "fallido",
        "fecha_extraccion": time.strftime("%Y-%m-%d"),
    }
    cache_file.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
    time.sleep(RATE_LIMIT_SECONDS)
    return resultado


if __name__ == "__main__":
    urls = [
        # Segunda ronda: mas fuentes potenciales
        "https://www.proceso.com.mx/nacional/estados/2026/3/23/mas-agua-menos-mundial-denuncian-crisis-sanitaria-por-agua-contaminada-en-guadalajara-368637.html",
        "https://www.milenio.com/politica/comunidad/crisis-agua-guadalajara-colonias-afectadas-siapa-2026",
        "https://www.informador.mx/jalisco/Agua-en-la-ZMG-Que-colonias-tienen-agua-contaminada-20260628-0030.html",
        "https://www.ntrguadalajara.com/tema/agua-contaminada-gdl/",
    ]

    resultados = [obtener_texto(u) for u in urls]

    Path("texto_extraido_para_llm.json").write_text(
        json.dumps(resultados, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Procesadas {len(resultados)} URLs. Ver texto_extraido_para_llm.json")
    for r in resultados:
        status = "OK" if r["texto"] else "FALLIDO"
        print(f"  [{status}] {r['metodo']:8s} {r['url'][:80]}")
