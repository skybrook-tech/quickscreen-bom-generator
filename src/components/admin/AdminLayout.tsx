import { NavLink } from "react-router-dom";
import { Package, Layers, Palette, ArrowLeft, Truck, Sliders } from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const navItems = [
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/components", label: "Components", icon: Layers },
  { to: "/admin/colours", label: "Colours", icon: Palette },
  { to: "/admin/suppliers", label: "Suppliers", icon: Truck },
  { to: "/admin/system-instances", label: "System Instances", icon: Sliders },
];

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-md transition-colors ${
      isActive
        ? "bg-brand-accent/15 text-brand-accent"
        : "text-brand-muted hover:text-brand-text hover:bg-brand-border/20"
    }`;

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Top bar */}
      <div className="bg-brand-card border-b border-brand-border px-6 py-3 flex items-center gap-4">
        <NavLink
          to="/"
          className="flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-text transition-colors"
        >
          <ArrowLeft size={13} />
          App
        </NavLink>
        <span className="text-brand-border/60">|</span>
        <span className="text-xs font-bold text-brand-accent tracking-widest uppercase px-2 py-0.5 rounded border border-brand-accent/40 bg-brand-accent/5">
          Admin
        </span>
        <nav className="flex items-center gap-0.5 ml-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={navCls}>
              <Icon size={13} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Page header */}
      <div className="px-6 py-5 border-b border-brand-border/50">
        <h1 className="text-lg font-semibold text-brand-text">{title}</h1>
        {subtitle && (
          <p className="text-sm text-brand-muted mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Content */}
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}
