import { AppShell } from "../../components/layout/AppShell";
import { Link } from "react-router-dom";
import { 
  ShieldAlert, 
  Layers, 
  Grid, 
  Palette, 
  Building, 
  Cpu, 
  Hammer, 
  Compass, 
  Package, 
  Activity 
} from "lucide-react";

export function AdminPortalPage() {
  const adminSections = [
    {
      title: "Moderation Queue",
      description: "Approve or reject custom slat calculators and formulas submitted by the contractor network.",
      path: "/admin/moderation",
      icon: ShieldAlert,
      color: "text-red-500 bg-red-500/10 border-red-500/20",
      badge: "2 pending"
    },
    {
      title: "Product Configurations",
      description: "Manage high-level system structures, rules, and compatibility mappings.",
      path: "/admin/products",
      icon: Layers,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20"
    },
    {
      title: "Global Component Library",
      description: "View and edit individual SKUs, units, categories, and default retail pricing.",
      path: "/admin/components",
      icon: Grid,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
    },
    {
      title: "Colorbond Colour Mappings",
      description: "Configure short-code translations, hex values, and availability of finishes.",
      path: "/admin/colours",
      icon: Palette,
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20"
    },
    {
      title: "Network Suppliers",
      description: "Onboard material suppliers, configure custom branding, logos, and service states.",
      path: "/admin/suppliers",
      icon: Building,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20"
    },
    {
      title: "Calculator Instances",
      description: "Publish specific archetype instances to supplier domains and configure B2B sharing.",
      path: "/admin/system-instances",
      icon: Cpu,
      color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20"
    },
    {
      title: "Visual Formula Builder",
      description: "Create or tweak math.js calculation rules, variable defaults, and validation expressions.",
      path: "/builder",
      icon: Hammer,
      color: "text-pink-500 bg-pink-500/10 border-pink-500/20"
    },
    {
      title: "Public Layout Planner",
      description: "Launch the interactive canvas tool and test BOM calculations as a public client.",
      path: "/",
      icon: Compass,
      color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20"
    }
  ];

  return (
    <AppShell>
      <div className="min-h-screen bg-brand-bg text-brand-text p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
          {/* Header */}
          <div className="border-b border-brand-border/60 pb-6">
            <h1 className="text-3xl font-black tracking-tight">
              AnyFence Admin Dashboard
            </h1>
            <p className="text-brand-muted text-sm mt-1">
              National Calculator Administration and Supplier Config Network Portal
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-brand-card p-5 rounded-2xl border border-brand-border/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-muted font-bold">Suppliers</p>
                <h3 className="text-2xl font-black mt-1">3 Active</h3>
              </div>
              <Building className="text-brand-muted" size={24} />
            </div>
            <div className="bg-brand-card p-5 rounded-2xl border border-brand-border/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-muted font-bold">Calculators</p>
                <h3 className="text-2xl font-black mt-1">12 Published</h3>
              </div>
              <Cpu className="text-brand-muted" size={24} />
            </div>
            <div className="bg-brand-card p-5 rounded-2xl border border-brand-border/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-muted font-bold">Total SKUs</p>
                <h3 className="text-2xl font-black mt-1">1,480 items</h3>
              </div>
              <Package className="text-brand-muted" size={24} />
            </div>
            <div className="bg-brand-card p-5 rounded-2xl border border-brand-border/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-muted font-bold">Sync Status</p>
                <h3 className="text-2xl font-black mt-1 text-emerald-500 font-bold">Connected</h3>
              </div>
              <Activity className="text-brand-success" size={24} />
            </div>
          </div>

          {/* Core admin links */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminSections.map((section) => {
              const Icon = section.icon;
              return (
                <Link
                  key={section.path}
                  to={section.path}
                  className="group bg-brand-card border border-brand-border/60 hover:border-brand-primary/50 transition-all rounded-2xl p-6 shadow-sm hover:shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-xl border ${section.color}`}>
                        <Icon size={20} />
                      </div>
                      {section.badge && (
                        <span className="text-[10px] px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full font-bold uppercase">
                          {section.badge}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-brand-text group-hover:text-brand-primary transition-colors">
                        {section.title}
                      </h3>
                      <p className="text-xs text-brand-muted mt-2 leading-relaxed">
                        {section.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-end text-xs font-semibold text-brand-primary pt-2 border-t border-brand-border/30">
                    <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Configure
                      <span>&rarr;</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
