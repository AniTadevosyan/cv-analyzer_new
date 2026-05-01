import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileSearch, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost, authStore } from "@/lib/api";

const AuthPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || (mode === "signup" && !fullName)) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const path = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const payload = mode === "signup" ? { full_name: fullName, email, password } : { email, password };
      const data = await apiPost(path, payload);
      authStore.set(data.access_token, data.user);
      navigate("/analyze");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elevated">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-display text-2xl font-bold">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <FileSearch className="h-5 w-5 text-primary-foreground" />
          </div>
          CVAnalyzer
        </Link>

        <div className="mb-6 grid grid-cols-2 rounded-xl bg-secondary p-1">
          <button onClick={() => setMode("login")} className={`rounded-lg py-2 text-sm font-medium ${mode === "login" ? "bg-card shadow-card" : "text-muted-foreground"}`}>Login</button>
          <button onClick={() => setMode("signup")} className={`rounded-lg py-2 text-sm font-medium ${mode === "signup" ? "bg-card shadow-card" : "text-muted-foreground"}`}>Sign up</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" />
          </div>

          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground">
            {mode === "login" ? <LogIn className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
