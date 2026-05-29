"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Settings as SettingsIcon, Key, ExternalLink, CheckCircle2,
  AlertCircle, Loader2, BookOpen, Shield,
} from "lucide-react";

interface ApiKeyConfig {
  key: string;
  label: string;
  description: string;
  placeholder: string;
  required: boolean;
  guideUrl: string;
  guideText: string;
  isSet: boolean;
  maskedValue: string;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKeyConfig[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    loadKeys();
  }, [user, router]);

  const loadKeys = async () => {
    try {
      const res = await api.get<ApiKeyConfig[]>("/settings/api-keys");
      setKeys(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // Only send keys that were edited
      const changed: Record<string, string> = {};
      for (const [k, v] of Object.entries(editing)) {
        if (v.trim()) changed[k] = v.trim();
      }
      if (Object.keys(changed).length === 0) {
        setMessage({ type: "err", text: "Değişiklik yapılmadı." });
        setSaving(false);
        return;
      }
      await api.post("/settings/api-keys", { keys: changed });
      setMessage({ type: "ok", text: "API anahtarları başarıyla kaydedildi!" });
      setEditing({});
      await loadKeys();
    } catch (err: any) {
      setMessage({ type: "err", text: err.message || "Kayıt başarısız" });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-slate-600" />
          <h2 className="text-xl font-bold text-slate-900">Ayarlar</h2>
        </div>

        {/* App Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-slate-800">AiRefCheck — Tamamen Ücretsiz & Açık Kaynak</p>
                <p className="mt-1 text-sm text-slate-500">
                  Bu uygulama GPL-3.0 lisansı ile dağıtılmaktadır. Tüm akademik API&apos;ler ücretsizdir.
                  API anahtarlarınız yalnızca sizin makinenizde saklanır ve hiçbir yere gönderilmez.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" /> API Anahtarları
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex items-center gap-2 py-4 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
              </div>
            ) : (
              <>
                {message && (
                  <div className={`flex items-center gap-2 rounded-lg p-3 ${message.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {message.type === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {message.text}
                  </div>
                )}

                {keys.map((cfg) => (
                  <div key={cfg.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">{cfg.label}</Label>
                      {cfg.isSet ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3 w-3" /> Yapılandırılmış
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600">Yapılandırılmamış</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{cfg.description}</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder={cfg.isSet ? cfg.maskedValue : cfg.placeholder}
                        value={editing[cfg.key] || ""}
                        onChange={(e) => setEditing({ ...editing, [cfg.key]: e.target.value })}
                        type="password"
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? "Kaydediliyor..." : "API Anahtarlarını Kaydet"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> API Anahtarları Nasıl Alınır?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              AiRefCheck referanslarınızı doğrulamak için aşağıdaki akademik veritabanlarını kullanır.
              Tüm API&apos;ler <strong>ücretsizdir</strong>. API anahtarı olmadan da uygulama çalışır,
              ancak istek limitleri daha düşük olur.
            </p>

            {keys.map((cfg) => (
              <div key={cfg.key} className="rounded-lg border p-4 space-y-2">
                <p className="font-medium text-slate-800">{cfg.label}</p>
                <p className="text-sm text-slate-600">{cfg.guideText}</p>
                <a
                  href={cfg.guideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> {cfg.guideUrl}
                </a>
              </div>
            ))}

            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
              <strong>Not:</strong> API anahtarlarınız yalnızca yerel makinenizin ortam değişkenlerinde saklanır.
              Sunucuya veya üçüncü tarafa hiçbir veri gönderilmez. Uygulama açık kaynaklı olduğundan,
              kodu inceleyerek bunu doğrulayabilirsiniz.
            </div>
          </CardContent>
        </Card>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Hesap Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="text-slate-500">Ad:</span> <strong>{user.firstName} {user.lastName}</strong></div>
            <div><span className="text-slate-500">E-posta:</span> <strong>{user.email}</strong></div>
            <div><span className="text-slate-500">Rol:</span> <strong>Kullanıcı</strong></div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
