/**
 * AiRefCheck - Reports Page
 */

"use client";

import { useEffect, useState } from "react";
import { FileDown, Share2, FileText, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

interface ReportItem {
  id: string;
  analysisId: string;
  format: string;
  status: string;
  fileUrl: string | null;
  shareToken: string | null;
  createdAt: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For now, we'll load analyses and map to reports
    api.get("/analyses")
      .then((res) => {
        const analyses = (res.data || []) as any[];
        setReports(
          analyses.map((a) => ({
            id: a.id,
            analysisId: a.id,
            format: "pdf",
            status: a.status === "COMPLETED" ? "COMPLETED" : "PENDING",
            fileUrl: null,
            shareToken: null,
            createdAt: a.createdAt,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async (analysisId: string, format: string) => {
    try {
      await api.post("/reports", { analysisId, format, sections: ["summary", "details", "charts", "recommendations"] });
      alert("Rapor oluşturuluyor. Tamamlandığında buradan indirebilirsiniz.");
    } catch (err: any) {
      alert("Rapor oluşturulamadı: " + (err.message || "Hata"));
    }
  };

  const handleShare = async (reportId: string) => {
    try {
      const res = await api.post<{ shareToken: string }>(`/reports/${reportId}/share`);
      const token = res.data?.shareToken;
      if (token) {
        await navigator.clipboard.writeText(`${window.location.origin}/api/v1/reports/shared/${token}`);
        alert("Paylaşım linki kopyalandı!");
      }
    } catch (err: any) {
      alert("Paylaşım linki oluşturulamadı: " + (err.message || "Hata"));
    }
  };

  if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Tamamlanan analizleriniz için rapor oluşturun ve indirin.</p>
      {reports.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-900">Analiz Raporu</p>
                <p className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString("tr-TR")}</p>
              </div>
              <Badge variant={r.status === "COMPLETED" ? "default" : "secondary"}>
                {r.status === "COMPLETED" ? "Hazır" : "Bekliyor"}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => handleExport(r.analysisId, "pdf")}>
                <FileDown className="h-3.5 w-3.5" /> PDF
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => handleExport(r.analysisId, "excel")}>
                <FileDown className="h-3.5 w-3.5" /> Excel
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => handleShare(r.id)}>
                <Share2 className="h-3.5 w-3.5" /> Paylaş
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
