import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { useEffect } from 'react';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import OnboardingPage from './pages/OnboardingPage';
import WeeklyPlanPage from './pages/WeeklyPlanPage';
import RecipesPage from './pages/RecipesPage';
import ShoppingListPage from './pages/ShoppingListPage';
import FamilySettingsPage from './pages/FamilySettingsPage';
import InvitationsPage from './pages/InvitationsPage';
import NotFoundPage from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plan/:planId"
            element={
              <ProtectedRoute>
                <WeeklyPlanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recipes"
            element={
              <ProtectedRoute>
                <RecipesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shopping/:planId"
            element={
              <ProtectedRoute>
                <ShoppingListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/family/settings"
            element={
              <ProtectedRoute>
                <FamilySettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invitations"
            element={
              <ProtectedRoute>
                <InvitationsPage />
              </ProtectedRoute>
            }
          />
          {/* Catch-all route for 404 errors */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
