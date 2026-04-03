import { useState } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAdmin } from "@/lib/admin-auth";
import { useAppConfig } from "@/lib/use-app-config";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const config = useAppConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const ok = await loginAdmin(password);
    setLoading(false);
    if (ok) {
      navigate("/admin");
    } else {
      setError("Password salah. Coba lagi.");
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="size-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
            <ShieldCheck className="size-6 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">{config.appName} Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">Masukkan password admin untuk melanjutkan</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              autoFocus
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading || !password}>
            {loading ? (
              <><Loader2 className="size-4 mr-2 animate-spin" /> Memverifikasi...</>
            ) : "Masuk"}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground mt-6">
          Password diatur melalui environment variable <code className="font-mono bg-muted px-1 rounded">ADMIN_PASSWORD</code>
        </p>
      </div>
    </div>
  );
}
