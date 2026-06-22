import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Mic,
  Send,
  Save,
  Sparkles,
  Calculator,
  Folder,
  Wrench,
  Settings,
  PlusCircle,
  FileSpreadsheet,
  ChevronDown,
  Trees,
  Layers,
  Waves,
  AlignJustify,
  Layout,
  Building2,
  KeyRound,
  Mountain
} from "lucide-react";
import { toast } from "sonner";
import {
  CustomCalculator,
  getCustomCalculators,
  saveCustomCalculators,
  getCustomPrices,
  saveCustomPrices,
  SEED_CUSTOM_CALCULATORS
} from "../lib/customCalculators";
import { calculateCustomBOM } from "../lib/customBOMCalculator";
import type { CanonicalPayload } from "../types/canonical.types";
import type { BOMLineItem } from "../types/bom.types";

// Local regex-based parsing fallback when Gemini API key is not present
function runLocalHeuristics(prompt: string, calc: CustomCalculator): CustomCalculator {
  const p = prompt.toLowerCase();
  const next = { ...calc };

  // 1. Check for adding options
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

      // Check if already exists
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

  // 2. Check for rail count updates
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

  // 3. Check for post spacing updates
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

  // 4. Check for nails updates
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

  // 5. Check for screws updates
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

// Call Gemini API to parse prompt instructions and rebuild variables/materials lists
async function callGeminiCopilot(
  apiKey: string,
  prompt: string,
  calculator: CustomCalculator
): Promise<CustomCalculator> {
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
  sort_order: number;
}

Materials are structured as:
interface CustomMaterial {
  skuPattern: string; // e.g., "TP-POST-{post_size}" (placeholders in curly braces represent variable values)
  namePattern: string; // e.g., "Treated Pine Post ({post_size})"
  category: string; // post, rail, slat, screw, accessory, hardware, fixing
  unit: string; // each, length, pack, bag
  defaultPrice: number;
  formula: string; // algebraic formula like "ceil(length / 2.4) + 1" or "palings * 6" (supports variables: length (in m), height (in m), width_mm, height_mm, panels, panel_width, and all variables, plus prior material names slugified)
  description: string;
}

Current calculator schema:
${JSON.stringify({ name: calculator.name, variables: calculator.variables, materials: calculator.materials }, null, 2)}

User Request:
"${prompt}"

Respond ONLY with a valid JSON object matching this structure (do NOT wrap it in markdown boxes, do NOT include any comments or explanations):
{
  "variables": [...],
  "materials": [...]
}
Make sure you return ALL variables and materials (both unchanged and modified/new ones) in the response. Ensure formulas are mathematically correct and variables referenced exist.`;

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
    return {
      ...calculator,
      variables: parsed.variables || calculator.variables,
      materials: parsed.materials || calculator.materials
    };
  } catch (err) {
    console.error("Gemini output parsing failed:", textResponse);
    throw new Error("Gemini returned invalid JSON structure. Please try again.");
  }
}

export function CalculatorBuilderPage() {
  const [calculators, setCalculators] = useState<CustomCalculator[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [pricesCount, setPricesCount] = useState<number>(0);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // Group calculators by their path[0] category
  const dynamicCategorizedCalculators = useMemo(() => {
    const groups: Record<string, CustomCalculator[]> = {};
    for (const c of calculators) {
      const category = c.path[0] || "Custom Fencing";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(c);
    }
    return groups;
  }, [calculators]);

  // Set initial expanded category dynamically once categories load
  useEffect(() => {
    if (calculators.length > 0 && !expandedCat) {
      const activeCalc = calculators.find(c => c.id === activeId);
      if (activeCalc) {
        setExpandedCat(activeCalc.path[0] || "Custom Fencing");
      } else {
        setExpandedCat(calculators[0].path[0] || "Custom Fencing");
      }
    }
  }, [calculators, activeId]);

  // AI assistant chat states
  const [chatInput, setChatInput] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [listening, setListening] = useState<boolean>(false);
  
  // Sandbox test states
  const [sandboxLength, setSandboxLength] = useState<number>(12);
  const [sandboxHeight, setSandboxHeight] = useState<number>(1800);
  const [sandboxVars, setSandboxVars] = useState<Record<string, any>>({});
  const [bomResult, setBomResult] = useState<any>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Load calculators
    const list = getCustomCalculators();
    setCalculators(list);
    if (list.length > 0) {
      setActiveId(list[0].id);
    }

    // Load key
    const key = localStorage.getItem("GEMINI_API_KEY") || "";
    setApiKey(key);

    // Load prices count
    const prices = getCustomPrices();
    setPricesCount(Object.keys(prices).length);

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
  }, []);

  const activeCalc = calculators.find((c) => c.id === activeId);

  // Initialize sandbox values whenever the active calculator changes
  useEffect(() => {
    if (!activeCalc) return;
    const initial: Record<string, any> = {};
    activeCalc.variables.forEach((v) => {
      initial[v.field_key] = v.default_value_json;
    });
    setSandboxVars(initial);
  }, [activeId, calculators]);

  // Recalculate preview BOM in real-time
  useEffect(() => {
    if (!activeCalc) {
      setBomResult(null);
      return;
    }

    // Create a mock canonical payload for a single run
    const mockPayload: CanonicalPayload = {
      productCode: activeCalc.id,
      schemaVersion: "v2",
      variables: {},
      runs: [
        {
          runId: "sandbox-run",
          productCode: activeCalc.id,
          variables: {},
          segments: [
            {
              segmentId: "sandbox-segment",
              segmentKind: "panel",
              segmentWidthMm: sandboxLength * 1000,
              targetHeightMm: sandboxHeight,
              variables: sandboxVars,
              sortOrder: 0,
            },
          ],
        },
      ],
    };

    try {
      const result = calculateCustomBOM(mockPayload, "tier1");
      setBomResult(result);
    } catch (e) {
      console.error("Preview BOM calculation error:", e);
    }
  }, [activeCalc, sandboxLength, sandboxHeight, sandboxVars]);

  // Save changes back to localStorage
  const handleSaveAll = (updatedCalcs = calculators) => {
    saveCustomCalculators(updatedCalcs);
    setCalculators(updatedCalcs);
    toast.success("Calculators saved successfully!");
  };

  // Add a new calculator category or system
  const handleAddSystem = () => {
    const name = prompt("Enter the name of the new fencing type:");
    if (!name) return;
    const category = prompt("Enter the category path (e.g. treated-pine or pool-fencing):") || "custom";
    
    const id = name.toLowerCase().replace(/[\s-]+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (calculators.some((c) => c.id === id)) {
      toast.error("A calculator with this ID already exists.");
      return;
    }

    const newCalc: CustomCalculator = {
      id,
      name,
      path: [category, name],
      description: `Custom ${name} fencing calculator.`,
      variables: [
        {
          id: `custom-height-${Date.now()}`,
          field_key: "target_height_mm",
          label: "Height",
          control_type: "select",
          data_type: "enum",
          unit: "mm",
          required: true,
          default_value_json: "1800",
          options_json: ["1200", "1500", "1800", "2100"],
          sort_order: 1,
          visible_when_json: {}
        }
      ],
      materials: [
        {
          skuPattern: `${id.toUpperCase()}-POST`,
          namePattern: `${name} Post`,
          category: "post",
          unit: "each",
          defaultPrice: 35.00,
          formula: "ceil(length / 2.4) + 1",
          description: "Post spaced every 2.4m + 1 end post."
        }
      ]
    };

    const nextList = [...calculators, newCalc];
    setCalculators(nextList);
    setActiveId(id);
    handleSaveAll(nextList);
  };

  // Delete current calculator
  const handleDeleteSystem = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this calculator? This cannot be undone.")) return;
    const nextList = calculators.filter((c) => c.id !== id);
    setCalculators(nextList);
    if (nextList.length > 0) {
      setActiveId(nextList[0].id);
    } else {
      setActiveId("");
    }
    handleSaveAll(nextList);
  };

  // Reset custom calculators to default seed values
  const handleResetToDefaults = () => {
    if (!window.confirm("Are you sure you want to reset all custom calculators to default seeds? Your changes will be lost.")) return;
    saveCustomCalculators(SEED_CUSTOM_CALCULATORS);
    setCalculators(SEED_CUSTOM_CALCULATORS);
    setActiveId(SEED_CUSTOM_CALCULATORS[0].id);
    toast.success("Reset to defaults successfully.");
  };

  // Handle CSV file upload for pricing
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const pricesMap: Record<string, number> = {};
        let successCount = 0;
        
        results.data.forEach((row: any) => {
          const sku = row.SKU || row.sku || row.code || row.Code;
          const priceStr = row.Price || row.price || row.cost || row.Cost || row.DefaultPrice;
          if (sku && priceStr) {
            const price = parseFloat(priceStr.replace(/[^0-9.]/g, ""));
            if (Number.isFinite(price)) {
              pricesMap[sku.trim()] = price;
              successCount++;
            }
          }
        });

        if (successCount > 0) {
          saveCustomPrices(pricesMap);
          setPricesCount(successCount);
          toast.success(`Successfully loaded ${successCount} prices from CSV!`);
        } else {
          toast.error("Could not find SKU/Price columns in the uploaded CSV.");
        }
      },
      error: (error) => {
        console.error("CSV parse error:", error);
        toast.error("Failed to parse CSV file.");
      }
    });
  };

  // Trigger speech recognition
  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      if (!recognitionRef.current) {
        toast.error("Speech recognition is not supported in this browser.");
        return;
      }
      try {
        recognitionRef.current.start();
        setListening(true);
        toast.info("Listening... speak now");
      } catch (err) {
        console.error("Speech recognition error:", err);
      }
    }
  };

  // Submit AI Prompt (Text/Voice)
  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeCalc) return;

    setAiLoading(true);
    const key = apiKey.trim();
    
    try {
      let updatedCalc: CustomCalculator;
      
      if (key) {
        toast.info("Calling Gemini to interpret instructions...");
        updatedCalc = await callGeminiCopilot(key, chatInput, activeCalc);
      } else {
        toast.warning("No Gemini API key. Applying local rule-based heuristics.");
        updatedCalc = runLocalHeuristics(chatInput, activeCalc);
      }

      // Update the active calculator state
      const nextList = calculators.map((c) => (c.id === activeId ? updatedCalc : c));
      setCalculators(nextList);
      saveCustomCalculators(nextList);
      setChatInput("");
      toast.success(`Successfully updated ${activeCalc.name}!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update calculator using AI.");
    } finally {
      setAiLoading(false);
    }
  };

  // Field editor updates
  const handleUpdateGeneralInfo = (field: keyof CustomCalculator, val: any) => {
    if (!activeCalc) return;
    const updated = { ...activeCalc, [field]: val };
    const nextList = calculators.map((c) => (c.id === activeId ? updated : c));
    setCalculators(nextList);
  };

  // Options variables editor updates
  const handleAddVariable = () => {
    if (!activeCalc) return;
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
      sort_order: activeCalc.variables.length + 1,
      visible_when_json: {}
    };
    const updated = { ...activeCalc, variables: [...activeCalc.variables, newVar] };
    const nextList = calculators.map((c) => (c.id === activeId ? updated : c));
    setCalculators(nextList);
  };

  const handleUpdateVariable = (idx: number, field: string, val: any) => {
    if (!activeCalc) return;
    const vars = [...activeCalc.variables];
    vars[idx] = { ...vars[idx], [field]: val };
    const updated = { ...activeCalc, variables: vars };
    const nextList = calculators.map((c) => (c.id === activeId ? updated : c));
    setCalculators(nextList);
  };

  const handleDeleteVariable = (idx: number) => {
    if (!activeCalc) return;
    const vars = activeCalc.variables.filter((_, i) => i !== idx);
    const updated = { ...activeCalc, variables: vars };
    const nextList = calculators.map((c) => (c.id === activeId ? updated : c));
    setCalculators(nextList);
  };

  // Materials editor updates
  const handleAddMaterial = () => {
    if (!activeCalc) return;
    const newMat = {
      skuPattern: "ITEM-SKU",
      namePattern: "New Material Item",
      category: "accessory",
      unit: "each",
      defaultPrice: 10.00,
      formula: "ceil(length)",
      description: "Custom material item"
    };
    const updated = { ...activeCalc, materials: [...activeCalc.materials, newMat] };
    const nextList = calculators.map((c) => (c.id === activeId ? updated : c));
    setCalculators(nextList);
  };

  const handleUpdateMaterial = (idx: number, field: string, val: any) => {
    if (!activeCalc) return;
    const mats = [...activeCalc.materials];
    mats[idx] = { ...mats[idx], [field]: val };
    const updated = { ...activeCalc, materials: mats };
    const nextList = calculators.map((c) => (c.id === activeId ? updated : c));
    setCalculators(nextList);
  };

  const handleDeleteMaterial = (idx: number) => {
    if (!activeCalc) return;
    const mats = activeCalc.materials.filter((_, i) => i !== idx);
    const updated = { ...activeCalc, materials: mats };
    const nextList = calculators.map((c) => (c.id === activeId ? updated : c));
    setCalculators(nextList);
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col font-sans">
      {/* Top Header Panel */}
      <div className="border-b border-brand-border bg-brand-card px-6 py-4 flex items-center justify-between shadow-md" data-print-hide>
        <div className="flex items-center gap-3">
          <Link
            to="/fence-calculator-v4"
            className="p-2 rounded-lg bg-brand-border/40 hover:bg-brand-border/75 transition-colors text-brand-muted hover:text-brand-text"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-brand-text flex items-center gap-2">
              <Wrench className="text-brand-accent shrink-0" size={18} />
              AI Fencing Calculator Builder
            </h1>
            <p className="text-xs text-brand-muted">
              Define options, pricing, and material formulas. Build calculators using voice dictation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Prices Count Chip */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border bg-brand-card/50 text-xs text-brand-muted">
            <FileSpreadsheet size={14} className="text-brand-muted" />
            <span>{pricesCount} SKU Prices loaded</span>
            <label className="ml-2 px-2 py-0.5 rounded bg-brand-accent/20 hover:bg-brand-accent/35 text-brand-accent cursor-pointer font-semibold transition-colors">
              Upload
              <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
            </label>
          </div>

          {/* Gemini API Key */}
          <div className="relative">
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="p-2 rounded-lg bg-brand-border/40 hover:bg-brand-border/75 transition-colors text-brand-muted hover:text-brand-text flex items-center gap-1"
              title="Configure API key"
            >
              <Settings size={15} />
              <span className="text-xs font-semibold">Gemini Key</span>
            </button>

            {showApiKey && (
              <div className="absolute right-0 top-full mt-2 z-50 p-4 rounded-xl border border-brand-border bg-brand-card shadow-2xl min-w-[320px] space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider">Gemini API Configuration</h4>
                  <p className="text-[10px] text-brand-muted mt-1 leading-relaxed">
                    Used securely in your browser to parse custom calculator structures. Get a free key from Google AI Studio.
                  </p>
                </div>
                <input
                  type="password"
                  placeholder="Paste Gemini API Key..."
                  value={apiKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    setApiKey(key);
                    localStorage.setItem("GEMINI_API_KEY", key);
                  }}
                  className="w-full px-3 py-2 border border-brand-border rounded-lg bg-brand-bg text-sm text-brand-text outline-none focus:border-brand-accent"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowApiKey(false)}
                    className="px-3 py-1.5 rounded-lg bg-brand-accent hover:bg-brand-accent/90 text-xs font-semibold text-white transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Seed Defaults / Save */}
          <button
            onClick={handleResetToDefaults}
            className="px-3 py-1.5 rounded-lg border border-brand-border/80 hover:bg-brand-border/40 text-xs font-semibold text-brand-muted hover:text-brand-text transition-colors"
          >
            Reset seeds
          </button>
          <button
            onClick={() => handleSaveAll()}
            className="px-4 py-1.5 rounded-lg bg-brand-accent hover:bg-brand-accent/90 text-xs font-semibold text-white shadow-md transition-all flex items-center gap-1.5"
          >
            <Save size={14} />
            Save changes
          </button>
        </div>
      </div>

      {/* Main Workspace Panels */}
      <div className="flex-1 flex min-h-0">
        
        {/* Left Panel - Catalog Tree */}
        <div className="w-64 border-r border-brand-border bg-brand-card/35 flex flex-col p-4 space-y-4">
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted">Calculators Catalog</h3>
            <button
              onClick={handleAddSystem}
              className="p-1 rounded bg-brand-accent/15 hover:bg-brand-accent/30 text-brand-accent transition-colors"
              title="Add new custom calculator"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {Object.entries(dynamicCategorizedCalculators).map(([catName, items]) => {
              const isExpanded = expandedCat === catName;
              return (
                <div key={catName} className="rounded-xl border border-brand-border/40 bg-brand-card/25 overflow-hidden mb-2">
                  <button
                    type="button"
                    onClick={() => setExpandedCat(isExpanded ? null : catName)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-brand-card/85 hover:bg-brand-card border-b border-brand-border/20 text-xs font-black text-brand-text transition"
                  >
                    <span className="flex items-center gap-2">
                      {(catName.toLowerCase().includes("pine") || catName.toLowerCase().includes("timber")) && <Trees size={14} className="text-brand-primary" />}
                      {catName.toLowerCase().includes("colorbond") && <Layers size={14} className="text-brand-primary" />}
                      {(catName.toLowerCase().includes("pool") || catName.toLowerCase().includes("glass")) && <Waves size={14} className="text-brand-primary" />}
                      {catName.toLowerCase().includes("slat") && <AlignJustify size={14} className="text-brand-primary" />}
                      {catName.toLowerCase().includes("modular") && <Layout size={14} className="text-brand-primary" />}
                      {(catName.toLowerCase().includes("commercial") || catName.toLowerCase().includes("chain") || catName.toLowerCase().includes("weld")) && <Building2 size={14} className="text-brand-primary" />}
                      {(catName.toLowerCase().includes("gate") || catName.toLowerCase().includes("security")) && <KeyRound size={14} className="text-brand-primary" />}
                      {catName.toLowerCase().includes("retaining") && <Mountain size={14} className="text-brand-primary" />}
                      {catName}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`text-brand-muted transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="p-2 space-y-1.5 bg-brand-bg/10">
                      {items.map((c) => {
                        const isActive = c.id === activeId;
                        const subPath = c.path.slice(1).join(" › ") || c.name;
                        return (
                          <button
                            key={c.id}
                            onClick={() => setActiveId(c.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-start gap-2.5 ${
                              isActive
                                ? "border-brand-accent bg-brand-accent/5 ring-1 ring-brand-accent/40 shadow-sm"
                                : "border-brand-border/55 bg-brand-card/50 hover:border-brand-accent/50 hover:bg-brand-card"
                            }`}
                          >
                            <Folder className={`shrink-0 mt-0.5 ${isActive ? "text-brand-accent" : "text-brand-muted"}`} size={14} />
                            <div className="min-w-0">
                              <span className="block truncate text-xs font-semibold text-brand-text leading-tight">{c.name}</span>
                              {subPath && subPath !== c.name && (
                                <span className="block truncate text-[9px] text-brand-muted mt-0.5">{subPath}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle Panel - Builder Designer */}
        <div className="flex-1 border-r border-brand-border bg-brand-bg flex flex-col min-w-0">
          {activeCalc ? (
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Designer Form Scroll Workspace */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Meta details */}
                <div className="bg-brand-card p-4 rounded-xl border border-brand-border/55 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-accent">General Info</h3>
                    <button
                      onClick={() => handleDeleteSystem(activeCalc.id)}
                      className="p-1 text-brand-danger hover:bg-brand-danger/10 rounded transition-colors flex items-center gap-1 text-[10px]"
                      title="Delete this calculator"
                    >
                      <Trash2 size={12} /> Delete calculator
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="space-y-1">
                      <span className="text-[11px] font-medium text-brand-muted uppercase">Calculator Name</span>
                      <input
                        type="text"
                        value={activeCalc.name}
                        onChange={(e) => handleUpdateGeneralInfo("name", e.target.value)}
                        className="w-full px-3 py-2 border border-brand-border rounded-lg bg-brand-bg text-sm text-brand-text outline-none"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[11px] font-medium text-brand-muted uppercase">System ID</span>
                      <input
                        type="text"
                        disabled
                        value={activeCalc.id}
                        className="w-full px-3 py-2 border border-brand-border rounded-lg bg-brand-card text-sm text-brand-muted cursor-not-allowed font-mono"
                      />
                    </label>
                    <label className="sm:col-span-2 space-y-1">
                      <span className="text-[11px] font-medium text-brand-muted uppercase">Description</span>
                      <textarea
                        value={activeCalc.description}
                        rows={2}
                        onChange={(e) => handleUpdateGeneralInfo("description", e.target.value)}
                        className="w-full px-3 py-2 border border-brand-border rounded-lg bg-brand-bg text-sm text-brand-text outline-none resize-none"
                      />
                    </label>
                  </div>
                </div>

                {/* Options Variables Editor */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted">Variables & Selector Options</h3>
                    <button
                      onClick={handleAddVariable}
                      className="px-2.5 py-1 rounded-lg bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent transition-colors text-xs font-semibold flex items-center gap-1"
                    >
                      <PlusCircle size={14} /> Add variable
                    </button>
                  </div>

                  <div className="space-y-2">
                    {activeCalc.variables.map((v, idx) => (
                      <div key={v.id} className="bg-brand-card p-3 rounded-lg border border-brand-border/40 flex flex-wrap items-center gap-3 shadow-xs">
                        <label className="flex-1 min-w-[120px] space-y-1">
                          <span className="text-[9px] font-bold text-brand-muted uppercase">Label</span>
                          <input
                            type="text"
                            value={v.label}
                            onChange={(e) => handleUpdateVariable(idx, "label", e.target.value)}
                            className="w-full px-2 py-1.5 border border-brand-border rounded-md bg-brand-bg text-xs text-brand-text outline-none"
                          />
                        </label>
                        <label className="flex-1 min-w-[100px] space-y-1">
                          <span className="text-[9px] font-bold text-brand-muted uppercase">Key</span>
                          <input
                            type="text"
                            value={v.field_key}
                            onChange={(e) => handleUpdateVariable(idx, "field_key", e.target.value)}
                            className="w-full px-2 py-1.5 border border-brand-border rounded-md bg-brand-bg text-xs text-brand-text outline-none font-mono"
                          />
                        </label>
                        <label className="min-w-[80px] space-y-1">
                          <span className="text-[9px] font-bold text-brand-muted uppercase">Type</span>
                          <select
                            value={v.control_type}
                            onChange={(e) => handleUpdateVariable(idx, "control_type", e.target.value)}
                            className="w-full px-2 py-1.5 border border-brand-border rounded-md bg-brand-bg text-xs text-brand-text outline-none"
                          >
                            <option value="select">Dropdown</option>
                            <option value="number">Numeric</option>
                            <option value="toggle">Checkbox</option>
                          </select>
                        </label>
                        
                        {v.control_type === "select" && (
                          <label className="flex-[2] min-w-[180px] space-y-1">
                            <span className="text-[9px] font-bold text-brand-muted uppercase">Choices (comma split)</span>
                            <input
                              type="text"
                              value={Array.isArray(v.options_json) ? v.options_json.join(", ") : ""}
                              onChange={(e) => {
                                const arr = e.target.value.split(",").map(s => s.trim());
                                handleUpdateVariable(idx, "options_json", arr);
                                handleUpdateVariable(idx, "default_value_json", arr[0] || "");
                              }}
                              className="w-full px-2 py-1.5 border border-brand-border rounded-md bg-brand-bg text-xs text-brand-text outline-none"
                            />
                          </label>
                        )}

                        <button
                          onClick={() => handleDeleteVariable(idx)}
                          className="mt-4 p-1.5 text-brand-danger hover:bg-brand-danger/10 rounded-md transition-colors"
                          title="Remove option"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Materials & Formulas Designer */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted">BOM Materials & Formulas</h3>
                    <button
                      onClick={handleAddMaterial}
                      className="px-2.5 py-1 rounded-lg bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent transition-colors text-xs font-semibold flex items-center gap-1"
                    >
                      <PlusCircle size={14} /> Add material
                    </button>
                  </div>

                  <div className="space-y-3">
                    {activeCalc.materials.map((m, idx) => (
                      <div key={idx} className="bg-brand-card p-4 rounded-xl border border-brand-border/40 space-y-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <label className="flex-[2] min-w-[120px] space-y-1">
                            <span className="text-[9px] font-bold text-brand-muted uppercase">Name Pattern</span>
                            <input
                              type="text"
                              value={m.namePattern}
                              onChange={(e) => handleUpdateMaterial(idx, "namePattern", e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-brand-border rounded-lg bg-brand-bg text-xs text-brand-text outline-none"
                            />
                          </label>
                          <label className="flex-1 min-w-[100px] space-y-1">
                            <span className="text-[9px] font-bold text-brand-muted uppercase">SKU Pattern</span>
                            <input
                              type="text"
                              value={m.skuPattern}
                              onChange={(e) => handleUpdateMaterial(idx, "skuPattern", e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-brand-border rounded-lg bg-brand-bg text-xs text-brand-text outline-none font-mono"
                            />
                          </label>
                          <label className="w-24 space-y-1">
                            <span className="text-[9px] font-bold text-brand-muted uppercase">Category</span>
                            <select
                              value={m.category}
                              onChange={(e) => handleUpdateMaterial(idx, "category", e.target.value)}
                              className="w-full px-2 py-1.5 border border-brand-border rounded-lg bg-brand-bg text-xs text-brand-text outline-none"
                            >
                              <option value="post">Post</option>
                              <option value="rail">Rail</option>
                              <option value="slat">Paling/Slat</option>
                              <option value="screw">Screw/Nails</option>
                              <option value="accessory">Accessory</option>
                              <option value="fixing">Fixing</option>
                            </select>
                          </label>
                          <button
                            onClick={() => handleDeleteMaterial(idx)}
                            className="p-1.5 text-brand-danger hover:bg-brand-danger/10 rounded-md transition-colors self-end"
                            title="Remove material"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <label className="space-y-1">
                            <span className="text-[9px] font-bold text-brand-muted uppercase">Default Price ($)</span>
                            <input
                              type="number"
                              step="0.01"
                              value={m.defaultPrice}
                              onChange={(e) => handleUpdateMaterial(idx, "defaultPrice", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-brand-border rounded-lg bg-brand-bg text-xs text-brand-text outline-none font-mono"
                            />
                          </label>
                          <label className="sm:col-span-2 space-y-1">
                            <span className="text-[9px] font-bold text-brand-muted uppercase">Calculation Formula</span>
                            <input
                              type="text"
                              value={m.formula}
                              onChange={(e) => handleUpdateMaterial(idx, "formula", e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-brand-border rounded-lg bg-brand-bg text-xs text-brand-text outline-none font-mono text-brand-accent font-semibold"
                            />
                          </label>
                        </div>
                        <p className="text-[10px] text-brand-muted italic mt-1 leading-relaxed">
                          {m.description || "Evaluates formula to output Bill of Materials quantity."}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Bottom Panel - AI Copilot Voice/Text */}
              <div className="shrink-0 border-t border-brand-border bg-brand-card/50 p-4 shadow-inner space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="text-brand-accent" size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-text">AI Calculator Assistant</span>
                  </div>
                  <span className="text-[10px] text-brand-muted">
                    {apiKey ? "Gemini 2.5 Flash active" : "Local parsing active (API key empty)"}
                  </span>
                </div>

                <form onSubmit={handleAiSubmit} className="flex gap-2">
                  <div className="flex-1 relative flex items-center bg-brand-bg border border-brand-border rounded-xl px-3 py-2">
                    <input
                      type="text"
                      placeholder="e.g. Add option gap_size (5,10,20). Calculate rails as length/2.4 * 3."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={aiLoading}
                      className="w-full bg-transparent border-0 outline-none text-xs placeholder:text-brand-muted/50 text-brand-text p-0 focus:ring-0"
                    />
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`p-1.5 rounded-lg transition-colors ${
                        listening 
                          ? "bg-brand-danger/20 text-brand-danger animate-pulse" 
                          : "text-brand-muted hover:text-brand-text hover:bg-brand-border/40"
                      }`}
                      title={listening ? "Stop voice dictation" : "Start voice dictation"}
                    >
                      <Mic size={14} />
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={aiLoading || !chatInput.trim()}
                    className="px-4 rounded-xl bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-40 disabled:hover:bg-brand-accent text-white transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold"
                  >
                    <Send size={12} />
                    <span>Apply</span>
                  </button>
                </form>

                {/* Suggestions Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setChatInput("Add option gap_size with 5, 10, 20")}
                    className="text-[10px] bg-brand-border/30 hover:bg-brand-border/60 text-brand-muted px-2 py-0.5 rounded-full transition-colors"
                  >
                    + Gap Option
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatInput("Rails formula should be ceil(length / 2.4) * 3")}
                    className="text-[10px] bg-brand-border/30 hover:bg-brand-border/60 text-brand-muted px-2 py-0.5 rounded-full transition-colors"
                  >
                    Update Rails
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatInput("Nails should be 6 per paling")}
                    className="text-[10px] bg-brand-border/30 hover:bg-brand-border/60 text-brand-muted px-2 py-0.5 rounded-full transition-colors"
                  >
                    Update Nails
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatInput("Post spacing spaced every 2.4 meters")}
                    className="text-[10px] bg-brand-border/30 hover:bg-brand-border/60 text-brand-muted px-2 py-0.5 rounded-full transition-colors"
                  >
                    Update Post Spacing
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <Calculator size={48} className="text-brand-muted/40 animate-pulse" />
              <div>
                <h3 className="font-bold text-brand-text">No calculator selected</h3>
                <p className="text-sm text-brand-muted mt-1">Select or create a calculator from the catalog tree to begin.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Real-time Interactive Sandbox */}
        <div className="w-80 border-l border-brand-border bg-brand-card/45 flex flex-col min-w-0">
          <div className="p-4 border-b border-brand-border shrink-0 bg-brand-card/85 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text flex items-center gap-1.5">
              <Calculator size={14} className="text-brand-accent" />
              Calculator Sandbox
            </h3>
            <span className="text-[10px] font-mono bg-brand-border/40 text-brand-muted px-1.5 py-0.5 rounded">
              Live Preview
            </span>
          </div>

          {activeCalc ? (
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Test Inputs */}
              <div className="p-4 border-b border-brand-border space-y-4 shrink-0 bg-brand-card/30">
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-[10px] font-medium uppercase text-brand-muted">Length (m)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={sandboxLength}
                      onChange={(e) => setSandboxLength(Math.max(0.1, parseFloat(e.target.value) || 0))}
                      className="w-full px-2.5 py-1.5 border border-brand-border rounded-lg bg-brand-bg text-xs font-semibold font-mono text-brand-text outline-none"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-medium uppercase text-brand-muted">Height (mm)</span>
                    <input
                      type="number"
                      step="100"
                      value={sandboxHeight}
                      onChange={(e) => setSandboxHeight(Math.max(100, parseInt(e.target.value) || 0))}
                      className="w-full px-2.5 py-1.5 border border-brand-border rounded-lg bg-brand-bg text-xs font-semibold font-mono text-brand-text outline-none"
                    />
                  </label>
                </div>

                {/* Dynamically rendered inputs from custom calculator variables */}
                {activeCalc.variables.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-brand-border/40">
                    <h4 className="text-[10px] font-bold uppercase text-brand-muted">Calculator Parameters</h4>
                    <div className="space-y-2.5">
                      {activeCalc.variables.map((v) => {
                        const currentVal = sandboxVars[v.field_key] !== undefined ? sandboxVars[v.field_key] : v.default_value_json;
                        
                        if (v.control_type === "toggle") {
                          return (
                            <label key={v.id} className="flex items-center gap-2.5 cursor-pointer py-1">
                              <input
                                type="checkbox"
                                checked={Boolean(currentVal)}
                                onChange={(e) => setSandboxVars({ ...sandboxVars, [v.field_key]: e.target.checked })}
                                className="rounded border-brand-border bg-brand-bg text-brand-accent focus:ring-brand-accent"
                              />
                              <span className="text-xs font-medium text-brand-text">{v.label}</span>
                            </label>
                          );
                        }

                        if (v.control_type === "select") {
                          return (
                            <label key={v.id} className="block space-y-1">
                              <span className="text-[10px] text-brand-muted">{v.label}</span>
                              <select
                                value={String(currentVal)}
                                onChange={(e) => setSandboxVars({ ...sandboxVars, [v.field_key]: e.target.value })}
                                className="w-full px-2 py-1.5 border border-brand-border rounded-lg bg-brand-bg text-xs text-brand-text outline-none"
                              >
                                {v.options_json?.map((opt: any) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </label>
                          );
                        }

                        return (
                          <label key={v.id} className="block space-y-1">
                            <span className="text-[10px] text-brand-muted">{v.label} {v.unit && `(${v.unit})`}</span>
                            <input
                              type="number"
                              value={Number(currentVal)}
                              onChange={(e) => setSandboxVars({ ...sandboxVars, [v.field_key]: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2 py-1.5 border border-brand-border rounded-lg bg-brand-bg text-xs text-brand-text outline-none"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Calculated BOM Line Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold uppercase text-brand-muted">Bill of Materials</h4>
                  <span className="text-[10px] text-brand-muted">{bomResult?.lines?.length || 0} line items</span>
                </div>

                {bomResult?.lines && bomResult.lines.length > 0 ? (
                  <div className="space-y-2">
                    {bomResult.lines.map((line: BOMLineItem, i: number) => (
                      <div key={i} className="p-3 bg-brand-card border border-brand-border/45 rounded-lg space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-bold text-brand-text leading-snug">{line.description}</span>
                          <span className="text-xs font-bold text-brand-accent whitespace-nowrap">${line.lineTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-brand-muted font-mono">
                          <span>SKU: {line.sku}</span>
                          <span>{line.quantity} {line.unit} × ${line.unitPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-brand-muted italic">
                    BOM empty. Enter length/dimensions to calculate.
                  </div>
                )}
              </div>

              {/* Sandbox Totals Footer */}
              {bomResult && (
                <div className="shrink-0 border-t border-brand-border bg-brand-card/90 p-4 space-y-2">
                  <div className="flex justify-between text-xs text-brand-muted">
                    <span>Subtotal:</span>
                    <span>${bomResult.totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-brand-muted">
                    <span>GST (10%):</span>
                    <span>${bomResult.totals.gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-brand-text pt-2 border-t border-brand-border/40">
                    <span className="flex items-center gap-1">
                      Grand Total:
                    </span>
                    <span className="text-brand-accent">${bomResult.totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-6 text-xs text-brand-muted italic">
              No live preview. Select a calculator.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
