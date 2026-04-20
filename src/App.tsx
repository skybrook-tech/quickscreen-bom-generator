import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "./lib/queryClient";
import { AuthGuard } from "./components/auth/AuthGuard";
import { LoginPage } from "./pages/LoginPage";
import { MainApp } from "./pages/MainApp";
import { QuotesHistoryPage } from "./pages/QuotesHistoryPage";
import { QuoteViewPage } from "./pages/QuoteViewPage";
import { CalculatorV3Page } from "./pages/CalculatorV3Page";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="bottom-right" richColors />;
}

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/", element: <Navigate to="/calculator" replace /> },
  {
    path: "/new",
    element: (
      <AuthGuard>
        <MainApp />
      </AuthGuard>
    ),
  },
  {
    path: "/calculator",
    element: (
      <AuthGuard>
        <CalculatorV3Page />
      </AuthGuard>
    ),
  },
  {
    path: "/quotes",
    element: (
      <AuthGuard>
        <QuotesHistoryPage />
      </AuthGuard>
    ),
  },
  {
    path: "/quote/:id",
    element: (
      <AuthGuard>
        <QuoteViewPage />
      </AuthGuard>
    ),
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedToaster />
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
