import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Candidates from "./pages/Candidates";
import Campaigns from "./pages/Campaigns";
import Copilot from "./pages/Copilot";
import Analytics from "./pages/Analytics";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
import RequestDemo from "./pages/RequestDemo";
import CampaignDetail from "./pages/CampaignDetail";
import CandidateDetail from "./pages/CandidateDetail";
import Compare from "./pages/Compare";
import Notifications from "./pages/Notifications";
import Help from "./pages/Help";
import SettingsPage from "./pages/SettingsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTeamsRoles from "./pages/admin/AdminTeamsRoles";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminUsage from "./pages/admin/AdminUsage";
import AdminFlags from "./pages/admin/AdminFlags";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminOps from "./pages/admin/AdminOps";
import AdminData from "./pages/admin/AdminData";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminEngagement from "./pages/admin/AdminEngagement";
import Interviews from "./pages/Interviews";
import Upload from "./pages/Upload";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/features"} component={Home} />
      <Route path={"/pricing"} component={Home} />
      <Route path={"/security"} component={Home} />
      <Route path={"/blog"} component={Home} />
      <Route path={"/about"} component={Home} />
      <Route path={"/enterprise"} component={Home} />
      <Route path={"/contact"} component={Home} />
      <Route path={"/request-demo"} component={RequestDemo} />
      <Route path={"/docs"} component={Home} />
      <Route path={"/careers"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/signup"} component={SignUp} />
      <Route path={"/forgot-password"} component={ForgotPassword} />
      <Route path={"/verify-email"} component={VerifyEmail} />
      <Route path={"/privacy"} component={Home} />
      <Route path={"/terms"} component={Home} />
      <Route path={"/app/dashboard"} component={Dashboard} />
      <Route path={"/app"} component={Dashboard} />
      <Route path={"/app/candidates"} component={Candidates} />
      <Route path={"/app/candidates/:id"} component={CandidateDetail} />
      <Route path={"/app/campaigns"} component={Campaigns} />
      <Route path={"/app/campaigns/:id"} component={CampaignDetail} />
      <Route path={"/app/copilot"} component={Copilot} />
      <Route path={"/app/compare"} component={Compare} />
      <Route path={"/app/analytics"} component={Analytics} />
      <Route path={"/app/interviews"} component={Interviews} />
      <Route path={"/app/upload"} component={Upload} />
      <Route path={"/app/notifications"} component={Notifications} />
      <Route path={"/app/help"} component={Help} />
      <Route path={"/app/settings"} component={SettingsPage} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/admin/organizations"} component={AdminOrganizations} />
      <Route path={"/admin/users"} component={AdminUsers} />
      <Route path={"/admin/teams"} component={AdminTeamsRoles} />
      <Route path={"/admin/roles"} component={AdminTeamsRoles} />
      <Route path={"/admin/subscriptions"} component={AdminBilling} />
      <Route path={"/admin/billing"} component={AdminBilling} />
      <Route path={"/admin/invoices"} component={AdminBilling} />
      <Route path={"/admin/accounts"} component={AdminBilling} />
      <Route path={"/admin/usage"} component={AdminUsage} />
      <Route path={"/admin/ai-usage"} component={AdminUsage} />
      <Route path={"/admin/flags"} component={AdminFlags} />
      <Route path={"/admin/api-keys"} component={AdminFlags} />
      <Route path={"/admin/audit"} component={AdminAudit} />
      <Route path={"/admin/status"} component={AdminOps} />
      <Route path={"/admin/monitoring"} component={AdminOps} />
      <Route path={"/admin/security"} component={AdminOps} />
      <Route path={"/admin/errors"} component={AdminOps} />
      <Route path={"/admin/backups"} component={AdminData} />
      <Route path={"/admin/storage"} component={AdminData} />
      <Route path={"/admin/residency"} component={AdminData} />
      <Route path={"/admin/data-jobs"} component={AdminData} />
      <Route path={"/admin/support"} component={AdminSupport} />
      <Route path={"/admin/activity"} component={AdminEngagement} />
      <Route path={"/admin/integrations"} component={AdminEngagement} />
      <Route path={"/admin/notifications"} component={AdminEngagement} />
      <Route path={"/admin/emails"} component={AdminEngagement} />
      <Route path={"/admin/releases"} component={AdminEngagement} />
      <Route path={"/admin/brand"} component={AdminEngagement} />
      <Route path={"/admin/settings"} component={AdminEngagement} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
