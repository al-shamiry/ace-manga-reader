import { call } from "~/api/client";
import type {
  LibraryDisplay,
  LibraryFilters,
  Settings,
  SortPreference,
  SourceDisplay,
  SourceFilters,
} from "~/types";

// ── Root directory ──

export function getRootDirectory(): Promise<string | null> {
  return call<string | null>("get_root_directory");
}

export function setRootDirectory(path: string): Promise<void> {
  return call<void>("set_root_directory", { path });
}

// ── Default reader settings ──

export function getDefaultReaderSettings(): Promise<Settings> {
  return call<Settings>("get_default_reader_settings");
}

export function setDefaultReaderSettings(settings: Settings): Promise<void> {
  return call("set_default_reader_settings", { settings });
}

// ── Library browse prefs ──

export function getLibraryFilters(): Promise<LibraryFilters> {
  return call<LibraryFilters>("get_library_filters");
}

export function setLibraryFilters(filters: LibraryFilters): Promise<void> {
  return call("set_library_filters", { filters });
}

export function getActiveCategory(): Promise<string | null> {
  return call<string | null>("get_active_category");
}

export function setActiveCategory(categoryId: string): Promise<void> {
  return call("set_active_category", { categoryId });
}

export function getLibrarySortPreference(): Promise<SortPreference> {
  return call<SortPreference>("get_library_sort_preference");
}

export function setLibrarySortPreference(
  preference: SortPreference,
): Promise<void> {
  return call("set_library_sort_preference", { preference });
}

export function getLibraryDisplay(): Promise<LibraryDisplay> {
  return call<LibraryDisplay>("get_library_display");
}

export function setLibraryDisplay(display: LibraryDisplay): Promise<void> {
  return call("set_library_display", { display });
}

// ── Source browse prefs ──

export function getSourceSortPreference(): Promise<SortPreference> {
  return call<SortPreference>("get_source_sort_preference");
}

export function setSourceSortPreference(
  preference: SortPreference,
): Promise<void> {
  return call("set_source_sort_preference", { preference });
}

export function getSourceDisplay(): Promise<SourceDisplay> {
  return call<SourceDisplay>("get_source_display");
}

export function setSourceDisplay(display: SourceDisplay): Promise<void> {
  return call("set_source_display", { display });
}

export function getSourceFilters(): Promise<SourceFilters> {
  return call<SourceFilters>("get_source_filters");
}

export function setSourceFilters(filters: SourceFilters): Promise<void> {
  return call("set_source_filters", { filters });
}
