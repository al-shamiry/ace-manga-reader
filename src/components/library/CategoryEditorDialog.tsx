import { createSignal, For, Show } from "solid-js";

import { Check, Pencil, Plus, Trash2, X } from "lucide-solid";

import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogTitle,
} from "~/components/ui/dialog";

import { useLibrary } from "~/context/LibraryContext";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CategoryEditorDialog(props: Props) {
  const { categories, createCategory, renameCategory, deleteCategory } =
    useLibrary();

  const [newName, setNewName] = createSignal("");
  const [renamingId, setRenamingId] = createSignal<string | null>(null);
  const [renamingValue, setRenamingValue] = createSignal("");
  const [confirmDeleteId, setConfirmDeleteId] = createSignal<string | null>(
    null,
  );
  const [busy, setBusy] = createSignal(false);

  function resetRowState() {
    setRenamingId(null);
    setRenamingValue("");
    setConfirmDeleteId(null);
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setNewName("");
      resetRowState();
    }
    props.onOpenChange(open);
  }

  async function submitCreate() {
    const name = newName().trim();
    if (!name || busy()) return;
    setBusy(true);
    try {
      await createCategory(name);
      setNewName("");
    } catch (e) {
      console.error("Failed to create category:", e);
    } finally {
      setBusy(false);
    }
  }

  function startRename(id: string, current: string) {
    setConfirmDeleteId(null);
    setRenamingId(id);
    setRenamingValue(current);
  }

  async function submitRename() {
    const id = renamingId();
    const name = renamingValue().trim();
    if (!id || !name || busy()) {
      resetRowState();
      return;
    }
    setBusy(true);
    try {
      await renameCategory(id, name);
    } catch (e) {
      console.error("Failed to rename category:", e);
    } finally {
      setBusy(false);
      resetRowState();
    }
  }

  async function confirmDelete(id: string) {
    if (busy()) return;
    setBusy(true);
    try {
      await deleteCategory(id);
    } catch (e) {
      console.error("Failed to delete category:", e);
    } finally {
      setBusy(false);
      setConfirmDeleteId(null);
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
      <DialogContent class="max-w-sm">
        <header class="flex items-center justify-between gap-3 border-b border-ink-800 px-5 py-3.5">
          <div>
            <DialogTitle>Manage categories</DialogTitle>
            <p class="mt-0.5 text-xs text-ink-500">
              Rename or remove categories, or add a new one.
            </p>
          </div>
          <DialogCloseButton class="-mr-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-200">
            <X size={16} />
          </DialogCloseButton>
        </header>

        <div class="max-h-72 overflow-y-auto px-3 py-2">
          <Show
            when={categories().length > 0}
            fallback={
              <p class="px-2 py-6 text-center text-sm text-ink-500">
                No categories yet. Add your first one below.
              </p>
            }
          >
            <ul class="flex flex-col">
              <For each={categories()}>
                {(cat) => (
                  <li class="flex h-10 items-center gap-2 rounded-md px-2 hover:bg-ink-800/50">
                    <Show
                      when={renamingId() === cat.id}
                      fallback={
                        <Show
                          when={confirmDeleteId() === cat.id}
                          fallback={
                            <>
                              <span class="flex-1 truncate text-sm text-ink-200">
                                {cat.name}
                              </span>
                              <button
                                type="button"
                                title="Rename"
                                class="flex size-7 cursor-pointer items-center justify-center rounded text-ink-500 transition-colors hover:bg-ink-700 hover:text-ink-100"
                                onClick={() => startRename(cat.id, cat.name)}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                title={
                                  cat.id === "default"
                                    ? "The Default category can't be deleted"
                                    : "Delete"
                                }
                                disabled={cat.id === "default"}
                                class="flex size-7 cursor-pointer items-center justify-center rounded text-ink-500 transition-colors hover:bg-red-950/40 hover:text-red-300 disabled:pointer-events-none disabled:cursor-default disabled:opacity-30"
                                onClick={() => setConfirmDeleteId(cat.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          }
                        >
                          <span class="flex-1 truncate text-sm text-red-300/90">
                            Delete “{cat.name}”?
                          </span>
                          <button
                            type="button"
                            class="h-7 cursor-pointer rounded px-2 text-xs font-medium text-ink-400 transition-colors hover:bg-ink-700 hover:text-ink-100"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            class="h-7 cursor-pointer rounded px-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-950/40 hover:text-red-200"
                            onClick={() => confirmDelete(cat.id)}
                          >
                            Delete
                          </button>
                        </Show>
                      }
                    >
                      <form
                        class="flex flex-1 items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitRename();
                        }}
                      >
                        <input
                          ref={(el) => requestAnimationFrame(() => el.select())}
                          value={renamingValue()}
                          onInput={(e) =>
                            setRenamingValue(e.currentTarget.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Escape") resetRowState();
                          }}
                          class="h-7 flex-1 rounded border border-jade-500 bg-ink-800 px-2 text-sm text-ink-100 outline-none placeholder:text-ink-600"
                        />
                        <button
                          type="submit"
                          title="Save"
                          class="flex size-7 cursor-pointer items-center justify-center rounded text-jade-400 transition-colors hover:bg-jade-950/40 hover:text-jade-300"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          title="Cancel"
                          class="flex size-7 cursor-pointer items-center justify-center rounded text-ink-500 transition-colors hover:bg-ink-700 hover:text-ink-100"
                          onClick={resetRowState}
                        >
                          <X size={14} />
                        </button>
                      </form>
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>

        <form
          class="flex items-center gap-2 border-t border-ink-800 px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            submitCreate();
          }}
        >
          <input
            value={newName()}
            onInput={(e) => setNewName(e.currentTarget.value)}
            placeholder="New category"
            class="h-8 flex-1 rounded-md border border-ink-700 bg-ink-800 px-2.5 text-sm text-ink-100 transition-colors outline-none placeholder:text-ink-600 focus:border-jade-500"
          />
          <button
            type="submit"
            disabled={!newName().trim() || busy()}
            class="flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-default disabled:opacity-40"
          >
            <Plus size={14} /> Add
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
