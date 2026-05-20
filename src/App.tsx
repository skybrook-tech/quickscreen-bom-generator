import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "./lib/queryClient";
import { AuthGuard } from "./components/auth/AuthGuard";
import { AdminGuard } from "./components/auth/AdminGuard";
import { LoginPage } from "./pages/LoginPage";
import { QuotesHistoryPage } from "./pages/QuotesHistoryPage";
import { CalculatorV3Page } from "./pages/CalculatorV3Page";
import { CalculatorV4Page } from "./pages/CalculatorV4Page";
import { ProductsIndexPage } from "./pages/admin/ProductsIndexPage";
import { ProductDetailPage } from "./pages/admin/ProductDetailPage";
import { ComponentsIndexPage } from "./pages/admin/ComponentsIndexPage";
import { ColoursAdminPage } from "./pages/admin/ColoursAdminPage";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { ProfileProvider } from "./context/ProfileContext";
import { NotFoundPage } from "./pages/NotFoundPage";

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="bottom-right" richColors />;
}

const router = createBrowserRouter([
  {
    errorElement: <NotFoundPage />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/", element: <Navigate to="/fence-calculator" replace /> },
      {
        path: "/fence-calculator",
        element: (
          <AuthGuard>
            <CalculatorV3Page />
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
        path: "/fence-calculator-v4",
        element: (
          <AuthGuard>
            <CalculatorV4Page />
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
        path: "/quote/:quoteId",
        element: (
          <AuthGuard>
            <CalculatorV3Page />
          </AuthGuard>
        ),
      },
      {
        path: "/admin/products",
        element: (
          <AdminGuard>
            <ProductsIndexPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/products/:id",
        element: (
          <AdminGuard>
            <ProductDetailPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/components",
        element: (
          <AdminGuard>
            <ComponentsIndexPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/colours",
        element: (
          <AdminGuard>
            <ColoursAdminPage />
          </AdminGuard>
        ),
      },
      { path: "*", element: <NotFoundPage asNotFound /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ProfileProvider>
          <ThemedToaster />
          <RouterProvider router={router} />
        </ProfileProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
