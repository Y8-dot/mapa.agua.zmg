"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Send, Check, AlertCircle, Search, X, MapPin, Loader2 } from "lucide-react";
import type { CategoriaAgua } from "@/lib/tipos";
import { CATEGORIA_LABELS, CATEGORIA_COLORS, MUNICIPIOS_ZMG, TODAS_CATEGORIAS, normalizarTexto } from "@/lib/tipos";
import coloniasCatalogo from "@/data/colonias_zmg_nombres.json";
import { Turnstile, TURNSTILE_SITE_KEY } from "./Turnstile";

interface ColoniaItem { nombre: string; municipio: string; }

export interface DatosReporte {
  colonia: string;
  municipio: string;
  categorias: CategoriaAgua[];
  descripcion: string;
  /** Token de Cloudflare Turnstile (solo si está configurado). */
  turnstile?: string;
}

export interface ResultadoEnvio { ok: boolean; mensaje: string; }

interface ReportFormProps {
  open: boolean; onClose: () => void;
  onSubmit: (data: DatosReporte) => Promise<ResultadoEnvio>;
  coloniaInicial?: string;
}

const CATALOGO = coloniasCatalogo as ColoniaItem[];

export function ReportForm({ open, onClose, onSubmit, coloniaInicial = "" }: ReportFormProps) {
  const [query, setQuery] = useState(coloniaInicial);
  const [selected, setSelected] = useState<ColoniaItem | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [modoManual, setModoManual] = useState(false);
  const [coloniaManual, setColoniaManual] = useState("");
  const [municipioManual, setMunicipioManual] = useState("");
  const [categorias, setCategorias] = useState<CategoriaAgua[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tokenTs, setTokenTs] = useState("");
  const [tsKey, setTsKey] = useState(0); // cambiarla vuelve a montar el widget (token nuevo)
  const containerRef = useRef<HTMLDivElement>(null);

  const results: ColoniaItem[] = query.trim().length >= 2 && !modoManual
    ? CATALOGO.filter((c) => normalizarTexto(c.nombre).includes(normalizarTexto(query))).slice(0, 8)
    : [];

  // Al abrir: precargar la colonia de la que viene el usuario (si es única en el catálogo)
  useEffect(() => {
    if (!open) return;
    setQuery(coloniaInicial);
    const n = normalizarTexto(coloniaInicial);
    const coincidencias = n ? CATALOGO.filter((c) => normalizarTexto(c.nombre) === n) : [];
    setSelected(coincidencias.length === 1 ? coincidencias[0] : null);
    setShowDropdown(coincidencias.length > 1);
  }, [open, coloniaInicial]);

  const reset = useCallback(() => {
    setQuery(""); setSelected(null); setShowDropdown(false);
    setModoManual(false); setColoniaManual(""); setMunicipioManual("");
    setCategorias([]); setDescripcion(""); setEnviado(null); setError(""); setEnviando(false);
    setTokenTs(""); setTsKey((k) => k + 1);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowDropdown(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggleCat = (cat: CategoriaAgua) => setCategorias((p) => p.includes(cat) ? p.filter((c) => c !== cat) : [...p, cat]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setError("");
    const colonia = modoManual ? coloniaManual.trim() : selected?.nombre ?? "";
    const municipio = modoManual ? municipioManual : selected?.municipio ?? "";
    if (!colonia) { setError("Selecciona tu colonia de la lista o escríbela manualmente."); return; }
    if (!municipio) { setError("Selecciona el municipio."); return; }
    if (categorias.length === 0) { setError("Selecciona al menos un tipo de problema."); return; }
    if (TURNSTILE_SITE_KEY && !tokenTs) { setError("Espera a que termine la verificación anti-bots."); return; }
    setEnviando(true);
    const r = await onSubmit({
      colonia, municipio, categorias, descripcion: descripcion.trim(),
      ...(TURNSTILE_SITE_KEY ? { turnstile: tokenTs } : {}),
    });
    setEnviando(false);
    if (!r.ok) {
      setError(r.mensaje);
      // El token ya se usó: pedir uno nuevo para el siguiente intento.
      if (TURNSTILE_SITE_KEY) { setTokenTs(""); setTsKey((k) => k + 1); }
      return;
    }
    setEnviado(r.mensaje);
    setTimeout(() => reset(), 4000);
  }, [enviando, modoManual, coloniaManual, municipioManual, selected, categorias, descripcion, tokenTs, onSubmit, reset]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && reset()}>
      <DialogContent>
        {enviado ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <div className="rounded-full bg-green-500/20 p-3"><Check className="h-8 w-8 text-green-400" /></div>
            <DialogTitle>Reporte enviado</DialogTitle>
            <DialogDescription>{enviado}</DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Reportar un problema de agua</DialogTitle>
              <DialogDescription>
                Reporte anónimo. Se publica al momento como &quot;ciudadano sin verificar&quot;.
                Para evitar abusos se acepta un reporte por colonia desde la misma red cada 30 días.
              </DialogDescription>
            </DialogHeader>
            <DialogClose onClick={reset} />
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* ─── Colonia autocompletado ─────────────────────────── */}
              <div ref={containerRef} className="relative">
                <label className="text-sm font-medium">Colonia *</label>
                {!modoManual ? (
                  <>
                    <div className="mt-1 flex items-center rounded-md border bg-background px-3 py-2">
                      <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                      <input
                        type="text" value={query}
                        onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); setSelected(null); }}
                        onFocus={() => { if (query.trim().length >= 2) setShowDropdown(true); }}
                        placeholder="Busca tu colonia..." className="flex-1 bg-transparent text-sm outline-none"
                      />
                      {query && <button type="button" onClick={() => { setQuery(""); setSelected(null); }} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
                    </div>
                    {showDropdown && results.length > 0 && (
                      <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover shadow-xl max-h-48 overflow-y-auto animate-fade-in">
                        {results.map((c, i) => (
                          <button key={`${c.nombre}-${i}`} type="button" onClick={() => { setSelected(c); setQuery(c.nombre); setShowDropdown(false); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-left">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">{c.nombre}</span>
                            <span className="text-xs text-muted-foreground ml-auto shrink-0">{c.municipio}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {showDropdown && query.trim().length >= 2 && results.length === 0 && (
                      <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover shadow-xl p-3 animate-fade-in">
                        <p className="text-sm text-muted-foreground mb-2">No se encontró &quot;{query}&quot; en el catálogo oficial (2,053 colonias).</p>
                        <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={() => { setModoManual(true); setShowDropdown(false); }}>
                          Escribir nombre manualmente
                        </Button>
                      </div>
                    )}
                    {selected && (
                      <p className="mt-1 text-xs text-green-400 flex items-center gap-1"><Check className="h-3 w-3" />{selected.nombre} &middot; {selected.municipio}</p>
                    )}
                  </>
                ) : (
                  /* ─── Modo manual ──────────────────────────────────── */
                  <div className="mt-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="text" value={coloniaManual} onChange={(e) => setColoniaManual(e.target.value)}
                        placeholder="Escribe el nombre de tu colonia" className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required />
                      <button type="button" onClick={() => { setModoManual(false); setColoniaManual(""); }} className="text-xs text-primary hover:underline shrink-0">Volver a buscar</button>
                    </div>
                    <select value={municipioManual} onChange={(e) => setMunicipioManual(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" required>
                      <option value="">Selecciona el municipio</option>
                      {MUNICIPIOS_ZMG.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <p className="text-xs text-amber-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" />Esta colonia no está en el catálogo oficial: tu reporte se guardará, pero no aparecerá en el mapa por ahora.</p>
                  </div>
                )}
              </div>

              {/* ─── Categorias ──────────────────────────────────────── */}
              <div>
                <label className="text-sm font-medium">Tipo de problema *</label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TODAS_CATEGORIAS.map((cat) => {
                    const sel = categorias.includes(cat);
                    return (
                      <button key={cat} type="button" onClick={() => toggleCat(cat)}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors ${sel ? "bg-primary/20 text-primary border border-primary/40" : "border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
                        style={sel ? { borderColor: CATEGORIA_COLORS[cat], color: CATEGORIA_COLORS[cat], backgroundColor: `${CATEGORIA_COLORS[cat]}20` } : undefined}>
                        {CATEGORIA_LABELS[cat]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Descripción (opcional)</label>
                <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describe el problema: color, olor, partículas, desde cuándo..." rows={3} maxLength={1000}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>

              {open && <Turnstile key={tsKey} onToken={setTokenTs} />}

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />{error}
                </div>
              )}

              <Button type="submit" className="w-full gap-2" disabled={enviando}>
                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {enviando ? "Enviando…" : "Enviar reporte"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">* Campos requeridos. No guardamos tu IP, solo una huella cifrada para limitar abusos.</p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
