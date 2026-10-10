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
  created_at?: string;
}

export const TODAS_CATEGORIAS: CategoriaAgua[] = [
  "fecal_bacteriologico",
  "metales_pesados",
  "sarro",
  "color_anormal",
  "olor",
  "sedimentos",
  "desabasto",
  "otro",
];

export const TODAS_FUENTES: FuenteTipo[] = [
  "oficial",
  "academico_ong",
  "prensa",
  "ciudadano_verificado",
  "ciudadano_sin_verificar",
];

export const MUNICIPIOS_ZMG: MunicipioZMG[] = [
  "Guadalajara",
  "Zapopan",
  "Tlaquepaque",
  "Tonalá",
  "El Salto",
  "Tlajomulco",
];

/** Quita acentos, espacios extra y mayúsculas para comparar nombres. */
export function normalizarTexto(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

/** Clave única colonia+municipio, insensible a acentos y mayúsculas. */
export function normalizarKey(colonia: string, municipio: string): string {
  return `${normalizarTexto(colonia)}|${normalizarTexto(municipio)}`;
}

/** Devuelve el municipio con su escritura oficial ("Tonala" → "Tonalá"), o null. */
export function normalizarMunicipio(m: string): MunicipioZMG | null {
  const n = normalizarTexto(m);
  return MUNICIPIOS_ZMG.find((x) => normalizarTexto(x) === n) ?? null;
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
