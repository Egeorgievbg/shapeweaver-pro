import { useState, type ReactNode } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { quoteDrafts } from "@/stores/persistence";
import { useI18n, type Locale } from "@/lib/i18n";
import { AlertCircle } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1).max(10_000_000),
  deadline: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  consent: z.literal(true),
});

type FormValues = z.infer<typeof schema>;

type QuoteCopy = {
  title: string;
  description: string;
  fullName: string;
  company: string;
  phone: string;
  email: string;
  quantity: string;
  deadline: string;
  deadlinePlaceholder: string;
  notes: string;
  notesPlaceholder: string;
  consent: string;
  warning: string;
  cancel: string;
  saving: string;
  saveDraft: string;
  savedTitle: string;
  savedDescription: string;
  errors: {
    name: string;
    email: string;
    quantity: string;
    consent: string;
  };
};

const COPY: Record<Locale, QuoteCopy> = {
  bg: {
    title: "Заявка за оферта",
    description:
      "Към заявката ще бъдат приложени конфигурацията, размерите, материалът и текущият визуален преглед.",
    fullName: "Име и фамилия",
    company: "Фирма",
    phone: "Телефон",
    email: "Имейл",
    quantity: "Количество",
    deadline: "Желан срок",
    deadlinePlaceholder: "дд.мм.гггг",
    notes: "Бележки",
    notesPlaceholder: "Ефекти, цветове, доставка и други изисквания…",
    consent: "Съгласявам се да се свържете с мен във връзка с тази заявка.",
    warning:
      "Онлайн изпращането на оферти все още не е свързано. Заявката ще бъде запазена локално като чернова.",
    cancel: "Отказ",
    saving: "Запазване…",
    saveDraft: "Запази като чернова",
    savedTitle: "Офертата е запазена като чернова",
    savedDescription: "Черновата е налична локално, докато бъде свързан сървърният endpoint.",
    errors: {
      name: "Въведете име и фамилия.",
      email: "Въведете валиден имейл адрес.",
      quantity: "Количество трябва да бъде поне 1.",
      consent: "Необходимо е съгласие за контакт.",
    },
  },
  en: {
    title: "Request a quote",
    description:
      "Your configuration, dimensions, material and current preview will be attached to the request.",
    fullName: "Full name",
    company: "Company",
    phone: "Phone",
    email: "Email",
    quantity: "Quantity",
    deadline: "Preferred deadline",
    deadlinePlaceholder: "dd/mm/yyyy",
    notes: "Notes",
    notesPlaceholder: "Print effects, colours, delivery details and other requirements…",
    consent: "I agree to be contacted regarding this request.",
    warning:
      "The quote submission endpoint is not connected yet. The request will be stored locally as a draft.",
    cancel: "Cancel",
    saving: "Saving…",
    saveDraft: "Save as draft",
    savedTitle: "Quote saved as draft",
    savedDescription: "The draft is stored locally until the server endpoint is connected.",
    errors: {
      name: "Enter your full name.",
      email: "Enter a valid email address.",
      quantity: "Quantity must be at least 1.",
      consent: "Consent is required.",
    },
  },
};

export function QuoteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const model = useConfiguratorStore((state) => state.productModel);
  const exportConfiguration = useConfiguratorStore((state) => state.exportConfiguration);
  const { locale } = useI18n();
  const copy = COPY[locale];
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 500, consent: false as unknown as true },
  });

  const errorMessage = (field: keyof QuoteCopy["errors"]) =>
    errors[field]?.message ? copy.errors[field] : undefined;

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
      toast.success(copy.savedTitle, { description: copy.savedDescription });
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
          <Field label={copy.fullName} error={errorMessage("name")}>
            <input {...register("name")} autoComplete="name" className="input" />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={copy.company} error={errors.company?.message}>
              <input {...register("company")} autoComplete="organization" className="input" />
            </Field>
            <Field label={copy.phone} error={errors.phone?.message}>
              <input {...register("phone")} autoComplete="tel" inputMode="tel" className="input" />
            </Field>
          </div>

          <Field label={copy.email} error={errorMessage("email")}>
            <input type="email" {...register("email")} autoComplete="email" className="input" />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={copy.quantity} error={errorMessage("quantity")}>
              <input type="number" min={1} {...register("quantity")} className="input" />
            </Field>
            <Field label={copy.deadline} error={errors.deadline?.message}>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={copy.deadlinePlaceholder}
                {...register("deadline")}
                className="input"
              />
            </Field>
          </div>

          <Field label={copy.notes} error={errors.notes?.message}>
            <textarea
              rows={3}
              {...register("notes")}
              className="input resize-y"
              placeholder={copy.notesPlaceholder}
            />
          </Field>

          <label className="flex items-start gap-2.5 rounded-lg border border-panel-border bg-surface-2 p-3 text-xs leading-5">
            <input type="checkbox" {...register("consent")} className="mt-1 accent-gold" />
            <span>{copy.consent}</span>
          </label>
          {errors.consent && <p className="text-xs text-destructive">{copy.errors.consent}</p>}

          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs leading-5 text-muted-foreground">
            <AlertCircle className="mr-1.5 inline h-3.5 w-3.5 text-warning" />
            {copy.warning}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-input px-4 py-2 text-sm hover:bg-accent"
            >
              {copy.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-gold-foreground disabled:opacity-50"
            >
              {submitting ? copy.saving : copy.saveDraft}
            </button>
          </DialogFooter>
        </form>

        <style>{`
          .input { display:block; width:100%; min-height:2.5rem; border:1px solid var(--color-input); background:var(--color-background); padding:.55rem .65rem; border-radius:.5rem; font-size:.82rem; }
          .input:focus { outline:none; box-shadow:0 0 0 2px var(--color-ring); }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
