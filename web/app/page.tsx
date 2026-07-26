import dynamic from "next/dynamic";

const Map = dynamic(() => import("@/components/Map").then((m) => m.Map), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-300">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Cargando mapa…</p>
      </div>
    </div>
  ),
});

export default function HomePage() {
  return <Map />;
}
