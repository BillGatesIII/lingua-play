import { svg } from '../../ui/dom';
import type { ColorId } from './logic';

export interface BrushPoint {
  x: number;
  y: number;
}

export interface ChameleonSvgOptions {
  /** Base coat color already painted onto the chameleon (null = unpainted paper-white). */
  baseColor: ColorId | null;
  baseHex: string;
  /** Optional new paint color being brushed on via the SVG mask. */
  brushColor?: ColorId | null;
  brushHex?: string | null;
  /** Accumulated brush stroke points in SVG coordinates (0..260 x 0..200). */
  strokes?: readonly BrushPoint[];
  /** Visual facial expression. */
  mood?: 'idle' | 'happy' | 'mud';
  /** Compact mode for the end-of-round gallery cards. */
  compact?: boolean;
  /** Optional floating SVG brush position when hovering/painting. */
  cursor?: BrushPoint | null;
  /** Show subtle dashed paint-invitation highlight around the chameleon body. */
  inviting?: boolean;
}

/** Key zones across the chameleon silhouette used to measure brush coverage. */
export const PAINT_ZONES: readonly BrushPoint[] = [
  { x: 76, y: 102 },  // curly tail
  { x: 108, y: 102 }, // hind back
  { x: 134, y: 92 },  // mid back
  { x: 158, y: 102 }, // front torso
  { x: 188, y: 92 },  // head
  { x: 140, y: 122 }, // belly
];

export const BRUSH_RADIUS = 28;
export const ZONE_HIT_RADIUS = 38;
export const ZONES_TO_COMPLETE = 4;

const DARK_COLORS = new Set<ColorId>(['black', 'navy', 'maroon', 'darkgreen']);
const UNPAINTED_HEX = '#f8f5ee';

let maskSeq = 0;

export function isDarkChameleonColor(color: ColorId | null): boolean {
  return color !== null && DARK_COLORS.has(color);
}

/** Returns indices of PAINT_ZONES covered by the given brush stroke points. */
export function coveredPaintZones(strokes: readonly BrushPoint[]): Set<number> {
  const hit = new Set<number>();
  const r2 = ZONE_HIT_RADIUS * ZONE_HIT_RADIUS;
  for (const pt of strokes) {
    for (let i = 0; i < PAINT_ZONES.length; i++) {
      if (hit.has(i)) continue;
      const dx = pt.x - PAINT_ZONES[i].x;
      const dy = pt.y - PAINT_ZONES[i].y;
      if (dx * dx + dy * dy <= r2) hit.add(i);
    }
  }
  return hit;
}

const BODY_PATH =
  'M 176 122 C 154 136 116 138 94 126 C 78 118 82 88 106 72 C 126 58 152 56 168 68 C 172 54 186 48 194 56 C 202 64 206 74 214 82 C 224 90 224 106 212 114 C 200 122 188 124 176 122 Z';
const TAIL_PATH =
  'M 98 126 C 64 132 48 106 60 88 C 70 74 90 80 88 96 C 86 108 72 108 73 98';
const BACK_LEG_PATH =
  'M 103 120 C 98 134 99 144 108 148 C 115 150 118 144 114 134 L 116 122 Z';
const FRONT_LEG_PATH =
  'M 159 118 C 156 132 160 144 170 146 C 177 148 178 140 172 132 L 172 118 Z';
const RIDGE_PATH =
  'M 107 71 Q 112 63 118 66 Q 124 58 131 62 Q 138 55 145 60 Q 152 56 158 63';

function chameleonBodyLayer(fillHex: string, dark: boolean, unpainted: boolean): SVGGElement {
  const stripeFill = dark ? '#ffffff' : '#1f1b3d';
  const stripeOpacity = unpainted ? 0.07 : dark ? 0.18 : 0.14;
  const bellyOpacity = unpainted ? 0.5 : dark ? 0.16 : 0.28;
  const ridgeStroke = '#1f1b3d';

  return svg('g', { class: 'chameleon-body-layer' },
    // Spiral tail (ink outer + painted inner)
    svg('path', {
      d: TAIL_PATH,
      fill: 'none',
      stroke: '#1f1b3d',
      'stroke-width': 20,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
    svg('path', {
      d: TAIL_PATH,
      fill: 'none',
      stroke: fillHex,
      'stroke-width': 13,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
    // Back leg
    svg('path', {
      d: BACK_LEG_PATH,
      fill: fillHex,
      stroke: '#1f1b3d',
      'stroke-width': 3.5,
      'stroke-linejoin': 'round',
    }),
    // Dorsal crest bumps
    svg('path', {
      d: RIDGE_PATH,
      fill: fillHex,
      stroke: ridgeStroke,
      'stroke-width': 3.5,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
    // Main body + head + casque
    svg('path', {
      d: BODY_PATH,
      fill: fillHex,
      stroke: '#1f1b3d',
      'stroke-width': 4,
      'stroke-linejoin': 'round',
    }),
    // Soft chameleon stripes
    svg('path', {
      d: 'M 111 76 Q 107 95 113 114 Q 119 95 118 74 Z',
      fill: stripeFill,
      opacity: stripeOpacity,
    }),
    svg('path', {
      d: 'M 131 69 Q 127 92 133 115 Q 140 92 139 69 Z',
      fill: stripeFill,
      opacity: stripeOpacity,
    }),
    svg('path', {
      d: 'M 151 72 Q 148 93 153 113 Q 159 93 158 73 Z',
      fill: stripeFill,
      opacity: stripeOpacity,
    }),
    // Soft belly highlight
    svg('path', {
      d: 'M 101 124 C 122 134 152 133 172 121 C 152 125 123 126 101 124 Z',
      fill: '#ffffff',
      opacity: bellyOpacity,
    }),
    // Upper back sheen
    svg('path', {
      d: 'M 111 78 C 128 67 148 67 161 75',
      fill: 'none',
      stroke: '#ffffff',
      'stroke-width': 4.5,
      'stroke-linecap': 'round',
      opacity: unpainted ? 0.45 : 0.26,
    }),
    // Front leg clasping branch
    svg('path', {
      d: FRONT_LEG_PATH,
      fill: fillHex,
      stroke: '#1f1b3d',
      'stroke-width': 3.5,
      'stroke-linejoin': 'round',
    }),
    // Outer eye turret in body color
    svg('circle', {
      cx: 190,
      cy: 88,
      r: 15,
      fill: fillHex,
      stroke: '#1f1b3d',
      'stroke-width': 3.2,
    }),
  );
}

function chameleonFaceLayer(dark: boolean, mood: 'idle' | 'happy' | 'mud'): SVGGElement {
  const lineColor = dark ? '#f8fafc' : '#1f1b3d';
  const mouth = mood === 'happy'
    ? svg('path', {
        d: 'M 192 108 Q 204 118 215 106',
        fill: 'none',
        stroke: lineColor,
        'stroke-width': 3.2,
        'stroke-linecap': 'round',
      })
    : mood === 'mud'
      ? svg('circle', {
          cx: 206,
          cy: 109,
          r: 4,
          fill: 'none',
          stroke: lineColor,
          'stroke-width': 2.8,
        })
      : svg('path', {
          d: 'M 194 109 Q 204 113 213 108',
          fill: 'none',
          stroke: lineColor,
          'stroke-width': 2.8,
          'stroke-linecap': 'round',
        });

  return svg('g', { class: 'chameleon-face-layer' },
    // White eye + expressive pupil + catchlight
    svg('circle', {
      cx: 192,
      cy: 88,
      r: 10,
      fill: '#ffffff',
      stroke: '#1f1b3d',
      'stroke-width': 2.5,
    }),
    svg('circle', { cx: 195, cy: 88, r: 5.2, fill: '#1f1b3d' }),
    svg('circle', { cx: 197, cy: 85.5, r: 2.1, fill: '#ffffff' }),
    // Nostril
    svg('circle', { cx: 213, cy: 96, r: 1.8, fill: lineColor }),
    // Rosy cheek when happy
    mood === 'happy'
      ? svg('ellipse', { cx: 184, cy: 105, rx: 6, ry: 3.8, fill: '#ff8fab', opacity: 0.8 })
      : null,
    mouth,
  );
}

function sparkle(cx: number, cy: number, size: number): SVGPathElement {
  const s = size;
  const i = size * 0.28;
  return svg('path', {
    d: `M ${cx} ${cy - s} Q ${cx + i} ${cy - i} ${cx + s} ${cy} Q ${cx + i} ${cy + i} ${cx} ${cy + s} Q ${cx - i} ${cy + i} ${cx - s} ${cy} Q ${cx - i} ${cy - i} ${cx} ${cy - s} Z`,
    fill: '#ffd23f',
    stroke: '#1f1b3d',
    'stroke-width': 1.6,
    'stroke-linejoin': 'round',
  });
}

/** Builds a cute SVG paintbrush tip positioned at `(x, y)` (tip at origin). */
export function buildPaintbrushGroup(colorHex: string, pos?: BrushPoint | null): SVGGElement {
  const g = svg('g', {
    class: 'chameleon-brush-cursor',
    'data-role': 'brush-cursor',
    transform: pos ? `translate(${pos.x}, ${pos.y})` : 'translate(-100, -100)',
    opacity: pos ? 1 : 0,
    'pointer-events': 'none',
  },
  // Teardrop paint-loaded bristles with tip at (0, 0)
  svg('path', {
    d: 'M 0 0 C 4 -10 13 -14 19 -10 C 23 -6 19 3 10 5 C 4 6 0 4 0 0 Z',
    fill: colorHex,
    stroke: '#1f1b3d',
    'stroke-width': 2.5,
    'stroke-linejoin': 'round',
  }),
  // Gloss highlight on paint bristles
  svg('path', {
    d: 'M 6 -4 Q 11 -8 15 -6',
    fill: 'none',
    stroke: '#ffffff',
    'stroke-width': 2,
    'stroke-linecap': 'round',
    opacity: 0.7,
  }),
  // Silver ferrule
  svg('path', {
    d: 'M 17 -12 L 24 -19 L 30 -13 L 23 -6 Z',
    fill: '#d8dee9',
    stroke: '#1f1b3d',
    'stroke-width': 2.4,
    'stroke-linejoin': 'round',
  }),
  // Wooden brush handle
  svg('path', {
    d: 'M 24 -19 L 48 -43 C 51 -46 56 -46 58 -43 C 60 -40 59 -36 56 -33 L 30 -13 Z',
    fill: '#e9a96b',
    stroke: '#1f1b3d',
    'stroke-width': 2.5,
    'stroke-linejoin': 'round',
  }));
  return g;
}

/** Builds a full storybook SVG chameleon on a leafy branch with optional live brush-mask layer. */
export function buildChameleonSvg(opts: ChameleonSvgOptions): {
  svgEl: SVGSVGElement;
  maskStrokesEl: SVGGElement | null;
  brushCursorEl: SVGGElement | null;
} {
  const mood = opts.mood ?? 'idle';
  const unpainted = opts.baseColor === null;
  const baseFill = unpainted ? UNPAINTED_HEX : opts.baseHex;
  const baseDark = isDarkChameleonColor(opts.baseColor);

  const hasBrushLayer = Boolean(opts.brushHex && !opts.compact);
  const maskId = hasBrushLayer ? `cham-mask-${++maskSeq}` : '';
  const clipId = `cham-frame-${++maskSeq}`;

  const maskStrokesEl = hasBrushLayer
    ? svg('g', { class: 'chameleon-mask-strokes' },
        ...(opts.strokes ?? []).map((pt) =>
          svg('circle', { cx: pt.x, cy: pt.y, r: BRUSH_RADIUS, fill: '#ffffff' })))
    : null;

  const brushCursorEl = hasBrushLayer && opts.brushHex
    ? buildPaintbrushGroup(opts.brushHex, opts.cursor)
    : null;

  const defs = svg('defs', {},
    svg('clipPath', { id: clipId },
      svg('circle', { cx: 130, cy: 100, r: 90 })),
    hasBrushLayer && maskStrokesEl
      ? svg('mask', { id: maskId, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 260, height: 200 },
          svg('rect', { x: 0, y: 0, width: 260, height: 200, fill: '#000000' }),
          maskStrokesEl)
      : null,
  );

  // Determine effective darkness for face details (when brush has painted over the head, use brush darkness)
  const headPainted = hasBrushLayer && (opts.strokes ?? []).some(
    (pt) => (pt.x - 190) ** 2 + (pt.y - 95) ** 2 <= (BRUSH_RADIUS + 12) ** 2,
  );
  const faceDark = headPainted
    ? isDarkChameleonColor(opts.brushColor ?? null)
    : baseDark;

  const svgEl = svg('svg', {
    class: opts.compact ? 'chameleon-svg chameleon-svg--compact' : 'chameleon-svg',
    viewBox: '0 0 260 200',
    'aria-hidden': 'true',
  },
  defs,
  // Warm storybook medallion frame (never turns into the paint color!)
  svg('circle', {
    cx: 130,
    cy: 100,
    r: 92,
    fill: '#fffaf0',
    stroke: '#1f1b3d',
    'stroke-width': opts.compact ? 6 : 4.5,
  }),
  // Soft sunlit sky & subtle grass hill clipped inside the medallion
  svg('g', { 'clip-path': `url(#${clipId})` },
    svg('circle', { cx: 130, cy: 100, r: 90, fill: '#fffdf7' }),
    svg('ellipse', { cx: 130, cy: 182, rx: 105, ry: 42, fill: '#e8f7da' }),
  ),
  // Inviting paint halo when a brush is loaded and waiting
  opts.inviting && !opts.compact
    ? svg('circle', {
        cx: 130,
        cy: 100,
        r: 84,
        fill: 'none',
        stroke: opts.brushHex ?? '#ff9f1c',
        'stroke-width': 3.5,
        'stroke-dasharray': '9 7',
        opacity: 0.7,
        class: 'chameleon-invite-ring',
      })
    : null,
  // Woody branch + green leaves
  svg('g', { class: 'chameleon-branch' },
    svg('path', {
      d: 'M 42 152 C 25 144 21 127 36 121 C 48 127 51 141 42 152 Z',
      fill: '#52b788',
      stroke: '#1f1b3d',
      'stroke-width': 3,
      'stroke-linejoin': 'round',
    }),
    svg('path', {
      d: 'M 218 150 C 234 140 241 125 228 118 C 216 124 212 138 218 150 Z',
      fill: '#74c69d',
      stroke: '#1f1b3d',
      'stroke-width': 3,
      'stroke-linejoin': 'round',
    }),
    svg('path', {
      d: 'M 28 159 Q 130 140 232 152',
      fill: 'none',
      stroke: '#1f1b3d',
      'stroke-width': 19,
      'stroke-linecap': 'round',
    }),
    svg('path', {
      d: 'M 28 159 Q 130 140 232 152',
      fill: 'none',
      stroke: '#9c6644',
      'stroke-width': 12.5,
      'stroke-linecap': 'round',
    }),
    svg('path', {
      d: 'M 42 154 Q 130 137 218 148',
      fill: 'none',
      stroke: '#c08552',
      'stroke-width': 3.5,
      'stroke-linecap': 'round',
      opacity: 0.75,
    }),
  ),
  // Base coat chameleon body
  chameleonBodyLayer(baseFill, baseDark, unpainted),
  // Masked new paint layer revealed by real brush strokes
  hasBrushLayer && opts.brushHex
    ? svg('g', { mask: `url(#${maskId})` },
        chameleonBodyLayer(opts.brushHex, isDarkChameleonColor(opts.brushColor ?? null), false))
    : null,
  // Face (eye, nostril, smile/surprise) always crisp on top
  chameleonFaceLayer(faceDark, mood),
  // Celebration sparkles when solved
  mood === 'happy'
    ? svg('g', { class: 'chameleon-sparkles' },
        sparkle(64, 52, 9),
        sparkle(216, 48, 10),
        sparkle(232, 76, 6.5))
    : null,
  // Live paintbrush following the pointer
  brushCursorEl,
  );

  return { svgEl, maskStrokesEl, brushCursorEl };
}
