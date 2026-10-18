import { describe, expect, it } from 'vitest';
import { renderKeepingFocus } from './focus';

describe('renderKeepingFocus', () => {
  it('updates mounted live regions and moves focus to the requested next control', () => {
    const container = document.createElement('div');
    const previousRegion = document.createElement('p');
    previousRegion.setAttribute('aria-live', 'polite');
    previousRegion.dataset.live = 'message';
    previousRegion.textContent = 'Old message';
    const previousButton = document.createElement('button');
    previousButton.dataset.focus = 'ready';
    container.append(previousRegion, previousButton);
    document.body.append(container);

    renderKeepingFocus(container, () => {
      const next = document.createElement('div');
      const region = document.createElement('p');
      region.setAttribute('aria-live', 'polite');
      region.dataset.live = 'message';
      region.textContent = 'New message';
      const button = document.createElement('button');
      button.dataset.focus = 'next';
      next.append(region, button);
      return next;
    }, 'next');

    expect(container.querySelector('[data-live="message"]')).toBe(previousRegion);
    expect(previousRegion.textContent).toBe('New message');
    expect(document.activeElement).toBe(container.querySelector('[data-focus="next"]'));
    container.remove();
  });
});
