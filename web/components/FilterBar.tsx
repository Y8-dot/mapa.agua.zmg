"use client";

import { useCallback } from "react";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import type { CategoriaAgua, FuenteTipo } from "@/lib/tipos";
import { CATEGORIA_LABELS, FUENTE_LABELS } from "@/lib/tipos";
import { useState } from "react";

export interface FiltrosActivos {
  categorias: CategoriaAgua[];
  fuentes: FuenteTipo[];
}

interface FilterBarProps {
  filtros: FiltrosActivos;
  onChange: (filtros: FiltrosActivos) => void;
}

const TODAS_CATEGORIAS: CategoriaAgua[] = [
  "fecal_bacteriologico",
  "metales_pesados",
  "sarro",
  "color_anormal",
  "olor",
  "sedimentos",
  "desabasto",
  "otro",
];

const TODAS_FUENTES: FuenteTipo[] = [
  "oficial",
  "academico_ong",
  "prensa",
  "ciudadano_verificado",
  "ciudadano_sin_verificar",
];

export function FilterBar({ filtros, onChange }: FilterBarProps) {
  const [expandido, setExpandido] = useState(false);
  const [seccion, setSeccion] = useState<"categorias" | "fuentes">("categorias");

  const toggleCategoria = useCallback(
    (cat: CategoriaAgua) => {
      const next = filtros.categorias.includes(cat)
        ? filtros.categorias.filter((c) => c !== cat)
        : [...filtros.categorias, cat];
      onChange({ ...filtros, categorias: next });
    },
    [filtros, onChange]
  );

  const toggleFuente = useCallback(
    (f: FuenteTipo) => {
      const next = filtros.fuentes.includes(f)
        ? filtros.fuentes.filter((x) => x !== f)
        : [...filtros.fuentes, f];
      onChange({ ...filtros, fuentes: next });
    },
    [filtros, onChange]
  );

  const limpiarFiltros = useCallback(() => {
    onChange({ categorias: [], fuentes: [] });
  }, [onChange]);

  const totalFiltros = filtros.categorias.length + filtros.fuentes.length;

  return (
    <div className="absolute top-4 left-4 z-10 max-w-[340px]">
      {/* Botón principal */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="flex items-center gap-2 rounded-lg border bg-card/95 backdrop-blur px-3 py-2 text-sm font-medium shadow-lg hover:bg-accent transition-colors"
      >
        <Filter className="h-4 w-4" />
        <span>Filtros</span>
        {totalFiltros > 0 && (
          <Badge variant="default" className="ml-1">
            {totalFiltros}
          </Badge>
        )}
        {expandido ? (
          <ChevronUp className="h-4 w-4 ml-1" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-1" />
        )}
      </button>

      {/* Panel expandible */}
      {expandido && (
        <div className="mt-2 rounded-lg border bg-card/95 backdrop-blur p-4 shadow-xl animate-fade-in max-h-[60vh] overflow-y-auto">
          {/* Tabs */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setSeccion("categorias")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                seccion === "categorias"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tipo de problema
            </button>
            <button
              onClick={() => setSeccion("fuentes")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                seccion === "fuentes"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Fuente del dato
            </button>
          </div>

          {/* Contenido */}
          {seccion === "categorias" && (
            <div className="space-y-2">
              {TODAS_CATEGORIAS.map((cat) => (
                <label
                  key={cat}
                  className="flex items-center justify-between gap-3 cursor-pointer rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors"
                >
                  <span className="text-sm">{CATEGORIA_LABELS[cat]}</span>
                  <Switch
                    checked={filtros.categorias.includes(cat)}
                    onCheckedChange={() => toggleCategoria(cat)}
                  />
                </label>
              ))}
            </div>
          )}

          {seccion === "fuentes" && (
            <div className="space-y-2">
              {TODAS_FUENTES.map((f) => (
                <label
                  key={f}
                  className="flex items-center justify-between gap-3 cursor-pointer rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors"
                >
                  <span className="text-sm">{FUENTE_LABELS[f]}</span>
                  <Switch
                    checked={filtros.fuentes.includes(f)}
                    onCheckedChange={() => toggleFuente(f)}
                  />
                </label>
              ))}
            </div>
          )}

          {/* Limpiar filtros */}
          {totalFiltros > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limpiarFiltros}
              className="mt-3 w-full text-xs gap-1"
            >
              <X className="h-3 w-3" />
              Limpiar todos los filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
