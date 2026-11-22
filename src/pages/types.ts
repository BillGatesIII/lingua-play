export interface PageContext {
  root: HTMLElement;
  /** Re-run the current page, e.g. after progress was erased. */
  refresh: () => void;
}

export type PageCleanup = () => void;

/** A page renders into ctx.root and may return a cleanup function. */
export type Page = (ctx: PageContext) => void | PageCleanup;
