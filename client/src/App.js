import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Router, Route, Redirect } from "wouter";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Songs from "./pages/Songs";
import Editor from "./pages/Editor";
import Setlists from "./pages/Setlists";
import PublicSong from "./pages/PublicSong";
const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: 1, staleTime: 30000 },
    },
});
function PrivateRoute({ component: Component }) {
    return localStorage.getItem("token") ? _jsx(Component, {}) : _jsx(Redirect, { to: "/login" });
}
export default function App() {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsxs(Router, { children: [_jsx(Route, { path: "/", component: Landing }), _jsx(Route, { path: "/login", component: Login }), _jsx(Route, { path: "/songs", children: () => _jsx(PrivateRoute, { component: Songs }) }), _jsx(Route, { path: "/editor/:id", children: () => _jsx(PrivateRoute, { component: Editor }) }), _jsx(Route, { path: "/setlists", children: () => _jsx(PrivateRoute, { component: Setlists }) }), _jsx(Route, { path: "/share/:id", component: PublicSong })] }) }));
}
