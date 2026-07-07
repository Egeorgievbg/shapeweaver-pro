import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Save,
  Download,
  Send,
  Boxes,
  Palette,
  Image as ImageIcon,
  Layers,
  FileText,
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  Camera,
  PanelRight,
  Grid3x3,
  Sun,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import {
  useConfiguratorStore,
  type ViewMode,
  type CameraPreset,
  type ScenePreset,
} from "@/stores/configurator";
import { Viewport3D } from "@/components/viewer/Viewport3D";
import { DielineEditor } from "@/components/dieline/DielineEditor";
import { MATERIAL_PRESETS, getPreset } from "@/components/materials/material-presets";
import { validateArtworkFile, fileToDataUrl } from "@/components/artwork/artwork-utils";
import { savedConfigs } from "@/stores/persistence";
import { ExportDialog } from "@/components/export/ExportDialog";
import { QuoteDialog } from "@/components/quote/QuoteDialog";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LeftTab = "models" | "artwork" | "layers" | "materials" | "dieline" | "saved";

export function StudioWorkspace() {
  const model = useConfiguratorStore((s) => s.productModel);
  const viewMode = useConfiguratorStore((s) => s.viewMode);
  const setViewMode = useConfiguratorStore((s) => s.setViewMode);
  const foldProgress = useConfiguratorStore((s) => s.foldProgress);
  const setFoldProgress = useConfiguratorStore((s) => s.setFoldProgress);
  const undo = useConfiguratorStore((s) => s.undo);
  const redo = useConfiguratorStore((s) => s.redo);
  const isDirty = useConfiguratorStore((s) => s.isDirty);
  const exportConfiguration = useConfiguratorStore((s) => s.exportConfiguration);
  const [leftTab, setLeftTab] = useState<LeftTab>("models");
  const [exportOpen, setExportOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const { t } = useI18n();

  if (!model) return null;

  const handleSave = () => {
    const payload = exportConfiguration();
    savedConfigs.upsert({
      id: `${model.sourceId}-${Date.now()}`,
      name: model.name,
      updatedAt: new Date().toISOString(),
      payload,
    });
    toast.success(t("toast.saved"));
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full flex-col overflow-hidden bg-surface">
      {/* Top toolbar */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-panel-border bg-panel px-3">
        <Link
          to="/library"
          className="flex items-center gap-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{model.name}</p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">
            source-{model.sourceId} · {model.geometryStrategy} · {model.panels.length}p /{" "}
            {model.folds.length}f
            {isDirty && <span className="ml-2 text-warning">{t("studio.toolbar.unsaved")}</span>}
          </p>
        </div>
        <ToolbarBtn icon={<Undo2 className="h-4 w-4" />} label={t("action.undo")} onClick={undo} />
        <ToolbarBtn icon={<Redo2 className="h-4 w-4" />} label={t("action.redo")} onClick={redo} />
        <div className="mx-1 h-6 w-px bg-panel-border" />
        <div className="flex overflow-hidden rounded-md border border-input">
          {(["3d", "2d", "split"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={cn(
                "px-2.5 py-1 text-xs uppercase tracking-wider",
                viewMode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="mx-1 h-6 w-px bg-panel-border" />
        <ToolbarBtn
          icon={<Save className="h-4 w-4" />}
          label={t("action.save")}
          onClick={handleSave}
        />
        <ToolbarBtn
          icon={<Download className="h-4 w-4" />}
          label={t("action.export")}
          onClick={() => setExportOpen(true)}
          highlighted
        />
        <button
          onClick={() => setQuoteOpen(true)}
          className="ml-1 inline-flex items-center gap-1.5 rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-gold-foreground hover:opacity-90"
        >
          <Send className="h-3.5 w-3.5" /> {t("studio.toolbar.quote")}
        </button>
      </div>

      {/* Main split */}
      <div className="flex min-h-0 flex-1">
        {/* Left rail */}
        <div className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-panel-border bg-panel py-2 md:flex">
          {(
            [
              ["models", Boxes, "tab.models"],
              ["artwork", ImageIcon, "tab.artwork"],
              ["layers", Layers, "tab.layers"],
              ["materials", Palette, "tab.materials"],
              ["dieline", FileText, "tab.dieline"],
              ["saved", Save, "tab.saved"],
            ] as const
          ).map(([k, Icon, lbl]) => (
            <button
              key={k}
              onClick={() => setLeftTab(k)}
              title={t(lbl)}
              className={cn(
                "flex h-10 w-10 flex-col items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                leftTab === k && "bg-accent text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="mt-0.5 text-[9px] font-medium leading-none">{t(lbl)}</span>
            </button>
          ))}
        </div>

        {/* Left panel content */}
        <div className="hidden w-72 shrink-0 overflow-y-auto border-r border-panel-border bg-panel md:block">
          <LeftPanelContent tab={leftTab} />
        </div>

        {/* Viewport / dieline */}
        <div className="relative min-w-0 flex-1">
          {viewMode === "3d" && <Viewport3D />}
          {viewMode === "2d" && <DielineEditor />}
          {viewMode === "split" && (
            <div className="grid h-full grid-cols-2 divide-x divide-panel-border">
              <Viewport3D />
              <DielineEditor />
            </div>
          )}

          {/* Bottom fold timeline */}
          <div className="pointer-events-auto absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-panel-border bg-panel/90 px-4 py-2 shadow backdrop-blur">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="rounded-full bg-primary p-1.5 text-primary-foreground"
              aria-label="Play fold"
            >
              {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={foldProgress}
              onChange={(e) => setFoldProgress(parseFloat(e.target.value))}
              className="w-48 accent-gold"
            />
            <span className="w-10 font-mono text-[10px] text-muted-foreground">
              {(foldProgress * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setFoldProgress(0)}
              className="rounded-full p-1 text-muted-foreground hover:bg-accent"
              aria-label="Reset fold"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          <FoldTicker playing={playing} />
        </div>

        {/* Right inspector */}
        <div className="hidden w-80 shrink-0 overflow-y-auto border-l border-panel-border bg-panel lg:block">
          <RightInspector />
        </div>
      </div>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <QuoteDialog open={quoteOpen} onOpenChange={setQuoteOpen} />
    </div>
  );
}

/* ---------------- Small internal components ---------------- */

function FoldTicker({ playing }: { playing: boolean }) {
  const foldProgress = useConfiguratorStore((s) => s.foldProgress);
  const setFoldProgress = useConfiguratorStore((s) => s.setFoldProgress);
  useState(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (playing) {
        const next = (foldProgress + dt * 0.4) % 1;
        setFoldProgress(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
  return null;
}

function ToolbarBtn({
  icon,
  label,
  onClick,
  highlighted,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  highlighted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-md p-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground",
        highlighted && "text-foreground",
      )}
    >
      {icon}
    </button>
  );
}

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-panel-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        {title}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </div>
  );
}

function LeftPanelContent({ tab }: { tab: LeftTab }) {
  if (tab === "artwork") return <ArtworkTab />;
  if (tab === "materials") return <MaterialsTab />;
  if (tab === "layers") return <LayersTab />;
  if (tab === "dieline") return <DielineTab />;
  if (tab === "saved") return <SavedTab />;
  return <ModelsTab />;
}

function ModelsTab() {
  const model = useConfiguratorStore((s) => s.productModel)!;
  const { t } = useI18n();
  return (
    <div className="p-4">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
        {t("models.currentProduct")}
      </p>
      <p className="mt-1 text-sm font-medium">{model.name}</p>
      {model.thumbnailUrl && (
        <img
          src={model.thumbnailUrl}
          alt={model.name}
          className="mt-3 w-full rounded border border-panel-border bg-viewport object-contain p-2"
        />
      )}
      <dl className="mt-4 space-y-1 font-mono text-[11px]">
        <Row label={t("models.sourceId")} value={model.sourceId} />
        <Row label={t("models.family")} value={model.family ?? "—"} />
        <Row label={t("models.category")} value={model.category ?? "—"} />
        <Row label={t("models.strategy")} value={model.geometryStrategy} />
        <Row label={t("models.panels")} value={String(model.panels.length)} />
        <Row label={t("models.folds")} value={String(model.folds.length)} />
        <Row
          label={t("models.warnings")}
          value={model.warnings.length ? model.warnings.join(", ") : t("models.warnings.none")}
        />
      </dl>
      <Link
        to="/library"
        className="mt-6 inline-flex w-full items-center justify-center rounded-md border border-input px-3 py-2 text-xs hover:bg-accent"
      >
        {t("models.changeProduct")}
      </Link>
    </div>
  );
}

function ArtworkTab() {
  const artworkLayers = useConfiguratorStore((s) => s.artworkLayers);
  const addArtwork = useConfiguratorStore((s) => s.addArtwork);
  const updateArtwork = useConfiguratorStore((s) => s.updateArtwork);
  const removeArtwork = useConfiguratorStore((s) => s.removeArtwork);
  const model = useConfiguratorStore((s) => s.productModel)!;
  const selectedPanelId = useConfiguratorStore((s) => s.selectedPanelId);
  const { t } = useI18n();

  const handleFile = async (file: File) => {
    const v = validateArtworkFile(file);
    if (!v.ok) return toast.error(v.reason ?? "Invalid file");
    const dataUrl = await fileToDataUrl(file);
    addArtwork({
      name: file.name,
      dataUrl,
      panelId: selectedPanelId ?? "all",
      side: "outside",
      offset: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
    });
    toast.success(`Added "${file.name}"`);
  };

  return (
    <div className="p-4">
      <label className="block cursor-pointer rounded-md border-2 border-dashed border-panel-border bg-surface p-6 text-center hover:border-gold">
        <ImageIcon className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 text-sm">{t("artwork.drop")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("artwork.formats")}</p>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </label>

      {selectedPanelId && (
        <p className="mt-3 rounded bg-accent/50 px-2 py-1 text-xs">
          {t("artwork.assignPanel")}{" "}
          <span className="font-mono font-medium">{selectedPanelId}</span>
        </p>
      )}

      <div className="mt-4 space-y-2">
        {artworkLayers.length === 0 && (
          <p className="text-xs text-muted-foreground">{t("artwork.noLayers")}</p>
        )}
        {artworkLayers.map((l) => (
          <div key={l.id} className="panel-surface rounded-md p-2 text-xs">
            <div className="flex items-center gap-2">
              <img
                src={l.dataUrl}
                alt=""
                className="h-8 w-8 rounded border border-panel-border object-cover"
              />
              <p className="flex-1 truncate font-medium">{l.name}</p>
              <button
                onClick={() => updateArtwork(l.id, { visible: !l.visible })}
                className="text-muted-foreground hover:text-foreground"
              >
                {l.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => updateArtwork(l.id, { locked: !l.locked })}
                className="text-muted-foreground hover:text-foreground"
              >
                {l.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => removeArtwork(l.id)}
                className="text-destructive hover:opacity-80"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 space-y-1.5">
              <SliderRow
                label={t("artwork.scale")}
                value={l.scale}
                min={0.1}
                max={3}
                step={0.05}
                onChange={(v) => updateArtwork(l.id, { scale: v })}
              />
              <SliderRow
                label={t("artwork.rotation")}
                value={l.rotation}
                min={-180}
                max={180}
                step={1}
                onChange={(v) => updateArtwork(l.id, { rotation: v })}
                unit="°"
              />
              <SliderRow
                label={t("artwork.opacity")}
                value={l.opacity}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => updateArtwork(l.id, { opacity: v })}
              />
              <div className="flex items-center gap-1">
                <label className="w-14 text-muted-foreground">{t("artwork.panel")}</label>
                <select
                  value={l.panelId}
                  onChange={(e) => updateArtwork(l.id, { panelId: e.target.value as string })}
                  className="flex-1 rounded border border-input bg-background px-1 py-0.5 font-mono"
                >
                  <option value="all">{t("artwork.allPanels")}</option>
                  {model.panels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LayersTab() {
  const panels = useConfiguratorStore((s) => s.productModel?.panels ?? []);
  const selected = useConfiguratorStore((s) => s.selectedPanelId);
  const select = useConfiguratorStore((s) => s.selectPanel);
  const { t } = useI18n();
  return (
    <div className="p-2">
      <p className="px-2 py-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
        {t("layers.panels")} ({panels.length})
      </p>
      <ul className="space-y-0.5">
        {panels.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => select(selected === p.id ? null : p.id)}
              className={cn(
                "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs",
                selected === p.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60",
              )}
            >
              <span className="font-mono">{p.name}</span>
              {p.direction && (
                <span className="rounded bg-muted px-1 py-0.5 text-[10px]">{p.direction}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MaterialsTab() {
  const material = useConfiguratorStore((s) => s.material);
  const setMaterial = useConfiguratorStore((s) => s.setMaterial);
  const { t } = useI18n();
  return (
    <div className="p-4">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
        {t("materials.presets")}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {MATERIAL_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() =>
              setMaterial({
                presetId: p.id,
                color: p.color,
                roughness: p.roughness,
                metalness: p.metalness,
                clearcoat: p.clearcoat ?? 0,
                clearcoatRoughness: p.clearcoatRoughness ?? 0.3,
              })
            }
            className={cn(
              "group rounded-md border p-1.5 text-[10px] font-medium transition-colors",
              material.presetId === p.id
                ? "border-gold"
                : "border-panel-border hover:border-muted-foreground",
            )}
          >
            <div className="mb-1 aspect-square rounded" style={{ background: p.color }} />
            <p className="truncate text-muted-foreground">{p.name}</p>
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <ColorRow
          label={t("materials.color")}
          value={material.color}
          onChange={(v) => setMaterial({ color: v })}
        />
        <SliderRow
          label={t("materials.roughness")}
          value={material.roughness}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => setMaterial({ roughness: v })}
        />
        <SliderRow
          label={t("materials.metalness")}
          value={material.metalness}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => setMaterial({ metalness: v })}
        />
        <SliderRow
          label={t("materials.clearcoat")}
          value={material.clearcoat}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => setMaterial({ clearcoat: v })}
        />
      </div>
      {getPreset(material.presetId) && (
        <p className="mt-3 text-xs text-muted-foreground">
          {getPreset(material.presetId)!.description}
        </p>
      )}
    </div>
  );
}

function DielineTab() {
  const setViewMode = useConfiguratorStore((s) => s.setViewMode);
  const { t } = useI18n();
  return (
    <div className="p-4">
      <p className="text-sm">{t("dieline.tab.desc")}</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setViewMode("2d")}
          className="flex-1 rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground"
        >
          {t("dieline.tab.2dOnly")}
        </button>
        <button
          onClick={() => setViewMode("split")}
          className="flex-1 rounded-md border border-input px-3 py-2 text-xs hover:bg-accent"
        >
          {t("dieline.tab.split")}
        </button>
      </div>
    </div>
  );
}

function SavedTab() {
  const { t } = useI18n();
  return (
    <div className="p-4">
      <p className="text-xs text-muted-foreground">
        {t("saved.tab.desc")}{" "}
        <Link to="/configurations" className="text-gold underline">
          {t("saved.tab.page")}
        </Link>
        .
      </p>
    </div>
  );
}

function RightInspector() {
  const model = useConfiguratorStore((s) => s.productModel)!;
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const setDimensions = useConfiguratorStore((s) => s.setDimensions);
  const scene = useConfiguratorStore((s) => s.scene);
  const setScene = useConfiguratorStore((s) => s.setScene);
  const cameraPreset = useConfiguratorStore((s) => s.cameraPreset);
  const setCameraPreset = useConfiguratorStore((s) => s.setCameraPreset);
  const foldProgress = useConfiguratorStore((s) => s.foldProgress);
  const setFoldProgress = useConfiguratorStore((s) => s.setFoldProgress);
  const { t } = useI18n();

  const lim = model.limits ?? {};

  return (
    <div>
      <Section title={t("inspector.dimensions")}>
        <NumberInput
          label={t("inspector.dim.width")}
          value={dimensions.width}
          min={lim.lengthMin}
          max={lim.lengthMax}
          onChange={(v) => setDimensions({ width: v })}
          unit={dimensions.unit}
        />
        <NumberInput
          label={t("inspector.dim.depth")}
          value={dimensions.depth}
          min={lim.widthMin}
          max={lim.widthMax}
          onChange={(v) => setDimensions({ depth: v })}
          unit={dimensions.unit}
        />
        <NumberInput
          label={t("inspector.dim.height")}
          value={dimensions.height}
          min={lim.heightMin}
          max={lim.heightMax}
          onChange={(v) => setDimensions({ height: v })}
          unit={dimensions.unit}
        />
        <NumberInput
          label={t("inspector.dim.thickness")}
          value={dimensions.thickness ?? 1.5}
          min={lim.thicknessMin ?? 0.1}
          max={5}
          step={0.1}
          onChange={(v) => setDimensions({ thickness: v })}
          unit="mm"
        />
        {model.geometryStrategy === "knife-rig" && (
          <p className="mt-1 text-[10px] text-muted-foreground">{t("inspector.dim.knifeNote")}</p>
        )}
      </Section>

      <Section title={t("inspector.fold")}>
        <SliderRow
          label={t("inspector.fold.progress")}
          value={foldProgress}
          min={0}
          max={1}
          step={0.01}
          onChange={setFoldProgress}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setFoldProgress(0)}
            className="flex-1 rounded border border-input px-2 py-1 text-xs hover:bg-accent"
          >
            {t("inspector.fold.flat")}
          </button>
          <button
            onClick={() => setFoldProgress(1)}
            className="flex-1 rounded border border-input px-2 py-1 text-xs hover:bg-accent"
          >
            {t("inspector.fold.closed")}
          </button>
        </div>
      </Section>

      <Section title={t("inspector.scene")}>
        <SelectRow
          label={t("inspector.scene.preset")}
          value={scene.preset}
          options={
            [
              ["studio-light", t("scene.studioLight")],
              ["studio-dark", t("scene.studioDark")],
              ["warm", t("scene.warm")],
              ["cool", t("scene.cool")],
              ["transparent", t("scene.transparent")],
            ] as [ScenePreset, string][]
          }
          onChange={(v) => setScene({ preset: v as ScenePreset })}
        />
        <SliderRow
          label={t("inspector.scene.environment")}
          value={scene.environmentIntensity}
          min={0}
          max={2}
          step={0.05}
          onChange={(v) => setScene({ environmentIntensity: v })}
        />
        <SliderRow
          label={t("inspector.scene.keyLight")}
          value={scene.keyLightIntensity}
          min={0}
          max={3}
          step={0.05}
          onChange={(v) => setScene({ keyLightIntensity: v })}
        />
        <SliderRow
          label={t("inspector.scene.fill")}
          value={scene.fillLightIntensity}
          min={0}
          max={3}
          step={0.05}
          onChange={(v) => setScene({ fillLightIntensity: v })}
        />
        <SliderRow
          label={t("inspector.scene.rim")}
          value={scene.rimLightIntensity}
          min={0}
          max={3}
          step={0.05}
          onChange={(v) => setScene({ rimLightIntensity: v })}
        />
        <div className="flex flex-wrap gap-2 pt-1">
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={scene.contactShadows}
              onChange={(e) => setScene({ contactShadows: e.target.checked })}
              className="accent-gold"
            />
            {t("inspector.scene.shadows")}
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={scene.showGrid}
              onChange={(e) => setScene({ showGrid: e.target.checked })}
              className="accent-gold"
            />
            <Grid3x3 className="h-3 w-3" /> {t("inspector.scene.grid")}
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={scene.transparentBackground}
              onChange={(e) => setScene({ transparentBackground: e.target.checked })}
              className="accent-gold"
            />
            {t("inspector.scene.transparentBg")}
          </label>
        </div>
        <ColorRow
          label={t("inspector.scene.background")}
          value={scene.backgroundColor}
          onChange={(v) => setScene({ backgroundColor: v })}
        />
      </Section>

      <Section title={t("inspector.camera")}>
        <SelectRow
          label={t("inspector.camera.preset")}
          value={cameraPreset}
          options={
            [
              ["perspective", t("camera.perspective")],
              ["front", t("camera.front")],
              ["back", t("camera.back")],
              ["left", t("camera.left")],
              ["right", t("camera.right")],
              ["top", t("camera.top")],
              ["bottom", t("camera.bottom")],
              ["isometric", t("camera.isometric")],
            ] as [CameraPreset, string][]
          }
          onChange={(v) => setCameraPreset(v as CameraPreset)}
        />
        <p className="text-[10px] text-muted-foreground">
          <Camera className="mr-1 inline h-3 w-3" /> {t("inspector.camera.hint")}
        </p>
      </Section>
    </div>
  );
}

/* ---------------- Micro inputs ---------------- */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right">{value}</dd>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <label className="text-muted-foreground">{label}</label>
        <span className="font-mono text-[10px]">
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-gold"
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1 flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="w-full rounded border border-input bg-background px-2 py-1 font-mono text-xs"
        />
        {unit && <span className="font-mono text-[10px] text-muted-foreground">{unit}</span>}
      </div>
      {(min != null || max != null) && (
        <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
          range {min ?? "—"} … {max ?? "—"}
        </p>
      )}
    </div>
  );
}

function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-xs"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-8 cursor-pointer rounded border border-input"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 rounded border border-input bg-background px-1 py-0.5 font-mono text-[10px]"
        />
      </div>
    </div>
  );
}

// keep icons imports used
void PanelRight;
void Sun;
void Plus;
