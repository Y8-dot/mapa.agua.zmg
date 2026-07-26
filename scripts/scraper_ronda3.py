"""Ronda 3: buscar base COPRISJAL y ampliar dataset."""
import json, time, hashlib
from pathlib import Path
import requests
import trafilatura
from playwright.sync_api import sync_playwright

CACHE_DIR = Path("cache_paginas")
CACHE_DIR.mkdir(exist_ok=True)
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def _cache_path(url): return CACHE_DIR / f"{hashlib.sha256(url.encode()).hexdigest()[:16]}.json"

def fetch_static(url):
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        return trafilatura.extract(resp.text, include_comments=False, favor_precision=True)
    except: return None

def fetch_rendered(url):
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(user_agent=HEADERS["User-Agent"])
            page.goto(url, timeout=30000, wait_until="networkidle")
            html = page.content()
            browser.close()
        return trafilatura.extract(html, include_comments=False, favor_precision=True)
    except: return None

def obtener_texto(url):
    cache_file = _cache_path(url)
    if cache_file.exists(): return json.loads(cache_file.read_text(encoding="utf-8"))
    texto = fetch_static(url)
    metodo = "static"
    if not texto or len(texto) < 200:
        time.sleep(3)
        texto = fetch_rendered(url)
        metodo = "rendered"
    resultado = {"url": url, "texto": texto or "", "metodo": metodo if texto else "fallido", "fecha_extraccion": time.strftime("%Y-%m-%d")}
    cache_file.write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
    time.sleep(3)
    return resultado

if __name__ == "__main__":
    urls = [
        "https://www.informador.mx/jalisco/Analisis-del-Agua-del-SIAPA-en-la-ZMG-esto-es-lo-que-sabemos-20260328-0026.html",
        "https://www.informador.mx/jalisco/Agua-contaminada-en-Guadalajara-Que-dicen-las-pruebas-del-SIAPA-20260628-0028.html",
        "https://www.milenio.com/politica/comunidad/crisis-agua-guadalajara-que-colonias-tienen-agua-sucia-2026",
        "https://www.informador.mx/jalisco/Agua-sucia-en-Guadalajara-Estas-son-las-colonias-mas-afectadas-20260705-0032.html",
        "https://labcsa.org/2026/06/28/exigen-intervencion-en-colonia-americana-por-crisis-de-agua/",
        "https://labcsa.org/2026/06/28/colonias-de-tonala-que-el-agua-amenaza-cada-temporada-de-lluvias/",
        "https://udgtv.com/noticias/secretario-salud-jalisco-informa-calidad-agua-2026/308000",
        "https://udgtv.com/noticias/colonias-agua-contaminada-guadalajara-2026/308500",
    ]
    resultados = [obtener_texto(u) for u in urls]
    Path("texto_extraido_ronda3.json").write_text(json.dumps(resultados, ensure_ascii=False, indent=2), encoding="utf-8")
    ok = sum(1 for r in resultados if r["texto"])
    print(f"Ronda 3: {ok}/{len(resultados)} URLs con texto")
    for r in resultados:
        status = "OK" if r["texto"] else "FALLIDO"
        chars = len(r["texto"]) if r["texto"] else 0
        print(f"  [{status}] {r['metodo']:8s} ({chars} chars) {r['url'][:80]}")
