"use client";
import { AppShell } from "@/components/app-shell";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { user } = useAuthStore();
  const router = useRouter();
  useEffect(() => { if (!user) router.push("/login"); }, [user, router]);
  if (!user) return null;
  return (
    <AppShell>
      <div className="rounded-lg border bg-white p-12 text-center shadow-sm">
        <p className="text-slate-500">Bu sayfa yakında aktif olacak.</p>
      </div>
    </AppShell>
  );
}
