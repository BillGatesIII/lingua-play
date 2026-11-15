import type { Lang } from '../shared/i18n';

export interface PageContext {
  root: HTMLElement;
  lang: Lang;
  /** Re-run the current page, e.g. after progress was erased. */
  refresh: () => void;
}

export type PageCleanup = (() => void) & {
  updateSettings?: (lang: Lang) => void;
};

/** A page renders into ctx.root and may return a cleanup function. */
export type Page = (ctx: PageContext) => void | PageCleanup;
