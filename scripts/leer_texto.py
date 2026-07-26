"""Lee y muestra el texto extraido por el scraper."""
import json
from pathlib import Path

data = json.loads(Path("texto_extraido_para_llm.json").read_text(encoding="utf-8"))

for r in data:
    if not r["texto"]:
        continue
    print(f"=== URL: {r['url']} ===")
    print(f"=== Metodo: {r['metodo']} ===")
    print(r["texto"][:2500])
    print("\n...[TRUNCADO]...\n")
    print("=" * 60)
