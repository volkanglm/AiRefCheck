/**
 * AiRefCheck - Login Page (Auto-Login)
 * Automatically logs in with the default admin account and redirects to dashboard.
 */

"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

const DEFAULT_EMAIL = "admin@airefcheck.com";
const DEFAULT_PASSWORD = "admin123";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const hasAttempted = useRef(false);

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if (user) {
      router.replace("/dashboard");
      return;
    }

    // Prevent double-call in StrictMode
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    // Auto-login with default admin credentials
    const autoLogin = async () => {
      try {
        const res = await api.post("/auth/login", {
          email: DEFAULT_EMAIL,
          password: DEFAULT_PASSWORD,
        });
        if (res.data) {
          setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
          router.replace("/dashboard");
        }
      } catch {
        // If auto-login fails (e.g. no admin user in DB), show a message
        // The backend auth middleware will handle unauthenticated requests anyway
        router.replace("/dashboard");
      }
    };

    autoLogin();
  }, [user, setAuth, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">AiRefCheck</CardTitle>
          <CardDescription>Akademik Referans Kontrol Platformu</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span>Giriş yapılıyor...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
