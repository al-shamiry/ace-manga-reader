import { Clock } from "lucide-solid";

export function HistoryView() {
  return (
    <div class="flex flex-col items-center justify-center flex-1 gap-4 text-center px-8">
      <div class="p-5 bg-ink-900 rounded-2xl text-ink-600">
        <Clock size={48} stroke-width={1} />
      </div>
      <div>
        <p class="text-ink-300 font-medium">History</p>
        <p class="text-ink-600 text-sm mt-1">Your reading history will appear here</p>
      </div>
    </div>
  );
}
