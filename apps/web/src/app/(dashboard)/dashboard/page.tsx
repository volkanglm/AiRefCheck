/**
 * AiRefCheck - Dashboard Home Page
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Upload, BarChart3, CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Analysis } from "@airefcheck/shared";

interface Stats {
  totalDocuments: number;
  totalAnalyses: number;
  totalReferences: number;
  verifiedReferences: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [analysesRes] = await Promise.all([api.get<Analysis[]>("/analyses")]);
        const analyses = analysesRes.data || [];
        setRecentAnalyses(analyses.slice(0, 5));
        setStats({
          totalDocuments: analyses.length,
          totalAnalyses: analyses.length,
          totalReferences: analyses.reduce((s: number, a: any) => s + (a.totalReferences || 0), 0),
          verifiedReferences: analyses.reduce((s: number, a: any) => s + (a.verifiedCount || 0), 0),
        });
      } catch {
        // Not logged in or no data yet
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    { label: "Toplam Doküman", value: stats?.totalDocuments || 0, icon: FileText, color: "text-blue-600" },
    { label: "Analiz Sayısı", value: stats?.totalAnalyses || 0, icon: BarChart3, color: "text-purple-600" },
    { label: "Kontrol Edilen Referans", value: stats?.totalReferences || 0, icon: CheckCircle2, color: "text-green-600" },
    { label: "Doğrulanan Referans", value: stats?.verifiedReferences || 0, icon: CheckCircle2, color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Hoş Geldiniz</h2>
        <p className="mt-1 text-slate-500">Akademik referans bütünlük kontrol paneli</p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link href="/upload">
          <Button className="gap-2">
            <Upload className="h-4 w-4" /> Yeni Analiz Başlat
          </Button>
        </Link>
        <Link href="/history">
          <Button variant="outline" className="gap-2">
            <Clock className="h-4 w-4" /> Geçmiş Analizler
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          : statCards.map((s) => (
              <Card key={s.label}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={`rounded-lg bg-slate-100 p-3 ${s.color}`}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                    <p className="text-sm text-slate-500">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Recent Analyses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Son Analizler</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : recentAnalyses.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p>Henüz analiz yapılmamış.</p>
              <Link href="/upload"><Button variant="link">İlk analizinizi başlatın</Button></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAnalyses.map((a: any) => (
                <Link
                  key={a.id}
                  href={`/analysis/${a.id}`}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    {a.overallScore >= 80 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : a.overallScore >= 50 ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{a.document?.originalName || `Analiz #${a.id.slice(0, 8)}`}</p>
                      <p className="text-xs text-slate-500">{a.totalReferences} referans · {a.detectedStyle?.toUpperCase() || "Tespit edilmedi"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={a.overallScore >= 80 ? "default" : a.overallScore >= 50 ? "secondary" : "destructive"}>
                      {a.overallScore !== null ? `${Math.round(a.overallScore)}%` : "—"}
                    </Badge>
                    <p className="mt-1 text-xs text-slate-400">{a.status === "COMPLETED" ? "Tamamlandı" : a.status}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
