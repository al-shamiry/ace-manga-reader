import { FolderOpen } from "lucide-solid";

export function SourcesView() {
  return (
    <div class="flex flex-col items-center justify-center flex-1 gap-4 text-center px-8">
      <div class="p-5 bg-zinc-900 rounded-2xl text-zinc-600">
        <FolderOpen size={48} stroke-width={1} />
      </div>
      <div>
        <p class="text-zinc-300 font-medium">Sources</p>
        <p class="text-zinc-600 text-sm mt-1">Source management coming in Stage 4</p>
      </div>
    </div>
  );
}
