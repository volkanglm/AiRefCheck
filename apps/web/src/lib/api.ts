/**
 * AiRefCheck - API Client
 * Centralized fetch wrapper with auth token injection and error handling.
 */

"use client";

import type { ApiResponse } from "@airefcheck/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw { code: data.error?.code || "UNKNOWN", message: data.error?.message || "Bir hata oluştu", status: res.status };
    }
    return data;
  }

  async get<T>(path: string) { return this.request<T>(path); }
  async post<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(body) });
  }
  async delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }

  async upload<T>(path: string, file: File) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
    return res.json();
  }
}

export const api = new ApiClient(API_URL);
