"use client";

import { useEffect, useRef } from "react";

/**
 * Widget de Cloudflare Turnstile (verificación anti-bots sin rompecabezas).
 * Solo se muestra si existe NEXT_PUBLIC_TURNSTILE_SITE_KEY; si no, no renderiza
 * nada y el servidor tampoco exige el token (ver /api/reportes).
 *
 * Los tokens son de un solo uso: para pedir uno nuevo, cambia la `key` del
 * componente (lo vuelve a montar).
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
}

declare global {
  interface Window { turnstile?: TurnstileApi }
}

let cargando: Promise<TurnstileApi> | null = null;

function cargarScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (cargando) return cargando;
  cargando = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile no cargó")));
    s.onerror = () => { cargando = null; reject(new Error("turnstile no cargó")); };
    document.head.appendChild(s);
  });
  return cargando;
}

export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !ref.current) return;
    let id: string | null = null;
    let vivo = true;
    cargarScript()
      .then((ts) => {
        if (!vivo || !ref.current) return;
        id = ts.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: "es",
          theme: "dark",
          size: "flexible",
          callback: (t: string) => onTokenRef.current(t),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => onTokenRef.current(""),
        });
      })
      .catch(() => onTokenRef.current(""));
    return () => {
      vivo = false;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}
