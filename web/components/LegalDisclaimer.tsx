"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { AlertTriangle, ArrowRight, Droplets, ShieldAlert, Users } from "lucide-react";

const COOKIE_NAME = "mapa-agua-zmg-disclaimer-v1";
const TOTAL_SLIDES = 4;

function hasAccepted(): boolean {
  if (typeof document === "undefined") return true;
  return document.cookie
    .split("; ")
    .some((c) => c.startsWith(`${COOKIE_NAME}=1`));
}

function setAccepted() {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${oneYear}; SameSite=Lax`;
}

const SLIDES = [
  {
    eyebrow: "Bienvenida",
    title: "Mapa Ciudadano de Calidad del Agua — ZMG",
    icon: Droplets,
    iconBg: "bg-blue-500/10",
    iconFg: "text-blue-400",
    body: (
      <p>
        Este mapa centraliza reportes sobre la calidad del agua potable en la
        Zona Metropolitana de Guadalajara. Los datos provienen de fuentes
        periodísticas, académicas, oficiales y ciudadanas.
      </p>
    ),
  },
  {
    eyebrow: "Qué mostramos",
    title: "Tipos de problemas y fuentes",
    icon: Users,
    iconBg: "bg-amber-500/10",
    iconFg: "text-amber-400",
    body: (
      <div className="space-y-2">
        <p>
          Cada punto en el mapa representa una colonia con al menos un reporte.
          El color indica la severidad:{" "}
          <span className="text-green-400">amarillo</span> = 1 reporte,{" "}
          <span className="text-orange-400">naranja</span> = 2,{" "}
          <span className="text-red-400">rojo</span> = 3+.
        </p>
        <p>
          Puedes filtrar por tipo de problema (metales, bacterias, color, olor,
          desabasto…) y por fuente del dato (oficial, académico/ONG, prensa,
          ciudadano).
        </p>
      </div>
    ),
  },
  {
    eyebrow: "Importante",
    title: "Limitaciones y transparencia",
    icon: ShieldAlert,
    iconBg: "bg-red-500/10",
    iconFg: "text-red-400",
    body: (
      <div className="space-y-2">
        <p>
          <strong>Este sitio no reemplaza análisis de laboratorio</strong> ni es
          un diagnóstico de salud. Solo centraliza y visibiliza reportes
          existentes.
        </p>
        <p>
          Diferenciamos visualmente entre datos oficiales confirmados y reportes
          ciudadanos sin verificar. Cada dato cita su fuente original.
        </p>
      </div>
    ),
  },
  {
    eyebrow: "Participa",
    title: "Tu reporte ayuda",
    icon: AlertTriangle,
    iconBg: "bg-green-500/10",
    iconFg: "text-green-400",
    body: (
      <div className="space-y-2">
        <p>
          Si tu colonia tiene problemas de agua, repórtalo con el botón{" "}
          <strong>&quot;Reportar un problema&quot;</strong>. Tu reporte es
          anónimo y será revisado antes de publicarse.
        </p>
        <p>
          Para recomendaciones de salud, consulta a la{" "}
          <strong>Secretaría de Salud Jalisco / COPRISJAL</strong>.
        </p>
      </div>
    ),
  },
];

export function LegalDisclaimer() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!hasAccepted()) setOpen(true);
  }, []);

  const accept = useCallback(() => {
    setAccepted();
    setOpen(false);
  }, []);

  const next = useCallback(() => {
    setStep((s) => (s < TOTAL_SLIDES - 1 ? s + 1 : s));
  }, []);

  const back = useCallback(() => {
    setStep((s) => (s > 0 ? s - 1 : s));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (step === TOTAL_SLIDES - 1) accept();
        else next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step, next, back, accept]);

  const slide = SLIDES[step];
  const Icon = slide.icon;
  const isLast = step === TOTAL_SLIDES - 1;

  return (
    <Dialog open={open} onOpenChange={() => accept()}>
      <DialogContent className="max-w-md">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          {/* Icono */}
          <div className={`rounded-full ${slide.iconBg} p-4`}>
            <Icon className={`h-8 w-8 ${slide.iconFg}`} />
          </div>

          {/* Contenido */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {slide.eyebrow}
            </p>
            <DialogTitle>{slide.title}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-left">
              {slide.body}
            </DialogDescription>
          </div>

          {/* Dots */}
          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          {/* Botones */}
          <div className="flex gap-3 w-full">
            {step > 0 && (
              <Button variant="outline" onClick={back} className="flex-1">
                Atrás
              </Button>
            )}
            {isLast ? (
              <Button onClick={accept} className="flex-1 gap-1.5">
                Entendido
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={next} className="flex-1 gap-1.5">
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
