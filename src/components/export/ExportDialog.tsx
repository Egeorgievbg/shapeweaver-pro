import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useConfiguratorStore } from "@/stores/configurator";
import { useI18n } from "@/lib/i18n";
import {
  EXPORT_CAPABILITIES,
  exportNative3D,
  type Native3DFormat,
} from "@/features/configurator/export/nativeExporters";
import {
  Box,
  ChevronDown,
  Download,
  FileCode,
  FileJson,
  Image as ImageIcon,
} from "lucide-react";

type Format = "png" | "json" | "svg" | Native3DFormat;
type Resolution = "1920" | "2048" | "3840" | "4096";

const THREE_D_FORMATS: Native3DFormat[] = ["glb", "gltf", "obj", "stl", "ply"];

export function ExportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const { t } = useI18n();
  const [format, setFormat] = useState<Format>("png");
  const [resolution, setResolution] = useState<Resolution>("2048");
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const model = useConfiguratorStore((state) => state.productModel);
  const exportConfiguration = useConfiguratorStore((state) => state.exportConfiguration);
  const productionStatus = (model as { productionStatus?: string } | null)?.productionStatus;
  const groupedCapabilities = useMemo(
    () =>
      EXPORT_CAPABILITIES.reduce<Record<string, typeof EXPORT_CAPABILITIES>>((groups, item) => {
        (groups[item.group] ??= []).push(item);
        return groups;
      }, {}),
    [],
  );

  const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const baseName = () => `gptsboxes-${model?.sourceId ?? "config"}-${timestamp()}`;

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const doExport = async () => {
    if (!model) return;
    setBusy(true);
    try {
      if (format === "json") {
        download(
          new Blob([exportConfiguration()], { type: "application/json" }),
          `${baseName()}.json`,
        );
      } else if (format === "svg") {
        if (!model.dieline) throw new Error(t("export.noDieline"));
        const svg = buildDielineSvg(model.name, model.dieline, transparent, productionStatus);
        download(new Blob([svg], { type: "image/svg+xml" }), `${baseName()}-dieline.svg`);
      } else if (format === "png") {
        const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
        if (!canvas) throw new Error(t("export.viewportNotReady"));
        const target = document.createElement("canvas");
        const size = Number.parseInt(resolution, 10);
        target.width = size;
        target.height = Math.max(1, Math.round((size * canvas.height) / canvas.width));
        const context = target.getContext("2d");
        if (!context) throw new Error("Canvas 2D context unavailable");
        if (!transparent) {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, target.width, target.height);
        }
        context.drawImage(canvas, 0, 0, target.width, target.height);
        const blob = await new Promise<Blob | null>((resolve) =>
          target.toBlob(resolve, "image/png"),
        );
        if (!blob) throw new Error("PNG encoding failed");
        download(blob, `${baseName()}.png`);
      } else {
        const blob = await exportNative3D(format);
        download(blob, `${baseName()}.${format}`);
      }
      toast.success(t("export.success"));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("export.title")}</DialogTitle>
          <DialogDescription>{t("export.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          <FormatButton
            active={format === "png"}
            onClick={() => setFormat("png")}
            icon={<ImageIcon className="h-4 w-4" />}
            label="PNG"
          />
          <FormatButton
            active={format === "svg"}
            onClick={() => setFormat("svg")}
            icon={<FileCode className="h-4 w-4" />}
            label="SVG"
          />
          <FormatButton
            active={format === "json"}
            onClick={() => setFormat("json")}
            icon={<FileJson className="h-4 w-4" />}
            label="JSON"
          />
          {THREE_D_FORMATS.map((item) => (
            <FormatButton
              key={item}
              active={format === item}
              onClick={() => setFormat(item)}
              icon={<Box className="h-4 w-4" />}
              label={item.toUpperCase()}
            />
          ))}
        </div>

        {format === "png" && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-xs font-medium">{t("export.resolution")}</p>
            <div className="grid grid-cols-4 gap-2">
              {(["1920", "2048", "3840", "4096"] as Resolution[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setResolution(value)}
                  className={`rounded border px-2 py-1 text-xs ${
                    resolution === value ? "border-gold bg-accent" : "border-input"
                  }`}
                >
                  {value}px
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={transparent}
                onChange={(event) => setTransparent(event.target.checked)}
                className="accent-gold"
              />
              {t("export.transparent")}
            </label>
          </div>
        )}

        {format === "svg" && (
          <p className="rounded-md bg-warning/20 p-3 text-xs text-foreground">
            {t("export.previewDieline")}
          </p>
        )}

        {THREE_D_FORMATS.includes(format as Native3DFormat) && (
          <p className="rounded-md bg-accent p-3 text-xs text-foreground">
            {t("export.currentPose")}
          </p>
        )}

        <div className="rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setShowMatrix((value) => !value)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium"
          >
            {t("export.capabilities")}
            <ChevronDown className={`h-4 w-4 transition ${showMatrix ? "rotate-180" : ""}`} />
          </button>
          {showMatrix && (
            <div className="space-y-3 border-t border-border p-3">
              {Object.entries(groupedCapabilities).map(([group, capabilities]) => (
                <div key={group}>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {group}
                  </p>
                  <div className="space-y-1">
                    {capabilities.map((capability) => (
                      <div
                        key={capability.id}
                        className="grid grid-cols-[64px_120px_1fr] gap-2 rounded bg-muted/45 px-2 py-1.5 text-[11px]"
                      >
                        <strong>{capability.id.toUpperCase()}</strong>
                        <span>{t(`export.${capability.support.replace("-", "")}`)}</span>
                        <span className="text-muted-foreground">{capability.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent"
          >
            {t("action.cancel")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={doExport}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> {t("action.export")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormatButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-md border p-3 text-xs ${
        active ? "border-gold bg-accent" : "border-input hover:bg-accent/60"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function buildDielineSvg(
  name: string,
  dieline: NonNullable<ReturnType<typeof useConfiguratorStore.getState>["productModel"]>["dieline"] extends infer Value
    ? Value extends { totalX: number }
      ? Value
      : never
    : never,
  transparent: boolean,
  productionStatus?: string,
): string {
  const { totalX, totalY, cutsPath, bleedsPath, folds, faces, sizeArrows } = dieline;
  const background = transparent
    ? ""
    : `<rect width="${totalX}" height="${totalY}" fill="#ffffff"/>`;
  const foldsSvg = folds
    .map(
      (fold) =>
        `<line data-layer="CREASE" x1="${fold.from[0]}" y1="${fold.from[1]}" x2="${fold.to[0]}" y2="${fold.to[1]}" stroke="#3366cc" stroke-width="0.5" stroke-dasharray="3 2"/>`,
    )
    .join("");
  const labels = faces
    .map(
      (panel) =>
        `<text data-layer="ANNOTATIONS" x="${panel.centroid.x}" y="${panel.centroid.y}" text-anchor="middle" font-size="6" fill="#888" font-family="monospace">${escapeXml(panel.name)}</text>`,
    )
    .join("");
  const arrows = sizeArrows
    .map(
      (size) =>
        `<line data-layer="DIMENSIONS" x1="${size.p1.x}" y1="${size.p1.y}" x2="${size.p2.x}" y2="${size.p2.y}" stroke="#666" stroke-width="0.3"/>${
          size.tpointer
            ? `<text data-layer="DIMENSIONS" x="${size.tpointer.x}" y="${size.tpointer.y}" text-anchor="middle" font-size="6" font-family="monospace">${escapeXml(size.label)}</text>`
            : ""
        }`,
    )
    .join("");
  const bleeds = bleedsPath
    ? `<path data-layer="BLEED" d="${bleedsPath}" fill="none" stroke="#cc00cc" stroke-width="0.4" stroke-dasharray="4 2"/>`
    : "";
  const watermark =
    productionStatus === "approved"
      ? ""
      : `<text x="${totalX / 2}" y="${totalY / 2}" text-anchor="middle" font-size="18" fill="#d40000" opacity="0.24" transform="rotate(-28 ${totalX / 2} ${totalY / 2})">UNVERIFIED / НЕПОТВЪРДЕН</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalX} ${totalY}" width="${totalX}mm" height="${totalY}mm">
  <title>${escapeXml(name)} — GPTSBOXES dieline</title>
  <metadata>production_status=${escapeXml(productionStatus ?? "unverified")}</metadata>
  ${background}
  ${bleeds}
  ${foldsSvg}
  <path data-layer="CUT" d="${cutsPath}" fill="none" stroke="#cc0000" stroke-width="0.6"/>
  ${labels}
  ${arrows}
  ${watermark}
</svg>`;
}

function escapeXml(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ??
      character,
  );
}
