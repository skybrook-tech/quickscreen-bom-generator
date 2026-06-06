import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCalculator, CalculatorProvider } from "../context/CalculatorContext";
import { FenceConfigProvider } from "../context/FenceConfigContext";
import { GateProvider } from "../context/GateContext";
import { LayoutCanvasV3 } from "../components/calculator-v3/LayoutCanvasV3";
import { useBomCalculator } from "../hooks/useBomCalculator";
import { calcRunStats } from "../lib/runStats";
import { clampPostSpacing } from "../lib/productOptionRules";
import { initialVariablesForSystem } from "../lib/productOptionRules";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";
import { AnyfenceLogo } from "../components/brand/AnyfenceLogo";
import {
  Hammer,
  Video,
  UploadCloud,
  CheckCircle2,
  XCircle,
  FileVideo,
  DollarSign,
  AlertTriangle,
  Map,
  Shield,
  Layers,
  MapPin,
  Clock,
  Phone,
  Mail
} from "lucide-react";
import { toast } from "sonner";
import type { CanonicalPayload, CanonicalRun } from "../types/canonical.types";
import type { CalculatorBOMResult } from "../types/bom.types";

interface ContractorDetails {
  id: string;
  slug: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  logoUrl?: string;
  servicedPostcodes: string[];
  installRatePerMeter: number;
  installRatePerPost: number;
  installRatePerGate: number;
  markupPercent: number;
  description: string;
}

// Predefined mock contractors for local fallback and testing
const MOCK_CONTRACTORS: Record<string, ContractorDetails> = {
  "skybrook-fencing": {
    id: "skybrook-fencing-id",
    slug: "skybrook-fencing",
    name: "Alex Skybrook",
    companyName: "Skybrook Fencing & Gates",
    phone: "0412 345 678",
    email: "alex@skybrookfencing.com.au",
    servicedPostcodes: ["4000", "4001", "4005", "4006", "4007", "4010", "4011", "4012", "4030", "4031", "4032", "4051", "4053", "4101", "4102", "4169"],
    installRatePerMeter: 95,
    installRatePerPost: 60,
    installRatePerGate: 180,
    markupPercent: 20,
    description: "Premium residential fencing installation specialist across Brisbane inner suburbs."
  },
  "apex-installations": {
    id: "apex-installations-id",
    slug: "apex-installations",
    name: "Marcus Miller",
    companyName: "Apex Fencing Installations",
    phone: "0499 888 777",
    email: "marcus@apexfencing.com.au",
    servicedPostcodes: ["2000", "2001", "2010", "2011", "2015", "2016", "2020", "2021", "2025", "2026", "2030", "2031"],
    installRatePerMeter: 110,
    installRatePerPost: 75,
    installRatePerGate: 220,
    markupPercent: 15,
    description: "Experienced contractor offering reliable supply & install services for slat fencing in Sydney."
  },
  "elite-fencing": {
    id: "elite-fencing-id",
    slug: "elite-fencing",
    name: "Dave Elite",
    companyName: "Elite Slat Fencing Co",
    phone: "0477 666 555",
    email: "dave@eliteslatfencing.com.au",
    servicedPostcodes: ["3000", "3001", "3002", "3003", "3004", "3005", "3006", "3008", "3051", "3052", "3053", "3054"],
    installRatePerMeter: 105,
    installRatePerPost: 70,
    installRatePerGate: 200,
    markupPercent: 18,
    description: "Melbourne's premier choice for custom slat fencing and gate installations."
  }
};

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

function runLengthMm(run: CanonicalRun): number {
  return run.segments.reduce((sum, segment) => {
    if (segment.segmentKind === "gate_opening") return sum;
    const qty =
      run.productCode === "BAYG"
        ? Math.max(1, Math.round(Number(segment.variables?.panel_quantity ?? 1)))
        : 1;
    return sum + Number(segment.segmentWidthMm ?? 0) * qty;
  }, 0);
}

function createEmptyPayload(systemType = "QSHS"): CanonicalPayload {
  return {
    productCode: systemType,
    schemaVersion: "v1",
    variables: initialVariablesForSystem(systemType),
    runs: [],
  };
}

const SYSTEM_OPTIONS = [
  { value: "QSHS", label: "Horizontal Slat Fencing" },
  { value: "VS", label: "Vertical Slat Fencing" },
  { value: "XPL", label: "Xpress Louvre Fencing" },
  { value: "BAYG", label: "Boundary Panel Screens" }
];

const COLOUR_OPTIONS = [
  { value: "B", label: "Black Satin" },
  { value: "MN", label: "Monument Matt" },
  { value: "G", label: "Woodland Grey Matt" },
  { value: "SM", label: "Surfmist Matt" },
  { value: "W", label: "Pearl White Gloss" },
  { value: "BS", label: "Basalt Satin" },
  { value: "D", label: "Dune Satin" },
  { value: "M", label: "Mill" }
];

const HEIGHT_OPTIONS = [
  { value: "900", label: "900 mm" },
  { value: "1200", label: "1200 mm" },
  { value: "1500", label: "1500 mm" },
  { value: "1800", label: "1800 mm" },
  { value: "2100", label: "2100 mm" }
];

const GAP_OPTIONS = [
  { value: "5", label: "5 mm Gap" },
  { value: "9", label: "9 mm Gap" },
  { value: "20", label: "20 mm Gap" }
];

const MOUNTING_OPTIONS = [
  { value: "in_ground", label: "Concreted In Ground" },
  { value: "base_plate", label: "Base Plated" },
  { value: "core_drill", label: "Core Drilled" }
];

function ContractorEmbedQuoteContent({ contractorSlug }: { contractorSlug?: string }) {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;
  const bomMutation = useBomCalculator();
  const bomRequestIdRef = useRef(0);
  const skipRecalcRef = useRef(false);

  // ─── 1. Load Contractor Details ───────────────────────────────────────────
  const activeSlug = contractorSlug || "skybrook-fencing";
  const { data: contractor, isLoading: loadingContractor } = useQuery<ContractorDetails | null>({
    queryKey: ["embedContractor", activeSlug],
    queryFn: async () => {
      // First try database lookup in public profiles
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, company, phone, email")
          .eq("user_type", "contractor");
        
        if (!error && data && data.length > 0) {
          const matched = data.find(p => slugify(p.company || p.full_name || "") === activeSlug);
          if (matched) {
            return {
              id: matched.id,
              slug: activeSlug,
              name: matched.full_name || "Contractor Installer",
              companyName: matched.company || "Fencing Installer",
              phone: matched.phone || "0400 000 000",
              email: matched.email || "installer@fencingnetwork.com.au",
              servicedPostcodes: ["4000", "4001", "4005", "4006", "4007", "4010", "4011", "4012", "4030", "4031", "4032", "4051", "4053", "4101", "4102", "4169"],
              installRatePerMeter: 95,
              installRatePerPost: 60,
              installRatePerGate: 180,
              markupPercent: 20,
              description: "Verified fencing installation partner on Skybrook network."
            };
          }
        }
      } catch (err) {
        console.warn("Could not query profiles due to RLS, falling back to mock list:", err);
      }
      
      // Fallback to local mock registry
      return MOCK_CONTRACTORS[activeSlug] || MOCK_CONTRACTORS["skybrook-fencing"];
    }
  });

  // ─── 2. Postcode & Contact Verification State ──────────────────────────────
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientPostcode, setClientPostcode] = useState("");
  const [postcodeError, setPostcodeError] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  const handleVerifyPostcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractor) return;

    if (!clientName || !clientEmail || !clientPhone || !clientPostcode) {
      setPostcodeError("Please fill out all contact fields.");
      return;
    }

    const trimmedPostcode = clientPostcode.trim();
    if (contractor.servicedPostcodes.includes(trimmedPostcode)) {
      setIsVerified(true);
      setPostcodeError("");
      toast.success(`Success! We service postcode ${trimmedPostcode}.`);
    } else {
      setIsVerified(false);
      setPostcodeError(
        `Sorry, we do not service postcode ${trimmedPostcode}. Serviced areas include: ${contractor.servicedPostcodes.slice(0, 6).join(", ")}...`
      );
      toast.error("Location outside service area.");
    }
  };

  // ─── 3. Video Dropzone Mock State ──────────────────────────────────────────
  const [videoFile, setVideoFile] = useState<{ name: string; size: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      startMockUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) {
      startMockUpload(file);
    } else {
      toast.error("Please drop a valid video file.");
    }
  };

  const startMockUpload = (file: File) => {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setVideoFile({ name: file.name, size: `${sizeMb} MB` });
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          toast.success("Walk-through video attached successfully!");
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setUploadProgress(-1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── 4. Quote Calculations & Real-time Recalculations ────────────────────────
  const bomResult = state.bomResult as CalculatorBOMResult | null;
  const materialsExGst = bomResult?.total ?? 0;

  // Initialize payload on mount or product code change
  useEffect(() => {
    if (!payload) {
      dispatch({ type: "SET_PAYLOAD", payload: createEmptyPayload("QSHS") });
    }
  }, [payload, dispatch]);

  const payloadCalcKey = useMemo(() => {
    return payload ? JSON.stringify(payload) : null;
  }, [payload]);

  // Recalculate BOM when payload structures/variables change
  useEffect(() => {
    if (!payload || !payloadCalcKey) return;
    if (skipRecalcRef.current) {
      skipRecalcRef.current = false;
      return;
    }

    const emptyRuns = payload.runs.every((run) => run.segments.length === 0);
    if (emptyRuns) {
      dispatch({ type: "CLEAR_BOM_RESULT" });
      return;
    }

    const requestId = ++bomRequestIdRef.current;
    const triggerRecalc = async () => {
      try {
        const result = await bomMutation.mutateAsync({
          payload,
          supplierSlug: "glass-outlet"
        });
        if (requestId !== bomRequestIdRef.current) return;
        dispatch({ type: "SET_BOM_RESULT", result });
      } catch (err) {
        console.error("BOM recalculation failed:", err);
      }
    };

    const timer = setTimeout(triggerRecalc, 400);
    return () => clearTimeout(timer);
  }, [payloadCalcKey, dispatch]);

  // Update variables helper
  const updatePayloadVariables = (updates: Record<string, any>) => {
    if (!payload) return;
    const newVariables = { ...payload.variables, ...updates };
    const newRuns = payload.runs.map((run) => ({
      ...run,
      variables: { ...run.variables, ...updates }
    }));
    dispatch({
      type: "SET_PAYLOAD",
      payload: {
        ...payload,
        variables: newVariables,
        runs: newRuns
      }
    });
  };

  // Fence system layout totals
  const fenceTotals = useMemo(() => {
    if (!payload) return { lengthM: 0, posts: 0, gates: 0 };
    const jobMax = clampPostSpacing(payload.variables.max_panel_width_mm, 2600);
    
    return payload.runs.reduce(
      (acc, run) => {
        const stats = calcRunStats(run, jobMax);
        const lenM = runLengthMm(run) / 1000;
        const gateCount = run.segments.filter((s) => s.segmentKind === "gate_opening").length;

        return {
          lengthM: acc.lengthM + lenM,
          posts: acc.posts + stats.posts,
          gates: acc.gates + gateCount
        };
      },
      { lengthM: 0, posts: 0, gates: 0 }
    );
  }, [payload]);

  // Pricing Breakdown (Materials + Labor Installation + Markup)
  const installCost = useMemo(() => {
    if (!contractor) return 0;
    const laborLength = fenceTotals.lengthM * contractor.installRatePerMeter;
    const laborPosts = fenceTotals.posts * contractor.installRatePerPost;
    const laborGates = fenceTotals.gates * contractor.installRatePerGate;
    return laborLength + laborPosts + laborGates;
  }, [fenceTotals, contractor]);

  const markupAmount = useMemo(() => {
    if (!contractor) return 0;
    return (materialsExGst + installCost) * (contractor.markupPercent / 100);
  }, [materialsExGst, installCost, contractor]);

  const subtotalExGst = materialsExGst + installCost + markupAmount;
  const gstAmount = subtotalExGst * 0.10;
  const grandTotalIncGst = subtotalExGst * 1.10;

  // ─── 5. Submit Form State ─────────────────────────────────────────────────
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitQuoteRequest = () => {
    if (!clientName || !clientEmail || !clientPhone || !clientPostcode) {
      toast.error("Please verify your details and location first.");
      return;
    }
    if (fenceTotals.lengthM === 0) {
      toast.error("Please draw at least one fence run on the map.");
      return;
    }
    
    setSubmitted(true);
    toast.success("Your Supply & Install quote request has been sent!");
  };

  if (loadingContractor) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-brand-bg text-brand-text">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-primary border-t-transparent"></div>
        <p className="mt-4 text-sm text-brand-muted animate-pulse">Initializing portal...</p>
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-brand-bg text-brand-text p-6 text-center">
        <XCircle className="text-brand-danger mb-4" size={48} />
        <h1 className="text-xl font-bold text-brand-text">Contractor Link Invalid</h1>
        <p className="text-sm text-brand-muted mt-2 max-w-sm">
          The requested portal slug could not be resolved to an active installer.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <p className="text-xs text-brand-muted font-bold uppercase tracking-wider">Try Demo Links</p>
          <div className="flex gap-3 justify-center">
            {Object.keys(MOCK_CONTRACTORS).map(slug => (
              <a key={slug} href={`/embed/${slug}`} className="px-3 py-1.5 bg-brand-card hover:bg-brand-border/30 rounded border border-brand-border text-xs font-semibold text-brand-primary transition-colors">
                {MOCK_CONTRACTORS[slug].companyName}
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-brand-bg text-brand-text p-6 text-center">
        <div className="bg-brand-card border border-brand-border rounded-3xl p-8 max-w-xl mx-auto shadow-2xl space-y-6">
          <CheckCircle2 className="text-green-500 mx-auto animate-bounce" size={64} />
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-brand-text">Estimate Submitted!</h1>
            <p className="text-sm text-brand-muted leading-relaxed">
              Thanks <span className="text-brand-text font-bold">{clientName}</span>, your project details, map drawing, and walk-through video have been sent to <span className="text-brand-primary font-bold">{contractor.companyName}</span>.
            </p>
          </div>

          <div className="bg-brand-bg/50 p-4 rounded-2xl border border-brand-border/60 text-left text-xs space-y-2">
            <div className="flex justify-between"><span className="text-brand-muted">Postcode:</span> <span className="font-bold">{clientPostcode}</span></div>
            <div className="flex justify-between"><span className="text-brand-muted">Total Fence Length:</span> <span className="font-bold">{fenceTotals.lengthM.toFixed(1)} m</span></div>
            <div className="flex justify-between"><span className="text-brand-muted">Video Upload:</span> <span className="font-bold">{videoFile ? "Attached" : "None"}</span></div>
            <div className="flex justify-between border-t border-brand-border/30 pt-2"><span className="text-brand-muted">Estimated Total (Inc GST):</span> <span className="font-black text-brand-primary text-sm">${new Intl.NumberFormat("en-AU", { minimumFractionDigits: 2 }).format(grandTotalIncGst)}</span></div>
          </div>

          <div className="border-t border-brand-border/40 pt-4 text-xs text-brand-muted flex items-center justify-center gap-2">
            <Clock size={14} className="text-brand-primary" />
            Alex or one of the team will get in touch with you at <span className="text-brand-text font-bold">{clientPhone}</span> shortly.
          </div>

          <Button onClick={() => setSubmitted(false)} variant="secondary" className="w-full">
            Back to Estimator
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-brand-bg text-brand-text overflow-hidden">
      
      {/* ─── LEFT COLUMN: Wizard & Configurator (45% Width) ─────────────────── */}
      <aside className="w-full md:w-[45%] border-r border-brand-border/60 flex flex-col h-full bg-brand-bg">
        
        {/* Contractor Header */}
        <div className="p-4 border-b border-brand-border/60 bg-brand-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center font-black text-brand-primary">
              <Hammer size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-brand-text truncate max-w-[200px]" title={contractor.companyName}>
                {contractor.companyName}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] bg-brand-primary/10 border border-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Installer Partner
                </span>
                <span className="text-[8px] text-brand-muted flex items-center gap-1 select-none">
                  · powered by <AnyfenceLogo variant="white" showSubtitle={false} iconClassName="h-3 w-3" textClassName="text-[9px]" />
                </span>
              </div>
            </div>
          </div>
          <div className="text-right text-[10px] text-brand-muted shrink-0">
            <div className="flex items-center gap-1 justify-end"><Phone size={10} className="text-brand-primary" /> {contractor.phone}</div>
            <div className="flex items-center gap-1 mt-0.5 justify-end"><Mail size={10} className="text-brand-primary" /> {contractor.email}</div>
          </div>
        </div>

        {/* Scrollable Wizard Steps */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Step 1: Location Check & Contact Details */}
          <div className="bg-brand-card border border-brand-border/60 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-brand-muted flex items-center gap-2">
              <MapPin size={16} className="text-brand-primary" />
              1. Verify Service Area
            </h3>
            
            <form onSubmit={handleVerifyPostcode} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-muted mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    disabled={isVerified}
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:border-brand-primary disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-muted mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="0400 000 000"
                    disabled={isVerified}
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:border-brand-primary disabled:opacity-60"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-[1fr_5rem] gap-3 items-end">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-muted mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    disabled={isVerified}
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:border-brand-primary disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-muted mb-1">Postcode</label>
                  <input
                    type="text"
                    required
                    placeholder="4000"
                    disabled={isVerified}
                    value={clientPostcode}
                    onChange={(e) => setClientPostcode(e.target.value)}
                    className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-3 py-2 text-xs text-brand-text outline-none focus:border-brand-primary text-center disabled:opacity-60"
                  />
                </div>
              </div>

              {postcodeError && (
                <p className="text-[11px] text-brand-danger font-semibold bg-brand-danger/10 p-2 rounded-lg border border-brand-danger/25">
                  {postcodeError}
                </p>
              )}

              {isVerified ? (
                <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 p-2.5 rounded-lg text-xs font-semibold text-green-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> Location Serviced ({clientPostcode})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsVerified(false)}
                    className="text-[10px] text-brand-muted hover:text-brand-text font-bold"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <Button type="submit" variant="primary" className="w-full text-xs py-2">
                  Verify Postcode & Start
                </Button>
              )}
            </form>
          </div>

          {/* Locked Overlay for Design Steps */}
          <div className={`space-y-6 transition-opacity duration-300 ${isVerified ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
            
            {/* Step 2: Fence Configuration */}
            <div className="bg-brand-card border border-brand-border/60 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-brand-muted flex items-center gap-2">
                <Layers size={16} className="text-brand-primary" />
                2. Fence System & Configuration
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-muted mb-1">System Style</label>
                  <select
                    value={payload?.productCode || "QSHS"}
                    onChange={(e) => {
                      const sys = e.target.value;
                      const iv = initialVariablesForSystem(sys);
                      dispatch({
                        type: "SET_PAYLOAD",
                        payload: {
                          ...payload!,
                          productCode: sys,
                          variables: { ...payload!.variables, ...iv }
                        }
                      });
                    }}
                    className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-2.5 py-2 text-xs text-brand-text outline-none focus:border-brand-primary"
                  >
                    {SYSTEM_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-brand-card">{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-muted mb-1">Colorbond Color</label>
                  <select
                    value={String(payload?.variables?.colour_code || "B")}
                    onChange={(e) => updatePayloadVariables({ colour_code: e.target.value, post_colour_code: e.target.value })}
                    className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-2.5 py-2 text-xs text-brand-text outline-none focus:border-brand-primary"
                  >
                    {COLOUR_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-brand-card">{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-muted mb-1">Fence Height</label>
                  <select
                    value={String(payload?.variables?.target_height_mm || "1800")}
                    onChange={(e) => updatePayloadVariables({ target_height_mm: Number(e.target.value) })}
                    className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-2 py-2 text-xs text-brand-text outline-none focus:border-brand-primary"
                  >
                    {HEIGHT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-brand-card">{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-muted mb-1">Slat Gap</label>
                  <select
                    value={String(payload?.variables?.slat_gap_mm || "9")}
                    onChange={(e) => updatePayloadVariables({ slat_gap_mm: Number(e.target.value) })}
                    className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-2 py-2 text-xs text-brand-text outline-none focus:border-brand-primary"
                  >
                    {GAP_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-brand-card">{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-brand-muted mb-1">Post Mount</label>
                  <select
                    value={String(payload?.variables?.mounting_method || "in_ground")}
                    onChange={(e) => updatePayloadVariables({ mounting_method: e.target.value, mounting_type: e.target.value })}
                    className="w-full bg-brand-bg/50 border border-brand-border rounded-lg px-2 py-2 text-xs text-brand-text outline-none focus:border-brand-primary"
                  >
                    {MOUNTING_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} className="bg-brand-card">{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-brand-bg/40 border border-brand-border/40 rounded-xl p-3 text-[11px] text-brand-muted space-y-1.5">
                <p className="font-semibold text-brand-text flex items-center gap-1">
                  <Map size={14} className="text-brand-primary" /> Map Drawing Guidance:
                </p>
                <p>Use the Interactive Map canvas on the right to trace your fence runs. Add gates and click nodes to split. Calculations will update automatically.</p>
              </div>
            </div>

            {/* Step 3: Video Dropzone Upload */}
            <div className="bg-brand-card border border-brand-border/60 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-brand-muted flex items-center gap-2">
                  <Video size={16} className="text-brand-primary" />
                  3. Walk-through Video
                </h3>
                <span className="text-[9px] bg-brand-border/60 text-brand-muted px-1.5 py-0.5 rounded font-bold uppercase">
                  Optional
                </span>
              </div>
              
              <p className="text-xs text-brand-muted leading-relaxed">
                Take a quick video walking along the proposed fence line and upload it below. This helps us audit property layout, slope, and potential blockages.
              </p>

              {uploadProgress === -1 ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-brand-border/80 hover:border-brand-primary/60 rounded-xl p-6 text-center cursor-pointer transition-colors hover:bg-brand-border/5 space-y-2"
                >
                  <UploadCloud className="mx-auto text-brand-muted animate-pulse" size={28} />
                  <div className="text-xs font-bold text-brand-text">Drag & drop video here</div>
                  <div className="text-[10px] text-brand-muted">or click to browse from device (MP4, MOV, etc.)</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="bg-brand-bg/50 border border-brand-border/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                      <FileVideo size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-brand-text truncate">{videoFile?.name}</p>
                      <p className="text-[10px] text-brand-muted mt-0.5">{videoFile?.size}</p>
                    </div>
                    <button
                      type="button"
                      disabled={uploadProgress < 100 && uploadProgress >= 0}
                      onClick={handleRemoveVideo}
                      className="text-xs font-bold text-brand-danger hover:underline disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>

                  {uploadProgress < 100 ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-brand-muted">
                        <span>Uploading explanations...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1.5 bg-brand-border/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-primary transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-brand-success font-semibold">
                      <CheckCircle2 size={14} className="text-brand-success" /> Video attached.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 4: Supply & Install Price breakdown */}
            <div className="bg-brand-card border border-brand-border/60 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-brand-muted flex items-center gap-2">
                  <DollarSign size={16} className="text-brand-primary" />
                  4. Supply & Install Estimate
                </h3>
                <span className="text-[10px] font-bold text-brand-primary">
                  {fenceTotals.lengthM.toFixed(1)} m fence
                </span>
              </div>

              {fenceTotals.lengthM === 0 ? (
                <div className="text-center py-6 text-brand-muted text-xs border border-dashed border-brand-border rounded-xl">
                  Use the layout tool on the right to map fence runs.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Rough Estimate Badge */}
                  <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/25 p-3 rounded-xl">
                    <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-amber-500 uppercase tracking-wide">
                        Rough Estimate - Awaiting Contractor Approval
                      </h4>
                      <p className="text-[10px] text-brand-muted mt-1 leading-relaxed">
                        This is an automated pricing projection. Your contractor will review site parameters, access restrictions, and slope offsets before finalising the quote.
                      </p>
                    </div>
                  </div>

                  {/* Calculations Details Table */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-brand-border/30">
                      <span className="text-brand-muted">Supplier Materials (BOM total, ex GST)</span>
                      <span className="font-semibold text-brand-text">
                        {bomMutation.isPending ? "Calculating..." : `$${formatMoney(materialsExGst)}`}
                      </span>
                    </div>

                    <div className="py-1 border-b border-brand-border/30 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-brand-muted">Contractor Installation Labor (ex GST)</span>
                        <span className="font-semibold text-brand-text">
                          ${formatMoney(installCost)}
                        </span>
                      </div>
                      <div className="pl-3 text-[10px] text-brand-muted space-y-0.5">
                        <div>• Run labor: {fenceTotals.lengthM.toFixed(1)} m @ ${contractor.installRatePerMeter}/m = ${formatMoney(fenceTotals.lengthM * contractor.installRatePerMeter)}</div>
                        <div>• Posts assembly: {fenceTotals.posts} posts @ ${contractor.installRatePerPost}/post = ${formatMoney(fenceTotals.posts * contractor.installRatePerPost)}</div>
                        {fenceTotals.gates > 0 && (
                          <div>• Gates mounting: {fenceTotals.gates} gate{fenceTotals.gates > 1 ? "s" : ""} @ ${contractor.installRatePerGate}/gate = ${formatMoney(fenceTotals.gates * contractor.installRatePerGate)}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between py-1 border-b border-brand-border/30">
                      <span className="text-brand-muted">Contractor Markup ({contractor.markupPercent}%, ex GST)</span>
                      <span className="font-semibold text-brand-text">
                        ${formatMoney(markupAmount)}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-brand-border/30 font-bold text-brand-text">
                      <span>Subtotal (ex GST)</span>
                      <span>${formatMoney(subtotalExGst)}</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-brand-border/30">
                      <span className="text-brand-muted">GST (10%)</span>
                      <span className="font-semibold text-brand-text">${formatMoney(gstAmount)}</span>
                    </div>

                    <div className="flex justify-between py-2 text-sm font-black text-brand-primary">
                      <span>Supply & Install Total (inc GST)</span>
                      <span>${formatMoney(grandTotalIncGst)}</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleSubmitQuoteRequest}
                    disabled={bomMutation.isPending}
                    variant="primary"
                    className="w-full text-xs font-black uppercase py-3 shadow-lg"
                  >
                    Submit Details & Request Quote
                  </Button>
                </div>
              )}
            </div>

          </div>

          {/* Switcher for testing/reviewing other mock contractors */}
          <div className="border-t border-brand-border/40 pt-4 space-y-2">
            <p className="text-[10px] font-black uppercase text-brand-muted tracking-wide text-center">
              Testing Embeds: Swap Active Contractor
            </p>
            <div className="flex justify-center gap-2">
              {Object.keys(MOCK_CONTRACTORS).map(slug => {
                const selected = slug === activeSlug;
                return (
                  <Link
                    key={slug}
                    to={`/embed/${slug}`}
                    className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                      selected
                        ? "border-brand-primary bg-brand-primary text-white shadow-sm"
                        : "border-brand-border bg-brand-card text-brand-text hover:border-brand-primary"
                    }`}
                  >
                    {MOCK_CONTRACTORS[slug].companyName.split(" ")[0]}
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      </aside>

      {/* ─── RIGHT COLUMN: Interactive Layout Drawing Canvas (55% Width) ────── */}
      <main className="flex-1 relative h-full bg-brand-bg flex flex-col">
        {/* Help Banner at the top of the canvas */}
        <div className="absolute top-4 left-4 z-40 bg-brand-card/90 border border-brand-border/60 px-4 py-2.5 rounded-xl shadow-md pointer-events-none backdrop-blur-sm">
          <h4 className="text-xs font-black text-brand-text flex items-center gap-1.5">
            <Shield className="text-brand-primary" size={14} /> Fencing Layout Canvas
          </h4>
          <p className="text-[10px] text-brand-muted mt-0.5">
            Right-click/drag to pan • Scroll to zoom • Draw tool active by default
          </p>
        </div>

        {/* Canvas layout integration */}
        <div className="flex-1 h-full w-full">
          <LayoutCanvasV3
            mapExpanded={true}
            showRunDetails={false}
            jobName={`Customer S&I Quote - ${clientName || "Rough Estimate"}`}
            propertyAnchor={payload?.propertyAnchor}
            mapSnapshot={payload?.snapshot}
            onMapSnapshotChange={(snapshot) =>
              dispatch({ type: "SET_MAP_SNAPSHOT", snapshot })
            }
          />
        </div>
      </main>

    </div>
  );
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export function ContractorEmbedQuotePage() {
  const { contractorSlug } = useParams<{ contractorSlug?: string }>();
  
  // Isolate calculator state per loaded contractor
  const key = contractorSlug || "default";

  return (
    <CalculatorProvider key={key}>
      <FenceConfigProvider>
        <GateProvider>
          <ContractorEmbedQuoteContent contractorSlug={contractorSlug} />
        </GateProvider>
      </FenceConfigProvider>
    </CalculatorProvider>
  );
}
