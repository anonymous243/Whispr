import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { WebSocketProvider } from "@/hooks/use-websocket";
import { ChatProvider } from "@/hooks/use-chat";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import ChatPage from "@/pages/chat-page";
import { Helmet } from "react-helmet";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={ChatPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <Helmet>
        <title>Velvet Chat - Modern Messaging</title>
        <meta 
          name="description" 
          content="Velvet Chat is a secure messaging app for staying connected with friends, family, and colleagues."
        />
        <meta property="og:title" content="Velvet Chat - Modern Messaging" />
        <meta 
          property="og:description" 
          content="Connect with the people who matter most with our secure and reliable chat application."
        />
      </Helmet>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WebSocketProvider>
            <ChatProvider>
              <Router />
              <Toaster />
            </ChatProvider>
          </WebSocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
