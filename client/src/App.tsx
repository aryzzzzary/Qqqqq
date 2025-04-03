import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import ContentCreation from "@/pages/content-creation";
import Scheduling from "@/pages/scheduling";
import Engagement from "@/pages/engagement";
import Analytics from "@/pages/analytics";
import Security from "@/pages/security";
import SubscriptionPage from "@/pages/subscription";
import BlogPage from "@/pages/blog";
import BlogPostPage from "@/pages/blog-post";
import AIDatasetsPage from "@/pages/ai-datasets";
import LandingPage from "@/pages/landing-page";
import InspirationGalleryPage from "@/pages/inspiration-gallery";
import MainLayout from "@/components/layout/main-layout";
import { AuthProvider } from "./hooks/use-auth";

// Home page component that displays the landing page
const Home = () => <LandingPage />;

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute 
        path="/dashboard" 
        component={() => (
          <MainLayout>
            <Dashboard />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/content-creation" 
        component={() => (
          <MainLayout>
            <ContentCreation />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/scheduling" 
        component={() => (
          <MainLayout>
            <Scheduling />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/engagement" 
        component={() => (
          <MainLayout>
            <Engagement />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/analytics" 
        component={() => (
          <MainLayout>
            <Analytics />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/security" 
        component={() => (
          <MainLayout>
            <Security />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/subscription" 
        component={() => (
          <MainLayout>
            <SubscriptionPage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/ai-datasets" 
        component={() => (
          <MainLayout>
            <AIDatasetsPage />
          </MainLayout>
        )} 
      />
      <ProtectedRoute 
        path="/inspiration-gallery" 
        component={() => (
          <MainLayout>
            <InspirationGalleryPage />
          </MainLayout>
        )} 
      />
      {/* Blog routes - publicly accessible */}
      <Route 
        path="/blog" 
        component={() => (
          <MainLayout>
            <BlogPage />
          </MainLayout>
        )} 
      />
      <Route 
        path="/blog/:slug" 
        component={() => (
          <MainLayout>
            <BlogPostPage />
          </MainLayout>
        )} 
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <AuthProvider>
        <Router />
      </AuthProvider>
      <Toaster />
    </>
  );
}

export default App;
