"use client";

import { ExternalLink, AlertTriangle, X, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import type { Reporte, CategoriaAgua } from "@/lib/tipos";
import { CATEGORIA_LABELS, FUENTE_LABELS, CATEGORIA_COLORS } from "@/lib/tipos";

interface ColoniaDetailProps {
  open: boolean;
  onClose: () => void;
  colonia: {
    nombre: string;
    municipio: string;
    reportes: Reporte[];
    categorias: CategoriaAgua[];
  } | null;
  onReportar: (nombre: string) => void;
}

export function ColoniaDetail({
  open,
  onClose,
  colonia,
  onReportar,
}: ColoniaDetailProps) {
  if (!open || !colonia) return null;

  return (
    <div className="absolute top-4 right-4 z-10 w-[360px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border bg-card/95 backdrop-blur shadow-xl animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div>
          <h2 className="text-lg font-semibold">{colonia.nombre}</h2>
          <p className="text-sm text-muted-foreground">{colonia.municipio}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Resumen */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium">
            {colonia.reportes.length}{" "}
            {colonia.reportes.length === 1 ? "reporte" : "reportes"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {colonia.categorias.map((cat) => (
            <Badge
              key={cat}
              variant="outline"
              className="text-xs"
              style={{
                borderColor: CATEGORIA_COLORS[cat],
                color: CATEGORIA_COLORS[cat],
              }}
            >
              {CATEGORIA_LABELS[cat]}
            </Badge>
          ))}
        </div>
      </div>

      {/* Reportes */}
      <div className="px-4 pb-3 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Historial de reportes
        </h3>
        {colonia.reportes.map((r) => (
          <div
            key={r.id}
            className="rounded-md border bg-background/50 p-3 space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {r.categorias.map((cat) => (
                  <span
                    key={cat}
                    className="inline-block w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: CATEGORIA_COLORS[cat] }}
                  />
                ))}
                {r.categorias.map((cat) => (
                  <span key={cat} className="text-xs text-muted-foreground">
                    {CATEGORIA_LABELS[cat]}
                  </span>
                ))}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {r.fecha_reporte}
              </span>
            </div>
            {r.descripcion && (
              <p className="text-sm leading-relaxed">{r.descripcion}</p>
            )}
            <div className="flex items-center justify-between pt-1">
              <Badge variant="secondary" className="text-xs">
                {FUENTE_LABELS[r.fuente_tipo]}
              </Badge>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {r.fuente_nombre && <span>{r.fuente_nombre}</span>}
                {r.fuente_url && (
                  <a
                    href={r.fuente_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Fuente
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botón reportar en esta colonia */}
      <div className="p-4 pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => onReportar(colonia.nombre)}
        >
          <Plus className="h-4 w-4" />
          Reportar problema en {colonia.nombre}
        </Button>
      </div>
    </div>
  );
}
