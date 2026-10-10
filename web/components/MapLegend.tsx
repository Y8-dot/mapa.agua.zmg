"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import {
  ETIQUETAS_CLASE,
  OPACIDAD_SEVERIDAD,
  RAMPA_SEVERIDAD,
  VIDA_MEDIA_DIAS,
  type RangoClase,
} from "@/lib/severidad";

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function fmt(n: number) {
  return n >= 10 ? n.toFixed(0) : n.toFixed(1);
}

export function MapLegend({ rangos }: { rangos: RangoClase[] }) {
  const [info, setInfo] = useState(false);
  const total = rangos.reduce((s, r) => s + r.colonias, 0);

  return (
    <div className="w-[min(196px,calc(100vw-12.5rem))] sm:w-[230px] rounded-lg border bg-card/90 backdrop-blur px-3 py-2 shadow-lg">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-muted-foreground">Severidad relativa por colonia</span>
        <button
          onClick={() => setInfo((v) => !v)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Cómo se calcula el color"
          aria-expanded={info}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex gap-[2px]" role="list" aria-label="Escala de colores">
        {RAMPA_SEVERIDAD.map((color, i) => {
          const r = rangos[i];
          const titulo = r && r.colonias > 0
            ? `${ETIQUETAS_CLASE[i]}: ${r.colonias} colonias (puntaje ${fmt(r.min)}–${fmt(r.max)})`
            : `${ETIQUETAS_CLASE[i]}: sin colonias`;
          return (
            <span
              key={color}
              role="listitem"
              title={titulo}
              aria-label={titulo}
              className="h-3 flex-1 first:rounded-l-sm last:rounded-r-sm border"
              style={{ backgroundColor: hexA(color, Math.min(1, OPACIDAD_SEVERIDAD[i] + 0.35)), borderColor: hexA(color, 0.8) }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>Menor</span>
        <span>Mayor</span>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="inline-block h-3 w-3 rounded-sm border border-dashed border-muted-foreground/50" />
        Sin color = sin reportes
      </div>

      {info && (
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground border-t border-border/60 pt-2">
          Cada colonia recibe un puntaje: la suma de sus reportes, donde los
          oficiales y académicos pesan más que los ciudadanos sin verificar, y
          un reporte pierde la mitad de su peso cada {Math.round(VIDA_MEDIA_DIAS / 30)} meses.
          Hoy hay {total.toLocaleString("es-MX")} colonias con reportes.
          Los 5 colores se asignan buscando los saltos naturales entre puntajes
          (en escala logarítmica), así que el color compara colonias entre sí y
          se ajusta a los filtros activos y al crecimiento de los datos.
        </p>
      )}
    </div>
  );
}
