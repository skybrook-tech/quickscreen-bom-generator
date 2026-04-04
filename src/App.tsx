import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthGuard } from './components/auth/AuthGuard';
import { LoginPage } from './pages/LoginPage';
import { MainApp } from './pages/MainApp';

export default function App() {
  return (
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
      </Routes>
    </BrowserRouter>
  );
}
