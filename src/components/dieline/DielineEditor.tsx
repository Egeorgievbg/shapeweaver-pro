import { useMemo, useRef, useState } from "react";
import { useConfiguratorStore } from "@/stores/configurator";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * SVG-based dieline editor.
 * - Cut lines (red solid)
 * - Fold lines (blue dashed)
 * - Bleeds (magenta)
 * - Panel labels
 * - Size arrows
 * - Panel click → selects panel in configurator store
 */
export function DielineEditor() {
  const model = useConfiguratorStore((s) => s.productModel);
  const selectedPanelId = useConfiguratorStore((s) => s.selectedPanelId);
  const selectPanel = useConfiguratorStore((s) => s.selectPanel);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showBleed, setShowBleed] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const { t } = useI18n();

  const dieline = model?.dieline;
  const viewBox = useMemo(() => {
    if (!dieline) return "0 0 600 600";
    const pad = 20;
    return `${-pad} ${-pad} ${dieline.totalX + pad * 2} ${dieline.totalY + pad * 2}`;
  }, [dieline]);

  if (!model) return null;
  if (!dieline) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t("dieline.noData")}
      </div>
    );
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.2, Math.min(6, z * (e.deltaY < 0 ? 1.1 : 0.9))));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setPan({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  };
  const onMouseUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-viewport">
      {/* Toolbar */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
        <div className="panel-surface flex items-center gap-1 rounded-md p-1">
          <button
            onClick={() => setZoom((z) => z * 1.2)}
            className="rounded px-2 py-1 text-xs hover:bg-accent"
          >
            +
          </button>
          <span className="min-w-12 text-center font-mono text-xs">{(zoom * 100).toFixed(0)}%</span>
          <button
            onClick={() => setZoom((z) => z / 1.2)}
            className="rounded px-2 py-1 text-xs hover:bg-accent"
          >
            −
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="rounded px-2 py-1 text-xs hover:bg-accent"
          >
            {t("dieline.fit")}
          </button>
        </div>
        <div className="panel-surface flex flex-col gap-1 rounded-md p-2 text-xs">
          <ToggleRow
            label={t("dieline.bleed")}
            value={showBleed}
            onChange={setShowBleed}
            color="var(--color-die-bleed)"
          />
          <ToggleRow label={t("dieline.labels")} value={showLabels} onChange={setShowLabels} />
          <ToggleRow
            label={t("dieline.dimensions")}
            value={showDimensions}
            onChange={setShowDimensions}
          />
        </div>
      </div>
      <p className="absolute right-3 top-3 z-10 rounded bg-surface/80 px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground">
        {t("dieline.hint")}
      </p>

      <svg
        ref={svgRef}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full cursor-crosshair"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center",
        }}
      >
        {/* Bleed */}
        {showBleed && dieline.bleedsPath && (
          <path
            d={dieline.bleedsPath}
            fill="none"
            stroke="var(--color-die-bleed)"
            strokeWidth={0.8}
            strokeDasharray="4 2"
            opacity={0.7}
          />
        )}

        {/* Panels (fill) */}
        {dieline.faces.map((panel) => {
          const isSelected = selectedPanelId === panel.id;
          return (
            <path
              key={panel.id}
              d={panel.svgPath}
              fill={
                isSelected
                  ? "color-mix(in oklch, var(--color-gold) 35%, transparent)"
                  : "color-mix(in oklch, var(--color-panel) 90%, transparent)"
              }
              stroke="var(--color-panel-border)"
              strokeWidth={0.4}
              className="cursor-pointer transition-colors hover:fill-[color-mix(in_oklch,var(--color-gold)_20%,transparent)]"
              onClick={(e) => {
                e.stopPropagation();
                selectPanel(isSelected ? null : panel.id);
              }}
            />
          );
        })}

        {/* Cut outlines */}
        {dieline.cutsPath && (
          <path
            d={dieline.cutsPath}
            fill="none"
            stroke="var(--color-die-cut)"
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        )}

        {/* Fold lines */}
        {dieline.folds.map((f) => (
          <line
            key={f.id}
            x1={f.from[0]}
            y1={f.from[1]}
            x2={f.to[0]}
            y2={f.to[1]}
            stroke="var(--color-die-fold)"
            strokeWidth={0.9}
            strokeDasharray="3 2"
          />
        ))}

        {/* Panel labels */}
        {showLabels &&
          dieline.faces.map((panel) => (
            <text
              key={`lbl-${panel.id}`}
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

        {/* Dimension arrows */}
        {showDimensions &&
          dieline.sizeArrows.map((s, i) => (
            <g key={i} stroke="var(--color-muted-foreground)" strokeWidth={0.4} fill="none">
              <line x1={s.p1.x} y1={s.p1.y} x2={s.p2.x} y2={s.p2.y} />
              {s.tpointer && (
                <text
                  x={s.tpointer.x}
                  y={s.tpointer.y}
                  textAnchor="middle"
                  style={{
                    fontSize: 8,
                    fill: "var(--color-muted-foreground)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {s.label}
                </text>
              )}
            </g>
          ))}
      </svg>

      {/* Legend */}
      <div className="panel-surface absolute bottom-3 right-3 z-10 flex items-center gap-3 rounded-md px-3 py-1.5 text-xs">
        <Legend swatch="var(--color-die-cut)" label={t("dieline.cut")} />
        <Legend swatch="var(--color-die-fold)" label={t("dieline.fold")} dashed />
        <Legend swatch="var(--color-die-bleed)" label={t("dieline.bleed")} dashed />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <label className={cn("flex items-center gap-2", !value && "text-muted-foreground")}>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-gold"
      />
      {color && <span className="h-2 w-2 rounded-sm" style={{ background: color }} />}
      {label}
    </label>
  );
}

function Legend({ swatch, label, dashed }: { swatch: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-0.5 w-4"
        style={{
          background: dashed ? undefined : swatch,
          borderTop: dashed ? `2px dashed ${swatch}` : undefined,
        }}
      />
      <span className="font-mono text-[10px] uppercase">{label}</span>
    </span>
  );
}
