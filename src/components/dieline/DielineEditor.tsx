import { useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Focus, Hand, Minus, Plus, Ruler, ScanLine } from "lucide-react";
import { useConfiguratorStore } from "@/stores/configurator";
import { cn } from "@/lib/utils";

export function DielineEditor() {
  const model = useConfiguratorStore((s) => s.productModel);
  const selectedPanelId = useConfiguratorStore((s) => s.selectedPanelId);
  const selectPanel = useConfiguratorStore((s) => s.selectPanel);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showCuts, setShowCuts] = useState(true);
  const [showFolds, setShowFolds] = useState(true);
  const [showBleed, setShowBleed] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const dieline = model?.dieline;
  const selectedPanel = model?.panels.find((panel) => panel.id === selectedPanelId);
  const viewBox = useMemo(() => {
    if (!dieline) return "0 0 600 600";
    const pad = Math.max(20, Math.max(dieline.totalX, dieline.totalY) * 0.04);
    return `${-pad} ${-pad} ${dieline.totalX + pad * 2} ${dieline.totalY + pad * 2}`;
  }, [dieline]);

  if (!model) return null;
  if (!dieline) {
    return (
      <div className="flex h-full items-center justify-center bg-viewport px-6 text-center">
        <div className="max-w-sm">
          <ScanLine className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold">No production dieline available</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            The 3D fallback remains available, but this structure has no validated cut and fold paths.
          </p>
        </div>
      </div>
    );
  }

  const fit = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const onWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    setZoom((current) => Math.max(0.2, Math.min(8, current * (event.deltaY < 0 ? 1.1 : 0.9))));
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 1 && !event.altKey && !event.shiftKey) return;
    dragRef.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPan({ x: event.clientX - dragRef.current.x, y: event.clientY - dragRef.current.y });
  };

  const stopDrag = () => {
    dragRef.current = null;
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-viewport">
      <div className="pointer-events-none absolute inset-x-0 top-14 z-10 flex justify-center px-3 md:top-3">
        <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-xl border border-panel-border bg-panel/92 p-1.5 shadow-lg backdrop-blur-xl">
          <button
            onClick={() => setZoom((value) => Math.min(8, value * 1.2))}
            className="studio-icon-button"
            aria-label="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom((value) => Math.max(0.2, value / 1.2))}
            className="studio-icon-button"
            aria-label="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-12 text-center font-mono text-[10px] text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={fit} className="studio-secondary-button px-2.5 py-1.5 text-[10px]">
            <Focus className="h-3.5 w-3.5" /> Fit
          </button>
          <span className="mx-1 h-5 w-px bg-panel-border" />
          <LayerToggle
            label="Cut"
            active={showCuts}
            onClick={() => setShowCuts((value) => !value)}
            color="var(--color-die-cut)"
          />
          <LayerToggle
            label="Fold"
            active={showFolds}
            onClick={() => setShowFolds((value) => !value)}
            color="var(--color-die-fold)"
            dashed
          />
          <LayerToggle
            label="Bleed"
            active={showBleed}
            onClick={() => setShowBleed((value) => !value)}
            color="var(--color-die-bleed)"
            dashed
          />
        </div>
      </div>

      <div className="absolute left-3 top-3 z-10 hidden rounded-lg border border-panel-border bg-panel/90 px-3 py-2 shadow-sm backdrop-blur md:block">
        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Dieline canvas</p>
        <p className="mt-1 font-mono text-[10px]">
          {dieline.totalX.toFixed(1)} × {dieline.totalY.toFixed(1)} mm
        </p>
      </div>

      {selectedPanel && (
        <div className="absolute right-3 top-3 z-10 hidden max-w-56 rounded-lg border border-gold/25 bg-panel/90 px-3 py-2 shadow-sm backdrop-blur md:block">
          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-gold">Selected panel</p>
          <p className="mt-1 truncate text-xs font-semibold">{selectedPanel.name}</p>
          <p className="mt-1 font-mono text-[9px] text-muted-foreground">
            {selectedPanel.bbox.w.toFixed(1)} × {selectedPanel.bbox.h.toFixed(1)} mm
          </p>
        </div>
      )}

      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className={cn("h-full w-full select-none", dragRef.current ? "cursor-grabbing" : "cursor-crosshair")}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onPointerLeave={stopDrag}
        onClick={() => selectPanel(null)}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center" }}
      >
        {showBleed && dieline.bleedsPath && (
          <path
            d={dieline.bleedsPath}
            fill="none"
            stroke="var(--color-die-bleed)"
            strokeWidth={0.8}
            strokeDasharray="4 2"
            opacity={0.8}
          />
        )}

        {dieline.faces.map((panel) => {
          const selected = selectedPanelId === panel.id;
          return (
            <path
              key={panel.id}
              d={panel.svgPath}
              fill={
                selected
                  ? "color-mix(in oklch, var(--color-gold) 32%, transparent)"
                  : "color-mix(in oklch, var(--color-panel) 90%, transparent)"
              }
              stroke={selected ? "var(--color-gold)" : "var(--color-panel-border)"}
              strokeWidth={selected ? 1 : 0.4}
              className="cursor-pointer transition-colors hover:fill-[color-mix(in_oklch,var(--color-gold)_18%,transparent)]"
              onClick={(event) => {
                event.stopPropagation();
                selectPanel(selected ? null : panel.id);
              }}
            />
          );
        })}

        {showCuts && dieline.cutsPath && (
          <path
            d={dieline.cutsPath}
            fill="none"
            stroke="var(--color-die-cut)"
            strokeWidth={1.15}
            strokeLinejoin="round"
          />
        )}

        {showFolds &&
          dieline.folds.map((fold) => (
            <line
              key={fold.id}
              x1={fold.from[0]}
              y1={fold.from[1]}
              x2={fold.to[0]}
              y2={fold.to[1]}
              stroke="var(--color-die-fold)"
              strokeWidth={0.9}
              strokeDasharray="3 2"
            />
          ))}

        {showLabels &&
          dieline.faces.map((panel) => (
            <text
              key={`label-${panel.id}`}
              x={panel.centroid.x}
              y={panel.centroid.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none select-none"
              style={{
                fontSize: Math.max(6, Math.min(panel.bbox.w, panel.bbox.h) / 8),
                fill: "var(--color-muted-foreground)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {panel.name}
            </text>
          ))}

        {showDimensions &&
          dieline.sizeArrows.map((size, index) => (
            <g key={index} stroke="var(--color-muted-foreground)" strokeWidth={0.4} fill="none">
              <line x1={size.p1.x} y1={size.p1.y} x2={size.p2.x} y2={size.p2.y} />
              {size.tpointer && (
                <text
                  x={size.tpointer.x}
                  y={size.tpointer.y}
                  textAnchor="middle"
                  style={{
                    fontSize: 8,
                    fill: "var(--color-muted-foreground)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {size.label}
                </text>
              )}
            </g>
          ))}
      </svg>

      <div className="absolute bottom-20 left-3 z-10 hidden rounded-xl border border-panel-border bg-panel/92 p-2 shadow-lg backdrop-blur md:block">
        <ToggleButton
          icon={showLabels ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          label="Panel labels"
          active={showLabels}
          onClick={() => setShowLabels((value) => !value)}
        />
        <ToggleButton
          icon={<Ruler className="h-3.5 w-3.5" />}
          label="Dimensions"
          active={showDimensions}
          onClick={() => setShowDimensions((value) => !value)}
        />
        <div className="mt-1 flex items-center gap-2 border-t border-panel-border px-2 pt-2 text-[9px] text-muted-foreground">
          <Hand className="h-3 w-3" /> Shift or Alt + drag to pan
        </div>
      </div>

      <div className="absolute bottom-20 right-3 z-10 hidden items-center gap-3 rounded-lg border border-panel-border bg-panel/92 px-3 py-2 text-[10px] shadow-sm backdrop-blur lg:flex">
        <Legend color="var(--color-die-cut)" label="Cut" />
        <Legend color="var(--color-die-fold)" label="Fold" dashed />
        <Legend color="var(--color-die-bleed)" label="Bleed" dashed />
      </div>
    </div>
  );
}

function LayerToggle({
  label,
  active,
  onClick,
  color,
  dashed,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
  dashed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-medium sm:inline-flex",
        active ? "bg-accent text-foreground" : "text-muted-foreground opacity-55",
      )}
    >
      <span
        className="h-0.5 w-3"
        style={{ background: dashed ? undefined : color, borderTop: dashed ? `2px dashed ${color}` : undefined }}
      />
      {label}
    </button>
  );
}

function ToggleButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px]",
        active ? "text-foreground" : "text-muted-foreground opacity-55",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-0.5 w-4"
        style={{ background: dashed ? undefined : color, borderTop: dashed ? `2px dashed ${color}` : undefined }}
      />
      <span className="font-mono text-[9px] uppercase text-muted-foreground">{label}</span>
    </span>
  );
}
