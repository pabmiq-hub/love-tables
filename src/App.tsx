import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AdminLogin from "./pages/AdminLogin";
import SuperAdminLogin from "./pages/SuperAdminLogin";
import AdminRegister from "./pages/AdminRegister";
import AdminResetPassword from "./pages/AdminResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import PendingApproval from "./pages/PendingApproval";
import CreateEvent from "./pages/CreateEvent";
import EventDetail from "./pages/EventDetail";
import ParticipantSelect from "./pages/ParticipantSelect";
import ParticipantJoin from "./pages/ParticipantJoin";
import ParticipantCheckin from "./pages/ParticipantCheckin";
import NotFound from "./pages/NotFound";
import AvisoLegal from "./pages/AvisoLegal";
import PoliticaPrivacidad from "./pages/PoliticaPrivacidad";
import PoliticaCookies from "./pages/PoliticaCookies";
import TerminosCondiciones from "./pages/TerminosCondiciones";
import { CookieBanner } from "./components/cookies/CookieBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/register" element={<AdminRegister />} />
          <Route path="/admin/reset-password" element={<AdminResetPassword />} />
          <Route path="/admin/pending-approval" element={<PendingApproval />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/super-admin" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/login" element={<SuperAdminLogin />} />
          <Route path="/admin/events/new" element={<CreateEvent />} />
          <Route path="/admin/events/:id" element={<EventDetail />} />
          <Route path="/event/:id/select" element={<ParticipantSelect />} />
          <Route path="/event/:id/join" element={<ParticipantJoin />} />
          <Route path="/event/:id/checkin" element={<ParticipantCheckin />} />
          <Route path="/aviso-legal" element={<AvisoLegal />} />
          <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
          <Route path="/politica-cookies" element={<PoliticaCookies />} />
          <Route path="/terminos-condiciones" element={<TerminosCondiciones />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <CookieBanner />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
