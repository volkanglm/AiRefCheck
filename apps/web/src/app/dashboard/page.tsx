"use client";
import { AppShell } from "@/components/app-shell";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  useEffect(() => { if (!user) router.push("/login"); }, [user, router]);
  if (!user) return null;

  return (
    <AppShell>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Hoş Geldiniz, {user.firstName}!</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Toplam Analiz", value: "0", color: "text-blue-600" },
            { label: "Doğrulanmış", value: "0", color: "text-green-600" },
            { label: "Şüpheli", value: "0", color: "text-amber-600" },
            { label: "Bulunamayan", value: "0", color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border bg-white p-6 shadow-sm">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <p className="text-slate-600">Başlamak için sol menüden <strong>Doküman Yükle</strong>&apos;yi seçin.</p>
        </div>
      </div>
    </AppShell>
  );
}
