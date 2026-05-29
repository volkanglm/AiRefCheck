"use client";
import { AppShell } from "@/components/app-shell";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState({ total: 0, verified: 0, suspicious: 0, notFound: 0 });

  useEffect(() => {
    api.get("/analyses?limit=1").then((res) => {
      const data = (res as any).data;
      // Sum up stats from analyses if available
      setStats((prev) => ({ ...prev, total: data?.length || data?.meta?.total || 0 }));
    }).catch(() => {});
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">Hoş Geldiniz!</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Toplam Analiz", value: stats.total, color: "text-blue-600" },
            { label: "Doğrulanmış", value: stats.verified, color: "text-green-600" },
            { label: "Şüpheli", value: stats.suspicious, color: "text-amber-600" },
            { label: "Bulunamayan", value: stats.notFound, color: "text-red-600" },
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
