import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import UserSosPage from "./pages/UserSosPage";
import ChatbotPage from "./pages/ChatbotPage";
import { getToken } from "./auth/auth";
import { setAuthToken } from "./api/api";
import RequireRole from "./auth/RequireRole";

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = getToken();
  if (!token) return <Navigate to="/auth" replace />;
  return children;
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) setAuthToken(token);
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/auth"
          element={<AuthPage onAuthed={() => (window.location.href = "/dashboard")} />}
        />

        <Route
          path="/dashboard"
          element={
            <RequireRole roles={["ADMIN", "RESCUE"]}>
              <DashboardPage />
            </RequireRole>
          }
        />

        <Route
          path="/sos"
          element={
            <RequireAuth>
              <UserSosPage />
            </RequireAuth>
          }
        />

        {/* ✅ Chatbot */}
        <Route
          path="/chat"
          element={
            <RequireAuth>
              <ChatbotPage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
