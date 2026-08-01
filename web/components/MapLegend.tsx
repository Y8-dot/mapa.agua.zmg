export function MapLegend() {
  return (
    <div className="absolute bottom-10 left-4 z-10 rounded-lg border bg-card/90 backdrop-blur px-3 py-2 shadow-lg md:bottom-6">
      <div className="text-xs font-semibold text-muted-foreground mb-1.5">
        Reportes por colonia
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-4 w-4 rounded-sm border"
            style={{
              backgroundColor: "rgba(234,179,8,0.3)",
              borderColor: "rgba(234,179,8,0.5)",
            }}
          />
          <span className="text-xs">1</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-4 w-4 rounded-sm border"
            style={{
              backgroundColor: "rgba(249,115,22,0.32)",
              borderColor: "rgba(249,115,22,0.5)",
            }}
          />
          <span className="text-xs">2</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-4 w-4 rounded-sm border"
            style={{
              backgroundColor: "rgba(220,38,38,0.38)",
              borderColor: "rgba(220,38,38,0.55)",
            }}
          />
          <span className="text-xs">3+</span>
        </div>
        <div className="w-px h-4 bg-border mx-1" />
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-4 w-4 rounded-sm border"
            style={{
              backgroundColor: "rgba(100,116,139,0.12)",
              borderColor: "rgba(148,163,184,0.3)",
            }}
          />
          <span className="text-xs">Sin datos</span>
        </div>
      </div>
    </div>
  );
}
