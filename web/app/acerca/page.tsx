import Link from "next/link";

export default function AcercaPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container max-w-3xl py-16 space-y-8">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Volver al mapa
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          Acerca del proyecto
        </h1>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            El <strong>Mapa Ciudadano de Calidad del Agua — ZMG</strong> es una
            herramienta de transparencia ciudadana que centraliza y visibiliza
            reportes sobre la calidad del agua potable en la Zona Metropolitana
            de Guadalajara (Guadalajara, Zapopan, San Pedro Tlaquepaque, Tonalá,
            con extensión a El Salto y Tlajomulco).
          </p>
          <p>
            Desde inicios de 2026, la ZMG vive una crisis de calidad del agua
            suministrada por el SIAPA. Los reportes ciudadanos describen agua
            con color anormal, mal olor, sedimentos y presencia de metales
            pesados y bacterias coliformes. Sin embargo, no existe un mapa
            público que centralice esta información por colonia.
          </p>
          <h2 className="text-xl font-semibold text-foreground mt-8">
            ¿Por qué este mapa?
          </h2>
          <p>
            El SIAPA no publica sus reportes de forma abierta y geolocalizada.
            Organizaciones como IMDEC recolectan denuncias ciudadanas pero no
            tienen visualización geoespacial pública. Este proyecto llena ese
            vacío: cualquier persona puede ver qué colonias tienen problemas
            reportados, de qué tipo, desde qué fuente, y agregar su propio
            reporte.
          </p>
          <h2 className="text-xl font-semibold text-foreground mt-8">
            ¿Quién está detrás?
          </h2>
          <p>
            Este es un proyecto ciudadano independiente. Los datos provienen de:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Fuentes periodísticas:</strong> Milenio, El Informador,
              Proceso, UDGTV, Telediario, LABCSA.
            </li>
            <li>
              <strong>Fuentes académicas y ONG:</strong> IMDEC, ITESO,
              Resistencia Civil por el Valle.
            </li>
            <li>
              <strong>Fuentes oficiales:</strong> CEDHJ (Recomendación 10/2026),
              COPRISJAL, SIAPA (vía solicitudes de transparencia públicas).
            </li>
            <li>
              <strong>Reportes ciudadanos:</strong> Enviados a través de este
              mismo sitio.
            </li>
          </ul>
          <h2 className="text-xl font-semibold text-foreground mt-8">
            Aviso importante
          </h2>
          <p>
            Este mapa <strong>no reemplaza análisis de laboratorio</strong> ni
            constituye un diagnóstico de salud. Los datos se presentan con su
            fuente original para que cualquier persona pueda verificarlos. Para
            recomendaciones de salud, consulta a la Secretaría de Salud Jalisco
            / COPRISJAL.
          </p>
        </div>
      </div>
    </div>
  );
}
