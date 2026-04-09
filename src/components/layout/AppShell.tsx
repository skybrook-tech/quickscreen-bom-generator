import { Header } from "./Header";

interface AppShellProps {
  children: React.ReactNode;
  topBar?: React.ReactNode;
}

export function AppShell({ children, topBar }: AppShellProps) {
  return (
    <div className="h-screen overflow-hidden bg-brand-bg text-brand-text flex flex-col">
      <Header />
      {topBar && (
        <div className="shrink-0 bg-brand-bg border-b border-brand-border/60">
          {topBar}
        </div>
      )}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
