import type { Lang } from '../shared/i18n';
import type { AgeBand } from '../shared/storage';

export interface PageContext {
  root: HTMLElement;
  lang: Lang;
  band: AgeBand;
  /** Re-run the current page, e.g. after progress was erased. */
  refresh: () => void;
}

/** A page renders into ctx.root and may return a cleanup function. */
export type Page = (ctx: PageContext) => void | (() => void);
