import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ApiError } from './api/client';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { AuthProvider, RequireAuth, useAuth } from './hooks/useAuth';
import './index.css';
import CustomersPage from './pages/CustomersPage';
import DashboardPage from './pages/DashboardPage';
import DayUsePage from './pages/DayUsePage';
import LoginPage from './pages/LoginPage';
import ProductsPage from './pages/ProductsPage';
import StockPage from './pages/StockPage';
import TabDetailPage from './pages/TabDetailPage';
import TabsPage from './pages/TabsPage';
import UsersPage from './pages/UsersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      // Não insiste em erro de cliente (4xx); só em rede/5xx.
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
      refetchOnWindowFocus: true,
    },
  },
});

function Home() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'ADMIN' ? '/dashboard' : '/comandas'} replace />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                }
              >
                <Route index element={<Home />} />
                <Route path="comandas" element={<TabsPage />} />
                <Route path="comandas/:id" element={<TabDetailPage />} />
                <Route path="clientes" element={<CustomersPage />} />
                <Route path="produtos" element={<ProductsPage />} />
                <Route path="dashboard" element={<RequireAuth role="ADMIN"><DashboardPage /></RequireAuth>} />
                <Route path="estoque" element={<RequireAuth role="ADMIN"><StockPage /></RequireAuth>} />
                <Route path="day-use" element={<RequireAuth role="ADMIN"><DayUsePage /></RequireAuth>} />
                <Route path="usuarios" element={<RequireAuth role="ADMIN"><UsersPage /></RequireAuth>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
