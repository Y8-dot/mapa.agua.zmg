// Analiza la distribución de reportes por colonia para diseñar la escala de colores.
// Uso: node scripts/analizar_distribucion.js
const https = require("https");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://awukzgnyceaeybixnqmy.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_PkwrqqKt7z8WxpAadJXNKQ_5RRvGq7L";

const polis = require(path.join(__dirname, "..", "web", "data", "colonias_zmg_poligonos.json"));

const norm = (s) =>
  (s || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// Claves normalizadas de los polígonos (sin acentos, minúsculas)
const polyKeys = new Set(
  polis.features.map((f) => norm(f.properties.nombre + "|" + f.properties.municipio))
);

function fetchPage(from) {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/rest/v1/reportes?select=colonia,municipio&limit=1000&offset=${from}`;
    const opts = {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    };
    https
      .get(url, opts, (res) => {
        let b = "";
        res.on("data", (c) => (b += c));
        res.on("end", () => {
          try { resolve(JSON.parse(b)); } catch { resolve([]); }
        });
      })
      .on("error", reject);
  });
}

(async () => {
  const all = [];
  for (let from = 0; from < 20000; from += 1000) {
    const page = await fetchPage(from);
    if (!page || !page.length) break;
    all.push(...page);
  }
  console.log("Total registros en Supabase:", all.length);

  const counts = new Map();
  let sinPoligono = 0;
  for (const r of all) {
    const k = norm(r.colonia + "|" + r.municipio);
    if (!polyKeys.has(k)) {
      sinPoligono++;
      continue;
    }
    counts.set(k, (counts.get(k) || 0) + 1);
  }

  const arr = [...counts.values()].sort((a, b) => a - b);
  const n = arr.length;
  const q = (p) => arr[Math.min(n - 1, Math.floor(p * n))];

  console.log("Colonias con reporte y polígono:", n);
  console.log("Registros sin polígono (sin mapear):", sinPoligono);
  console.log("Reportes mapeados:", arr.reduce((a, b) => a + b, 0));
  console.log("---");
  console.log("min:", arr[0], "max:", arr[n - 1]);
  console.log("mediana:", q(0.5), "media:", (arr.reduce((a, b) => a + b, 0) / n).toFixed(2));
  console.log(
    "percentiles 50/75/90/95/99:",
    q(0.5), q(0.75), q(0.9), q(0.95), q(0.99)
  );

  const bins = [
    [1, 1], [2, 2], [3, 4], [5, 6], [7, 9], [10, 14], [15, 19], [20, 49], [50, Infinity],
  ];
  console.log("--- Histograma ---");
  for (const [lo, hi] of bins) {
    const c = arr.filter((v) => v >= lo && v <= hi).length;
    const label = hi === Infinity ? `${lo}+` : lo === hi ? `${lo}` : `${lo}-${hi}`;
    console.log(`${label}: ${c} colonias`);
  }

  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  console.log("--- Top 20 colonias ---");
  for (const [k, c] of top) console.log(`  ${k} -> ${c}`);
})();
