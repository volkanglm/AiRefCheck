"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { FileText, CheckCircle2, AlertTriangle, XCircle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AnalysisItem {
  id: string;
  status: string;
  progress: number;
  totalReferences: number;
  verifiedCount: number;
  suspiciousCount: number;
  notFoundCount: number;
  partialMatchCount: number;
  overallScore: number;
  detectedStyle: string | null;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  document: { originalName: string; format: string };
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  COMPLETED: { label: "Tamamlandı", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  FAILED: { label: "Başarısız", color: "bg-red-100 text-red-700", icon: XCircle },
  VALIDATING: { label: "Doğrulanıyor", color: "bg-blue-100 text-blue-700", icon: Loader2 },
  PENDING: { label: "Beklemede", color: "bg-slate-100 text-slate-700", icon: Clock },
  EXTRACTING_REFERENCES: { label: "Çıkarılıyor", color: "bg-blue-100 text-blue-700", icon: Loader2 },
  DETECTING_STYLE: { label: "Stil Tespiti", color: "bg-blue-100 text-blue-700", icon: Loader2 },
};

export default function HistoryPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      const res = await api.get<AnalysisItem[]>("/analyses");
      setAnalyses(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s: number) => s >= 80 ? "text-green-600" : s >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Analiz Geçmişi</h2>
          <Button onClick={() => router.push("/upload")}>+ Yeni Analiz</Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Yükleniyor...
          </div>
        ) : analyses.length === 0 ? (
          <div className="rounded-lg border bg-white p-12 text-center shadow-sm">
            <FileText className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <p className="text-lg font-medium text-slate-600">Henüz analiz yapılmamış</p>
            <p className="mt-1 text-sm text-slate-400">İlk analizinizi başlatmak için doküman yükleyin.</p>
            <Button className="mt-4" onClick={() => router.push("/upload")}>Doküman Yükle</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((a) => {
              const cfg = STATUS_MAP[a.status] || STATUS_MAP.PENDING;
              const Icon = cfg.icon;
              const isInProgress = !["COMPLETED", "FAILED"].includes(a.status);

              return (
                <Link key={a.id} href={`/analysis/${a.id}`}
                  className="block rounded-lg border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-4">
                    {/* Score */}
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-slate-50">
                      {a.status === "COMPLETED" ? (
                        <span className={`text-lg font-bold ${scoreColor(a.overallScore)}`}>{a.overallScore}%</span>
                      ) : isInProgress ? (
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-slate-900">{a.document?.originalName || "Doküman"}</p>
                        <Badge className={cfg.color}>{cfg.label}</Badge>
                      </div>

                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>{new Date(a.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        {a.totalReferences > 0 && <span>{a.totalReferences} referans</span>}
                        {a.detectedStyle && <span>Stil: {a.detectedStyle.toUpperCase()}</span>}
                      </div>

                      {/* Stats */}
                      {a.status === "COMPLETED" && (
                        <div className="mt-2 flex gap-4 text-xs">
                          <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> {a.verifiedCount} doğrulanmış</span>
                          <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-3 w-3" /> {a.suspiciousCount} şüpheli</span>
                          <span className="flex items-center gap-1 text-red-600"><XCircle className="h-3 w-3" /> {a.notFoundCount} bulunamadı</span>
                        </div>
                      )}

                      {/* Progress bar for in-progress */}
                      {isInProgress && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${a.progress}%` }} />
                        </div>
                      )}

                      {/* Error */}
                      {a.status === "FAILED" && a.errorMessage && (
                        <p className="mt-1 text-xs text-red-500 truncate">{a.errorMessage}</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
