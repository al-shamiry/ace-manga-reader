import { EmptyState } from "~/components/common/EmptyState";

interface FirstRunWelcomeProps {
  onChooseFolder: () => void;
}

// First-run welcome — no root configured. Accent eyebrow + the only place we
// teach the on-disk layout, since the user has nothing else to go on yet.
export function FirstRunWelcome(props: FirstRunWelcomeProps) {
  return (
    <EmptyState
      accent
      eyebrow="Ace Manga Reader"
      title="Point us at your manga."
      description="Pick the folder where your collection lives. We'll scan it once, cache the covers, and stay out of the way after that."
      action={{ label: "Choose library folder", onClick: props.onChooseFolder }}
    >
      <div class="mt-6 w-full max-w-md border-t border-ink-800/80 pt-6">
        <p class="mb-3 text-[0.7rem] font-medium tracking-wider text-ink-600 uppercase">
          Expected layout
        </p>
        <pre class="font-mono text-xs leading-relaxed text-ink-500">
          {`root/               ← the folder you are going to pick
  source/           ← each subfolder is a source (a collection of manga)
    Manga Title/    ← the manga
      Chapter 01/   ← folders that contain images (pages)
      Chapter 02/
    Another Manga/
      vol01.cbz     ← you can also have .cbz files instead of folders`}
        </pre>
      </div>
    </EmptyState>
  );
}
