import { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Mic,
  MicOff,
  Sparkles,
  Save,
  Settings,
  Wrench,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import {
  CustomCalculator,
  getCustomCalculators,
  saveCustomCalculators
} from "../../../lib/customCalculators";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { supabase, isSupabaseConfigured } from "../../../lib/supabase";
import { searchLocalProducts } from "../../../lib/localSeedData";

// Extract search keywords from user prompt
function extractSearchKeywords(prompt: string): string[] {
  const p = prompt.toLowerCase();
  
  // standard colors/materials relevant to fencing
  const commonColors = [
    "surfmist", "monument", "woodland", "grey", "shale", "dune", 
    "paperbark", "classic", "cream", "cottage", "green", "deep", 
    "ocean", "night", "sky", "basalt", "ironstone", "wallaby", 
    "jasper", "windspray", "gully", "cove", "mangrove", "terraine", 
    "manor", "red", "black", "white"
  ];
  const standardKeywords = [
    "post", "rail", "slat", "paling", "cap", "screw", "bracket", 
    "channel", "plinth", "concrete", "nail", "bolt", "insert", 
    "gate", "hinge", "latch", "fittings", "lock"
  ];
  
  const words = p.split(/[^a-zA-Z0-9]/).filter(w => w.length >= 2);
  const keywords: string[] = [];
  
  // Specific compound phrases
  if (p.includes("woodland grey") || p.includes("woodland-grey")) keywords.push("woodland grey");
  if (p.includes("classic cream") || p.includes("classic-cream")) keywords.push("classic cream");
  if (p.includes("deep ocean") || p.includes("deep-ocean")) keywords.push("deep ocean");
  if (p.includes("night sky") || p.includes("night-sky")) keywords.push("night sky");
  if (p.includes("treated pine") || p.includes("treated-pine")) keywords.push("treated pine");
  if (p.includes("lap and cap") || p.includes("lap-and-cap")) keywords.push("lap and cap");

  for (const word of words) {
    if (commonColors.includes(word) || standardKeywords.includes(word)) {
      if (!keywords.includes(word)) {
        keywords.push(word);
      }
    }
  }
  
  if (keywords.length === 0) {
    const nonTrivial = words.filter(w => w.length >= 3 && !["use", "the", "and", "add", "for", "with", "this", "that", "please", "make", "need"].includes(w));
    return nonTrivial.slice(0, 4);
  }
  
  return keywords;
}

// Search Supabase edge function or local seeds for matching products
async function searchCatalogForPrompt(prompt: string): Promise<any[]> {
  const keywords = extractSearchKeywords(prompt);
  if (keywords.length === 0) return [];

  const results: any[] = [];
  const seenSkus = new Set<string>();

  // Fetch session to auth the Edge Function
  let session: any = null;
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase.auth.getSession();
      session = data?.session;
    } catch (e) {
      console.warn("Failed to get session for product search:", e);
    }
  }

  // Query each keyword
  const searchPromises = keywords.map(async (kw) => {
    try {
      if (isSupabaseConfigured && session) {
        const response = await supabase.functions.invoke("search-products", {
          body: { query: kw, limit: 10 },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!response.error && response.data?.items) {
          return response.data.items;
        }
      }
      return searchLocalProducts(kw, 10);
    } catch (err) {
      console.error(`Error searching catalog for keyword "${kw}":`, err);
      return searchLocalProducts(kw, 10);
    }
  });

  const allSearches = await Promise.all(searchPromises);
  
  for (const items of allSearches) {
    if (!items) continue;
    for (const item of items) {
      const sku = item.sku || item.SKU;
      if (sku && !seenSkus.has(sku)) {
        seenSkus.add(sku);
        results.push({
          sku,
          name: item.name || item.Name || sku,
          description: item.description || item.Description || "",
          category: item.category || item.Category || "accessory",
          unit: item.unit || item.Unit || "each",
          defaultPrice: item.default_price || item.unitPrice || item.defaultPrice || 0
        });
      }
    }
  }

  return results.slice(0, 30);
}

// Local regex heuristics for offline AI parsing
function runLocalHeuristics(prompt: string, calc: CustomCalculator): CustomCalculator {
  const p = prompt.toLowerCase();
  const next = { ...calc };

  // 1. Add variable option
  if (p.includes("add option") || p.includes("add parameter") || p.includes("add variable")) {
    const nameMatch = p.match(/(?:option|parameter|variable)\s+for\s+([a-z0-9_\s]+)/i) || 
                      p.match(/(?:option|parameter|variable)\s+([a-z0-9_\s]+)/i);
    const optionsMatch = p.match(/(?:with|values|options)\s+([a-z0-9_,\s]+)/i);

    if (nameMatch) {
      const label = nameMatch[1].trim();
      const key = label.toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, "");
      const options = optionsMatch 
        ? optionsMatch[1].split(",").map(s => s.trim().replace(/['"]/g, "")) 
        : ["Standard", "Heavy Duty"];

      if (!next.variables.some(v => v.field_key === key)) {
        const newVar = {
          id: `custom-${key}-${Date.now()}`,
          field_key: key,
          label: label.charAt(0).toUpperCase() + label.slice(1),
          control_type: "select" as const,
          data_type: "enum" as const,
          required: true,
          default_value_json: options[0],
          options_json: options,
          sort_order: next.variables.length + 1,
          visible_when_json: {}
        };
        next.variables = [...next.variables, newVar];
        toast.success(`Locally added option: "${newVar.label}"`);
      }
    }
  }

  // 2. Rails update
  if (p.includes("rail")) {
    const railMat = next.materials.find(m => m.category === "rail");
    const numMatch = p.match(/(\d+)\s+rails/i) || p.match(/(?:use|need)\s+(\d+)\s+rails/i);
    if (railMat && numMatch) {
      const railsCount = numMatch[1];
      railMat.formula = `ceil(length / 4.8) * ${railsCount}`;
      railMat.description = `${railsCount} horizontal rails along the run.`;
      toast.success(`Locally updated rails formula to: ${railMat.formula}`);
    }
  }

  // 3. Post spacing
  if (p.includes("post spacing") || p.includes("space posts") || p.includes("spaced every") || p.includes("posts every")) {
    const distMatch = p.match(/(\d+(?:\.\d+)?)\s*m/i) || p.match(/every\s*(\d+(?:\.\d+)?)/i);
    const postMat = next.materials.find(m => m.category === "post");
    if (postMat && distMatch) {
      const spacing = distMatch[1];
      postMat.formula = `ceil(length / ${spacing}) + 1`;
      postMat.description = `Post spaced every ${spacing} meters + 1 end post.`;
      toast.success(`Locally updated posts spacing to: ${spacing}m`);
    }
  }

  // 4. Nails
  if (p.includes("nail")) {
    const nailMat = next.materials.find(m => m.category === "screw" && m.namePattern.toLowerCase().includes("nail"));
    const numMatch = p.match(/(\d+)\s+nails\s+per/i) || p.match(/(\d+)\s+per\s+paling/i);
    if (nailMat && numMatch) {
      const count = numMatch[1];
      nailMat.formula = `ceil((palings * ${count}) / 500)`;
      nailMat.description = `${count} nails per paling.`;
      toast.success(`Locally updated nails formula to: ${nailMat.formula}`);
    }
  }

  // 5. Screws
  if (p.includes("screw")) {
    const screwMat = next.materials.find(m => m.category === "screw" && m.namePattern.toLowerCase().includes("screw"));
    const numMatch = p.match(/(\d+)\s+screws\s+per/i) || p.match(/(\d+)\s+per\s+post/i);
    if (screwMat && numMatch) {
      const count = numMatch[1];
      screwMat.formula = `ceil((posts * 3 * ${count}) / 100)`;
      screwMat.description = `${count} screws per rail-post connection.`;
      toast.success(`Locally updated screws formula to: ${screwMat.formula}`);
    }
  }

  return next;
}

// Call Gemini API to parse prompt instructions
async function callGeminiCopilot(
  apiKey: string,
  prompt: string,
  calculator: CustomCalculator,
  catalogProducts?: any[]
): Promise<CustomCalculator> {
  let productsSnippet = "";
  if (catalogProducts && catalogProducts.length > 0) {
    productsSnippet = `\nAVAILABLE SUPPLIER PRODUCTS FROM DATABASE/CATALOG:\n` +
      catalogProducts.map(p => `- SKU: "${p.sku}", Name: "${p.name}", Description: "${p.description}", Category: "${p.category}", Unit: "${p.unit}", Price: $${p.defaultPrice || 0}`).join("\n") +
      `\n\nCRITICAL INSTRUCTION: When updating or adding materials in the calculator schema, you MUST select matching products from the AVAILABLE SUPPLIER PRODUCTS list above if they fit the user's description. Use their exact SKU for "skuPattern" (e.g. if the user says "use Surfmist slats" and there is a slat SKU like "QS-6100-S90-SM", use that exact SKU instead of generating a placeholder). If the SKU contains parameters/placeholders or if a product needs to dynamically resolve parameters from options, you can use variables in curly braces like "QS-6100-S90-{color}", but otherwise stick as close as possible to the real supplier SKUs, names, categories, and prices listed above.\n`;
  }

  const systemPrompt = `You are a fencing calculator AI assistant. Your task is to update a custom fencing calculator schema based on the user's request.
The calculator schema consists of "variables" (inputs for the calculator UI) and "materials" (products output in the BOM with formulas).

Variables are structured as:
interface SchemaField {
  id: string;
  field_key: string;
  label: string;
  control_type: "select" | "number" | "toggle" | "text";
  data_type: "enum" | "integer" | "number" | "boolean" | "string";
  unit?: string;
  required?: boolean;
  default_value_json?: any;
  options_json?: any[];
  visible_when_json: {};
  sort_order: number;
}

Materials are structured as:
interface CustomMaterial {
  skuPattern: string; // e.g., "TP-POST-{post_size}" (placeholders represent variable values)
  namePattern: string; // e.g., "Treated Pine Post ({post_size})"
  category: string; // post, rail, slat, screw, accessory, hardware, fixing
  unit: string; // each, length, pack, bag
  defaultPrice: number;
  formula: string; // algebraic formula like "ceil(length / 2.4) + 1" or "palings * 6" (supports variables: length (in m), height (in m), width_mm, height_mm, panels, panel_width, and all variables, plus prior material names slugified)
  description: string;
}

Current calculator schema:
${JSON.stringify({ name: calculator.name, variables: calculator.variables, materials: calculator.materials }, null, 2)}
${productsSnippet}
User Request:
"${prompt}"

Respond ONLY with a valid JSON object matching this structure (do NOT wrap it in markdown boxes, do NOT include any comments or explanations):
{
  "variables": [...],
  "materials": [...]
}
Make sure you return ALL variables and materials (both unchanged and modified/new ones) in the response. Ensure formulas are mathematically correct and variables referenced exist. Every variable object MUST include "visible_when_json": {} and "options_json": [] if empty.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: systemPrompt }]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API call failed: ${response.statusText}. ${errText}`);
  }

  const json = await response.json();
  const textResponse = json.candidates[0].content.parts[0].text;
  
  try {
    const parsed = JSON.parse(textResponse.trim());
    
    // Ensure visible_when_json is defined on all variables
    const variables = (parsed.variables || []).map((v: any) => ({
      ...v,
      visible_when_json: v.visible_when_json || {},
      options_json: v.options_json || []
    }));

    return {
      ...calculator,
      variables,
      materials: parsed.materials || calculator.materials
    };
  } catch (err) {
    console.error("Gemini output parsing failed:", textResponse);
    throw new Error("Gemini returned invalid JSON structure. Please try again.");
  }
}

interface CalculatorLogicModalProps {
  productCode: string;
  onClose: () => void;
}

export function CalculatorLogicModal({ productCode, onClose }: CalculatorLogicModalProps) {
  const { dispatch } = useCalculatorV4();
  const [calculator, setCalculator] = useState<CustomCalculator | null>(null);
  const [activeTab, setActiveTab] = useState<"variables" | "materials">("variables");
  
  // AI assistant states
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Load active calculator
    const calcs = getCustomCalculators();
    const found = calcs.find(c => c.id === productCode);
    if (found) {
      setCalculator(structuredClone(found));
    }

    // Load key
    const key = localStorage.getItem("GEMINI_API_KEY") || "";
    setApiKey(key);

    // Init Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-AU";

      rec.onresult = (e: any) => {
        const result = e.results[0][0].transcript;
        setChatInput(result);
        setListening(false);
        toast.info(`Dictated: "${result}"`);
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error", e);
        setListening(false);
        toast.error("Voice dictation failed or was blocked.");
      };

      rec.onend = () => {
        setListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [productCode]);

  if (!calculator) return null;

  const handleToggleSpeech = () => {
    if (!recognitionRef.current) {
      toast.warning("Speech recognition is not supported in this browser.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setListening(true);
      recognitionRef.current.start();
    }
  };

  const handleAiUpdate = async () => {
    if (!chatInput.trim()) return;
    setAiLoading(true);
    try {
      // Fetch matching supplier catalog products
      const catalogProducts = await searchCatalogForPrompt(chatInput);
      
      let updated: CustomCalculator;
      if (apiKey.trim()) {
        updated = await callGeminiCopilot(apiKey, chatInput, calculator, catalogProducts);
        toast.success("AI parsed and updated the logic schema successfully using supplier catalog!");
      } else {
        updated = runLocalHeuristics(chatInput, calculator);
      }
      setCalculator(updated);
      setChatInput("");
    } catch (e: any) {
      toast.error(e.message || "Failed to update logic via AI.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    const calcs = getCustomCalculators();
    const updatedList = calcs.map(c => c.id === productCode ? calculator : c);
    saveCustomCalculators(updatedList);
    toast.success("Calculator saved successfully!");
    
    // Close modal and mark BOM stale to trigger recalc
    dispatch({ type: "CLOSE_LOGIC_EDITOR" });
    onClose();
  };

  // Variable CRUD Handlers
  const handleAddVariable = () => {
    const key = `option_${Date.now()}`;
    const newVar = {
      id: `custom-var-${Date.now()}`,
      field_key: key,
      label: "New Option",
      control_type: "select" as const,
      data_type: "enum" as const,
      required: true,
      default_value_json: "standard",
      options_json: ["standard", "heavy_duty"],
      sort_order: calculator.variables.length + 1,
      visible_when_json: {}
    };
    setCalculator({
      ...calculator,
      variables: [...calculator.variables, newVar]
    });
  };

  const handleUpdateVariable = (idx: number, field: string, val: any) => {
    const vars = [...calculator.variables];
    vars[idx] = { ...vars[idx], [field]: val };
    setCalculator({ ...calculator, variables: vars });
  };

  const handleDeleteVariable = (idx: number) => {
    const vars = calculator.variables.filter((_, i) => i !== idx);
    setCalculator({ ...calculator, variables: vars });
  };

  // Material CRUD Handlers
  const handleAddMaterial = () => {
    const newMat = {
      skuPattern: "ITEM-SKU",
      namePattern: "New Material Item",
      category: "accessory",
      unit: "each",
      defaultPrice: 10.00,
      formula: "ceil(length)",
      description: "Custom material item"
    };
    setCalculator({
      ...calculator,
      materials: [...calculator.materials, newMat]
    });
  };

  const handleUpdateMaterial = (idx: number, field: string, val: any) => {
    const mats = [...calculator.materials];
    mats[idx] = { ...mats[idx], [field]: val };
    setCalculator({ ...calculator, materials: mats });
  };

  const handleDeleteMaterial = (idx: number) => {
    const mats = calculator.materials.filter((_, i) => i !== idx);
    setCalculator({ ...calculator, materials: mats });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-brand-card border border-brand-border w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between bg-slate-900/10">
          <div className="flex items-center gap-2">
            <Wrench className="text-brand-accent" size={20} />
            <div>
              <h2 className="text-base font-bold text-brand-text leading-snug">
                Calculator Logic Editor: <span className="text-brand-accent">{calculator.name}</span>
              </h2>
              <p className="text-xs text-brand-muted mt-0.5">ID: {calculator.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-brand-border/40 text-brand-muted hover:text-brand-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Inner Panels */}
        <div className="flex-1 flex min-h-0">
          
          {/* Left Side: Editor Form */}
          <div className="flex-1 flex flex-col border-r border-brand-border min-h-0 bg-brand-bg/10">
            <div className="flex border-b border-brand-border px-4 py-2 bg-slate-900/5 shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("variables")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "variables"
                    ? "bg-brand-accent text-white"
                    : "text-brand-muted hover:text-brand-text"
                }`}
              >
                1. Options Variables ({calculator.variables.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("materials")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "materials"
                    ? "bg-brand-accent text-white"
                    : "text-brand-muted hover:text-brand-text"
                }`}
              >
                2. Materials & Formulas ({calculator.materials.length})
              </button>
            </div>

            {/* Scrollable Form Container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {activeTab === "variables" ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                      Variables & Inputs
                    </span>
                    <button
                      type="button"
                      onClick={handleAddVariable}
                      className="px-2.5 py-1 text-xs bg-brand-accent/10 hover:bg-brand-accent/25 text-brand-accent font-semibold rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus size={13} /> Add Option
                    </button>
                  </div>

                  {calculator.variables.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-brand-border rounded-xl text-brand-muted text-xs">
                      No options defined yet. Add one or dictate via AI.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {calculator.variables.map((v, idx) => (
                        <div
                          key={v.id}
                          className="bg-brand-card/45 border border-brand-border/60 rounded-xl p-4 space-y-3 relative group"
                        >
                          <button
                            type="button"
                            onClick={() => handleDeleteVariable(idx)}
                            className="absolute right-3 top-3 p-1.5 rounded hover:bg-red-500/10 text-brand-muted hover:text-brand-danger opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete option"
                          >
                            <Trash2 size={13} />
                          </button>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className="space-y-1">
                              <span className="text-[10px] font-bold text-brand-muted uppercase">Label</span>
                              <input
                                type="text"
                                value={v.label}
                                onChange={(e) => handleUpdateVariable(idx, "label", e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-brand-border rounded-md bg-brand-bg text-brand-text outline-none"
                              />
                            </label>
                            
                            <label className="space-y-1">
                              <span className="text-[10px] font-bold text-brand-muted uppercase">Field Key</span>
                              <input
                                type="text"
                                value={v.field_key}
                                onChange={(e) => handleUpdateVariable(idx, "field_key", e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-brand-border rounded-md bg-brand-bg text-brand-text outline-none font-mono"
                              />
                            </label>

                            <label className="space-y-1">
                              <span className="text-[10px] font-bold text-brand-muted uppercase">Control type</span>
                              <select
                                value={v.control_type}
                                onChange={(e) => handleUpdateVariable(idx, "control_type", e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-brand-border rounded-md bg-brand-bg text-brand-text outline-none"
                              >
                                <option value="select">Dropdown Select</option>
                                <option value="number">Numeric Input</option>
                                <option value="toggle">Toggle / Boolean</option>
                              </select>
                            </label>
                          </div>

                          {v.control_type === "select" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <label className="space-y-1">
                                <span className="text-[10px] font-bold text-brand-muted uppercase">Options (Comma separated)</span>
                                <input
                                  type="text"
                                  value={Array.isArray(v.options_json) ? v.options_json.join(", ") : ""}
                                  onChange={(e) => {
                                    const opts = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                                    handleUpdateVariable(idx, "options_json", opts);
                                  }}
                                  className="w-full px-2 py-1 text-xs border border-brand-border rounded-md bg-brand-bg text-brand-text outline-none"
                                  placeholder="Monument, Woodland Grey..."
                                />
                              </label>

                              <label className="space-y-1">
                                <span className="text-[10px] font-bold text-brand-muted uppercase">Default Value</span>
                                <input
                                  type="text"
                                  value={String(v.default_value_json ?? "")}
                                  onChange={(e) => handleUpdateVariable(idx, "default_value_json", e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-brand-border rounded-md bg-brand-bg text-brand-text outline-none"
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                      Materials & Formulas
                    </span>
                    <button
                      type="button"
                      onClick={handleAddMaterial}
                      className="px-2.5 py-1 text-xs bg-brand-accent/10 hover:bg-brand-accent/25 text-brand-accent font-semibold rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus size={13} /> Add Material
                    </button>
                  </div>

                  {calculator.materials.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-brand-border rounded-xl text-brand-muted text-xs">
                      No materials defined yet. Add one or dictate via AI.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {calculator.materials.map((m, idx) => (
                        <div
                          key={idx}
                          className="bg-brand-card/45 border border-brand-border/60 rounded-xl p-4 space-y-3 relative group"
                        >
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterial(idx)}
                            className="absolute right-3 top-3 p-1.5 rounded hover:bg-red-500/10 text-brand-muted hover:text-brand-danger opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete material item"
                          >
                            <Trash2 size={13} />
                          </button>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className="space-y-1">
                              <span className="text-[10px] font-bold text-brand-muted uppercase">SKU Pattern</span>
                              <input
                                type="text"
                                value={m.skuPattern}
                                onChange={(e) => handleUpdateMaterial(idx, "skuPattern", e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-brand-border rounded-md bg-brand-bg text-brand-text outline-none font-mono"
                              />
                            </label>

                            <label className="space-y-1">
                              <span className="text-[10px] font-bold text-brand-muted uppercase">Name Pattern</span>
                              <input
                                type="text"
                                value={m.namePattern}
                                onChange={(e) => handleUpdateMaterial(idx, "namePattern", e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-brand-border rounded-md bg-brand-bg text-brand-text outline-none"
                              />
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                              <label className="space-y-1">
                                <span className="text-[10px] font-bold text-brand-muted uppercase">Category</span>
                                <select
                                  value={m.category}
                                  onChange={(e) => handleUpdateMaterial(idx, "category", e.target.value)}
                                  className="w-full px-1.5 py-1 text-xs border border-brand-border rounded-md bg-brand-bg text-brand-text outline-none"
                                >
                                  <option value="post">post</option>
                                  <option value="rail">rail</option>
                                  <option value="slat">slat (paling)</option>
                                  <option value="screw">screw</option>
                                  <option value="fixing">fixing</option>
                                  <option value="accessory">accessory</option>
                                </select>
                              </label>

                              <label className="space-y-1">
                                <span className="text-[10px] font-bold text-brand-muted uppercase">Unit</span>
                                <select
                                  value={m.unit}
                                  onChange={(e) => handleUpdateMaterial(idx, "unit", e.target.value)}
                                  className="w-full px-1.5 py-1.5 text-xs border border-brand-border rounded-md bg-brand-bg text-brand-text outline-none"
                                >
                                  <option value="each">each</option>
                                  <option value="length">length</option>
                                  <option value="pack">pack</option>
                                  <option value="box">box</option>
                                </select>
                              </label>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <label className="sm:col-span-2 space-y-1">
                              <span className="text-[10px] font-bold text-brand-muted uppercase">Formula</span>
                              <input
                                type="text"
                                value={m.formula}
                                onChange={(e) => handleUpdateMaterial(idx, "formula", e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-brand-border rounded-md bg-brand-bg text-brand-text outline-none font-mono"
                                placeholder="ceil(length / 2.4) + 1"
                              />
                            </label>

                            <label className="space-y-1">
                              <span className="text-[10px] font-bold text-brand-muted uppercase">Default Price ($)</span>
                              <input
                                type="number"
                                step={0.01}
                                value={m.defaultPrice}
                                onChange={(e) => handleUpdateMaterial(idx, "defaultPrice", Number(e.target.value))}
                                className="w-full px-2 py-1 text-xs border border-brand-border rounded-md bg-brand-bg text-brand-text outline-none"
                              />
                            </label>
                          </div>

                          <label className="block space-y-1">
                            <span className="text-[10px] font-bold text-brand-muted uppercase">Formula Description / Logic</span>
                            <input
                              type="text"
                              value={m.description}
                              onChange={(e) => handleUpdateMaterial(idx, "description", e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-brand-border rounded-md bg-brand-bg text-brand-text outline-none"
                              placeholder="Describe this calculation..."
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: AI Copilot Assistant Panel */}
          <div className="w-80 flex flex-col bg-slate-900/5 p-4 space-y-4">
            
            {/* AI Title & Gemini API config */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-text">
                <Sparkles size={14} className="text-brand-accent animate-pulse" />
                <span>AI Copilot Logic</span>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1 rounded bg-brand-border/45 hover:bg-brand-border/75 transition-colors text-brand-muted hover:text-brand-text flex items-center gap-0.5"
                  title="Configure Gemini API key"
                >
                  <Settings size={13} />
                  <span className="text-[10px] font-semibold">Gemini Key</span>
                </button>
                {showApiKey && (
                  <div className="absolute right-0 top-full mt-1.5 z-50 p-3 rounded-lg border border-brand-border bg-brand-card shadow-xl w-60 space-y-2">
                    <div className="text-[10px] text-brand-muted leading-snug">
                      Add a Gemini API key from AI Studio to use advanced parser models.
                    </div>
                    <input
                      type="password"
                      placeholder="Paste key here..."
                      value={apiKey}
                      onChange={(e) => {
                        const key = e.target.value;
                        setApiKey(key);
                        localStorage.setItem("GEMINI_API_KEY", key);
                      }}
                      className="w-full px-2 py-1 border border-brand-border rounded text-xs bg-brand-bg text-brand-text outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(false)}
                      className="w-full py-1 rounded bg-brand-accent text-white font-semibold text-xs"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* AI Assistant Chat / Help Panel */}
            <div className="flex-1 overflow-y-auto bg-brand-card/35 rounded-xl border border-brand-border p-3.5 space-y-3.5 text-xs text-brand-muted leading-relaxed">
              <div className="font-semibold text-brand-text flex items-center gap-1">
                <HelpCircle size={13} />
                <span>AI Calculator Prompt Tips</span>
              </div>
              <p>You can dictate rules in plain English to automatically build variables and formulas.</p>
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-brand-text">Example Speech:</div>
                <ul className="list-disc pl-4 space-y-1 text-brand-muted">
                  <li>"Add option for rail size with options 75x50, 75x38"</li>
                  <li>"Rails count should be 4 rails along the run"</li>
                  <li>"Space posts every 2.1 meters"</li>
                  <li>"Nails count should be 8 per paling"</li>
                  <li>"Screws count should be 4 per post"</li>
                </ul>
              </div>
              <p className="text-[10px] text-brand-muted border-t border-brand-border/40 pt-2.5">
                If no API key is set, the system falls back to regex search queries to parse variables, post spacing, rails, nails, and screws.
              </p>
            </div>

            {/* Input Prompt Box */}
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Describe your rules or options..."
                  rows={3}
                  className="w-full pl-3 pr-10 py-2 border border-brand-border rounded-xl bg-brand-card text-brand-text text-xs outline-none focus:border-brand-accent resize-none leading-normal"
                />
                <button
                  type="button"
                  onClick={handleToggleSpeech}
                  className={`absolute right-2.5 bottom-2.5 p-1.5 rounded-lg transition-colors ${
                    listening 
                      ? "bg-red-500 text-white animate-pulse" 
                      : "bg-brand-border/45 hover:bg-brand-border/75 text-brand-muted hover:text-brand-text"
                  }`}
                  title={listening ? "Stop recording" : "Dictate using microphone"}
                >
                  {listening ? <MicOff size={13} /> : <Mic size={13} />}
                </button>
              </div>

              <button
                type="button"
                disabled={aiLoading || !chatInput.trim()}
                onClick={handleAiUpdate}
                className="w-full py-2 bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Sparkles size={13} />
                {aiLoading ? "AI is thinking..." : "Apply AI Logic"}
              </button>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brand-border flex items-center justify-end gap-3 bg-slate-900/10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-brand-border hover:bg-brand-border/40 rounded-xl text-xs font-semibold text-brand-muted hover:text-brand-text transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-brand-accent hover:bg-brand-accent/90 rounded-xl text-xs font-bold text-white shadow-md transition-colors flex items-center gap-1.5"
          >
            <Save size={14} />
            Save Calculator
          </button>
        </div>

      </div>
    </div>
  );
}
