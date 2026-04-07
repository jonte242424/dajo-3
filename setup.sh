#!/bin/bash
mkdir -p server client/src/pages client/src/style
cat > package.json << 'PKG'
{
  "name": "dajo-3",
  "version": "3.0.0",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "16.3.1",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "@tanstack/react-query": "5.28.0",
    "wouter": "3.2.0",
    "tailwindcss": "3.3.6",
    "lucide-react": "0.294.0"
  },
  "devDependencies": {
    "typescript": "5.3.3",
    "@types/express": "4.17.21",
    "@types/react": "18.2.37",
    "@types/react-dom": "18.2.15",
    "@types/node": "20.10.5",
    "@vitejs/plugin-react": "4.2.0",
    "vite": "5.0.6",
    "tsx": "4.7.0",
    "concurrently": "8.2.2"
  }
}
PKG
cat > server/index.ts << 'SRV'
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.get("/api/auth/me", (req, res) => res.json({ id: "user-1", email: "jonte@dajo.club" }));
app.get("/api/songs", (req, res) => res.json({ songs: [{ id: 1, title: "Example", artist: "Jonte", key: "C", tempo: 120 }] }));
app.post("/api/auth/login", (req, res) => res.json({ success: true, user: { id: "user-1", email: req.body.email || "jonte@dajo.club" } }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: err.message }); });
app.listen(PORT, () => console.log(`✓ Express server on port ${PORT}`));
export default app;
SRV
cat > client/index.html << 'HTML'
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>DAJO 3.0</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
HTML
cat > client/src/main.tsx << 'MAIN'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./style/global.css";
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
MAIN
cat > client/src/App.tsx << 'APPTSX'
import { Router, Route } from "wouter";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Songs from "./pages/Songs";
const queryClient = new QueryClient();
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/songs" component={Songs} />
      </Router>
    </QueryClientProvider>
  );
}
APPTSX
cat > client/src/pages/Landing.tsx << 'LANDING'
import { Link } from "wouter";
export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">DAJO 3.0</h1>
        <p className="text-xl mb-8">Music chord charts</p>
        <div className="flex gap-4 justify-center">
          <Link href="/login"><a className="px-6 py-3 bg-indigo-600 text-white rounded">Start</a></Link>
        </div>
      </div>
    </div>
  );
}
LANDING
cat > client/src/pages/Login.tsx << 'LOGIN'
import { useState } from "react";
import { useLocation } from "wouter";
export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("jonte@dajo.club");
  const handleLogin = async (e) => {
    e.preventDefault();
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    setLocation("/songs");
  };
  return (
    <div className="min-h-screen bg-indigo-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded w-96">
        <h1 className="text-3xl font-bold mb-8">DAJO</h1>
        <form onSubmit={handleLogin}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded mb-4" /><button className="w-full py-2 bg-indigo-600 text-white rounded">Sign in</button></form>
      </div>
    </div>
  );
}
LOGIN
cat > client/src/pages/Songs.tsx << 'SONGS'
import { useQuery } from "@tanstack/react-query";
export default function Songs() {
  const { data } = useQuery({ queryKey: ["songs"], queryFn: async () => { const res = await fetch("/api/songs"); return res.json(); } });
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8">My Songs</h1>
      <div className="grid gap-4">{data?.songs?.map((song) => (<div key={song.id} className="p-6 bg-white rounded shadow"><h2 className="text-xl font-bold">{song.title}</h2><p>{song.artist}</p></div>))}</div>
    </div>
  );
}
SONGS
cat > client/src/App.css << 'CSS'
/* App styles */
CSS
cat > client/src/style/global.css << 'GLOBAL'
@tailwind base;
@tailwind components;
@tailwind utilities;
GLOBAL
cat > vite.config.ts << 'VITE'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } } } });
VITE
cat > tailwind.config.js << 'TAILWIND'
export default { content: ["./client/index.html", "./client/src/**/*.{js,ts,jsx,tsx}"], theme: { extend: {} }, plugins: [] };
TAILWIND
cat > postcss.config.js << 'POSTCSS'
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
POSTCSS
cat > tsconfig.json << 'TS'
{ "compilerOptions": { "target": "ES2020", "jsx": "react-jsx", "module": "ESNext", "lib": ["ES2020", "DOM", "DOM.Iterable"], "moduleResolution": "bundler", "strict": true, "allowSyntheticDefaultImports": true, "esModuleInterop": true } }
TS
cat > .env.local << 'ENV'
NODE_ENV=development
PORT=5000
ENV
echo "✓ Setup done"
