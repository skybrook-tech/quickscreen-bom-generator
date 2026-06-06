import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useProfile } from "../../context/ProfileContext";
import { Button } from "../ui/Button";
import { 
  Wand2, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  Send, 
  AlertTriangle,
  Settings,
  Sliders,
  Sparkles,
  ShoppingBag
} from "lucide-react";
import { toast } from "sonner";
import { parseDescription, type ParseResult, type ColourCode, type ParsedSystemType } from "../../lib/describeFenceParser";

interface CalculatorBuilderWizardProps {
  onClose: () => void;
  onApply: (data: {
    name: string;
    description: string;
    supplierId: string;
    archetypeId: string;
    visibility: string;
    variables: any[];
    rules: any[];
    selectors: any[];
  }) => void;
  supplierId: string;
  archetypeId: string;
  calcName: string;
  calcDescription: string;
}

// Color code mapper

const COLOUR_NAMES: Record<ColourCode, string> = {
  "B": "black-satin",
  "MN": "monument-matt",
  "G": "woodland-grey-matt",
  "SM": "surfmist-matt",
  "W": "pearl-white-gloss",
  "BS": "basalt-satin",
  "D": "dune-satin",
  "M": "mill",
  "P": "primrose",
  "PB": "paperbark",
  "S": "palladium-silver-pearl"
};

export function CalculatorBuilderWizard({
  onClose,
  onApply,
  supplierId,
  archetypeId,
  calcName: initialCalcName,
  calcDescription: initialCalcDescription
}: CalculatorBuilderWizardProps) {
  const { user, orgId } = useProfile();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Raw Description pre-fill state
  const [rawDescription, setRawDescription] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParseResult | null>(null);

  // Form State
  const [calcName, setCalcName] = useState(initialCalcName || "Custom Slat Fence System");
  const [calcDescription, setCalcDescription] = useState(initialCalcDescription || "Custom Visual Fencing System");
  const [selectedSupplierId] = useState(supplierId || "");
  const [selectedArchetypeId] = useState(archetypeId || "");
  const [systemType, setSystemType] = useState<ParsedSystemType>("QSHS");
  const [slatSize, setSlatSize] = useState<"65" | "90">("65");
  const [slatGap, setSlatGap] = useState<"5" | "9" | "20">("9");
  const [colour, setColour] = useState<ColourCode>("MN");
  
  // Step 2 Spacing
  const [runLength, setRunLength] = useState("6000");
  const [height, setHeight] = useState("1800");
  const [panelWidth, setPanelWidth] = useState("2600");

  // Step 3 Accessories
  const [mountingMethod, setMountingMethod] = useState<"concreted" | "base_plated" | "core_drilled">("concreted");
  const [postSize, setPostSize] = useState<"50" | "65" | "75" | "100">("50");
  const [corners, setCorners] = useState(0);
  const [termination, setTermination] = useState<"post_post" | "post_wall" | "wall_wall">("post_post");
  const [hasGate, setHasGate] = useState(false);
  const [gateType, setGateType] = useState<"pedestrian" | "sliding">("pedestrian");

  // Database comparison states
  const [contractorComponents, setContractorComponents] = useState<any[]>([]);
  const [masterComponents, setMasterComponents] = useState<any[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  useEffect(() => {
    fetchComponents();
  }, [selectedSupplierId]);

  const fetchComponents = async () => {
    setComparisonLoading(true);
    try {
      // 1. Fetch Glass Outlet org ID
      const { data: goOrg } = await supabase
        .from("organisations")
        .select("id")
        .eq("slug", "glass-outlet")
        .single();
      
      // 2. Fetch Supplier org ID
      let supplierOrgId = orgId;
      if (selectedSupplierId) {
        const { data: supData } = await supabase
          .from("suppliers")
          .select("org_id")
          .eq("id", selectedSupplierId)
          .single();
        if (supData?.org_id) {
          supplierOrgId = supData.org_id;
        }
      }

      // 3. Fetch contractor components
      if (supplierOrgId) {
        const { data: contractorComps } = await supabase
          .from("product_components")
          .select("sku, name, category, default_price, metadata")
          .eq("org_id", supplierOrgId);
        setContractorComponents(contractorComps ?? []);
      }

      // 4. Fetch Glass Outlet master components
      if (goOrg?.id) {
        const { data: masterComps } = await supabase
          .from("product_components")
          .select("sku, name, category, default_price, metadata")
          .eq("org_id", goOrg.id);
        setMasterComponents(masterComps ?? []);
      }
    } catch (err) {
      console.error("Error loading component lists:", err);
    } finally {
      setComparisonLoading(false);
    }
  };

  // Pre-fill Parser Logic
  const handleParseDescription = () => {
    if (!rawDescription.trim()) {
      toast.error("Please enter a short description to parse.");
      return;
    }

    const parsed = parseDescription(rawDescription);
    setParsedPreview(parsed);
    toast.success("Successfully parsed details! Review properties below.");
  };

  const applyParsedAttributes = () => {
    if (!parsedPreview) return;
    const attrs = parsedPreview.attributes;

    if (attrs.systemType?.value) {
      setSystemType(attrs.systemType.value);
    }
    if (attrs.heightMm?.value) {
      setHeight(String(attrs.heightMm.value));
    }
    if (attrs.slatSizeMm?.value) {
      setSlatSize(String(attrs.slatSizeMm.value) as any);
    }
    if (attrs.gapMm?.value) {
      setSlatGap(String(attrs.gapMm.value) as any);
    }
    if (attrs.colourCode?.value) {
      setColour(attrs.colourCode.value);
    }
    if (attrs.mountingMethod?.value) {
      setMountingMethod(attrs.mountingMethod.value);
    }
    if (attrs.termination?.value) {
      setTermination(attrs.termination.value);
    }
    if (attrs.cornerCount?.value !== undefined) {
      setCorners(attrs.cornerCount.value);
    }
    if (attrs.gates?.value && attrs.gates.value.length > 0) {
      setHasGate(true);
      const firstGate = attrs.gates.value[0];
      setGateType(firstGate.kind === "sliding" ? "sliding" : "pedestrian");
    } else {
      setHasGate(false);
    }
    if (attrs.runLengthMm?.value) {
      setRunLength(String(attrs.runLengthMm.value));
    }

    toast.success("Pre-filled wizard fields from description!");
    setStep(1); // Jump to first page of setup
  };

  // Determine needed SKUs based on settings
  const getGeneratedSkus = () => {
    const colourCode = colour;
    const skus = [
      // Slat
      {
        sku: slatSize === "65" ? `XP-6100-S65-${colourCode}` : `QS-6100-S90-${colourCode}`,
        category: "slat",
        desc: `${slatSize}mm Slat blade 6100mm`
      },
      // Side Frame
      {
        sku: `QS-5800-SF-${colourCode}`,
        category: "side_frame",
        desc: "Side Frame 5800mm"
      },
      // CFC cover
      {
        sku: `QS-5800-CFC-${colourCode}`,
        category: "cfc_cover",
        desc: "Concealed Fixing Cover 5800mm"
      },
      // Screws
      {
        sku: `QS-SCREW-TEK-${colourCode}`,
        category: "screw",
        desc: "Tek Screws (100 Pack)"
      },
      // Posts
      {
        sku: mountingMethod === "base_plated" 
          ? `QS-2400-P${postSize}-BP-${colourCode}` 
          : `QS-3000-P${postSize}-${colourCode}`,
        category: "post",
        desc: `${postSize}x${postSize}mm Aluminium Post`
      }
    ];

    if (hasGate) {
      skus.push({
        sku: `QS-GATE-PED-${colourCode}`,
        category: "gate",
        desc: `Pedestrian Slat Gate Kit`
      });
    }

    return skus;
  };

  // Compare SKUs to contractor lists
  const checkSkus = () => {
    const needed = getGeneratedSkus();
    return needed.map(item => {
      // Find in contractor database
      const contractorItem = contractorComponents.find(c => c.sku === item.sku);
      // Find in master catalogue
      const masterItem = masterComponents.find(c => c.sku === item.sku);

      const price = contractorItem?.default_price ?? masterItem?.default_price ?? 0;
      const isMissing = !contractorItem;

      return {
        ...item,
        name: contractorItem?.name ?? masterItem?.name ?? item.desc,
        price,
        isMissing,
        source: isMissing ? "Global Master Catalogue (Retail RRP)" : "Contractor Price List"
      };
    });
  };

  const matchedItems = checkSkus();
  const missingItemsCount = matchedItems.filter(i => i.isMissing).length;

  // Save Sandbox and Moderate queue
  const handleSaveAndSubmit = async (visibilityType: "private" | "marketplace_queue") => {
    if (!calcName) {
      toast.error("Calculator Name is required.");
      return;
    }

    toast.loading(
      visibilityType === "marketplace_queue" 
        ? "Submitting custom calculator copy to John's moderation queue..." 
        : "Saving copy to private sandbox...", 
      { id: "wizard-submit" }
    );

    try {
      const slug = calcName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      
      // Save custom variables, rules, selectors matching the wizard choices
      const finalVariables = [
        {
          name: "slat_gap_mm",
          type: "enum",
          description: "Space between slats in mm",
          defaultValue: slatGap,
          options: ["5", "9", "20"]
        },
        {
          name: "target_height_mm",
          type: "integer",
          description: "Target height of panel",
          defaultValue: height,
          options: []
        },
        {
          name: "slat_size_mm",
          type: "enum",
          description: "Width of slat blade",
          defaultValue: slatSize,
          options: ["65", "90"]
        },
        {
          name: "colour_code",
          type: "enum",
          description: "Colorbond colour selector",
          defaultValue: COLOUR_NAMES[colour] || "monument-matt",
          options: Object.values(COLOUR_NAMES)
        },
        {
          name: "post_mounting",
          type: "enum",
          description: "Mounting method of posts",
          defaultValue: mountingMethod,
          options: ["concreted", "base_plated", "core_drilled"]
        }
      ];

      const finalRules = [
        {
          outputKey: "slat_count",
          expression: `ceil((run_length - post_qty * ${postSize}) / (${slatSize} + slat_gap_mm))`,
          stage: "derive",
          description: "Calculate slats count based on chosen size"
        },
        {
          outputKey: "post_qty",
          expression: `ceil(run_length / ${panelWidth}) + 1`,
          stage: "derive",
          description: "Derive posts qty from panel width cap"
        },
        {
          outputKey: "screws_qty",
          expression: "slat_count * 4 + post_qty * 4",
          stage: "accessory",
          description: "Calculate screws qty"
        }
      ];

      const finalSelectors = [
        {
          category: "slat",
          matchCriteria: `slat_size_mm=${slatSize}`,
          skuPattern: slatSize === "65" ? "XP-6100-S65-{colour}" : "QS-6100-S90-{colour}"
        },
        {
          category: "post",
          matchCriteria: `post_mounting=${mountingMethod}`,
          skuPattern: mountingMethod === "base_plated" ? `QS-2400-P${postSize}-BP-{colour}` : `QS-3000-P${postSize}-{colour}`
        },
        {
          category: "screw",
          matchCriteria: "",
          skuPattern: "QS-SCREW-TEK-{colour}"
        }
      ];

      // Call database write (mock & save)
      if (user) {
        const { error: dbErr } = await supabase
          .from("system_instances")
          .insert({
            supplier_id: selectedSupplierId || null,
            archetype_id: selectedArchetypeId || "00000000-0000-0000-0000-000000000000",
            slug: `${slug}-${Date.now().toString().slice(-4)}`,
            name: calcName,
            description: calcDescription,
            status: "draft",
            readiness_status: visibilityType === "marketplace_queue" ? "calculator_ready" : "draft",
            trust_tier: "user",
            visibility: visibilityType === "marketplace_queue" ? "public" : "private",
            authored_by: user.id,
            org_id: orgId,
            readiness_notes: visibilityType === "marketplace_queue" 
              ? "Submitted via Visual Wizard. Awaiting John's dashboard moderation review." 
              : "Private sandbox draft copy.",
            ai_vetting_status: visibilityType === "marketplace_queue" ? "pending" : "skipped",
            is_public_library: false,
            is_new_product: true
          });

        if (dbErr) throw dbErr;
      }

      onApply({
        name: calcName,
        description: calcDescription,
        supplierId: selectedSupplierId,
        archetypeId: selectedArchetypeId,
        visibility: visibilityType,
        variables: finalVariables,
        rules: finalRules,
        selectors: finalSelectors
      });

      if (visibilityType === "marketplace_queue") {
        toast.success("🚀 Dispatched custom calculator config to John's admin moderation dashboard queue for National Network promotion!", { id: "wizard-submit" });
      } else {
        toast.success("Saved copy to Private Org Sandbox!", { id: "wizard-submit" });
      }
      
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(`Error saving: ${err instanceof Error ? err.message : String(err)}`, { id: "wizard-submit" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-bg/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-brand-card border border-brand-border/60 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
        
        {/* Wizard Header */}
        <div className="p-6 border-b border-brand-border/40 flex justify-between items-center bg-brand-bg/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-primary/10 rounded-2xl text-brand-primary border border-brand-primary/20">
              <Wand2 size={24} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-black text-brand-text">Visual Calculator Wizard</h2>
              <p className="text-xs text-brand-muted mt-0.5">Quickly outline a custom calculator using natural description and step-by-step visual parameters.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-brand-muted hover:text-brand-text text-sm font-bold border border-brand-border px-3 py-1.5 rounded-xl transition"
          >
            Close
          </button>
        </div>

        {/* Description Parser Sub-section */}
        {step === 1 && (
          <div className="p-6 bg-brand-primary/5 border-b border-brand-border/40 space-y-3">
            <label className="block text-xs font-bold text-brand-primary uppercase tracking-wider">
              ⚡ Pre-Fill via Text Description (Option)
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <textarea
                value={rawDescription}
                onChange={(e) => setRawDescription(e.target.value)}
                placeholder="e.g. 1.8m horizontal slat screen in Monument with 9mm gaps, core-drilled posts and swing gate..."
                className="flex-1 bg-brand-bg border border-brand-border focus:border-brand-primary/60 rounded-xl px-4 py-2.5 text-xs outline-none transition h-14 resize-none"
              />
              <Button onClick={handleParseDescription} variant="ghost" className="border-brand-primary text-brand-primary hover:bg-brand-primary/10 shrink-0 self-end">
                <Sparkles size={14} className="mr-1.5" />
                Parse Text
              </Button>
            </div>

            {parsedPreview && (
              <div className="bg-brand-card p-3 border border-brand-border rounded-xl flex flex-wrap gap-2 text-[11px] font-medium text-brand-text">
                <span className="text-brand-muted font-bold">Parsed attributes:</span>
                {parsedPreview.attributes.heightMm?.value && (
                  <span className="px-2 py-0.5 bg-brand-bg border border-brand-border rounded">Height: {parsedPreview.attributes.heightMm.value}mm</span>
                )}
                {parsedPreview.attributes.colourCode?.value && (
                  <span className="px-2 py-0.5 bg-brand-bg border border-brand-border rounded">Colour: {COLOUR_NAMES[parsedPreview.attributes.colourCode.value]}</span>
                )}
                {parsedPreview.attributes.gapMm?.value && (
                  <span className="px-2 py-0.5 bg-brand-bg border border-brand-border rounded">Gap: {parsedPreview.attributes.gapMm.value}mm</span>
                )}
                {parsedPreview.attributes.mountingMethod?.value && (
                  <span className="px-2 py-0.5 bg-brand-bg border border-brand-border rounded">Mounting: {parsedPreview.attributes.mountingMethod.value}</span>
                )}
                {parsedPreview.attributes.gates?.value && parsedPreview.attributes.gates.value.length > 0 && (
                  <span className="px-2 py-0.5 bg-brand-bg border border-brand-border rounded">Gate: {parsedPreview.attributes.gates.value[0].kind}</span>
                )}
                <button 
                  onClick={applyParsedAttributes}
                  className="ml-auto text-brand-accent hover:underline font-bold"
                >
                  Apply & Populate Fields →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Wizard Steps Navigation Bar */}
        <div className="px-6 py-4 bg-brand-bg/30 border-b border-brand-border/40 flex items-center justify-between text-xs font-black uppercase text-brand-muted">
          <div className="flex items-center gap-6">
            <span className={`flex items-center gap-1.5 ${step === 1 ? "text-brand-primary" : ""}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${step === 1 ? "border-brand-primary text-brand-primary bg-brand-primary/10" : "border-brand-border"}`}>1</span>
              Material Type
            </span>
            <span className="text-brand-border">/</span>
            <span className={`flex items-center gap-1.5 ${step === 2 ? "text-brand-primary" : ""}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${step === 2 ? "border-brand-primary text-brand-primary bg-brand-primary/10" : "border-brand-border"}`}>2</span>
              Dimensions
            </span>
            <span className="text-brand-border">/</span>
            <span className={`flex items-center gap-1.5 ${step === 3 ? "text-brand-primary" : ""}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${step === 3 ? "border-brand-primary text-brand-primary bg-brand-primary/10" : "border-brand-border"}`}>3</span>
              Fixings & Accessories
            </span>
            <span className="text-brand-border">/</span>
            <span className={`flex items-center gap-1.5 ${step === 4 ? "text-brand-primary" : ""}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center border ${step === 4 ? "border-brand-primary text-brand-primary bg-brand-primary/10" : "border-brand-border"}`}>4</span>
              Review BOM
            </span>
          </div>
          <span className="text-xs font-bold text-brand-muted lowercase">Step {step} of 4</span>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          
          {/* STEP 1: MATERIAL TYPE */}
          {step === 1 && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div>
                <h3 className="text-md font-bold flex items-center gap-2 text-brand-text">
                  <Sparkles size={16} className="text-brand-primary" />
                  Define Calculator details & Primary Materials
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">Specify basic details, colors, and slats dimensions.</p>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">Calculator Name</label>
                    <input 
                      type="text" 
                      value={calcName}
                      onChange={(e) => setCalcName(e.target.value)}
                      placeholder="e.g. Modern Horizontal Slat" 
                      className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary/60 rounded-xl px-4 py-2.5 text-xs outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">System Archetype</label>
                    <select 
                      value={systemType}
                      onChange={(e) => setSystemType(e.target.value as ParsedSystemType)}
                      className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary/60 rounded-xl px-4 py-2.5 text-xs outline-none transition text-brand-text"
                    >
                      <option value="QSHS">Horizontal Slat (QSHS)</option>
                      <option value="VS">Vertical Slat (VS)</option>
                      <option value="XPL">Premium Slat (XPL)</option>
                      <option value="BAYG">Infill Panel (BAYG)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">Description</label>
                  <input 
                    type="text" 
                    value={calcDescription}
                    onChange={(e) => setCalcDescription(e.target.value)}
                    placeholder="e.g. Premium horizontal slat screen config" 
                    className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary/60 rounded-xl px-4 py-2.5 text-xs outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">Primary Slat Size</label>
                    <select 
                      value={slatSize}
                      onChange={(e) => setSlatSize(e.target.value as any)}
                      className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary/60 rounded-xl px-4 py-2.5 text-xs outline-none transition text-brand-text"
                    >
                      <option value="65">65 mm slat</option>
                      <option value="90">90 mm slat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">Slat Gap</label>
                    <select 
                      value={slatGap}
                      onChange={(e) => setSlatGap(e.target.value as any)}
                      className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary/60 rounded-xl px-4 py-2.5 text-xs outline-none transition text-brand-text"
                    >
                      <option value="5">5 mm gap</option>
                      <option value="9">9 mm gap</option>
                      <option value="20">20 mm gap</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">Default Colour</label>
                    <select 
                      value={colour}
                      onChange={(e) => setColour(e.target.value as ColourCode)}
                      className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary/60 rounded-xl px-4 py-2.5 text-xs outline-none transition text-brand-text"
                    >
                      {Object.entries(COLOUR_NAMES).map(([code, name]) => (
                        <option key={code} value={code}>{name.replace("-", " ")}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DIMENSIONS & SPACING */}
          {step === 2 && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div>
                <h3 className="text-md font-bold flex items-center gap-2 text-brand-text">
                  <Sliders size={16} className="text-brand-primary" />
                  Dimensions & Spacing Rules
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">Specify standard panel run limits and measurements.</p>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">Run Length (mm)</label>
                    <input 
                      type="number" 
                      value={runLength}
                      onChange={(e) => setRunLength(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary/60 rounded-xl px-4 py-2.5 text-xs outline-none transition text-brand-text"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">Target Height (mm)</label>
                    <input 
                      type="number" 
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary/60 rounded-xl px-4 py-2.5 text-xs outline-none transition text-brand-text"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">Max Panel Width (mm)</label>
                    <select 
                      value={panelWidth}
                      onChange={(e) => setPanelWidth(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary/60 rounded-xl px-4 py-2.5 text-xs outline-none transition text-brand-text"
                    >
                      <option value="2000">2000 mm (High Wind)</option>
                      <option value="2600">2600 mm (Standard)</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-brand-bg border border-brand-border rounded-2xl text-xs space-y-2">
                  <span className="font-bold text-brand-muted uppercase text-[10px] block">Derived Geometry Logic:</span>
                  <div className="space-y-1 font-mono text-[11px] text-brand-text">
                    <div>Posts Required: <span className="text-brand-accent font-bold">ceil(run_length / max_panel_width) + 1</span></div>
                    <div>Slat Count: <span className="text-brand-accent font-bold">ceil((run_length - post_qty * {postSize}) / ({slatSize} + slat_gap_mm))</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FIXINGS & ACCESSORIES */}
          {step === 3 && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div>
                <h3 className="text-md font-bold flex items-center gap-2 text-brand-text">
                  <Settings size={16} className="text-brand-primary" />
                  Post Mountings & Gate Fixings
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">Define installation and gate accessory components.</p>
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">Post Mounting</label>
                    <select 
                      value={mountingMethod}
                      onChange={(e) => setMountingMethod(e.target.value as any)}
                      className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary/60 rounded-xl px-4 py-2.5 text-xs outline-none transition text-brand-text"
                    >
                      <option value="concreted">Concreted-in-ground</option>
                      <option value="base_plated">Base-plated</option>
                      <option value="core_drilled">Core-drilled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">Post Size (mm)</label>
                    <select 
                      value={postSize}
                      onChange={(e) => setPostSize(e.target.value as any)}
                      className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary/60 rounded-xl px-4 py-2.5 text-xs outline-none transition text-brand-text"
                    >
                      <option value="50">50 x 50 mm</option>
                      <option value="65">65 x 65 mm</option>
                      <option value="75">75 x 75 mm</option>
                      <option value="100">100 x 100 mm</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">Corner Count</label>
                    <input 
                      type="number" 
                      min="0"
                      value={corners}
                      onChange={(e) => setCorners(parseInt(e.target.value) || 0)}
                      className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary/60 rounded-xl px-4 py-2.5 text-xs outline-none transition text-brand-text"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-muted uppercase mb-1.5">Termination Ends</label>
                    <select 
                      value={termination}
                      onChange={(e) => setTermination(e.target.value as any)}
                      className="w-full bg-brand-bg border border-brand-border focus:border-brand-primary/60 rounded-xl px-4 py-2.5 text-xs outline-none transition text-brand-text"
                    >
                      <option value="post_post">Post to Post (Stand-alone)</option>
                      <option value="post_wall">Post to Wall (One wall attachment)</option>
                      <option value="wall_wall">Wall to Wall (Between walls)</option>
                    </select>
                  </div>
                </div>

                <div className="border border-brand-border rounded-2xl p-4 space-y-3 bg-brand-bg/50">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-brand-text uppercase">Include Gate Attachment</label>
                    <input 
                      type="checkbox" 
                      checked={hasGate}
                      onChange={(e) => setHasGate(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary focus:ring-2 accent-brand-primary"
                    />
                  </div>
                  
                  {hasGate && (
                    <div className="grid grid-cols-1 gap-2 animate-fade-in">
                      <label className="block text-[10px] font-bold text-brand-muted uppercase">Gate Type</label>
                      <div className="flex gap-4 text-xs font-bold text-brand-text">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="gateType" checked={gateType === "pedestrian"} onChange={() => setGateType("pedestrian")} />
                          Pedestrian Swing Gate
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="gateType" checked={gateType === "sliding"} onChange={() => setGateType("sliding")} />
                          Sliding Driveway Gate
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & DATABASE BOM MAPPING */}
          {step === 4 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <h3 className="text-md font-bold flex items-center gap-2 text-brand-text">
                  <ShoppingBag size={16} className="text-brand-primary" />
                  BOM Review & Supplier Database Reconciliation
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">
                  Reconciles generated SKUs against your contractor price list. Missing items fall back to Glass Outlet Retail RRP.
                </p>
              </div>

              {comparisonLoading ? (
                <div className="py-12 text-center text-xs text-brand-muted animate-pulse">
                  Reconciling inventory catalog databases...
                </div>
              ) : (
                <div className="space-y-4">
                  {missingItemsCount > 0 && (
                    <div className="flex items-start gap-2.5 p-4 border border-blue-500/20 bg-blue-500/10 text-blue-400 rounded-2xl text-xs">
                      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                      <div>
                        <strong>{missingItemsCount} items missing from Contractor Catalog</strong>
                        <p className="text-brand-muted text-[11px] mt-1">
                          We successfully queried the Glass Outlet Global Master Catalogue at Retail RRP. You can add trade pricing in the pricing book later.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="border border-brand-border/60 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-brand-bg border-b border-brand-border/60 text-[10px] font-black uppercase text-brand-muted">
                          <th className="p-3">SKU Code</th>
                          <th className="p-3">Component Detail</th>
                          <th className="p-3">Source Catalogue</th>
                          <th className="p-3 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border/40 bg-brand-card">
                        {matchedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-brand-bg/5 transition-colors">
                            <td className="p-3 font-mono font-bold text-brand-primary">{item.sku}</td>
                            <td className="p-3 text-brand-text">
                              <span className="font-bold">{item.name}</span>
                              <span className="block text-[9px] text-brand-muted">{item.desc}</span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                item.isMissing 
                                  ? "bg-blue-500/10 border border-blue-500/20 text-blue-500" 
                                  : "bg-brand-success/10 border border-brand-success/20 text-brand-success"
                              }`}>
                                {item.isMissing ? "Global Catalogue (RRP)" : "Contractor trade"}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-black text-brand-text">
                              ${item.price.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-brand-bg/30 border border-brand-border/50 rounded-2xl space-y-3">
                    <span className="text-[10px] font-bold text-brand-muted uppercase block">Tenant Moderation Queue Destination</span>
                    <p className="text-xs text-brand-muted leading-relaxed">
                      Publishing to the National Network requires platform review. Submitting here sends this customized calculator setup copy to John's admin dashboard moderation queue.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Wizard Footer Controls */}
        <div className="p-6 border-t border-brand-border/40 flex justify-between bg-brand-bg/40">
          <Button 
            variant="secondary" 
            onClick={() => {
              if (step === 1) onClose();
              else setStep((prev) => (prev - 1) as any);
            }}
            icon={ChevronLeft}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          <div className="flex gap-2">
            {step < 4 ? (
              <Button 
                variant="primary" 
                onClick={() => setStep((prev) => (prev + 1) as any)}
                className="font-bold"
              >
                Next Step
                <ChevronRight size={16} className="ml-1" />
              </Button>
            ) : (
              <>
                <Button 
                  variant="secondary" 
                  onClick={() => handleSaveAndSubmit("private")}
                  icon={Save}
                  className="font-bold"
                >
                  Save Sandbox Draft
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => handleSaveAndSubmit("marketplace_queue")}
                  icon={Send}
                  className="font-bold shadow-lg shadow-brand-primary/20"
                >
                  Submit to John's Queue
                </Button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
