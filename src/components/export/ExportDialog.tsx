import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useConfiguratorStore } from "@/stores/configurator";
import { Download, FileJson, Image as ImageIcon, FileCode } from "lucide-react";

type Format = "png" | "json" | "svg";
type Resolution = "1920" | "2048" | "3840";

export function ExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [format, setFormat] = useState<Format>("png");
  const [res, setRes] = useState<Resolution>("2048");
  const [transparent, setTransparent] = useState(false);
  const [busy, setBusy] = useState(false);
  const model = useConfiguratorStore((s) => s.productModel);
  const exportConfiguration = useConfiguratorStore((s) => s.exportConfiguration);

  const timestamp = () => new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const baseName = () => `gptsboxes-${model?.sourceId ?? "config"}-${timestamp()}`;

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const doExport = async () => {
    if (!model) return;
    setBusy(true);
    try {
      if (format === "json") {
        const payload = exportConfiguration();
        download(new Blob([payload], { type: "application/json" }), `${baseName()}.json`);
        toast.success("Configuration exported");
      } else if (format === "svg") {
        const d = model.dieline;
        if (!d) throw new Error("No dieline available");
        const svg = buildDielineSvg(model.name, d, transparent);
        download(new Blob([svg], { type: "image/svg+xml" }), `${baseName()}-dieline.svg`);
        toast.success("Dieline exported (preview quality — not production certified)");
      } else if (format === "png") {
        const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
        if (!canvas) throw new Error("Viewport not ready");
        // Rescale via offscreen canvas
        const target = document.createElement("canvas");
        const size = parseInt(res, 10);
        target.width = size;
        target.height = Math.round((size * canvas.height) / canvas.width);
        const ctx = target.getContext("2d")!;
        if (!transparent) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, target.width, target.height);
        }
        ctx.drawImage(canvas, 0, 0, target.width, target.height);
        const blob = await new Promise<Blob | null>((resolve) => target.toBlob(resolve, "image/png"));
        if (!blob) throw new Error("PNG encoding failed");
        download(blob, `${baseName()}.png`);
        toast.success(`Exported ${target.width}×${target.height}`);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>Save your configuration as an image, dieline, or configuration file.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <FormatBtn active={format === "png"} onClick={() => setFormat("png")} icon={<ImageIcon className="h-4 w-4" />} label="PNG render" />
          <FormatBtn active={format === "svg"} onClick={() => setFormat("svg")} icon={<FileCode className="h-4 w-4" />} label="SVG dieline" />
          <FormatBtn active={format === "json"} onClick={() => setFormat("json")} icon={<FileJson className="h-4 w-4" />} label="JSON config" />
        </div>

        {format === "png" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Resolution</label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {(["1920", "2048", "3840"] as Resolution[]).map((r) => (
                  <button key={r} onClick={() => setRes(r)}
                    className={`rounded border px-2 py-1 text-xs ${res === r ? "border-gold bg-accent" : "border-input"}`}>
                    {r}px
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} className="accent-gold" />
              Transparent background
            </label>
          </div>
        )}

        {format === "svg" && (
          <p className="rounded-md bg-warning/20 p-3 text-xs text-foreground">
            SVG dieline is a preview export. It reflects the source knife data but has not been
            production-certified.
          </p>
        )}

        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent">Cancel</button>
          <button disabled={busy} onClick={doExport}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
            <Download className="h-4 w-4" /> Export
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormatBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 rounded-md border p-3 text-xs ${active ? "border-gold bg-accent" : "border-input hover:bg-accent/60"}`}>
      {icon}
      {label}
    </button>
  );
}

function buildDielineSvg(name: string, d: NonNullable<ReturnType<typeof useConfiguratorStore.getState>["productModel"]>["dieline"] extends infer T ? T extends { totalX: number } ? T : never : never, transparent: boolean): string {
  const { totalX, totalY, cutsPath, bleedsPath, folds, faces, sizeArrows } = d;
  const bg = transparent ? "" : `<rect width="${totalX}" height="${totalY}" fill="#ffffff"/>`;
  const foldsSvg = folds.map((f) => `<line x1="${f.from[0]}" y1="${f.from[1]}" x2="${f.to[0]}" y2="${f.to[1]}" stroke="#3366cc" stroke-width="0.5" stroke-dasharray="3 2"/>`).join("");
  const labels = faces.map((p) => `<text x="${p.centroid.x}" y="${p.centroid.y}" text-anchor="middle" font-size="6" fill="#888" font-family="monospace">${p.name}</text>`).join("");
  const arrows = sizeArrows.map((s) => `<line x1="${s.p1.x}" y1="${s.p1.y}" x2="${s.p2.x}" y2="${s.p2.y}" stroke="#666" stroke-width="0.3"/>${s.tpointer ? `<text x="${s.tpointer.x}" y="${s.tpointer.y}" text-anchor="middle" font-size="6" font-family="monospace">${s.label}</text>` : ""}`).join("");
  const bleeds = bleedsPath ? `<path d="${bleedsPath}" fill="none" stroke="#cc00cc" stroke-width="0.4" stroke-dasharray="4 2"/>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalX} ${totalY}" width="${totalX}mm" height="${totalY}mm">
  <title>${escapeXml(name)} — dieline (GPTSBOXES preview export)</title>
  <metadata>Generated by GPTSBOXES 3D Packaging Studio</metadata>
  ${bg}
  ${bleeds}
  ${foldsSvg}
  <path d="${cutsPath}" fill="none" stroke="#cc0000" stroke-width="0.6"/>
  ${labels}
  ${arrows}
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] ?? c));
}
