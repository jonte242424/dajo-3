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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  return localStorage.getItem("token") ? <Component /> : <Redirect to="/login" />;
}

export default function App() {
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
    </QueryClientProvider>
  );
}
