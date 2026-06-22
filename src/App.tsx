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
import { EmbedCalculatorPage } from "./pages/EmbedCalculatorPage";
import { CalculatorBuilderPage } from "./pages/CalculatorBuilderPage";
import { ProductsIndexPage } from "./pages/admin/ProductsIndexPage";
import { ProductDetailPage } from "./pages/admin/ProductDetailPage";
import { ComponentsIndexPage } from "./pages/admin/ComponentsIndexPage";
import { ColoursAdminPage } from "./pages/admin/ColoursAdminPage";
import { SuppliersListPage } from "./pages/admin/SuppliersListPage";
import { SupplierEditPage } from "./pages/admin/SupplierEditPage";
import { SystemInstancesListPage } from "./pages/admin/SystemInstancesListPage";
import { SystemInstanceEditPage } from "./pages/admin/SystemInstanceEditPage";
import { ProductsListPage } from "./pages/admin/ProductsListPage";
import { ProductEditPage } from "./pages/admin/ProductEditPage";
import { ImportPage } from "./pages/admin/ImportPage";
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
      // Anonymous embeddable calculator (brief 032). NO AuthGuard — this route
      // is framed into supplier sites and resolves the org from the URL slug.
      { path: "/embed/:orgSlug", element: <EmbedCalculatorPage /> },
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
        path: "/builder",
        element: (
          <AuthGuard>
            <CalculatorBuilderPage />
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
      // ── Salvage Phase B: multi-supplier admin CRUD + import pipeline ──────
      {
        path: "/admin/suppliers",
        element: (
          <AdminGuard>
            <SuppliersListPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/suppliers/new",
        element: (
          <AdminGuard>
            <SupplierEditPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/suppliers/:slug/edit",
        element: (
          <AdminGuard>
            <SupplierEditPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/system-instances",
        element: (
          <AdminGuard>
            <SystemInstancesListPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/system-instances/new",
        element: (
          <AdminGuard>
            <SystemInstanceEditPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/system-instances/:id/edit",
        element: (
          <AdminGuard>
            <SystemInstanceEditPage />
          </AdminGuard>
        ),
      },
      {
        // New supplier-catalogue product CRUD. Mounted at /admin/catalog to avoid
        // colliding with the existing v3 product admin at /admin/products.
        path: "/admin/catalog",
        element: (
          <AdminGuard>
            <ProductsListPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/catalog/new",
        element: (
          <AdminGuard>
            <ProductEditPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/catalog/:id/edit",
        element: (
          <AdminGuard>
            <ProductEditPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/catalog/:id",
        element: (
          <AdminGuard>
            <ProductEditPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/imports/new",
        element: (
          <AdminGuard>
            <ImportPage />
          </AdminGuard>
        ),
      },
      {
        path: "/admin/imports/:runId/review",
        element: (
          <AdminGuard>
            <ImportPage />
          </AdminGuard>
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
