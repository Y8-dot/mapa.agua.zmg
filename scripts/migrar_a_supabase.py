"""Migra los reportes semilla a Supabase via REST API."""
import json, os, requests
from pathlib import Path

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

REPORTES_PATH = Path("data/reportes_semilla.json")
ENDPOINT = f"{SUPABASE_URL}/rest/v1/reportes"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

def main():
    reportes = json.loads(REPORTES_PATH.read_text(encoding="utf-8"))
    print(f"Migrando {len(reportes)} reportes a Supabase...")

    exitosos = 0
    errores = 0

    for i, r in enumerate(reportes):
        payload = {
            "colonia": r["colonia"],
            "municipio": r["municipio"],
            "categorias": r["categorias"],
            "fuente_tipo": r["fuente_tipo"],
            "fuente_nombre": r["fuente_nombre"],
            "fuente_url": r.get("fuente_url", ""),
            "descripcion": r.get("descripcion", ""),
            "fecha_reporte": r["fecha_reporte"],
            "fecha_carga": "2026-07-25",
            "nivel_confianza": r.get("nivel_confianza", "media"),
            "estado_moderacion": "aprobado",
        }

        resp = requests.post(ENDPOINT, json=payload, headers=HEADERS)
        if resp.status_code in (200, 201, 204):
            exitosos += 1
        else:
            errores += 1
            print(f"  ERROR [{i}] {r['colonia']}: {resp.status_code} {resp.text[:200]}")

        if (i + 1) % 10 == 0:
            print(f"  {i+1}/{len(reportes)}...")

    print(f"\nMigracion completada: {exitosos} exitosos, {errores} errores")

    # Verificar
    resp = requests.get(f"{ENDPOINT}?select=count", headers={**HEADERS, "Prefer": "count=exact"})
    print(f"Registros en Supabase: {resp.headers.get('content-range', '?')}")


if __name__ == "__main__":
    main()
