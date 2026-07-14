import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import App from "./app/App.tsx";
import { MarketingLanding } from "./app/components/marketing/MarketingLanding.tsx";
import { FaqPage } from "./app/components/marketing/FaqPage.tsx";
import { ContactPage } from "./app/components/marketing/ContactPage.tsx";
import { BlogPage } from "./app/components/marketing/BlogPage.tsx";
import { SignupScreen } from "./app/components/onboarding/SignupScreen.tsx";
import { VerifyEmailScreen } from "./app/components/onboarding/VerifyEmailScreen.tsx";
import { FriendsFamilyLaunch } from "./app/components/marketing/FriendsFamilyLaunch.tsx";
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
      <Route path="/" element={<MarketingLanding />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/contact" element={<ContactPage />} />
      {/* Friends & Family invite-only launch: public signup is gated. "/signup"
          — and every CTA that points at it — redirects to the early-access
          notify page. The real signup shell stays reachable at /signup-preview
          for review, and this reverts to a plain <SignupScreen/> /signup route
          at public launch. */}
      <Route path="/early-access" element={<FriendsFamilyLaunch />} />
      <Route path="/signup" element={<Navigate to="/early-access" replace />} />
      <Route path="/signup-preview" element={<SignupScreen />} />
      <Route path="/verify-email" element={<VerifyEmailScreen />} />
      <Route path="/onboarding" element={<ConnectMcpScreen />} />
      <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      <Route path="/*" element={<App />} />
    </Routes>
  </BrowserRouter>,
);
