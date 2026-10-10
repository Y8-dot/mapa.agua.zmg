"use client";

import { ChevronDown, ChevronUp, Trophy } from "lucide-react";

export interface ItemTop {
  nombre: string;
  municipio: string;
  count: number;
  color: string;
}

interface TopColoniasProps {
  items: ItemTop[];
  onSelect: (nombre: string, municipio: string) => void;
  /** Oculta el panel (p. ej. cuando el detalle de colonia ocupa la esquina en escritorio). */
  oculto?: boolean;
  /** Hay filtros activos: el ranking se calcula sobre los reportes filtrados. */
  filtrado?: boolean;
  abierto: boolean;
  onToggle: () => void;
}

/**
 * Top 5 de colonias con más reportes (respeta los filtros activos).
 * Escritorio: esquina superior derecha, abierto por defecto.
 * Celular: botón compacto bajo la búsqueda, cerrado por defecto para no tapar el mapa.
 */
export function TopColonias({ items, onSelect, oculto = false, filtrado = false, abierto, onToggle }: TopColoniasProps) {

  if (oculto || items.length === 0) return null;

  return (
    <div className="absolute top-14 right-4 z-20 w-[min(240px,calc(100vw-9.5rem))] md:top-4 md:w-[260px]">
      <button
        onClick={onToggle}
        aria-expanded={abierto}
        aria-controls="top-colonias-lista"
        className="ml-auto flex items-center gap-2 rounded-lg border bg-card/95 backdrop-blur px-3 py-2 text-sm font-medium shadow-lg hover:bg-accent transition-colors"
      >
        <Trophy className="h-4 w-4 text-amber-400" />
        <span>Top 5 colonias</span>
        {abierto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {abierto && (
        <div
          id="top-colonias-lista"
          className="mt-2 rounded-lg border bg-card/95 backdrop-blur p-2 shadow-xl animate-fade-in"
        >
          <p className="px-1.5 pb-1.5 text-[11px] text-muted-foreground">
            Colonias con más reportes{filtrado ? " (con los filtros activos)" : ""}
          </p>
          <ol className="space-y-0.5">
            {items.map((c, i) => (
              <li key={`${c.nombre}|${c.municipio}`}>
                <button
                  onClick={() => onSelect(c.nombre, c.municipio)}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-accent transition-colors"
                  title={`Ver ${c.nombre} en el mapa`}
                >
                  <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: c.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium leading-tight">{c.nombre}</span>
                    <span className="block truncate text-[11px] text-muted-foreground leading-tight">{c.municipio}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums">
                    {c.count.toLocaleString("es-MX")}
                    <span className="ml-0.5 font-normal text-muted-foreground">rep.</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
