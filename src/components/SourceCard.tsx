import type { Source } from "../types";

interface Props {
  source: Source;
  onClick: () => void;
}

export function SourceCard(props: Props) {
  return (
    <div class="source-card" onClick={props.onClick}>
      <div class="source-card__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </svg>
      </div>
      <div class="source-card__info">
        <div class="source-card__name">{props.source.name}</div>
        <div class="source-card__count">{props.source.manga_count} manga</div>
      </div>
    </div>
  );
}
