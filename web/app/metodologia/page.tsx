import Link from "next/link";

export default function MetodologiaPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container max-w-3xl py-16 space-y-8">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Volver al mapa
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Metodología</h1>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <h2 className="text-xl font-semibold text-foreground">
            ¿Cómo se recolectan los datos?
          </h2>
          <p>
            Los datos provienen de cuatro canales, todos convergiendo en el
            mismo modelo de datos para que el mapa crezca de forma consistente:
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6">
            1. Curaduría manual de fuentes públicas
          </h3>
          <p>
            El equipo del proyecto revisa periódicamente notas periodísticas,
            informes de ONG (IMDEC, ITESO), documentos oficiales (CEDHJ) y
            extrae: colonia mencionada, tipo de problema, fecha, fuente y URL.
            Cada dato se carga manualmente al dataset con atribución a la fuente
            original.
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6">
            2. Reportes ciudadanos
          </h3>
          <p>
            Cualquier persona puede enviar un reporte anónimo a través del
            formulario del sitio. Los reportes ciudadanos pasan por una cola de
            moderación antes de aparecer en el mapa público, y se etiquetan como
            &quot;ciudadano verificado&quot; o &quot;ciudadano sin
            verificar&quot; según corresponda.
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6">
            3. Solicitudes de transparencia
          </h3>
          <p>
            Periódicamente se presentan solicitudes de transparencia al SIAPA
            (vía Plataforma Nacional de Transparencia / ITEI Jalisco) pidiendo
            el desglose de reportes de calidad del agua por colonia. Los
            resultados se incorporan al mapa con atribución.
          </p>

          <h3 className="text-lg font-medium text-foreground mt-6">
            4. Colaboración con organizaciones
          </h3>
          <p>
            Buscamos establecer alianzas con organizaciones como IMDEC para
            compartir datos agregados, evitando duplicar esfuerzos y aumentando
            la cobertura del mapa.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">
            ¿Cómo se clasifican los problemas?
          </h2>
          <p>Usamos 8 categorías basadas en los tipos de problemas documentados en la crisis de 2026:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Contaminación fecal / bacteriológica</strong> — coliformes, E. coli, cloro residual insuficiente</li>
            <li><strong>Metales pesados / químicos</strong> — plomo, mercurio, aluminio, cobre, hierro, fluoruros, nitratos/nitritos</li>
            <li><strong>Sarro / dureza del agua</strong></li>
            <li><strong>Color anormal</strong> — café, amarillo, verde, negro</li>
            <li><strong>Mal olor</strong></li>
            <li><strong>Sedimentos / turbidez</strong></li>
            <li><strong>Desabasto / baja presión</strong></li>
            <li><strong>Otro / sin especificar</strong></li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8">
            ¿Cómo se presenta la severidad?
          </h2>
          <p>
            Cada colonia se colorea según el número de reportes acumulados (1 =
            amarillo, 2 = naranja, 3+ = rojo). Los reportes más antiguos de 6
            meses pesan menos en el color mostrado, para reflejar la actualidad
            del problema. Un sello de &quot;Actualizado por última vez&quot;
            indica la fecha del dato más reciente.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8">
            Limitaciones
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Los datos iniciales son una muestra semilla (~27 colonias
              identificadas en fuentes públicas). No cubren todas las colonias
              con reportes (se estiman ~200-390).
            </li>
            <li>
              Las coordenadas de las colonias son aproximadas (centroides). Se
              recomienda integrar geometrías oficiales del IIEG/INEGI para
              polígonos precisos.
            </li>
            <li>
              La ausencia de reportes en una colonia no significa ausencia de
              problema — puede ser que nadie haya reportado aún.
            </li>
            <li>
              Este sitio no realiza análisis de laboratorio ni verifica la
              veracidad de reportes ciudadanos más allá de la moderación básica.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
