import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "sonner";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import GameplayPage from "./pages/GameplayPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import OwnerLoginPage from "./pages/OwnerLoginPage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";
import OwnerCasesPage from "./pages/OwnerCasesPage";
import CaseEditorPage from "./pages/CaseEditorPage";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 font-mono text-sm">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Owner Protected Route
const OwnerRoute = ({ children }) => {
  const { user, loading, isOwner } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 font-mono text-sm">Loading...</div>
      </div>
    );
  }
  
  if (!user || !isOwner) {
    return <Navigate to="/owner/login" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/owner/login" element={<OwnerLoginPage />} />
      
      {/* Player Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/play/:caseId" element={
        <ProtectedRoute>
          <GameplayPage />
        </ProtectedRoute>
      } />
      <Route path="/leaderboard" element={
        <ProtectedRoute>
          <LeaderboardPage />
        </ProtectedRoute>
      } />
      <Route path="/subscription" element={
        <ProtectedRoute>
          <SubscriptionPage />
        </ProtectedRoute>
      } />
      <Route path="/subscription/success" element={
        <ProtectedRoute>
          <SubscriptionPage />
        </ProtectedRoute>
      } />
      
      {/* Owner Protected Routes */}
      <Route path="/owner/dashboard" element={
        <OwnerRoute>
          <OwnerDashboardPage />
        </OwnerRoute>
      } />
      <Route path="/owner/cases" element={
        <OwnerRoute>
          <OwnerCasesPage />
        </OwnerRoute>
      } />
      <Route path="/owner/cases/new" element={
        <OwnerRoute>
          <CaseEditorPage />
        </OwnerRoute>
      } />
      <Route path="/owner/cases/:caseId" element={
        <OwnerRoute>
          <CaseEditorPage />
        </OwnerRoute>
      } />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="noise-overlay">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#18181b',
              border: '1px solid #27272a',
              color: '#fafafa',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.875rem'
            }
          }}
        />
      </AuthProvider>
    </div>
  );
}

export default App;
