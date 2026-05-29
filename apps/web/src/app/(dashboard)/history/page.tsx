/**
 * AiRefCheck - Analysis History Page
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, XCircle, Clock, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface AnalysisWithDoc {
  id: string;
  status: string;
  overallScore: number | null;
  totalReferences: number;
  verifiedCount: number;
  suspiciousCount: number;
  detectedStyle: string | null;
  createdAt: string;
  document?: { originalName: string; format: string };
}

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<AnalysisWithDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AnalysisWithDoc[]>("/analyses")
      .then((res) => setAnalyses(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  if (!analyses.length) {
    return (
      <div className="py-16 text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <p className="text-lg text-slate-500">Henüz analiz yapılmamış.</p>
        <Link href="/upload" className="mt-2 inline-block text-blue-600 hover:underline">İlk analizinizi başlatın →</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {analyses.map((a) => {
        const score = a.overallScore ?? 0;
        const Icon = score >= 80 ? CheckCircle2 : score >= 50 ? AlertTriangle : XCircle;
        const color = score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-600";

        return (
          <Link key={a.id} href={`/analysis/${a.id}`}>
            <Card className="transition-colors hover:bg-slate-50">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Icon className={`h-6 w-6 ${color}`} />
                  <div>
                    <p className="font-medium text-slate-900">{a.document?.originalName || `Analiz #${a.id.slice(0, 8)}`}</p>
                    <p className="text-sm text-slate-500">
                      {a.totalReferences} referans · {(a.detectedStyle || "").toUpperCase()} · {new Date(a.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={score >= 80 ? "default" : score >= 50 ? "secondary" : "destructive"}>
                    {score !== null ? `${Math.round(score)}%` : "—"}
                  </Badge>
                  <div className="text-right text-xs text-slate-400">
                    <p>{a.verifiedCount} ✅ {a.suspiciousCount} ⚠️</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
