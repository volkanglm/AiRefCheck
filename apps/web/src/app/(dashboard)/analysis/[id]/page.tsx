/**
 * AiRefCheck - Analysis Results Page
 * The core page: shows overall score, reference cards, charts, filters.
 */

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2, AlertTriangle, XCircle, Info, Clock, Filter, ArrowUpDown,
  ExternalLink, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAnalysisStore } from "@/stores/analysis-store";
import type { Analysis, Reference, Validation } from "@airefcheck/shared";

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  VERIFIED: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "Doğrulanmış" },
  SUSPICIOUS: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", label: "Şüpheli" },
  NOT_FOUND: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", label: "Bulunamadı" },
  PARTIAL_MATCH: { icon: Info, color: "text-blue-600", bg: "bg-blue-50", label: "Kısmen Eşleşti" },
  PENDING: { icon: Clock, color: "text-slate-400", bg: "bg-slate-50", label: "Beklemede" },
};

export default function AnalysisPage() {
  const params = useParams();
  const id = params.id as string;
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [references, setReferences] = useState<(Reference & { validations?: Validation[]; expanded?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const { statusFilter, setStatusFilter } = useAnalysisStore();

  useEffect(() => {
    async function load() {
      try {
        const [analysisRes, refsRes] = await Promise.all([
          api.get<Analysis>(`/analyses/${id}`),
          api.get<Reference[]>(`/analyses/${id}/references`),
        ]);
        setAnalysis(analysisRes.data || null);
        setReferences((refsRes.data || []).map((r: any) => ({ ...r, expanded: false })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Auto-refresh while analysis is in progress
  useEffect(() => {
    if (!analysis) return;
    const terminalStates = ["COMPLETED", "FAILED"];
    if (terminalStates.includes(analysis.status)) return;

    const interval = setInterval(async () => {
      try {
        const [analysisRes, refsRes] = await Promise.all([
          api.get<Analysis>(`/analyses/${id}`),
          api.get<Reference[]>(`/analyses/${id}/references`),
        ]);
        const newAnalysis = analysisRes.data || null;
        setAnalysis(newAnalysis);
        setReferences((refsRes.data || []).map((r: any) => ({ ...r, expanded: false })));

        if (newAnalysis && terminalStates.includes(newAnalysis.status)) {
          clearInterval(interval);
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id, analysis?.status]);

  const score = analysis?.overallScore ?? 0;
  const scoreColor = score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-600";
  const scoreStroke = score >= 80 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";

  const filtered = statusFilter === "all"
    ? references
    : references.filter((r) => r.status === statusFilter);

  const toggleExpand = (idx: number) => {
    setReferences((prev) => prev.map((r, i) => (i === idx ? { ...r, expanded: !r.expanded } : r)));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!analysis) {
    return <div className="py-12 text-center text-slate-500">Analiz bulunamadı.</div>;
  }

  // Show progress while analysis is running
  const isInProgress = !["COMPLETED", "FAILED"].includes(analysis.status);

  const STATUS_LABELS: Record<string, string> = {
    PENDING: "Beklemede",
    EXTRACTING_REFERENCES: "Referanslar Çıkarılıyor...",
    DETECTING_STYLE: "Atıf Stili Tespit Ediliyor...",
    VALIDATING: "Referanslar Doğrulanıyor...",
    DETECTING_FABRICATION: "Sahte Referanslar Tespit Ediliyor...",
    MATCHING_CITATIONS: "Atıflar Eşleştiriliyor...",
    GENERATING_REPORT: "Rapor Oluşturuluyor...",
    COMPLETED: "Tamamlandı",
    FAILED: "Başarısız",
  };

  return (
    <div className="space-y-6">
      {/* Progress Banner */}
      {isInProgress && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-4 p-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <div className="flex-1">
              <p className="font-medium text-blue-800">
                {STATUS_LABELS[analysis.status] || analysis.status}
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-200">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${analysis.progress || 0}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-blue-600">Sayfa otomatik olarak güncellenecek...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Banner */}
      {analysis.status === "FAILED" && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Analiz Başarısız</span>
            </div>
            <p className="mt-2 text-sm text-red-600">{analysis.errorMessage || "Bilinmeyen bir hata oluştu."}</p>
          </CardContent>
        </Card>
      )}
      {/* Header with Score */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Score Circle */}
        <Card className="flex-shrink-0">
          <CardContent className="flex flex-col items-center p-8">
            <div className="relative flex h-36 w-36 items-center justify-center">
              <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="none" stroke={scoreStroke} strokeWidth="10"
                  strokeDasharray={`${(score / 100) * 314} 314`} strokeLinecap="round" />
              </svg>
              <span className={`absolute text-3xl font-bold ${scoreColor}`}>{Math.round(score)}%</span>
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">Genel Bütünlük Skoru</p>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Doğrulanmış", value: analysis.verifiedCount, color: "bg-green-100 text-green-700" },
            { label: "Şüpheli", value: analysis.suspiciousCount, color: "bg-amber-100 text-amber-700" },
            { label: "Bulunamadı", value: analysis.notFoundCount, color: "bg-red-100 text-red-700" },
            { label: "Kısmen Eşleşti", value: analysis.partialMatchCount, color: "bg-blue-100 text-blue-700" },
            { label: "Eksik Referans", value: analysis.missingCount, color: "bg-orange-100 text-orange-700" },
            { label: "Orfan Referans", value: analysis.orphanCount, color: "bg-slate-100 text-slate-700" },
          ].map((s) => (
            <div key={s.label} className={`rounded-lg p-4 ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium opacity-80">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Meta */}
        <Card className="flex-shrink-0">
          <CardContent className="p-6 space-y-2 text-sm">
            <p><span className="text-slate-500">Toplam:</span> <strong>{analysis.totalReferences}</strong> referans</p>
            <p><span className="text-slate-500">Stil:</span> <strong>{(analysis.detectedStyle || "").toUpperCase()}</strong></p>
            <p><span className="text-slate-500">Güven:</span> <strong>{Math.round((analysis.styleConfidence || 0) * 100)}%</strong></p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex h-8 overflow-hidden rounded-full">
            {analysis.verifiedCount > 0 && <div className="bg-green-500" style={{ width: `${(analysis.verifiedCount / analysis.totalReferences) * 100}%` }} />}
            {analysis.suspiciousCount > 0 && <div className="bg-amber-500" style={{ width: `${(analysis.suspiciousCount / analysis.totalReferences) * 100}%` }} />}
            {analysis.notFoundCount > 0 && <div className="bg-red-500" style={{ width: `${(analysis.notFoundCount / analysis.totalReferences) * 100}%` }} />}
            {analysis.partialMatchCount > 0 && <div className="bg-blue-500" style={{ width: `${(analysis.partialMatchCount / analysis.totalReferences) * 100}%` }} />}
            {analysis.missingCount > 0 && <div className="bg-orange-500" style={{ width: `${(analysis.missingCount / analysis.totalReferences) * 100}%` }} />}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Doğrulanmış ({analysis.verifiedCount})</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Şüpheli ({analysis.suspiciousCount})</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Bulunamadı ({analysis.notFoundCount})</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Kısmen ({analysis.partialMatchCount})</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Eksik ({analysis.missingCount})</span>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
        {["all", "VERIFIED", "SUSPICIOUS", "NOT_FOUND", "PARTIAL_MATCH"].map((f) => (
          <Button key={f} size="sm" variant={statusFilter === f ? "default" : "outline"} onClick={() => setStatusFilter(f as any)}>
            {f === "all" ? "Tümü" : STATUS_CONFIG[f]?.label || f}
          </Button>
        ))}
        <span className="ml-2 text-sm text-slate-500">{filtered.length} referans</span>
      </div>

      {/* Reference Cards */}
      <div className="space-y-3">
        {filtered.map((ref, idx) => {
          const cfg = STATUS_CONFIG[ref.status || "PENDING"] || STATUS_CONFIG.PENDING;
          const Icon = cfg.icon;
          return (
            <Card key={ref.id} className="overflow-hidden">
              <button className="flex w-full items-start gap-4 p-4 text-left" onClick={() => toggleExpand(idx)}>
                <div className={`mt-0.5 rounded-full p-1.5 ${cfg.bg}`}>
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 line-clamp-2">{ref.rawText}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">{cfg.label}</Badge>
                    {ref.year && <Badge variant="outline" className="text-xs">{ref.year}</Badge>}
                    {ref.doi && <Badge variant="outline" className="text-xs font-mono">DOI: {ref.doi}</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ref.confidenceScore !== null && (
                    <div className="w-16">
                      <div className="h-2 rounded-full bg-slate-200">
                        <div className={`h-2 rounded-full ${ref.confidenceScore >= 70 ? "bg-green-500" : ref.confidenceScore >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${ref.confidenceScore}%` }} />
                      </div>
                      <p className="mt-0.5 text-center text-xs text-slate-500">{ref.confidenceScore}%</p>
                    </div>
                  )}
                  {ref.expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </button>

              {/* Expanded Detail */}
              {ref.expanded && (
                <div className="border-t bg-slate-50 p-4 space-y-3">
                  {/* Source link */}
                  {ref.bestMatchUrl && (
                    <a href={ref.bestMatchUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" /> {ref.bestMatchSource} — Kaynağı Gör
                    </a>
                  )}
                  {/* Parsed fields */}
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    {ref.title && <p><span className="text-slate-500">Başlık:</span> {ref.title}</p>}
                    {ref.journal && <p><span className="text-slate-500">Dergi:</span> {ref.journal}</p>}
                    {ref.volume && <p><span className="text-slate-500">Cilt/Issue:</span> {ref.volume}{ref.issue ? `(${ref.issue})` : ""}</p>}
                    {ref.pages && <p><span className="text-slate-500">Sayfa:</span> {ref.pages}</p>}
                  </div>
                  {/* Validations */}
                  {ref.validations && ref.validations.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold text-slate-600">KAYNAK DOĞRULAMALARI</p>
                      <div className="space-y-1">
                        {ref.validations.map((v: any) => {
                          const vCfg = STATUS_CONFIG[v.status === "FOUND" ? "VERIFIED" : v.status === "PARTIAL_MATCH" ? "PARTIAL_MATCH" : v.status === "NOT_FOUND" ? "NOT_FOUND" : "SUSPICIOUS"];
                          const VIcon = vCfg.icon;
                          return (
                            <div key={v.id} className="flex items-center gap-2 text-xs">
                              <VIcon className={`h-3.5 w-3.5 ${vCfg.color}`} />
                              <span className="font-medium">{v.source}</span>
                              <span className="text-slate-400">{v.confidenceScore}%</span>
                              {v.sourceUrl && <a href={v.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">link</a>}
                              <span className="text-slate-300">{v.responseTimeMs}ms</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Suspicion reasons */}
                  {ref.suspicionReasons && (ref.suspicionReasons as any[]).length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="mb-1 text-xs font-semibold text-red-700">ŞÜPHE NEDENLERİ</p>
                      {(ref.suspicionReasons as any[]).map((r: any, i: number) => (
                        <p key={i} className="text-xs text-red-600">• {r.description || r.type}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
