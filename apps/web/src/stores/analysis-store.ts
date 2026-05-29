/**
 * AiRefCheck - Analysis Store (Zustand)
 * Manages analysis view state (filters, view mode).
 */

"use client";

import { create } from "zustand";

type ViewMode = "cards" | "table";
type StatusFilter = "all" | "verified" | "suspicious" | "not_found" | "partial_match" | "pending";
type SortBy = "orderIndex" | "confidenceScore" | "year" | "status";

interface AnalysisState {
  viewMode: ViewMode;
  statusFilter: StatusFilter;
  sortBy: SortBy;
  sortOrder: "asc" | "desc";
  searchQuery: string;

  setViewMode: (mode: ViewMode) => void;
  setStatusFilter: (filter: StatusFilter) => void;
  setSortBy: (sort: SortBy) => void;
  toggleSortOrder: () => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

export const useAnalysisStore = create<AnalysisState>()((set) => ({
  viewMode: "cards",
  statusFilter: "all",
  sortBy: "orderIndex",
  sortOrder: "asc",
  searchQuery: "",

  setViewMode: (viewMode) => set({ viewMode }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setSortBy: (sortBy) => set({ sortBy }),
  toggleSortOrder: () => set((s) => ({ sortOrder: s.sortOrder === "asc" ? "desc" : "asc" })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  resetFilters: () => set({ statusFilter: "all", sortBy: "orderIndex", sortOrder: "asc", searchQuery: "" }),
}));
