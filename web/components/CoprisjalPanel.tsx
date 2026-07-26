"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FlaskConical, AlertTriangle } from "lucide-react";
import stats from "@/data/coprisjal_municipios.json";

type MuniStats = {
  total_pruebas: number;
  periodo: string;
  fuera_norma: { cloro_residual_pct: number; ion_fluoruro_pct: number; color_pct: number };
  fuente: string;
  fuente_url: string;
  nota: string;
};

const MUNI_ORDER = ["Guadalajara", "Zapopan", "Tlaquepaque", "Tonalá"];

export function CoprisjalPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-24 left-4 z-10">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border bg-card/90 backdrop-blur px-3 py-2 text-xs font-medium shadow-lg hover:bg-accent transition-colors"
      >
        <FlaskConical className="h-3.5 w-3.5 text-amber-400" />
        <span>COPRISJAL · 211 pruebas</span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="mt-1.5 rounded-lg border bg-card/95 backdrop-blur p-3 shadow-xl animate-fade-in max-w-[280px]">
          <p className="text-xs text-muted-foreground mb-2">
            Pruebas físico-químicas COPRISJAL · {(stats as Record<string, MuniStats>)["Zapopan"]?.periodo}
          </p>
          <div className="space-y-1.5">
            {MUNI_ORDER.map((muni) => {
              const s = (stats as Record<string, MuniStats>)[muni];
              if (!s) return null;
              const cloro = s.fuera_norma.cloro_residual_pct;
              const severidad = cloro >= 75 ? "text-red-400" : cloro >= 60 ? "text-orange-400" : "text-yellow-400";
              return (
                <div key={muni} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{muni}</span>
                  <span className="text-muted-foreground">{s.total_pruebas} pruebas</span>
                  <span className={`${severidad} font-bold tabular-nums w-10 text-right`}>
                    {cloro}%
                  </span>
                  <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
            % de muestras con cloro residual fuera de norma NOM-127.
            Datos: Jonathan Lomelí / COPRISJAL. Sin desglose por colonia.
          </p>
        </div>
      )}
    </div>
  );
}
