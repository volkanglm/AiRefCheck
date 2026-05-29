/** AiRefCheck - types/index.ts
 * Re-exports all shared types and defines frontend-specific types
 * for UI components, navigation, and filtering.
 */

export * from '@airefcheck/shared';

import type { ReferenceStatus, AnalysisStatus } from '@airefcheck/shared';

// ============================================
// Navigation Types
// ============================================

export interface SidebarItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// ============================================
// View & Filter Types
// ============================================

export type ViewMode = 'card' | 'table';

export interface ReferenceFilters {
  status: ReferenceStatus[];
  minScore: number;
  maxScore: number;
  searchQuery: string;
  sortBy: 'confidence' | 'author' | 'year' | 'status';
  sortOrder: 'asc' | 'desc';
}

// ============================================
// Analysis Status Labels (Turkish)
// ============================================

export const ANALYSIS_STATUS_LABELS: Record<AnalysisStatus, string> = {
  pending: 'Bekliyor',
  extracting_references: 'Referanslar Çıkarılıyor',
  detecting_style: 'Atıf Stili Algılanıyor',
  validating: 'Doğrulanıyor',
  detecting_fabrication: 'Sahte Referans Kontrolü',
  matching_citations: 'Metin İçi Atıflar Eşleştiriliyor',
  generating_report: 'Rapor Oluşturuluyor',
  completed: 'Tamamlandı',
  failed: 'Başarısız',
};

export const REFERENCE_STATUS_LABELS: Record<ReferenceStatus, string> = {
  verified: 'Doğrulandı',
  suspicious: 'Şüpheli',
  not_found: 'Bulunamadı',
  partial_match: 'Kısmi Eşleşme',
  pending: 'Bekliyor',
};
