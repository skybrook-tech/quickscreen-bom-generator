interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  // Bypassed auth check to go straight to the calculator when embedded or run locally
  return <>{children}</>;
}
