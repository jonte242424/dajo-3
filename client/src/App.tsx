import { useEffect, useState } from "react";
import { Router, Route, Redirect } from "wouter";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Songs from "./pages/Songs";
import Editor from "./pages/Editor";
import Setlists from "./pages/Setlists";
import PublicSong from "./pages/PublicSong";
import Groups from "./pages/Groups";
import JoinGroup from "./pages/JoinGroup";
import PilotAdmin from "./pages/PilotAdmin";
import FeedbackWidget from "./components/FeedbackWidget";
import { apiFetch } from "./lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  return localStorage.getItem("token") ? <Component /> : <Redirect to="/login" />;
}

// Hämta /api/auth/me EN gång vid montering för att avgöra om vi är admin —
// då visas feedback-widgeten. 401 eller okänt fel = inte admin.
function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    apiFetch<{ user: { isAdmin?: boolean } }>("/api/auth/me")
      .then((data) => setIsAdmin(Boolean(data.user?.isAdmin)))
      .catch(() => setIsAdmin(false));
  }, []);
  return isAdmin;
}

export default function App() {
  const isAdmin = useIsAdmin();

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/songs">{() => <PrivateRoute component={Songs} />}</Route>
        <Route path="/editor/:id">{() => <PrivateRoute component={Editor} />}</Route>
        <Route path="/setlists">{() => <PrivateRoute component={Setlists} />}</Route>
        <Route path="/groups">{() => <PrivateRoute component={Groups} />}</Route>
        <Route path="/admin/pilot">{() => <PrivateRoute component={PilotAdmin} />}</Route>
        <Route path="/join/:token" component={JoinGroup} />
        <Route path="/share/:id" component={PublicSong} />
      </Router>
      {isAdmin && <FeedbackWidget />}
    </QueryClientProvider>
  );
}
