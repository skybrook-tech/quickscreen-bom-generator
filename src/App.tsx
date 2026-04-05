import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { AuthGuard } from './components/auth/AuthGuard';
import { LoginPage } from './pages/LoginPage';
import { MainApp } from './pages/MainApp';
import { QuoteViewPage } from './pages/QuoteViewPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="bottom-right" richColors />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <ThemedToaster />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <MainApp />
              </AuthGuard>
            }
          />
          <Route
            path="/quote/:id"
            element={
              <AuthGuard>
                <QuoteViewPage />
              </AuthGuard>
            }
          />
        </Routes>
      </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
