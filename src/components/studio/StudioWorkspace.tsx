import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Box,
  Boxes,
  Camera,
  Check,
  ChevronDown,
  CircleDollarSign,
  Download,
  Eye,
  EyeOff,
  Grid3x3,
  Image as ImageIcon,
  Layers,
  Lock,
  Maximize2,
  Menu,
  MonitorUp,
  PackageCheck,
  Palette,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  Ruler,
  Save,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  Undo2,
  Unlock,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useConfiguratorStore,
  type CameraPreset,
  type ScenePreset,
  type ViewMode,
} from "@/stores/configurator";
import { Viewport3D } from "@/components/viewer/Viewport3D";
import { DielineEditor } from "@/components/dieline/DielineEditor";
import { MATERIAL_PRESETS, getPreset } from "@/components/materials/material-presets";
import { validateArtworkFile, fileToDataUrl } from "@/components/artwork/artwork-utils";
import { savedConfigs } from "@/stores/persistence";
import { ExportDialog } from "@/components/export/ExportDialog";
import { QuoteDialog } from "@/components/quote/QuoteDialog";
import { cn } from "@/lib/utils";

type StudioTab = "product" | "size" | "material" | "artwork" | "finishes" | "scene";
type EditorMode = "simple" | "professional";

const STUDIO_TABS = [
  ["product", Boxes, "Product"],
  ["size", Ruler, "Size"],
  ["material", Palette, "Material"],
  ["artwork", ImageIcon, "Artwork"],
  ["finishes", Sparkles, "Finishes"],
  ["scene", Camera, "Scene"],
] as const;

const VIEW_LABELS: Record<ViewMode, string> = {
  "3d": "3D preview",
  "2d": "2D dieline",
  split: "Split view",
};

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
  const setCameraPreset = useConfiguratorStore((s) => s.setCameraPreset);
  const selectPanel = useConfiguratorStore((s) => s.selectPanel);
  const selectedPanelId = useConfiguratorStore((s) => s.selectedPanelId);

  const [activeTab, setActiveTab] = useState<StudioTab>("product");
  const [editorMode, setEditorMode] = useState<EditorMode>("simple");
  const [exportOpen, setExportOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.matches("input, textarea, select, [contenteditable='true']");
      if (editing) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      const shortcutMap: Record<string, CameraPreset> = {
        "0": "isometric",
        "1": "front",
        "2": "back",
        "3": "left",
        "4": "right",
        "5": "top",
      };
      if (shortcutMap[event.key]) setCameraPreset(shortcutMap[event.key]);
      if (event.key.toLowerCase() === "f") setCameraPreset("isometric");
      if (event.key === " ") {
        event.preventDefault();
        setPlaying((current) => !current);
      }
      if (event.key === "Escape") selectPanel(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, selectPanel, setCameraPreset, undo]);

  if (!model) return null;

  const selectedPanel = model.panels.find((panel) => panel.id === selectedPanelId);
  const warningCount = model.warnings.length;

  const handleSave = () => {
    const payload = exportConfiguration();
    savedConfigs.upsert({
      id: `${model.sourceId}-${Date.now()}`,
      name: model.name,
      updatedAt: new Date().toISOString(),
      payload,
    });
    toast.success("Project saved", {
      description: "The current configuration is available in Saved projects.",
    });
  };

  const openTab = (tab: StudioTab) => {
    setActiveTab(tab);
    setMobilePanelOpen(true);
  };

  return (
    <div className="studio-shell flex h-[calc(100dvh-3rem)] min-h-[620px] w-full flex-col overflow-hidden bg-background">
      <header className="studio-topbar flex h-14 shrink-0 items-center gap-2 border-b border-panel-border bg-panel px-2.5 md:px-4">
        <Link
          to="/library"
          className="studio-icon-button"
          aria-label="Back to structure library"
          title="Back to library"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="min-w-0 flex-1 border-l border-panel-border pl-3">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{model.name}</p>
            <span className={cn("status-dot", isDirty ? "bg-warning" : "bg-success")} />
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              {isDirty ? "Unsaved changes" : "Saved"}
            </span>
          </div>
          <p className="truncate font-mono text-[10px] text-muted-foreground">
            {model.family ?? "Packaging"} · {model.geometryStrategy} · {model.dimensions.unit}
          </p>
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          <TopbarButton icon={<Undo2 className="h-4 w-4" />} label="Undo · Ctrl+Z" onClick={undo} />
          <TopbarButton icon={<Redo2 className="h-4 w-4" />} label="Redo · Ctrl+Y" onClick={redo} />
        </div>

        <div className="hidden rounded-lg border border-input bg-surface-2 p-0.5 md:flex">
          {(["simple", "professional"] as EditorMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setEditorMode(mode)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-[11px] font-medium capitalize transition-colors",
                editorMode === mode
                  ? "bg-panel text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        <TopbarButton icon={<Save className="h-4 w-4" />} label="Save project" onClick={handleSave} />
        <button onClick={() => setExportOpen(true)} className="studio-secondary-button hidden sm:inline-flex">
          <Download className="h-4 w-4" /> Export
        </button>
        <button onClick={() => setQuoteOpen(true)} className="studio-primary-button">
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Request quote</span>
        </button>
        <button
          onClick={() => setMobilePanelOpen(true)}
          className="studio-icon-button md:hidden"
          aria-label="Open editor tools"
        >
          <Menu className="h-4 w-4" />
        </button>
      </header>

      {warningCount > 0 && editorMode === "professional" && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs">
          <div className="min-w-0">
            <strong>
              {warningCount} geometry diagnostic{warningCount === 1 ? "" : "s"}
            </strong>
            <span className="ml-2 truncate text-muted-foreground">
              {model.warnings.slice(0, 3).join(" · ")}
            </span>
          </div>
          <button onClick={() => openTab("product")} className="shrink-0 font-medium underline underline-offset-4">
            Review
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-[76px] shrink-0 flex-col items-center gap-1 border-r border-panel-border bg-panel py-3 md:flex">
          {STUDIO_TABS.map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn("studio-tool-button", activeTab === key && "studio-tool-button-active")}
              aria-label={label}
              title={label}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{label}</span>
            </button>
          ))}
          <div className="mt-auto w-full px-2">
            <button
              onClick={() => setInspectorOpen((value) => !value)}
              className="studio-tool-button w-full"
              title="Toggle inspector"
            >
              <Settings2 className="h-[18px] w-[18px]" />
              <span>Inspect</span>
            </button>
          </div>
        </nav>

        <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-r border-panel-border bg-panel md:block xl:w-[320px]">
          <PanelHeader
            eyebrow="Configure"
            title={STUDIO_TABS.find(([key]) => key === activeTab)?.[2] ?? "Product"}
            description={tabDescription(activeTab)}
          />
          <StudioPanel tab={activeTab} editorMode={editorMode} />
        </aside>

        <main className="relative min-w-0 flex-1 overflow-hidden bg-viewport">
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
            <div className="pointer-events-auto flex rounded-xl border border-panel-border bg-panel/90 p-1 shadow-lg backdrop-blur-xl">
              {(["2d", "3d", "split"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                    viewMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {VIEW_LABELS[mode]}
                </button>
              ))}
            </div>
          </div>

          {selectedPanel && (
            <div className="pointer-events-none absolute left-3 top-3 z-20 hidden rounded-lg border border-gold/30 bg-panel/90 px-3 py-2 shadow-sm backdrop-blur md:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">Selected panel</p>
              <p className="mt-0.5 max-w-48 truncate text-xs font-medium">{selectedPanel.name}</p>
            </div>
          )}

          {viewMode === "3d" && <Viewport3D />}
          {viewMode === "2d" && <DielineEditor />}
          {viewMode === "split" && (
            <div className="grid h-full min-h-0 grid-cols-1 divide-y divide-panel-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <div className="min-h-0">
                <DielineEditor />
              </div>
              <div className="min-h-0">
                <Viewport3D />
              </div>
            </div>
          )}

          <CanvasBottomBar
            playing={playing}
            setPlaying={setPlaying}
            foldProgress={foldProgress}
            setFoldProgress={setFoldProgress}
            viewMode={viewMode}
            setViewMode={setViewMode}
            setCameraPreset={setCameraPreset}
          />
          <FoldTicker playing={playing} />
        </main>

        {inspectorOpen && (
          <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-panel-border bg-panel lg:block xl:w-[330px]">
            <ContextInspector editorMode={editorMode} />
          </aside>
        )}
      </div>

      <nav className="grid h-16 shrink-0 grid-cols-6 border-t border-panel-border bg-panel md:hidden">
        {STUDIO_TABS.map(([key, Icon, label]) => (
          <button
            key={key}
            onClick={() => openTab(key)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground",
              activeTab === key && "text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {mobilePanelOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobilePanelOpen(false)}
            aria-label="Close tools"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-hidden rounded-t-2xl border-t border-panel-border bg-panel shadow-2xl">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Configure</p>
                <p className="text-sm font-semibold">
                  {STUDIO_TABS.find(([key]) => key === activeTab)?.[2]}
                </p>
              </div>
              <button
                onClick={() => setMobilePanelOpen(false)}
                className="studio-icon-button"
                aria-label="Close tools"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[calc(78dvh-64px)] overflow-y-auto">
              <StudioPanel tab={activeTab} editorMode={editorMode} />
              <div className="border-t border-panel-border">
                <ContextInspector editorMode={editorMode} compact />
              </div>
            </div>
          </div>
        </div>
      )}

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <QuoteDialog open={quoteOpen} onOpenChange={setQuoteOpen} />
    </div>
  );
}

function tabDescription(tab: StudioTab): string {
  const descriptions: Record<StudioTab, string> = {
    product: "Structure, technical health and product identity.",
    size: "Outer dimensions, board thickness and manufacturing limits.",
    material: "Board substrate, colour and physical surface response.",
    artwork: "Upload, assign and position print artwork by panel.",
    finishes: "Lamination, foil, selective UV and emboss treatments.",
    scene: "Lighting, background, camera and presentation settings.",
  };
  return descriptions[tab];
}

function PanelHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-panel-border px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">{eyebrow}</p>
      <h2 className="mt-1 text-base font-semibold">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function StudioPanel({ tab, editorMode }: { tab: StudioTab; editorMode: EditorMode }) {
  if (tab === "size") return <SizePanel />;
  if (tab === "material") return <MaterialPanel />;
  if (tab === "artwork") return <ArtworkPanel />;
  if (tab === "finishes") return <FinishesPanel />;
  if (tab === "scene") return <ScenePanel />;
  return <ProductPanel editorMode={editorMode} />;
}

function ProductPanel({ editorMode }: { editorMode: EditorMode }) {
  const model = useConfiguratorStore((s) => s.productModel)!;
  const selectedPanelId = useConfiguratorStore((s) => s.selectedPanelId);
  const selectPanel = useConfiguratorStore((s) => s.selectPanel);

  return (
    <div className="space-y-5 p-4">
      <div className="overflow-hidden rounded-xl border border-panel-border bg-surface-2">
        <div className="aspect-[16/10] bg-viewport p-4">
          {model.thumbnailUrl ? (
            <img src={model.thumbnailUrl} alt={model.name} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Box className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="border-t border-panel-border p-3">
          <p className="text-sm font-semibold">{model.name}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill>{model.family ?? "Packaging"}</Pill>
            <Pill tone={model.geometryStrategy === "knife-rig" ? "success" : "default"}>
              {model.geometryStrategy}
            </Pill>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric label="Panels" value={String(model.panels.length)} />
        <Metric label="Folds" value={String(model.folds.length)} />
        <Metric label="Material" value={model.materials[0]?.name ?? "Default"} />
        <Metric
          label="Warnings"
          value={String(model.warnings.length)}
          tone={model.warnings.length ? "warning" : "success"}
        />
      </div>

      <Link to="/library" className="studio-secondary-button w-full justify-center">
        <Boxes className="h-4 w-4" /> Replace structure
      </Link>

      {editorMode === "professional" && (
        <Section title={`Panel map · ${model.panels.length}`}>
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {model.panels.map((panel) => (
              <button
                key={panel.id}
                onClick={() => selectPanel(selectedPanelId === panel.id ? null : panel.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                  selectedPanelId === panel.id
                    ? "bg-gold/15 text-foreground ring-1 ring-gold/30"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <span className="truncate font-mono">{panel.name}</span>
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase">
                  {panel.direction ?? (panel.isFlap ? "flap" : "panel")}
                </span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {model.warnings.length > 0 && (
        <Section title="Diagnostics">
          <ul className="space-y-2 text-xs text-muted-foreground">
            {model.warnings.map((warning) => (
              <li
                key={warning}
                className="rounded-lg border border-warning/20 bg-warning/10 px-3 py-2 font-mono"
              >
                {warning}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function SizePanel() {
  const model = useConfiguratorStore((s) => s.productModel)!;
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const setDimensions = useConfiguratorStore((s) => s.setDimensions);
  const limits = model.limits ?? {};
  const presets = useMemo(
    () => [
      { name: "Compact", scale: 0.8 },
      { name: "Current", scale: 1 },
      { name: "Large", scale: 1.2 },
    ],
    [],
  );

  return (
    <div className="space-y-5 p-4">
      <div className="grid grid-cols-3 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.name}
            onClick={() => {
              if (preset.scale === 1) return;
              setDimensions({
                width: Math.round(dimensions.width * preset.scale),
                depth: Math.round(dimensions.depth * preset.scale),
                height: Math.round(dimensions.height * preset.scale),
              });
            }}
            className="rounded-lg border border-panel-border bg-surface-2 px-2 py-2 text-xs hover:border-gold/50 hover:bg-gold/5"
          >
            {preset.name}
          </button>
        ))}
      </div>

      <Section title="Outer dimensions" defaultOpen>
        <NumberInput
          label="Length · L"
          value={dimensions.width}
          min={limits.lengthMin}
          max={limits.lengthMax}
          onChange={(value) => setDimensions({ width: value })}
          unit={dimensions.unit}
        />
        <NumberInput
          label="Width · W"
          value={dimensions.depth}
          min={limits.widthMin}
          max={limits.widthMax}
          onChange={(value) => setDimensions({ depth: value })}
          unit={dimensions.unit}
        />
        <NumberInput
          label="Height · H"
          value={dimensions.height}
          min={limits.heightMin}
          max={limits.heightMax}
          onChange={(value) => setDimensions({ height: value })}
          unit={dimensions.unit}
        />
        <NumberInput
          label="Board thickness"
          value={dimensions.thickness ?? 1.5}
          min={limits.thicknessMin ?? 0.1}
          max={8}
          step={0.1}
          onChange={(value) => setDimensions({ thickness: value })}
          unit="mm"
        />
      </Section>

      <div className="rounded-xl border border-panel-border bg-surface-2 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Configured size</span>
          <span className="font-mono font-semibold">
            {dimensions.width} × {dimensions.depth} × {dimensions.height} {dimensions.unit}
          </span>
        </div>
        <p className="mt-2 leading-5 text-muted-foreground">
          Values outside the manufacturing range are constrained by the source structure limits.
        </p>
      </div>
    </div>
  );
}

function MaterialPanel() {
  const material = useConfiguratorStore((s) => s.material);
  const setMaterial = useConfiguratorStore((s) => s.setMaterial);

  return (
    <div className="space-y-5 p-4">
      <div className="space-y-2">
        {MATERIAL_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() =>
              setMaterial({
                presetId: preset.id,
                color: preset.color,
                roughness: preset.roughness,
                metalness: preset.metalness,
                clearcoat: preset.clearcoat ?? 0,
                clearcoatRoughness: preset.clearcoatRoughness ?? 0.3,
              })
            }
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
              material.presetId === preset.id
                ? "border-gold bg-gold/5 shadow-sm"
                : "border-panel-border hover:border-muted-foreground/40 hover:bg-accent/40",
            )}
          >
            <span
              className="h-11 w-11 shrink-0 rounded-lg border border-black/10 shadow-inner"
              style={{ background: preset.color }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{preset.name}</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                {preset.description}
              </span>
            </span>
            {material.presetId === preset.id && <Check className="h-4 w-4 text-gold" />}
          </button>
        ))}
      </div>

      <Section title="Surface controls">
        <ColorRow
          label="Base colour"
          value={material.color}
          onChange={(value) => setMaterial({ color: value })}
        />
        <SliderRow
          label="Roughness"
          value={material.roughness}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => setMaterial({ roughness: value })}
        />
        <SliderRow
          label="Metalness"
          value={material.metalness}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => setMaterial({ metalness: value })}
        />
        <SliderRow
          label="Clearcoat"
          value={material.clearcoat}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => setMaterial({ clearcoat: value })}
        />
      </Section>

      {getPreset(material.presetId) && (
        <div className="rounded-xl border border-success/20 bg-success/5 p-3 text-xs leading-5 text-muted-foreground">
          <PackageCheck className="mr-2 inline h-4 w-4 text-success" />
          Active substrate: <strong className="text-foreground">{getPreset(material.presetId)!.name}</strong>
        </div>
      )}
    </div>
  );
}

function ArtworkPanel() {
  const artworkLayers = useConfiguratorStore((s) => s.artworkLayers);
  const addArtwork = useConfiguratorStore((s) => s.addArtwork);
  const updateArtwork = useConfiguratorStore((s) => s.updateArtwork);
  const removeArtwork = useConfiguratorStore((s) => s.removeArtwork);
  const reorderArtwork = useConfiguratorStore((s) => s.reorderArtwork);
  const model = useConfiguratorStore((s) => s.productModel)!;
  const selectedPanelId = useConfiguratorStore((s) => s.selectedPanelId);

  const handleFile = async (file: File) => {
    const validation = validateArtworkFile(file);
    if (!validation.ok) return toast.error(validation.reason ?? "Invalid artwork file");
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
    toast.success("Artwork added", {
      description: selectedPanelId ? `Assigned to ${selectedPanelId}.` : "Assigned to all panels.",
    });
  };

  return (
    <div className="space-y-5 p-4">
      <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-panel-border bg-surface-2 px-4 py-7 text-center transition-colors hover:border-gold hover:bg-gold/5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-panel shadow-sm">
          <Upload className="h-4 w-4 text-gold" />
        </span>
        <p className="mt-3 text-sm font-semibold">Drop artwork or browse</p>
        <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WebP or SVG · maximum 12 MB</p>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
      </label>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Upload target</span>
        <span className="rounded-full bg-accent px-2 py-1 font-mono text-[10px]">
          {selectedPanelId ?? "All panels"}
        </span>
      </div>

      {artworkLayers.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" />}
          title="No artwork layers"
          description="Upload a print file and assign it to a panel or the full dieline."
        />
      ) : (
        <div className="space-y-2">
          {artworkLayers
            .slice()
            .sort((a, b) => b.order - a.order)
            .map((layer) => (
              <div key={layer.id} className="rounded-xl border border-panel-border bg-surface-2 p-3">
                <div className="flex items-center gap-2">
                  <img
                    src={layer.dataUrl}
                    alt=""
                    className="h-10 w-10 rounded-lg border border-panel-border bg-panel object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{layer.name}</p>
                    <p className="mt-0.5 truncate font-mono text-[9px] uppercase text-muted-foreground">
                      {layer.panelId} · {layer.side}
                    </p>
                  </div>
                  <IconToggle
                    on={layer.visible}
                    onClick={() => updateArtwork(layer.id, { visible: !layer.visible })}
                    onIcon={<Eye className="h-3.5 w-3.5" />}
                    offIcon={<EyeOff className="h-3.5 w-3.5" />}
                    label="Toggle visibility"
                  />
                  <IconToggle
                    on={layer.locked}
                    onClick={() => updateArtwork(layer.id, { locked: !layer.locked })}
                    onIcon={<Lock className="h-3.5 w-3.5" />}
                    offIcon={<Unlock className="h-3.5 w-3.5" />}
                    label="Toggle lock"
                  />
                  <button
                    onClick={() => removeArtwork(layer.id)}
                    className="studio-icon-button text-destructive"
                    aria-label="Delete artwork"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-3 space-y-2 border-t border-panel-border pt-3">
                  <SelectRow
                    label="Panel"
                    value={layer.panelId}
                    options={[
                      ["all", "All panels"],
                      ...model.panels.map((panel) => [panel.id, panel.name] as const),
                    ]}
                    onChange={(value) => updateArtwork(layer.id, { panelId: value })}
                  />
                  <SelectRow
                    label="Print side"
                    value={layer.side}
                    options={[
                      ["outside", "Outside"],
                      ["inside", "Inside"],
                    ]}
                    onChange={(value) =>
                      updateArtwork(layer.id, { side: value as "outside" | "inside" })
                    }
                  />
                  <SliderRow
                    label="Scale"
                    value={layer.scale}
                    min={0.1}
                    max={3}
                    step={0.05}
                    onChange={(value) => updateArtwork(layer.id, { scale: value })}
                  />
                  <SliderRow
                    label="Rotation"
                    value={layer.rotation}
                    min={-180}
                    max={180}
                    step={1}
                    onChange={(value) => updateArtwork(layer.id, { rotation: value })}
                    unit="°"
                  />
                  <SliderRow
                    label="Opacity"
                    value={layer.opacity}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(value) => updateArtwork(layer.id, { opacity: value })}
                  />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => reorderArtwork(layer.id, "up")}
                      className="studio-secondary-button justify-center text-[11px]"
                    >
                      Move up
                    </button>
                    <button
                      onClick={() => reorderArtwork(layer.id, "down")}
                      className="studio-secondary-button justify-center text-[11px]"
                    >
                      Move down
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function FinishesPanel() {
  const material = useConfiguratorStore((s) => s.material);
  const setMaterial = useConfiguratorStore((s) => s.setMaterial);
  const finishes = [
    { id: "none", name: "No finish", note: "Natural substrate response", icon: Box },
    { id: "matte", name: "Matte lamination", note: "Soft diffuse protection", icon: WandSparkles },
    { id: "gloss", name: "Gloss lamination", note: "High reflection and colour depth", icon: Sparkles },
    { id: "spot-uv", name: "Selective UV", note: "Gloss highlight on a mask", icon: MonitorUp },
    { id: "gold-foil", name: "Gold foil", note: "Metallic hot-stamped layer", icon: Sparkles },
    { id: "silver-foil", name: "Silver foil", note: "Cool metallic layer", icon: Sparkles },
    { id: "emboss", name: "Emboss", note: "Raised tactile relief", icon: Layers },
  ] as const;

  return (
    <div className="space-y-3 p-4">
      {finishes.map(({ id, name, note, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setMaterial({ effect: id })}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
            material.effect === id
              ? "border-gold bg-gold/5 shadow-sm"
              : "border-panel-border hover:border-muted-foreground/40 hover:bg-accent/40",
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2">
            <Icon className="h-4 w-4 text-gold" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{name}</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">{note}</span>
          </span>
          {material.effect === id && <Check className="h-4 w-4 text-gold" />}
        </button>
      ))}
      <div className="rounded-xl border border-warning/20 bg-warning/10 p-3 text-xs leading-5 text-muted-foreground">
        Finish previews are physically approximated. Production masks remain separate export layers.
      </div>
    </div>
  );
}

function ScenePanel() {
  const scene = useConfiguratorStore((s) => s.scene);
  const setScene = useConfiguratorStore((s) => s.setScene);
  const cameraPreset = useConfiguratorStore((s) => s.cameraPreset);
  const setCameraPreset = useConfiguratorStore((s) => s.setCameraPreset);

  const cameras: [CameraPreset, string][] = [
    ["isometric", "Isometric"],
    ["front", "Front"],
    ["back", "Back"],
    ["left", "Left"],
    ["right", "Right"],
    ["top", "Top"],
    ["bottom", "Bottom"],
    ["perspective", "Perspective"],
  ];

  return (
    <div className="space-y-5 p-4">
      <Section title="Camera presets">
        <div className="grid grid-cols-2 gap-2">
          {cameras.map(([preset, label]) => (
            <button
              key={preset}
              onClick={() => setCameraPreset(preset)}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs",
                cameraPreset === preset
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-panel-border text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Studio environment">
        <SelectRow
          label="Preset"
          value={scene.preset}
          options={[
            ["studio-light", "Studio light"],
            ["studio-dark", "Studio dark"],
            ["warm", "Warm editorial"],
            ["cool", "Cool technical"],
            ["transparent", "Transparent"],
          ]}
          onChange={(value) => setScene({ preset: value as ScenePreset })}
        />
        <SliderRow
          label="Environment"
          value={scene.environmentIntensity}
          min={0}
          max={2}
          step={0.05}
          onChange={(value) => setScene({ environmentIntensity: value })}
        />
        <SliderRow
          label="Key light"
          value={scene.keyLightIntensity}
          min={0}
          max={3}
          step={0.05}
          onChange={(value) => setScene({ keyLightIntensity: value })}
        />
        <SliderRow
          label="Fill light"
          value={scene.fillLightIntensity}
          min={0}
          max={3}
          step={0.05}
          onChange={(value) => setScene({ fillLightIntensity: value })}
        />
        <SliderRow
          label="Rim light"
          value={scene.rimLightIntensity}
          min={0}
          max={3}
          step={0.05}
          onChange={(value) => setScene({ rimLightIntensity: value })}
        />
      </Section>

      <Section title="Viewport">
        <Toggle
          label="Contact shadows"
          checked={scene.contactShadows}
          onChange={(value) => setScene({ contactShadows: value })}
        />
        <Toggle
          label="Engineering grid"
          checked={scene.showGrid}
          onChange={(value) => setScene({ showGrid: value })}
        />
        <Toggle
          label="Dimension overlay"
          checked={scene.showDimensions}
          onChange={(value) => setScene({ showDimensions: value })}
        />
        <Toggle
          label="Transparent background"
          checked={scene.transparentBackground}
          onChange={(value) => setScene({ transparentBackground: value })}
        />
        <ColorRow
          label="Background"
          value={scene.backgroundColor}
          onChange={(value) => setScene({ backgroundColor: value })}
        />
      </Section>
    </div>
  );
}

function ContextInspector({
  editorMode,
  compact = false,
}: {
  editorMode: EditorMode;
  compact?: boolean;
}) {
  const model = useConfiguratorStore((s) => s.productModel)!;
  const selectedPanelId = useConfiguratorStore((s) => s.selectedPanelId);
  const selectedPanel = model.panels.find((panel) => panel.id === selectedPanelId);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const material = useConfiguratorStore((s) => s.material);
  const artworkLayers = useConfiguratorStore((s) => s.artworkLayers);
  const foldProgress = useConfiguratorStore((s) => s.foldProgress);
  const setFoldProgress = useConfiguratorStore((s) => s.setFoldProgress);

  const assignedArtwork = selectedPanel
    ? artworkLayers.filter((layer) => layer.panelId === selectedPanel.id || layer.panelId === "all")
    : artworkLayers;

  return (
    <div className={cn(compact ? "pb-8" : "min-h-full")}>
      <PanelHeader
        eyebrow={selectedPanel ? "Selection" : "Project"}
        title={selectedPanel?.name ?? "Configuration inspector"}
        description={
          selectedPanel
            ? "Panel-specific print and geometry context."
            : "Live project summary and assembly state."
        }
      />

      <div className="space-y-4 p-4">
        {selectedPanel ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="Direction" value={selectedPanel.direction ?? "—"} />
              <Metric label="Type" value={selectedPanel.isFlap ? "Flap" : "Panel"} />
              <Metric label="Width" value={`${selectedPanel.bbox.w.toFixed(1)} mm`} />
              <Metric label="Height" value={`${selectedPanel.bbox.h.toFixed(1)} mm`} />
            </div>
            <Section title={`Artwork · ${assignedArtwork.length}`}>
              {assignedArtwork.length ? (
                <div className="space-y-2">
                  {assignedArtwork.map((layer) => (
                    <div
                      key={layer.id}
                      className="flex items-center gap-2 rounded-lg border border-panel-border bg-surface-2 p-2"
                    >
                      <img src={layer.dataUrl} alt="" className="h-8 w-8 rounded object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{layer.name}</p>
                        <p className="font-mono text-[9px] uppercase text-muted-foreground">{layer.side}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No artwork assigned to this panel.</p>
              )}
            </Section>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-panel-border bg-surface-2 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Structure
                  </p>
                  <p className="mt-1 text-sm font-semibold">{model.family ?? model.name}</p>
                </div>
                <Box className="h-5 w-5 text-gold" />
              </div>
              <dl className="mt-3 space-y-2 text-xs">
                <SummaryRow
                  label="Size"
                  value={`${dimensions.width} × ${dimensions.depth} × ${dimensions.height} ${dimensions.unit}`}
                />
                <SummaryRow
                  label="Material"
                  value={getPreset(material.presetId)?.name ?? material.presetId}
                />
                <SummaryRow label="Finish" value={material.effect} />
                <SummaryRow
                  label="Artwork"
                  value={`${artworkLayers.length} layer${artworkLayers.length === 1 ? "" : "s"}`}
                />
              </dl>
            </div>

            <Section title="Assembly">
              <SliderRow
                label="Progress"
                value={foldProgress}
                min={0}
                max={1}
                step={0.01}
                onChange={setFoldProgress}
                unit=""
              />
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setFoldProgress(0)}
                  className="studio-secondary-button justify-center text-[11px]"
                >
                  Flat
                </button>
                <button
                  onClick={() => setFoldProgress(0.5)}
                  className="studio-secondary-button justify-center text-[11px]"
                >
                  Assemble
                </button>
                <button
                  onClick={() => setFoldProgress(1)}
                  className="studio-secondary-button justify-center text-[11px]"
                >
                  Closed
                </button>
              </div>
            </Section>
          </>
        )}

        <div className="rounded-xl border border-gold/25 bg-gold/5 p-4">
          <div className="flex items-start gap-3">
            <CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
            <div>
              <p className="text-sm font-semibold">Quote-ready configuration</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                The quote includes the structure, dimensions, material, finish, artwork manifest and preview state.
              </p>
            </div>
          </div>
        </div>

        {editorMode === "professional" && (
          <Section title="Technical metadata">
            <SummaryRow label="Source ID" value={model.sourceId} mono />
            <SummaryRow label="Geometry" value={model.geometryStrategy} mono />
            <SummaryRow label="Panels / folds" value={`${model.panels.length} / ${model.folds.length}`} mono />
            <SummaryRow label="Warnings" value={String(model.warnings.length)} mono />
          </Section>
        )}
      </div>
    </div>
  );
}

function CanvasBottomBar({
  playing,
  setPlaying,
  foldProgress,
  setFoldProgress,
  viewMode,
  setViewMode,
  setCameraPreset,
}: {
  playing: boolean;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  foldProgress: number;
  setFoldProgress: (value: number) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  setCameraPreset: (preset: CameraPreset) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3 md:bottom-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-2xl border border-panel-border bg-panel/92 p-2 shadow-xl backdrop-blur-xl">
        <button
          onClick={() => setPlaying((value) => !value)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          aria-label={playing ? "Pause assembly" : "Play assembly"}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:block">
          Flat
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={foldProgress}
          onChange={(event) => setFoldProgress(Number(event.target.value))}
          className="w-28 accent-gold sm:w-48 lg:w-64"
          aria-label="Assembly progress"
        />
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:block">
          Closed
        </span>
        <span className="w-9 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
          {Math.round(foldProgress * 100)}%
        </span>
        <span className="mx-1 hidden h-6 w-px bg-panel-border md:block" />
        <button
          onClick={() => setCameraPreset("isometric")}
          className="studio-icon-button hidden md:inline-flex"
          title="Fit isometric · F"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setViewMode(viewMode === "split" ? "3d" : "split")}
          className="studio-icon-button hidden md:inline-flex"
          title="Toggle split view"
        >
          <Grid3x3 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            setPlaying(false);
            setFoldProgress(0);
          }}
          className="studio-icon-button"
          title="Reset assembly"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function FoldTicker({ playing }: { playing: boolean }) {
  const setFoldProgress = useConfiguratorStore((s) => s.setFoldProgress);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      const current = useConfiguratorStore.getState().foldProgress;
      const next = current + delta * 0.32;
      setFoldProgress(next >= 1 ? 0 : next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, setFoldProgress]);

  return null;
}

function TopbarButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="studio-icon-button" aria-label={label} title={label}>
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
    <section className="rounded-xl border border-panel-border bg-panel">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
      >
        {title}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="space-y-3 border-t border-panel-border p-3">{children}</div>}
    </section>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "success";
}) {
  return (
    <div className="rounded-lg border border-panel-border bg-surface-2 p-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-xs font-semibold",
          tone === "warning" && "text-warning",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success";
}) {
  return (
    <span
      className={cn(
        "rounded-full bg-muted px-2 py-1 font-mono text-[9px] uppercase text-muted-foreground",
        tone === "success" && "bg-success/10 text-success",
      )}
    >
      {children}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-panel-border bg-surface-2 px-4 py-7 text-center">
      <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-panel text-muted-foreground">
        {icon}
      </span>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function IconToggle({
  on,
  onClick,
  onIcon,
  offIcon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn("studio-icon-button", !on && "text-muted-foreground/50")}
      aria-label={label}
    >
      {on ? onIcon : offIcon}
    </button>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-xs">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-gold"
      />
    </label>
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
  onChange: (value: number) => void;
  unit?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-[10px] text-foreground">
          {Number.isInteger(value) ? value : value.toFixed(2)}
          {unit ?? ""}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-gold"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted-foreground">{label}</span>
      <span className="flex overflow-hidden rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring/30">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next) && next > 0) onChange(next);
          }}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-xs outline-none"
        />
        <span className="flex items-center border-l border-input bg-surface-2 px-2.5 font-mono text-[10px] text-muted-foreground">
          {unit}
        </span>
      </span>
      {(min != null || max != null) && (
        <span className="mt-1 block font-mono text-[9px] text-muted-foreground">
          Range {min ?? "—"}–{max ?? "—"} {unit}
        </span>
      )}
    </label>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 rounded-lg border border-input bg-background p-1.5">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-6 w-7 cursor-pointer border-0 bg-transparent p-0"
        />
        <span className="w-16 font-mono text-[10px] uppercase">{value}</span>
      </span>
    </label>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: (readonly [string, string])[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring/30"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function SummaryRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("max-w-[62%] text-right font-medium", mono && "font-mono text-[10px]")}>{value}</dd>
    </div>
  );
}
