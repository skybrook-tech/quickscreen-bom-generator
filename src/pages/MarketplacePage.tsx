import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { Button } from "../components/ui/Button";
import { 
  Search, 
  Grid, 
  Star, 
  ShieldCheck, 
  Users, 
  Copy, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Sliders
} from "lucide-react";
import { toast } from "sonner";

interface MarketplaceItem {
  id: string;
  name: string;
  contributor: string;
  description: string;
  tier: "verified" | "community" | "new_products";
  rating: number;
  reviewsCount: number;
  activeUses: number;
  archetype: string;
  generic?: boolean;
  aiVettingStatus?: "pending" | "passed" | "failed";
  aiVettingNotes?: string;
}

export function MarketplacePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<"all" | "generic" | "verified" | "community" | "new_products">("all");

  const [items] = useState<MarketplaceItem[]>([
    {
      id: "mkt-timber",
      name: "Generic Timber Paling Fence",
      contributor: "AnyFence Templates",
      description: "Generic, price-free design rules for timber paling, lap-and-cap, and plinth installations. Toggle on your local timber yard to overlay pricing automatically.",
      tier: "verified",
      rating: 4.8,
      reviewsCount: 15,
      activeUses: 980,
      archetype: "Timber Fence",
      generic: true,
      aiVettingStatus: "passed",
      aiVettingNotes: "AI assessment: Structural post math and paling overlaps conform fully to timber design guidelines."
    },
    {
      id: "mkt-generic-slat",
      name: "Generic Horizontal Slat Calculator",
      contributor: "AnyFence Templates",
      description: "Supplier-agnostic horizontal screening calculator. Emits generic bills of materials with canonical naming. Link your local supplier to populate wholesale prices.",
      tier: "verified",
      rating: 4.9,
      reviewsCount: 31,
      activeUses: 1420,
      archetype: "Horizontal Slat (QSHS)",
      generic: true,
      aiVettingStatus: "passed"
    },
    {
      id: "mkt-1",
      name: "Glass Outlet Standard Slat",
      contributor: "The Glass Outlet",
      description: "Official industry standard horizontal screening calculator. Fully tested across Australia and verified for production use.",
      tier: "verified",
      rating: 4.9,
      reviewsCount: 42,
      activeUses: 1240,
      archetype: "Horizontal Slat (QSHS)",
      aiVettingStatus: "passed"
    },
    {
      id: "mkt-2",
      name: "Economy Vertical Slat System",
      contributor: "Amazing Fencing",
      description: "Slat spacer optimized to maximize slat spans and lower post waste for budget contractor residential builds.",
      tier: "community",
      rating: 4.7,
      reviewsCount: 18,
      activeUses: 380,
      archetype: "Vertical Slat (VS)",
      aiVettingStatus: "passed"
    },
    {
      id: "mkt-3",
      name: "Cyclonic High Wind Panel",
      contributor: "Discount Fencing",
      description: "Heavy-duty bracing calculations designed specifically for Region C & D cyclonic building compliance requirements.",
      tier: "community",
      rating: 4.8,
      reviewsCount: 8,
      activeUses: 120,
      archetype: "Xpress Plus (XPL)",
      aiVettingStatus: "passed"
    },
    {
      id: "mkt-4",
      name: "3D Double Swing Gate Assembly",
      contributor: "Amazing Fencing",
      description: "Double swing gate width validation calculator, asserting clear gate leaf clearances, latch gaps, and hinge spacings.",
      tier: "community",
      rating: 4.6,
      reviewsCount: 12,
      activeUses: 290,
      archetype: "Swing Gate (QS_GATE)",
      aiVettingStatus: "passed"
    },
    {
      id: "mkt-new-5",
      name: "Xpress Slatted Gate (Louvred)",
      contributor: "EcoScreens Australia",
      description: "Experimental horizontal slat config with custom louvre angle adapters. Undergoing AnyFence vetting.",
      tier: "new_products",
      rating: 0,
      reviewsCount: 0,
      activeUses: 0,
      archetype: "Slat Fence",
      aiVettingStatus: "pending",
      aiVettingNotes: "AI assessment: Structural calculations verified. Deflection ratings under high wind load pending confirmation."
    }
  ]);

  const handleClone = (item: MarketplaceItem) => {
    toast.loading(`Cloning ${item.name} to Sandbox...`, { id: "clone" });
    
    setTimeout(() => {
      if (item.generic) {
        toast.success(`Successfully cloned generic template ${item.name}! Select a supplier in the workspace to load pricing.`, { id: "clone", duration: 5000 });
      } else {
        toast.success(`Successfully cloned ${item.name} into your Sandbox!`, { id: "clone" });
      }
      // Redirect to builder with pre-loaded mock state
      navigate(`/builder?clone=${item.id}`);
    }, 1000);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedTier === "all") return matchesSearch;
    if (selectedTier === "generic") return matchesSearch && item.generic === true;
    return matchesSearch && item.tier === selectedTier && !item.generic;
  });

  return (
    <AppShell>
      <div className="min-h-screen bg-brand-bg text-brand-text p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border/60 pb-6">
            <div>
              <h1 className="text-3xl font-black flex items-center gap-3">
                <Grid className="text-brand-primary animate-pulse" size={32} />
                National Calculator Marketplace
              </h1>
              <p className="text-brand-muted text-sm mt-1">
                Discover generic template calculators, verified supplier calculators, browse community variations, or publish your own templates.
              </p>
            </div>
            
            {/* Search */}
            <div className="relative w-full md:w-80 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" size={18} />
              <input 
                type="text" 
                placeholder="Search calculators..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-brand-card border border-brand-border focus:border-brand-primary/60 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition"
              />
            </div>
          </div>

          {/* Filtering and Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-brand-card/40 p-4 border border-brand-border/60 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-brand-muted uppercase tracking-wider mr-2">Filter Trust Tiers:</span>
              <button
                onClick={() => setSelectedTier("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedTier === "all"
                    ? "bg-brand-primary text-white"
                    : "bg-brand-bg text-brand-muted border border-brand-border hover:text-brand-text"
                }`}
              >
                All items
              </button>
              <button
                onClick={() => setSelectedTier("generic")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedTier === "generic"
                    ? "bg-brand-primary text-white"
                    : "bg-brand-bg text-brand-muted border border-brand-border hover:text-brand-text"
                }`}
              >
                Generic Templates
              </button>
              <button
                onClick={() => setSelectedTier("verified")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  selectedTier === "verified"
                    ? "bg-brand-primary text-white"
                    : "bg-brand-bg text-brand-muted border border-brand-border hover:text-brand-text"
                }`}
              >
                <ShieldCheck size={14} />
                Verified Suppliers
              </button>
              <button
                onClick={() => setSelectedTier("community")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  selectedTier === "community"
                    ? "bg-brand-primary text-white"
                    : "bg-brand-bg text-brand-muted border border-brand-border hover:text-brand-text"
                }`}
              >
                <Sparkles size={14} />
                Community
              </button>
              <button
                onClick={() => setSelectedTier("new_products")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  selectedTier === "new_products"
                    ? "bg-brand-primary text-white"
                    : "bg-brand-bg text-brand-muted border border-brand-border hover:text-brand-text"
                }`}
              >
                New Products
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-brand-muted font-bold">
              <TrendingUp size={16} className="text-brand-accent" />
              <span>48 communities building active calculators this week</span>
            </div>
          </div>

          {/* Grid Layout of Marketplace Items */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-20 bg-brand-card border border-dashed border-brand-border rounded-3xl text-brand-muted text-sm">
              No matching calculators found in the national registry.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-brand-card border border-brand-border hover:border-brand-primary/50 transition-all rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      {item.generic ? (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black uppercase tracking-wider flex items-center gap-1">
                          Generic
                        </span>
                      ) : item.tier === "verified" ? (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-black uppercase tracking-wider flex items-center gap-1">
                          <ShieldCheck size={12} />
                          VERIFIED
                        </span>
                      ) : item.tier === "new_products" ? (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-black uppercase tracking-wider flex items-center gap-1">
                          NEW / BETA
                        </span>
                      ) : (
                        <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 font-black uppercase tracking-wider flex items-center gap-1">
                          <Sparkles size={12} />
                          COMMUNITY
                        </span>
                      )}
                      
                      <div className="flex items-center gap-1 text-xs text-brand-muted font-bold">
                        <Star className="text-yellow-500 fill-current" size={14} />
                        {item.rating} <span className="font-normal text-[10px]">({item.reviewsCount})</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-brand-text leading-tight">{item.name}</h3>
                      <p className="text-[10px] text-brand-muted font-semibold mt-0.5 flex items-center gap-1">
                        Contributor: <span className="text-brand-accent">{item.contributor}</span>
                      </p>
                      <p className="text-xs text-brand-muted mt-3 leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                      
                      {/* AI Vetting status notes */}
                      {item.aiVettingStatus && (
                        <div className="mt-3 p-3 bg-brand-bg rounded-xl border border-brand-border/60 text-[11px]">
                          <span className="font-bold flex items-center gap-1">
                            🤖 AI Vetting: 
                            <span className={item.aiVettingStatus === "passed" ? "text-green-500" : "text-yellow-500"}>
                              {item.aiVettingStatus.toUpperCase()}
                            </span>
                          </span>
                          {item.aiVettingNotes && (
                            <p className="text-brand-muted mt-1 leading-normal">
                              {item.aiVettingNotes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-2 py-1 rounded bg-brand-bg border border-brand-border/60 text-brand-muted font-mono font-bold flex items-center gap-1 uppercase">
                        <Sliders size={10} />
                        {item.archetype}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-brand-border/40 mt-6">
                    <span className="text-[10px] text-brand-muted font-extrabold flex items-center gap-1.5 uppercase tracking-wide">
                      <Users size={14} className="text-brand-muted" />
                      {item.activeUses} uses
                    </span>
                    <Button 
                      size="small" 
                      variant="primary" 
                      onClick={() => handleClone(item)}
                      className="flex items-center gap-1 font-bold text-xs"
                      icon={Copy}
                    >
                      Clone
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Prompt to contribute */}
          <div className="bg-gradient-to-r from-brand-primary/10 to-brand-accent/5 border border-brand-border rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-xl font-black text-brand-text">Submit Your Custom Fencing Variant</h3>
              <p className="text-xs text-brand-muted max-w-lg">
                Have you created a calculator variation that others could benefit from? Submit it to AnyFence's AI vetting queue for promotion. Once approved, it goes live in the public library.
              </p>
            </div>
            <Button variant="secondary" size="medium" onClick={() => navigate("/builder")} className="flex items-center gap-1.5">
              Open Builder Sandbox
              <ArrowRight size={16} />
            </Button>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
