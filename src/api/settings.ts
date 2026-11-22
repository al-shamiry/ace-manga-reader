import { call } from "~/api/client";
import type {
  DisplayOverride,
  DisplayScope,
  LibraryDisplay,
  LibraryFilters,
  Settings,
  SortPreference,
  SourceFilters,
  ViewDisplay,
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

export function getReaderUiHidden(): Promise<boolean> {
  return call<boolean>("get_reader_ui_hidden");
}

export function setReaderUiHidden(hidden: boolean): Promise<void> {
  return call("set_reader_ui_hidden", { hidden });
}

export function getDefaultDisplay(): Promise<LibraryDisplay> {
  return call<LibraryDisplay>("get_default_display");
}

export function setDefaultDisplay(display: LibraryDisplay): Promise<void> {
  return call("set_default_display", { display });
}

export function getViewDisplay(scope: DisplayScope): Promise<ViewDisplay> {
  return call<ViewDisplay>("get_view_display", { scope });
}

export function patchViewDisplay(
  scope: DisplayScope,
  patch: DisplayOverride,
): Promise<ViewDisplay> {
  return call<ViewDisplay>("patch_view_display", { scope, patch });
}

export function resetViewDisplay(scope: DisplayScope): Promise<ViewDisplay> {
  return call<ViewDisplay>("reset_view_display", { scope });
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

// ── Source browse prefs ──

export function getSourceSortPreference(): Promise<SortPreference> {
  return call<SortPreference>("get_source_sort_preference");
}

export function setSourceSortPreference(
  preference: SortPreference,
): Promise<void> {
  return call("set_source_sort_preference", { preference });
}

export function getSourceFilters(): Promise<SourceFilters> {
  return call<SourceFilters>("get_source_filters");
}

export function setSourceFilters(filters: SourceFilters): Promise<void> {
  return call("set_source_filters", { filters });
}
