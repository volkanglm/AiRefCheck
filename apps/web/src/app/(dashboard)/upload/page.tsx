/**
 * AiRefCheck - Upload Page
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
  "text/x-tex": [".tex"],
  "application/x-bibtex": [".bib"],
};

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; docId?: string; error?: string } | null>(null);
  const router = useRouter();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setUploading(true);
    setResult(null);
    try {
      const res = await api.upload<{ id: string }>("/documents/upload", acceptedFiles[0]);
      setResult({ success: true, docId: res.data?.id });
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 100 * 1024 * 1024,
    multiple: false,
  });

  const startAnalysis = async () => {
    if (!result?.docId) return;
    try {
      const res = await api.post<{ id: string }>("/analyses", { documentId: result.docId });
      if (res.data) router.push(`/analysis/${res.data.id}`);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Doküman Yükle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
              isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <input {...getInputProps()} />
            <FileText className="mb-4 h-12 w-12 text-slate-400" />
            <p className="text-lg font-medium text-slate-700">
              {isDragActive ? "Dosyayı bırakın..." : "Dosya yüklemek için tıklayın veya sürükleyin"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              PDF, DOCX, LaTeX, BibTeX, TXT — Maks. 100MB
            </p>
          </div>

          {uploading && (
            <div className="mt-4 flex items-center gap-2 text-blue-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              Yükleniyor...
            </div>
          )}

          {result?.success && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
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
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span>{result.error}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
