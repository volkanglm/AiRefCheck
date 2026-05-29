/**
 * AiRefCheck - Settings Page
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleProfileSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      // Would call: PUT /api/v1/users/profile
      setUser({ ...user!, firstName, lastName });
      setMessage("Profil güncellendi ✅");
    } catch {
      setMessage("Hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setMessage("Şifreler eşleşmiyor");
      return;
    }
    if (newPassword.length < 8) {
      setMessage("Şifre en az 8 karakter olmalı");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      // Would call: PUT /api/v1/users/password
      setMessage("Şifre güncellendi ✅");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setMessage("Hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profil Bilgileri</CardTitle>
          <CardDescription>Adınızı ve iletişim bilgilerinizi güncelleyin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">Ad</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="lastName">Soyad</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>E-posta</Label>
            <Input value={user?.email || ""} disabled className="bg-slate-50" />
            <p className="mt-1 text-xs text-slate-400">E-posta değiştirmek için destek ile iletişime geçin</p>
          </div>
          <Button onClick={handleProfileSave} disabled={saving}>Kaydet</Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle>Şifre Değiştir</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Mevcut Şifre</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <Label>Yeni Şifre</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <Label>Yeni Şifre (Tekrar)</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button onClick={handlePasswordChange} disabled={saving}>Şifreyi Güncelle</Button>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Tercihler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Dil</Label>
            <div className="flex gap-2 mt-1">
              <Button size="sm" variant="default">Türkçe</Button>
              <Button size="sm" variant="outline">English</Button>
            </div>
          </div>
          <Separator />
          <div>
            <Label>Veri Saklama</Label>
            <p className="text-sm text-slate-500 mt-1">Yüklenen dokümanlar 30 gün sonra otomatik silinir.</p>
          </div>
        </CardContent>
      </Card>

      {message && <p className="text-sm font-medium text-center text-blue-600">{message}</p>}
    </div>
  );
}
