import { call } from "~/api/client";
import type { Manga, Source } from "~/types";

export function listSources(includeHidden: boolean): Promise<Source[]> {
  return call<Source[]>("list_sources", { includeHidden });
}

export function addSource(path: string, name: string | null): Promise<Source> {
  return call<Source>("add_source", { path, name });
}

export function removeSource(sourceId: string): Promise<void> {
  return call("remove_source", { sourceId });
}

export function relocateSource(
  sourceId: string,
  newPath: string,
): Promise<Source> {
  return call<Source>("relocate_source", { sourceId, newPath });
}

export function setSourceHidden(
  sourceId: string,
  hidden: boolean,
): Promise<void> {
  return call("set_source_hidden", { sourceId, hidden });
}

export function renameSource(sourceId: string, name: string): Promise<void> {
  return call("rename_source", { sourceId, name });
}

export function reorderSources(orderedIds: string[]): Promise<void> {
  return call("reorder_sources", { orderedIds });
}

export function scanSource(
  path: string,
  forceRefresh = false,
): Promise<Manga[]> {
  return call<Manga[]>("scan_source", { path, forceRefresh });
}
