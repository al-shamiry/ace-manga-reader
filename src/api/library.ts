import { call } from "~/api/client";
import type { Category, Manga } from "~/types";

// ── Categories ──

export function listCategories(): Promise<Category[]> {
  return call<Category[]>("list_categories");
}

export function createCategory(name: string): Promise<void> {
  return call("create_category", { name });
}

export function renameCategory(
  categoryId: string,
  name: string,
): Promise<void> {
  return call("rename_category", { categoryId, name });
}

export function deleteCategory(categoryId: string): Promise<void> {
  return call("delete_category", { categoryId });
}

// ── Library membership ──

export function listLibrary(): Promise<Manga[]> {
  return call<Manga[]>("list_library");
}

export function addToLibrary(
  mangaId: string,
  categoryIds: string[],
): Promise<void> {
  return call("add_to_library", { mangaId, categoryIds });
}

export function removeFromLibrary(mangaId: string): Promise<void> {
  return call("remove_from_library", { mangaId });
}

export function setMangasRead(
  mangaIds: string[],
  read: boolean,
): Promise<void> {
  return call("set_mangas_read", { mangaIds, read });
}

export function addMangasToCategories(
  mangaIds: string[],
  categoryIds: string[],
): Promise<void> {
  return call("add_mangas_to_categories", { mangaIds, categoryIds });
}

export function removeMangasFromLibrary(mangaIds: string[]): Promise<void> {
  return call("remove_mangas_from_library", { mangaIds });
}

export function removeMangasFromCategory(
  mangaIds: string[],
  categoryId: string,
): Promise<void> {
  return call("remove_mangas_from_category", { mangaIds, categoryId });
}
