import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useConfiguratorStore } from "@/stores/configurator";
import { quoteDrafts } from "@/stores/persistence";
import { AlertCircle } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(2, "Full name required").max(120),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1, "Min 1").max(10_000_000),
  deadline: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent required" }) }),
});
type FormValues = z.infer<typeof schema>;

export function QuoteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const model = useConfiguratorStore((s) => s.productModel);
  const exportConfiguration = useConfiguratorStore((s) => s.exportConfiguration);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 500, consent: false as unknown as true },
  });

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
      const previewDataUrl = canvas ? canvas.toDataURL("image/png") : undefined;
      quoteDrafts.add({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        name: data.name,
        company: data.company || undefined,
        email: data.email,
        phone: data.phone || undefined,
        quantity: data.quantity,
        deadline: data.deadline || undefined,
        notes: data.notes || undefined,
        configurationPayload: exportConfiguration(),
        previewDataUrl,
        sourceProductId: model?.sourceId ?? null,
        status: "draft",
      });
      toast.success("Quote saved as draft", {
        description: "The quote endpoint is not configured yet, so we've stored your request locally.",
      });
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a quote</DialogTitle>
          <DialogDescription>
            We'll attach your configuration, dimensions, material, and preview render to the request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
          <Field label="Full name" error={errors.name?.message}>
            <input {...register("name")} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company" error={errors.company?.message}>
              <input {...register("company")} className="input" />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <input {...register("phone")} className="input" />
            </Field>
          </div>
          <Field label="Email" error={errors.email?.message}>
            <input type="email" {...register("email")} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity" error={errors.quantity?.message}>
              <input type="number" {...register("quantity")} className="input" />
            </Field>
            <Field label="Deadline" error={errors.deadline?.message}>
              <input type="date" {...register("deadline")} className="input" />
            </Field>
          </div>
          <Field label="Notes" error={errors.notes?.message}>
            <textarea rows={3} {...register("notes")} className="input" placeholder="Print effects, colors, delivery details…" />
          </Field>

          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" {...register("consent")} className="mt-0.5 accent-gold" />
            <span>I agree to be contacted regarding this request.</span>
          </label>
          {errors.consent && <p className="text-xs text-destructive">{errors.consent.message}</p>}

          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
            <AlertCircle className="mr-1 inline h-3 w-3" />
            The quote submission endpoint is not configured yet. Your request will be saved as a
            local draft until an endpoint is provided.
          </div>

          <DialogFooter>
            <button type="button" onClick={() => onOpenChange(false)}
              className="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent">Cancel</button>
            <button type="submit" disabled={submitting}
              className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-gold-foreground disabled:opacity-50">
              {submitting ? "Saving…" : "Save as draft"}
            </button>
          </DialogFooter>
        </form>

        <style>{`
          .input { display:block; width:100%; border:1px solid var(--color-input); background:var(--color-background); padding:.4rem .5rem; border-radius:.375rem; font-size:.8rem; }
          .input:focus { outline:none; box-shadow:0 0 0 2px var(--color-ring); }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
