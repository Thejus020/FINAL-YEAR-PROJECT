import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import NewPipeline from "./pages/NewPipeline";
import PipelineDetail from "./pages/PipelineDetail";
import BuildView from "./pages/BuildView";
import AuthCallback from "./pages/AuthCallback";
import Settings from "./pages/Settings";

function ProtectedRoute({ children }) {
  const { user, token, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">Loading...</div>;
  if (token && !user) return <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function PublicHomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">Loading...</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicHomeRoute />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/pipeline/new" element={<ProtectedRoute><NewPipeline /></ProtectedRoute>} />
          <Route path="/pipeline/:id" element={<ProtectedRoute><PipelineDetail /></ProtectedRoute>} />
          <Route path="/build/:id" element={<ProtectedRoute><BuildView /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
