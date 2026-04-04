import { LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export function Header() {
  const { user } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="bg-brand-card border-b border-brand-border px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-brand-accent font-semibold text-sm tracking-wide uppercase">
          SkybrookAI
        </span>
        <span className="text-brand-border">|</span>
        <span className="text-brand-text font-medium">
          The Glass Outlet — QuickScreen BOM Generator
        </span>
      </div>

      {user && (
        <div className="flex items-center gap-3">
          <span className="text-brand-muted text-sm">{user.email}</span>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-brand-muted hover:text-brand-text text-sm transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}
