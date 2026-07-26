"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, MapPin } from "lucide-react";

interface ColoniaItem {
  nombre: string;
  municipio: string;
  count: number;
}

interface SearchBarProps {
  colonias: ColoniaItem[];
  onSelect: (nombre: string, municipio: string) => void;
}

export function SearchBar({ colonias, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.trim().length >= 2
    ? colonias.filter(
        (c) =>
          c.nombre.toLowerCase().includes(query.toLowerCase()) ||
          c.municipio.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSelect = useCallback(
    (c: ColoniaItem) => {
      setQuery(c.nombre);
      setOpen(false);
      onSelect(c.nombre, c.municipio);
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center rounded-lg border bg-card/95 backdrop-blur shadow-xl">
        <Search className="h-4 w-4 ml-3 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.trim().length >= 2) setOpen(true); }}
          placeholder="Buscar colonia..."
          className="flex-1 bg-transparent px-2.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button onClick={handleClear} className="p-2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1.5 w-full rounded-lg border bg-card/95 backdrop-blur shadow-xl overflow-hidden animate-fade-in">
          {results.map((c) => (
            <button
              key={`${c.nombre}|${c.municipio}`}
              onClick={() => handleSelect(c)}
              className="flex items-center justify-between w-full px-3.5 py-2.5 text-sm hover:bg-accent transition-colors text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate font-medium">{c.nombre}</span>
                <span className="text-xs text-muted-foreground shrink-0">{c.municipio}</span>
              </div>
              <span
                className={`text-xs font-bold ml-2 shrink-0 ${
                  c.count === 0
                    ? "text-muted-foreground"
                    : c.count >= 3
                    ? "text-red-400"
                    : c.count === 2
                    ? "text-orange-400"
                    : "text-yellow-400"
                }`}
              >
                {c.count === 0 ? "—" : c.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute top-full mt-1.5 w-full rounded-lg border bg-card/95 backdrop-blur shadow-xl p-3 text-sm text-muted-foreground text-center">
          No se encontraron colonias con ese nombre
        </div>
      )}
    </div>
  );
}
