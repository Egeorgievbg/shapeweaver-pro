import { Layers3, ScanLine, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function PackagingHeroVisual({ label }: { label: string }) {
  const { locale } = useI18n();
  const liveGeometry = locale === "bg" ? "активна геометрия" : "live geometry";
  const realtime = locale === "bg" ? "В РЕАЛНО ВРЕМЕ" : "REAL-TIME";
  const dieline = locale === "bg" ? "ДИЛАЙН" : "DIELINE";

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-panel-border bg-viewport shadow-2xl shadow-black/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(201,163,74,.18),transparent_38%)]" />
      <div
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-panel-border bg-panel/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-success" /> {liveGeometry}
      </div>
      <div className="absolute right-5 top-5 flex gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-panel-border bg-panel/80 text-gold">
          <Layers3 className="h-4 w-4" />
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-panel-border bg-panel/80 text-gold">
          <ScanLine className="h-4 w-4" />
        </span>
      </div>

      <svg className="absolute inset-x-[8%] top-[17%] h-[58%] w-[84%]" viewBox="0 0 520 310" aria-hidden="true">
        <defs>
          <linearGradient id="top" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#f0cb79" />
            <stop offset="1" stopColor="#c38d35" />
          </linearGradient>
          <linearGradient id="left" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#b67f2e" />
            <stop offset="1" stopColor="#754a18" />
          </linearGradient>
          <linearGradient id="right" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#d8a74d" />
            <stop offset="1" stopColor="#946322" />
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="0" dy="18" stdDeviation="14" floodOpacity=".35" />
          </filter>
        </defs>
        <ellipse cx="230" cy="257" rx="155" ry="28" fill="#000" opacity=".25" />
        <g filter="url(#shadow)">
          <path d="M76 116 226 58l150 57-150 64Z" fill="url(#top)" stroke="#f4d38e" strokeWidth="2" />
          <path d="m76 116 150 63v96L76 217Z" fill="url(#left)" stroke="#c18b37" strokeWidth="2" />
          <path d="m226 179 150-64v101l-150 59Z" fill="url(#right)" stroke="#edc56f" strokeWidth="2" />
          <path d="M119 128 226 87l107 40-107 45Z" fill="none" stroke="#5e3c13" strokeOpacity=".48" strokeWidth="2" />
          <path d="M137 145h72M137 157h100" stroke="#5e3c13" strokeOpacity=".48" strokeWidth="4" strokeLinecap="round" />
          <text x="137" y="137" fill="#4e3212" fontSize="11" fontWeight="700" letterSpacing="3">GPTSBOXES</text>
        </g>
        <g transform="translate(338 50)" opacity=".92">
          <path d="M0 44h52v42H0zM52 44h56v42H52zM108 44h51v42h-51z" fill="none" stroke="#d7a94f" strokeWidth="2" />
          <path d="M52 13h56v31H52zM52 86h56v33H52z" fill="none" stroke="#d7a94f" strokeWidth="2" />
          <path d="M52 44v42M108 44v42" stroke="#7dd3a8" strokeWidth="1.5" strokeDasharray="5 4" />
        </g>
      </svg>

      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <div className="mt-2 flex gap-1.5">
            {["3D", dieline, "PBR"].map((item) => (
              <span key={item} className="rounded-md border border-panel-border bg-panel/80 px-2 py-1 font-mono text-[8px] text-muted-foreground">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-gold">
          <Sparkles className="h-4 w-4" />
          <span className="text-[10px] font-semibold">{realtime}</span>
        </div>
      </div>
    </div>
  );
}
