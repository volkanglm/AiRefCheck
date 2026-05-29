/**
 * AiRefCheck - Upload Page
 * Single flow: select file → upload → auto-start analysis → redirect
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "starting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const getAuthHeaders = () => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStatus("idle");
      setErrorMsg("");
    }
  };

  const startFullFlow = async () => {
    if (!selectedFile) return;

    try {
      // Step 1: Upload
      setStatus("uploading");
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadRes = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success || !uploadData.data?.id) {
        throw new Error(uploadData.error?.message || "Dosya yükleme başarısız");
      }

      const docId = uploadData.data.id;

      // Step 2: Create analysis
      setStatus("starting");
      const analysisRes = await fetch(`${API_URL}/analyses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ documentId: docId }),
      });

      const analysisData = await analysisRes.json();
      if (!analysisData.success || !analysisData.data?.id) {
        throw new Error(analysisData.error?.message || "Analiz oluşturma başarısız");
      }

      // Step 3: Redirect to analysis page
      setStatus("done");
      router.push(`/analysis/${analysisData.data.id}`);

    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Beklenmeyen bir hata oluştu");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Doküman Yükle &amp; Analiz Et
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Input */}
            <div>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <FileText className="h-10 w-10 text-blue-500" />
                <div className="flex-1">
                  <p className="font-medium text-slate-700">{selectedFile.name}</p>
                  <p className="text-sm text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button
                  onClick={startFullFlow}
                  disabled={status === "uploading" || status === "starting"}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {status === "uploading" && (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor...</>
                  )}
                  {status === "starting" && (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analiz Başlatılıyor...</>
                  )}
                  {status === "idle" && "Analizi Başlat"}
                  {status === "done" && (
                    <><CheckCircle className="mr-2 h-4 w-4" /> Yönlendiriliyor...</>
                  )}
                  {status === "error" && "Tekrar Dene"}
                </Button>
              </div>
            )}

            {/* Status Messages */}
            {status === "uploading" && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Dosya sunucuya yükleniyor...</span>
              </div>
            )}

            {status === "starting" && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Referanslar ayrıştırılıyor, analiz başlatılıyor...</span>
              </div>
            )}

            {status === "error" && errorMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
