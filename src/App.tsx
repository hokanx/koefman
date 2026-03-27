import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import AdminRoute from "@/components/shared/AdminRoute";
import AppLayout from "@/components/layout/AppLayout";
import AdminLayout from "@/components/admin/AdminLayout";
import Login from "@/pages/Login";
import PendingActivation from "@/pages/PendingActivation";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import CustomerNew from "@/pages/CustomerNew";
import CustomerDetail from "@/pages/CustomerDetail";
import CustomerEdit from "@/pages/CustomerEdit";
import Offers from "@/pages/Offers";
import OfferNew from "@/pages/OfferNew";
import OfferDetail from "@/pages/OfferDetail";
import OfferEdit from "@/pages/OfferEdit";
import Invoices from "@/pages/Invoices";
import InvoiceNew from "@/pages/InvoiceNew";
import InvoiceDetail from "@/pages/InvoiceDetail";
import InvoiceEdit from "@/pages/InvoiceEdit";
import Settings from "@/pages/Settings";
import Leads from "@/pages/Leads";
import Templates from "@/pages/Templates";
import IntakeForm from "@/pages/IntakeForm";
import PublicOfferView from "@/pages/PublicOfferView";
import PublicContractView from "@/pages/PublicContractView";
import RecurringInvoices from "@/pages/RecurringInvoices";
import Contracts from "@/pages/Contracts";
import Finances from "@/pages/Finances";
import Documents from "@/pages/Documents";
import Onboarding from "@/pages/Onboarding";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSubscriptions from "@/pages/admin/AdminSubscriptions";
import AdminWorkspaces from "@/pages/admin/AdminWorkspaces";
import AdminClients from "@/pages/admin/AdminClients";
import AdminDocuments from "@/pages/admin/AdminDocuments";
import AdminTemplates from "@/pages/admin/AdminTemplates";
import AdminLeads from "@/pages/admin/AdminLeads";
import LandingPage from "@/pages/LandingPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const AppWithImpersonation = () => {
  const { user } = useAuth();
  return (
    <ImpersonationProvider realUserId={user?.id ?? null}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/pending" element={<ProtectedRoute><PendingActivation /></ProtectedRoute>} />
              <Route path="/" element={<LandingPage />} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                <Route path="/admin/workspaces" element={<AdminWorkspaces />} />
                <Route path="/admin/clients" element={<AdminClients />} />
                <Route path="/admin/documents" element={<AdminDocuments />} />
                <Route path="/admin/templates" element={<AdminTemplates />} />
                <Route path="/admin/leads" element={<AdminLeads />} />
              </Route>
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/new" element={<CustomerNew />} />
                <Route path="/customers/:id" element={<CustomerDetail />} />
                <Route path="/customers/:id/edit" element={<CustomerEdit />} />
                <Route path="/offers" element={<Offers />} />
                <Route path="/offers/new" element={<OfferNew />} />
                <Route path="/offers/:id" element={<OfferDetail />} />
                <Route path="/offers/:id/edit" element={<OfferEdit />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/new" element={<InvoiceNew />} />
                <Route path="/invoices/:id" element={<InvoiceDetail />} />
                <Route path="/invoices/:id/edit" element={<InvoiceEdit />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/recurring-invoices" element={<RecurringInvoices />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/finances" element={<Finances />} />
              <Route path="/documents" element={<Documents />} />
              </Route>
              <Route path="/intake/:token" element={<IntakeForm />} />
              <Route path="/offer/view/:token" element={<PublicOfferView />} />
              <Route path="/contract/view/:token" element={<PublicContractView />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ImpersonationProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppWithImpersonation />
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
