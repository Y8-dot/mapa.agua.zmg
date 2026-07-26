/** Tipos de problema de calidad del agua */
export type CategoriaAgua =
  | "fecal_bacteriologico"
  | "metales_pesados"
  | "sarro"
  | "color_anormal"
  | "olor"
  | "sedimentos"
  | "desabasto"
  | "otro";

/** Fuente del reporte */
export type FuenteTipo =
  | "oficial"
  | "academico_ong"
  | "prensa"
  | "ciudadano_verificado"
  | "ciudadano_sin_verificar";

/** Municipio de la ZMG */
export type MunicipioZMG =
  | "Guadalajara"
  | "Zapopan"
  | "Tlaquepaque"
  | "Tonalá"
  | "El Salto"
  | "Tlajomulco";

/** Un reporte de calidad del agua */
export interface Reporte {
  id: string;
  colonia: string;
  municipio: MunicipioZMG;
  categorias: CategoriaAgua[];
  fuente_tipo: FuenteTipo;
  fuente_nombre: string;
  fuente_url?: string;
  descripcion: string;
  fecha_reporte: string;
  fecha_carga: string;
  foto_url?: string;
  estado_moderacion?: "pendiente" | "aprobado" | "rechazado";
  nivel_confianza?: "alta" | "media" | "baja";
}

/** Etiquetas para categorías */
export const CATEGORIA_LABELS: Record<CategoriaAgua, string> = {
  fecal_bacteriologico: "Contaminación fecal / bacteriológica",
  metales_pesados: "Metales pesados / químicos",
  sarro: "Sarro / dureza del agua",
  color_anormal: "Color anormal",
  olor: "Mal olor",
  sedimentos: "Sedimentos / turbidez",
  desabasto: "Desabasto / baja presión",
  otro: "Otro / sin especificar",
};

/** Colores para categorías */
export const CATEGORIA_COLORS: Record<CategoriaAgua, string> = {
  fecal_bacteriologico: "#dc2626",
  metales_pesados: "#f97316",
  sarro: "#eab308",
  color_anormal: "#a855f7",
  olor: "#6366f1",
  sedimentos: "#06b6d4",
  desabasto: "#8b5cf6",
  otro: "#64748b",
};

/** Etiquetas para fuente */
export const FUENTE_LABELS: Record<FuenteTipo, string> = {
  oficial: "Oficial (SIAPA, COPRISJAL, CEDHJ)",
  academico_ong: "Académico / ONG (ITESO, IMDEC)",
  prensa: "Prensa",
  ciudadano_verificado: "Ciudadano verificado",
  ciudadano_sin_verificar: "Ciudadano sin verificar",
};

/** Color de severidad basado en número de reportes (0-5+) */
export function severidadColor(count: number): string {
  if (count === 0) return "#64748b";
  if (count === 1) return "#eab308";
  if (count === 2) return "#f97316";
  if (count === 3) return "#ea580c";
  return "#dc2626";
}

/** Color de severidad basado en categoría más grave */
export function severidadPorCategoria(cats: CategoriaAgua[]): string {
  if (cats.includes("fecal_bacteriologico")) return "#dc2626";
  if (cats.includes("metales_pesados")) return "#f97316";
  if (cats.includes("desabasto")) return "#8b5cf6";
  if (cats.includes("sedimentos")) return "#06b6d4";
  if (cats.includes("color_anormal")) return "#a855f7";
  if (cats.includes("olor")) return "#6366f1";
  if (cats.includes("sarro")) return "#eab308";
  return "#64748b";
}
