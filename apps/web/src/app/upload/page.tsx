/**
 * AiRefCheck - Upload Page
 */
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; docId?: string; error?: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setResult(null);
    try {
      const res = await api.upload<{ id: string }>("/documents/upload", selectedFile);
      setResult({ success: true, docId: res.data?.id });
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setUploading(false);
    }
  };

  const startAnalysis = async () => {
    if (!result?.docId) return;
    try {
      const res = await api.post<{ id: string }>("/analyses", { documentId: result.docId });
      if (res.data?.id) router.push(`/analysis/${res.data.id}`);
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Doküman Yükle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {selectedFile && !result?.success && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <FileText className="h-8 w-8 text-slate-400" />
                <div>
                  <p className="font-medium text-slate-700">{selectedFile.name}</p>
                  <p className="text-sm text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <Button className="ml-auto" onClick={handleUpload} disabled={uploading}>
                  {uploading ? "Yükleniyor..." : "Yükle"}
                </Button>
              </div>
            )}

            {uploading && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                Dosya yükleniyor...
              </div>
            )}

            {result?.success && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Dosya başarıyla yüklendi!</span>
                </div>
                <Button className="mt-3" onClick={startAnalysis}>
                  Analizi Başlat
                </Button>
              </div>
            )}

            {result?.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span>{result.error}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
