import { useEffect, useRef } from "react";
import { AlignJustify, GalleryVertical, Zap, Package } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SubmitHandler } from "react-hook-form";
import {
  FenceConfigSchema,
  defaultFenceConfig,
} from "../../schemas/fence.schema";
import type { FenceConfig } from "../../schemas/fence.schema";
import { useFenceConfig } from "../../context/FenceConfigContext";
import { FormField } from "../shared/FormField";
import { ColourSelect } from "./ColourSelect";
import { SlatSizeSelect } from "./SlatSizeSelect";
import { SlatGapSelect } from "./SlatGapSelect";
import { ButtonGroup } from "../shared/ButtonGroup";
import {
  SYSTEM_TYPES,
  PANEL_WIDTHS,
  POST_MOUNTINGS,
  TERMINATIONS,
} from "../../lib/constants";

// Shared class for all form inputs/selects
const inputCls =
  "w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-md text-sm text-brand-text " +
  "focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent " +
  "transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

interface FenceConfigFormProps {
  /** Called after form validates successfully. MainApp reads config from context. */
  onGenerate?: () => void;
}

const SYSTEM_TYPE_ICONS: Record<string, React.ReactNode> = {
  QSHS: <AlignJustify size={18} />,
  VS: <GalleryVertical size={18} />,
  XPL: <Zap size={18} />,
  BAYG: <Package size={18} />,
};

export function FenceConfigForm({ onGenerate }: FenceConfigFormProps) {
  const { state: contextState, dispatch } = useFenceConfig();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<FenceConfig>({
    resolver: zodResolver(FenceConfigSchema),
    defaultValues: defaultFenceConfig,
  });

  // Seed from context once on mount so pre-populated values (e.g. from layout tool) are reflected
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    reset({ ...defaultFenceConfig, ...contextState });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sync fields that external sources (canvas layout, parser) can change back into the
  // form. Runs after mount only (seeded guard prevents a loop on the initial reset).
  const fields: (keyof FenceConfig)[] = [
    "totalRunLength", "corners", "colour", "targetHeight",
    "slatSize", "slatGap", "postMounting", "leftTermination",
    "rightTermination", "maxPanelWidth", "systemType",
  ];
  useEffect(() => {
    if (!seeded.current) return;
    for (const field of fields) {
      setValue(field as never, contextState[field] as never, { shouldValidate: false });
    }
  }, fields.map((f) => contextState[f])); // eslint-disable-line react-hooks/exhaustive-deps

  const systemType = watch("systemType");
  const isXpl = systemType === "XPL";

  const systemTypeOptions = SYSTEM_TYPES.map((s) => ({
    ...s,
    icon: SYSTEM_TYPE_ICONS[s.value],
  }));

  // Enforce XPL → 65mm in the form as well as context
  useEffect(() => {
    if (isXpl) {
      setValue("slatSize", "65");
    }
  }, [isXpl, setValue]);

  // Sync every change back to the context so downstream components always have the latest values
  useEffect(() => {
    const subscription = watch((values) => {
      dispatch({ type: "SET_CONFIG", config: values as Partial<FenceConfig> });
    });
    return () => subscription.unsubscribe();
  }, [watch, dispatch]);

  const onSubmit: SubmitHandler<FenceConfig> = (data) => {
    // Flush validated form values to context synchronously before generating,
    // in case the watch() subscription hasn't fired yet (e.g. under Cypress).
    dispatch({ type: "SET_CONFIG", config: data });
    onGenerate?.();
  };

  return (
    <form id="fence-config-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* ── Row 1: System type ────────────────────────────────────── */}
      <div className="mb-6">
        <FormField label="System Type" error={errors.systemType?.message}>
          <Controller
            name="systemType"
            control={control}
            render={({ field }) => (
              <ButtonGroup
                options={systemTypeOptions}
                value={field.value}
                onChange={field.onChange}
                variant="system-type"
                data-testid="system-type"
              />
            )}
          />
        </FormField>
      </div>

      {/* ── Row 2: Customer ref / Run length / Target height ─────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <FormField label="Customer / Job Reference">
          <input
            {...register("customerRef")}
            type="text"
            placeholder="e.g. Smith Residence – Side Fence"
            className={inputCls}
          />
        </FormField>

        <FormField
          label="Total Run Length (m)"
          error={errors.totalRunLength?.message}
        >
          <input
            {...register("totalRunLength", { valueAsNumber: true })}
            type="number"
            step="0.1"
            min="0.1"
            data-testid="run-length"
            data-unit="m"
            className={inputCls}
            onBlur={(e) => {
              const raw = parseFloat(e.target.value);
              if (!isNaN(raw)) {
                const rounded = Math.ceil(raw * 10) / 10;
                setValue("totalRunLength", rounded, { shouldValidate: true });
              }
            }}
          />
        </FormField>

        <FormField
          label="Target Height (mm)"
          error={errors.targetHeight?.message}
          note="300 – 2400mm"
        >
          <input
            {...register("targetHeight", { valueAsNumber: true })}
            type="number"
            step="1"
            min="300"
            max="2400"
            data-testid="target-height"
            className={inputCls}
          />
        </FormField>
      </div>

      {/* ── Row 3: Slat size / Slat gap / Colour / Max panel width ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <FormField label="Slat Size" error={errors.slatSize?.message}>
          <SlatSizeSelect
            {...register("slatSize")}
            data-testid="slat-size"
            disabled={isXpl}
            className={inputCls}
          />
          {isXpl && (
            <p className="text-xs text-brand-muted mt-1">XPL uses 65mm only</p>
          )}
        </FormField>

        <FormField label="Slat Gap" error={errors.slatGap?.message}>
          <SlatGapSelect
            {...register("slatGap")}
            data-testid="slat-gap"
            className={inputCls}
          />
        </FormField>

        <FormField label="Colour" error={errors.colour?.message}>
          <ColourSelect
            {...register("colour")}
            data-testid="colour"
            className={inputCls}
          />
        </FormField>

        <FormField
          label="Max Panel Width"
          note="Use 2000mm for windy/exposed sites"
          error={errors.maxPanelWidth?.message}
        >
          <select
            {...register("maxPanelWidth")}
            data-testid="max-panel-width"
            className={inputCls}
          >
            {PANEL_WIDTHS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {/* ── Row 4: Terminations / Post mounting / Corners ────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <FormField
          label="Left Termination"
          error={errors.leftTermination?.message}
        >
          <select
            {...register("leftTermination")}
            data-testid="left-termination"
            className={inputCls}
          >
            {TERMINATIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Right Termination"
          error={errors.rightTermination?.message}
        >
          <select
            {...register("rightTermination")}
            data-testid="right-termination"
            className={inputCls}
          >
            {TERMINATIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Post Mounting" error={errors.postMounting?.message}>
          <select
            {...register("postMounting")}
            data-testid="post-mounting"
            className={inputCls}
          >
            {POST_MOUNTINGS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="90° Corners in Run"
          note="Each corner adds 1 post"
          error={errors.corners?.message}
        >
          <input
            {...register("corners", { valueAsNumber: true })}
            type="number"
            min="0"
            max="10"
            step="1"
            data-testid="corners"
            className={inputCls}
          />
        </FormField>
      </div>
    </form>
  );
}
