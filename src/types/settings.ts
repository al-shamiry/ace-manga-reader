export type FitMode =
  | "fit-screen"
  | "fit-width"
  | "fit-height"
  | "original"
  | "stretch";
export type ReadingMode =
  | "paged-ltr"
  | "paged-rtl"
  | "paged-vertical"
  | "webtoon";

export interface Settings {
  fit_mode?: FitMode;
  reading_mode?: ReadingMode;
  webtoon_padding?: number;
}
