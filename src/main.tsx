import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import App from "./app/App.tsx";
import { SignupScreen } from "./app/components/onboarding/SignupScreen.tsx";
import { VerifyEmailScreen } from "./app/components/onboarding/VerifyEmailScreen.tsx";
import { ConnectMcpScreen } from "./app/components/onboarding/ConnectMcpScreen.tsx";
import { ForgotPasswordScreen } from "./app/components/onboarding/ForgotPasswordScreen.tsx";
import "./styles/index.css";

// The unauthenticated onboarding shell (signup → verify → connect-your-MCP, plus
// forgot-password) lives on dedicated, deep-linkable routes so an email
// verification link can land directly. Everything else — the authenticated
// workspace and its forced-login gate — stays under the catch-all App route,
// preserving the existing phase-based gate untouched.
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/signup" element={<SignupScreen />} />
      <Route path="/verify-email" element={<VerifyEmailScreen />} />
      <Route path="/onboarding" element={<ConnectMcpScreen />} />
      <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      <Route path="/*" element={<App />} />
    </Routes>
  </BrowserRouter>,
);
