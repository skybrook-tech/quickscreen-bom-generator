import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { CanonicalRun, CanonicalPayload } from "../../types/canonical.types";
import { useProductVariables } from "../../hooks/useProductVariables";
import { useBranding } from "../../hooks/useBranding";

interface VariationDisclosureProps {
  run: CanonicalRun;
  payload: CanonicalPayload;
  onUpdateJobVariables: (vars: Record<string, any>) => void;
  onUpdateRunVariables: (vars: Record<string, any>) => void;
}

function getOptionLabel(fieldKey: string, val: any): string {
  const strVal = String(val);
  if (fieldKey === "paling_style") {
    if (strVal === "butted") return "Butted";
    if (strVal === "lapped_capped") return "Lapped & Capped";
  }
  if (fieldKey === "timber_type") {
    if (strVal === "treated_pine") return "CCA Pine H4";
    if (strVal === "hardwood") return "Hardwood";
  }
  if (fieldKey === "post_size") {
    if (strVal === "100x75") return "100x75mm (Standard)";
    if (strVal === "100x100") return "100x100mm (Heavy Duty)";
  }
  if (fieldKey === "post_mounting") {
    if (strVal === "in_ground") return "In Ground (Concrete)";
    if (strVal === "core_drilled") return "Core Drilled";
  }
  if (fieldKey === "rail_profile") {
    if (strVal === "75x38") return "75x38mm (Pine / Hardwood)";
    if (strVal === "100x38") return "100x38mm (Heavy Pine / Hardwood)";
    if (strVal === "100x38_arrissed") return "100x38mm Arrissed (Eased Edge)";
  }
  if (fieldKey === "rail_count") {
    if (strVal === "0") return "Auto";
    return strVal;
  }
  if (fieldKey === "nail_type") {
    if (strVal === "ring_shank") return "Ring Shank";
    if (strVal === "smooth_shank") return "Smooth Shank";
  }
  if (fieldKey === "target_height_mm" || fieldKey === "paling_width_mm") {
    return `${strVal}mm`;
  }
  return strVal.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function VariationDisclosure({
  run,
  payload,
  onUpdateJobVariables,
  onUpdateRunVariables,
}: VariationDisclosureProps) {
  const [activeSection, setActiveSection] = useState<string | null>("style");

  // Merge variables for convenience of reading values
  const jobVars = payload.variables ?? {};
  const runVars = run.variables ?? {};

  // Fetch variables from all scopes for this productCode
  const productCode = payload.productCode;
  const activeSupplierSlug = jobVars.supplier_slug as string | undefined || "amazing-fencing";
  const { supplier } = useBranding(activeSupplierSlug);
  const orgId = supplier?.orgId || null;

  const { data: jobFields = [] } = useProductVariables(productCode, "job", orgId);
  const { data: runFields = [] } = useProductVariables(productCode, "run", orgId);
  const { data: segmentFields = [] } = useProductVariables(productCode, "segment", orgId);

  // Merge the fields
  const fields = [...jobFields, ...runFields, ...segmentFields];

  // Resolves the options for a given field key, with local hardcoded fallbacks
  const getFieldOptions = (fieldKey: string, fallbackOpts: any[]) => {
    const field = fields.find((f) => f.field_key === fieldKey);
    if (field && Array.isArray(field.options_json) && field.options_json.length > 0) {
      return field.options_json;
    }
    return fallbackOpts;
  };

  const getFieldDefault = (fieldKey: string, fallbackDefault: any) => {
    const field = fields.find((f) => f.field_key === fieldKey);
    if (field && field.default_value_json !== undefined && field.default_value_json !== null) {
      return field.default_value_json;
    }
    return fallbackDefault;
  };

  const palingStyle = jobVars.paling_style || getFieldDefault("paling_style", "butted");
  const timberType = jobVars.timber_type || getFieldDefault("timber_type", "treated_pine");
  const targetHeight = runVars.target_height_mm || jobVars.target_height_mm || getFieldDefault("target_height_mm", 1800);
  const postSize = runVars.post_size || getFieldDefault("post_size", "100x75");
  const postMounting = runVars.post_mounting || getFieldDefault("post_mounting", "in_ground");
  const palingWidth = jobVars.paling_width_mm || getFieldDefault("paling_width_mm", 100);
  const railProfile = runVars.rail_profile || getFieldDefault("rail_profile", "75x38");
  const railCount = runVars.rail_count != null ? Number(runVars.rail_count) : Number(getFieldDefault("rail_count", 0)); // 0 = auto
  const plinthEnabled = jobVars.plinth_enabled !== undefined ? jobVars.plinth_enabled === true : getFieldDefault("plinth_enabled", false) === true;
  const nailType = jobVars.nail_type || getFieldDefault("nail_type", "ring_shank");

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <div className="mt-4 border border-brand-border/40 rounded-xl overflow-hidden bg-brand-bg/25 text-xs text-brand-text">
      {/* 1. STYLE SECTION */}
      <div className="border-b border-brand-border/40">
        <button
          type="button"
          onClick={() => toggleSection("style")}
          className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
            activeSection === "style" ? "bg-[#FCF1E6]/50" : "hover:bg-[#FCF1E6]/10"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6E7681]">Style & Height</span>
          <div className="flex items-center gap-2">
            {activeSection !== "style" && (
              <span className="af-sidebar-mono text-[#11161D] font-semibold capitalize">
                {String(palingStyle).replace("_", " & ")} · {String(targetHeight)}mm
              </span>
            )}
            <span className={activeSection === "style" ? "text-[#DD6E1B]" : "text-[#6E7681]"}>
              {activeSection === "style" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </div>
        </button>

        {activeSection === "style" && (
          <div className="p-3 bg-brand-bg space-y-3 border-t border-brand-border/20 text-xs">
            {/* Style selector */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.12em]">Style</span>
              <div className="flex gap-2">
                {getFieldOptions("paling_style", ["butted", "lapped_capped"]).map((optVal) => {
                  const val = String(optVal);
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onUpdateJobVariables({ paling_style: val })}
                      className={`flex-1 min-h-9 px-3 rounded-lg border text-center font-semibold transition-all ${
                        palingStyle === val
                          ? "bg-[#DD6E1B] border-[#DD6E1B] text-white shadow-sm"
                          : "border-brand-border text-brand-muted hover:border-brand-text"
                      }`}
                    >
                      {getOptionLabel("paling_style", val)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Height selector */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.12em]">Height</span>
              <div className="flex flex-wrap gap-1.5">
                {getFieldOptions("target_height_mm", [1200, 1500, 1800, 2100, 2400]).map((hVal) => {
                  const h = Number(hVal);
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => onUpdateRunVariables({ target_height_mm: h })}
                      className={`min-h-9 px-3.5 rounded-lg border text-center font-semibold transition-all ${
                        Number(targetHeight) === h
                          ? "bg-[#DD6E1B] border-[#DD6E1B] text-white shadow-sm"
                          : "border-brand-border text-brand-muted hover:border-brand-text"
                      }`}
                    >
                      {getOptionLabel("target_height_mm", h)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. POSTS SECTION */}
      <div className="border-b border-brand-border/40">
        <button
          type="button"
          onClick={() => toggleSection("posts")}
          className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
            activeSection === "posts" ? "bg-[#FCF1E6]/50" : "hover:bg-[#FCF1E6]/10"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6E7681]">Posts Specification</span>
          <div className="flex items-center gap-2">
            {activeSection !== "posts" && (
              <span className="af-sidebar-mono text-[#11161D] font-semibold capitalize">
                {timberType === "hardwood" ? "Hardwood" : "CCA Pine"} · {postSize} · {postMounting === "core_drilled" ? "Core-drill" : "In-ground"}
              </span>
            )}
            <span className={activeSection === "posts" ? "text-[#DD6E1B]" : "text-[#6E7681]"}>
              {activeSection === "posts" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </div>
        </button>

        {activeSection === "posts" && (
          <div className="p-3 bg-brand-bg space-y-3 border-t border-brand-border/20 text-xs">
            {/* Post Material */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.12em]">Post Material</span>
              <div className="flex gap-2">
                {getFieldOptions("timber_type", ["treated_pine", "hardwood"]).map((optVal) => {
                  const val = String(optVal);
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onUpdateJobVariables({ timber_type: val })}
                      className={`flex-1 min-h-9 px-3 rounded-lg border text-center font-semibold transition-all ${
                        timberType === val
                          ? "bg-[#DD6E1B] border-[#DD6E1B] text-white shadow-sm"
                          : "border-brand-border text-brand-muted hover:border-brand-text"
                      }`}
                    >
                      {getOptionLabel("timber_type", val)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Post Size Dropdown */}
            <div className="space-y-1">
              <label htmlFor="post-size-select" className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.12em] block">
                Post Size
              </label>
              <select
                id="post-size-select"
                value={String(postSize)}
                onChange={(e) => onUpdateRunVariables({ post_size: e.target.value })}
                className="w-full h-9 rounded-lg border border-brand-border bg-brand-bg px-2 text-brand-text focus:border-[#DD6E1B] focus:outline-none"
              >
                {getFieldOptions("post_size", ["100x75", "100x100"]).map((optVal) => {
                  const val = String(optVal);
                  return (
                    <option key={val} value={val}>
                      {getOptionLabel("post_size", val)}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Mounting Method */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.12em]">Mounting</span>
              <div className="flex gap-2">
                {getFieldOptions("post_mounting", ["in_ground", "core_drilled"]).map((optVal) => {
                  const val = String(optVal);
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onUpdateRunVariables({ post_mounting: val })}
                      className={`flex-1 min-h-9 px-3 rounded-lg border text-center font-semibold transition-all ${
                        postMounting === val
                          ? "bg-[#DD6E1B] border-[#DD6E1B] text-white shadow-sm"
                          : "border-brand-border text-brand-muted hover:border-brand-text"
                      }`}
                    >
                      {getOptionLabel("post_mounting", val)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. PALINGS SECTION */}
      <div className="border-b border-brand-border/40">
        <button
          type="button"
          onClick={() => toggleSection("palings")}
          className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
            activeSection === "palings" ? "bg-[#FCF1E6]/50" : "hover:bg-[#FCF1E6]/10"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6E7681]">Palings Specification</span>
          <div className="flex items-center gap-2">
            {activeSection !== "palings" && (
              <span className="af-sidebar-mono text-[#11161D] font-semibold">
                {palingWidth}mm width · {targetHeight}mm length
              </span>
            )}
            <span className={activeSection === "palings" ? "text-[#DD6E1B]" : "text-[#6E7681]"}>
              {activeSection === "palings" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </div>
        </button>

        {activeSection === "palings" && (
          <div className="p-3 bg-brand-bg space-y-3 border-t border-brand-border/20 text-xs">
            {/* Paling Width */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.12em]">Paling Width</span>
              <div className="flex gap-2">
                {getFieldOptions("paling_width_mm", [100, 125, 150]).map((wVal) => {
                  const w = Number(wVal);
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => onUpdateJobVariables({ paling_width_mm: w })}
                      className={`flex-1 min-h-9 px-3 rounded-lg border text-center font-semibold transition-all ${
                        Number(palingWidth) === w
                          ? "bg-[#DD6E1B] border-[#DD6E1B] text-white shadow-sm"
                          : "border-brand-border text-brand-muted hover:border-brand-text"
                      }`}
                    >
                      {getOptionLabel("paling_width_mm", w)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paling Length (calculated) */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.12em]">Paling Length</span>
              <div className="flex gap-2">
                <div className="flex-1 min-h-9 px-3 py-2 rounded-lg border border-brand-border bg-brand-bg/50 text-center font-semibold text-brand-muted">
                  {targetHeight}mm (Matches height)
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. RAILS SECTION */}
      <div className="border-b border-brand-border/40">
        <button
          type="button"
          onClick={() => toggleSection("rails")}
          className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
            activeSection === "rails" ? "bg-[#FCF1E6]/50" : "hover:bg-[#FCF1E6]/10"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6E7681]">Rails Specification</span>
          <div className="flex items-center gap-2">
            {activeSection !== "rails" && (
              <span className="af-sidebar-mono text-[#11161D] font-semibold capitalize">
                {String(railProfile).replace("_", " ")} · {railCount === 0 ? "Auto" : `${railCount} Rails`}
              </span>
            )}
            <span className={activeSection === "rails" ? "text-[#DD6E1B]" : "text-[#6E7681]"}>
              {activeSection === "rails" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </div>
        </button>

        {activeSection === "rails" && (
          <div className="p-3 bg-brand-bg space-y-3 border-t border-brand-border/20 text-xs">
            {/* Rail Size dropdown */}
            <div className="space-y-1">
              <label htmlFor="rail-size-select" className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.12em] block">
                Rail Size
              </label>
              <select
                id="rail-size-select"
                value={String(railProfile)}
                onChange={(e) => onUpdateRunVariables({ rail_profile: e.target.value })}
                className="w-full h-9 rounded-lg border border-brand-border bg-brand-bg px-2 text-brand-text focus:border-[#DD6E1B] focus:outline-none capitalize"
              >
                {getFieldOptions("rail_profile", ["75x38", "100x38", "100x38_arrissed"]).map((optVal) => {
                  const val = String(optVal);
                  return (
                    <option key={val} value={val}>
                      {getOptionLabel("rail_profile", val)}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Rails per panel */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.12em]">Rails per panel</span>
              <div className="flex gap-1.5">
                {getFieldOptions("rail_count", [0, 2, 3, 4]).map((optVal) => {
                  const val = Number(optVal);
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onUpdateRunVariables({ rail_count: val })}
                      className={`min-h-9 px-3.5 rounded-lg border text-center font-semibold transition-all ${
                        railCount === val
                          ? "bg-[#DD6E1B] border-[#DD6E1B] text-white shadow-sm"
                          : "border-brand-border text-brand-muted hover:border-brand-text"
                      }`}
                    >
                      {getOptionLabel("rail_count", val)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. EXTRAS SECTION */}
      <div>
        <button
          type="button"
          onClick={() => toggleSection("extras")}
          className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
            activeSection === "extras" ? "bg-[#FCF1E6]/50" : "hover:bg-[#FCF1E6]/10"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6E7681]">Extras & Fasteners</span>
          <div className="flex items-center gap-2">
            {activeSection !== "extras" && (
              <span className="af-sidebar-mono text-[#11161D] font-semibold capitalize">
                Plinth: {plinthEnabled ? "Yes" : "No"} · Nails: {String(nailType).replace("_", " ")}
              </span>
            )}
            <span className={activeSection === "extras" ? "text-[#DD6E1B]" : "text-[#6E7681]"}>
              {activeSection === "extras" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </div>
        </button>

        {activeSection === "extras" && (
          <div className="p-3 bg-brand-bg space-y-3 border-t border-brand-border/20 text-xs">
            {/* Plinth toggle */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-brand-text">Include Bottom Plinth Board</span>
              <button
                type="button"
                onClick={() => onUpdateJobVariables({ plinth_enabled: !plinthEnabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  plinthEnabled ? "bg-[#DD6E1B]" : "bg-brand-border"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    plinthEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Nail type toggle */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.12em]">Nail Type</span>
              <div className="flex gap-2">
                {getFieldOptions("nail_type", ["ring_shank", "smooth_shank"]).map((optVal) => {
                  const val = String(optVal);
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onUpdateJobVariables({ nail_type: val })}
                      className={`flex-1 min-h-9 px-3 rounded-lg border text-center font-semibold transition-all ${
                        nailType === val
                          ? "bg-[#DD6E1B] border-[#DD6E1B] text-white shadow-sm"
                          : "border-brand-border text-brand-muted hover:border-brand-text"
                      }`}
                    >
                      {getOptionLabel("nail_type", val)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
