/**
 * Healthy's own icon family: a 24-point grid, a 1.75 stroke and round ends.
 * A shape with `fill: 'solid'` is filled with the icon colour; `fill: 'cutout'`
 * is filled with the surface behind it, to carve detail out of a solid shape.
 */
export type GlyphShape =
  | { kind: 'path'; d: string; fill?: 'solid' | 'cutout' }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill?: 'solid' | 'cutout' }
  | {
      kind: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      rx: number;
      fill?: 'solid' | 'cutout';
    };

export type GlyphName =
  | 'bloodPressure'
  | 'bloodSugar'
  | 'breathing'
  | 'everydayHealth'
  | 'walk'
  | 'water'
  | 'today'
  | 'todayFilled'
  | 'challenges'
  | 'challengesFilled'
  | 'you'
  | 'youFilled'
  | 'check'
  | 'back'
  | 'close'
  | 'mail'
  | 'bell'
  | 'offline'
  | 'clock'
  | 'search'
  | 'strength'
  | 'gym'
  | 'mobility'
  | 'phone'
  | 'camera'
  | 'hand'
  | 'pencil'
  | 'leaf'
  | 'plus'
  | 'share'
  | 'lock'
  | 'minus'
  | 'deleteKey'
  | 'pause'
  | 'play'
  | 'flip'
  | 'pin'
  | 'eyeOff'
  | 'message'
  | 'forward'
  | 'moon'
  | 'spark'
  | 'settings'
  | 'eye'
  | 'heart'
  | 'watch'
  | 'star'
  | 'key'
  | 'help'
  | 'trophy'
  | 'users'
  | 'external'
  | 'bellOff'
  | 'doc'
  | 'history'
  | 'calendar'
  | 'clap'
  | 'inbox'
  | 'flame'
  | 'repeat'
  | 'bookmark'
  | 'link'
  | 'more'
  | 'alert';

const SUN_RAYS =
  'M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M5.6 18.4l1.3-1.3M17.1 6.9l1.3-1.3';
const CARD_BEHIND =
  'M7.5 7.5V6A2.5 2.5 0 0 1 10 3.5h8A2.5 2.5 0 0 1 20.5 6v8a2.5 2.5 0 0 1-2.5 2.5h-1.5';
const SHOULDERS = 'M6.5 18.2a6.2 6.2 0 0 1 11 0';

export const GLYPH_SHAPES: Record<GlyphName, readonly GlyphShape[]> = {
  bloodPressure: [
    {
      kind: 'path',
      d: 'M12 20.2s-7.6-4.5-7.6-10.3A4.4 4.4 0 0 1 12 7.1a4.4 4.4 0 0 1 7.6 2.8c0 5.8-7.6 10.3-7.6 10.3z',
    },
    { kind: 'path', d: 'M7.4 12.2h2.1l1.3-2.1 2.3 4.2 1.3-2.1h2.2' },
  ],
  bloodSugar: [
    {
      kind: 'path',
      d: 'M12 3.6c3.2 3.8 5.8 7.1 5.8 10.3a5.8 5.8 0 0 1-11.6 0c0-3.2 2.6-6.5 5.8-10.3z',
    },
    { kind: 'path', d: 'M9.4 14.4a2.7 2.7 0 0 0 2.6 2.7' },
  ],
  breathing: [
    { kind: 'path', d: 'M12 4.2v7.3' },
    { kind: 'path', d: 'M12 11.5c-.5.9-1.1 1.4-1.9 1.6M12 11.5c.5.9 1.1 1.4 1.9 1.6' },
    {
      kind: 'path',
      d: 'M9.2 7.6c-2.7.5-4.7 4.5-4.7 8.6 0 2.1 1 3.5 2.8 3.5 2 0 2.9-1.3 2.9-3.4V8.9c0-.9-.4-1.4-1-1.3zM14.8 7.6c2.7.5 4.7 4.5 4.7 8.6 0 2.1-1 3.5-2.8 3.5-2 0-2.9-1.3-2.9-3.4V8.9c0-.9.4-1.4 1-1.3z',
    },
  ],
  everydayHealth: [
    { kind: 'path', d: 'M12 20.5v-8' },
    { kind: 'path', d: 'M12 12.5c0-3.7-2.6-6.3-6.8-6.3 0 4 2.7 6.3 6.8 6.3z' },
    { kind: 'path', d: 'M12 14.6c0-3.2 2.3-5.3 6-5.3 0 3.4-2.4 5.3-6 5.3z' },
  ],
  walk: [
    { kind: 'circle', cx: 13.3, cy: 4.3, r: 1.7 },
    { kind: 'path', d: 'M10.2 20.5l2-5.8 2.7 2.7v3.1' },
    { kind: 'path', d: 'M7.6 11.6l2.5-3.2 3.2 1.3 1.9 3 2.4.8' },
    { kind: 'path', d: 'M12.2 14.7l1-5' },
  ],
  water: [
    { kind: 'path', d: 'M6.5 4.5h11l-1.4 14.2a2 2 0 0 1-2 1.8H9.9a2 2 0 0 1-2-1.8z' },
    { kind: 'path', d: 'M7.2 10.5c1.6-.8 3.2-.8 4.8 0s3.2.8 4.8 0' },
  ],
  today: [
    { kind: 'circle', cx: 12, cy: 12, r: 4 },
    { kind: 'path', d: SUN_RAYS },
  ],
  todayFilled: [
    { kind: 'circle', cx: 12, cy: 12, r: 4.6, fill: 'solid' },
    { kind: 'path', d: SUN_RAYS },
  ],
  challenges: [
    { kind: 'rect', x: 3.5, y: 7.5, width: 13, height: 13, rx: 3 },
    { kind: 'path', d: CARD_BEHIND },
  ],
  challengesFilled: [
    { kind: 'rect', x: 3.5, y: 7.5, width: 13, height: 13, rx: 3, fill: 'solid' },
    { kind: 'path', d: CARD_BEHIND },
  ],
  you: [
    { kind: 'circle', cx: 12, cy: 12, r: 8.8 },
    { kind: 'circle', cx: 12, cy: 10, r: 3 },
    { kind: 'path', d: SHOULDERS },
  ],
  youFilled: [
    { kind: 'circle', cx: 12, cy: 12, r: 8.8, fill: 'solid' },
    { kind: 'circle', cx: 12, cy: 10, r: 3, fill: 'cutout' },
    { kind: 'path', d: SHOULDERS, fill: 'cutout' },
  ],
  check: [{ kind: 'path', d: 'M20 6 9 17l-5-5' }],
  back: [{ kind: 'path', d: 'm15 18-6-6 6-6' }],
  close: [{ kind: 'path', d: 'M18 6 6 18M6 6l12 12' }],
  mail: [
    { kind: 'rect', x: 3, y: 5, width: 18, height: 14, rx: 2 },
    { kind: 'path', d: 'm3.5 6 8.5 7 8.5-7' },
  ],
  bell: [
    { kind: 'path', d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' },
    { kind: 'path', d: 'M10.3 21a1.9 1.9 0 0 0 3.4 0' },
  ],
  offline: [
    { kind: 'path', d: 'M3 3l18 18' },
    {
      kind: 'path',
      d: 'M8.5 16.5a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 4.2-2.4M19 12.9a10 10 0 0 0-2.1-1.6M2 9a15 15 0 0 1 4.1-2.6M22 9a15 15 0 0 0-10-3.9',
    },
    { kind: 'path', d: 'M12 20h.01' },
  ],
  clock: [
    { kind: 'circle', cx: 12, cy: 12, r: 9 },
    { kind: 'path', d: 'M12 7v5l3 2' },
  ],
  search: [
    { kind: 'circle', cx: 11, cy: 11, r: 7 },
    { kind: 'path', d: 'm20 20-4-4' },
  ],
  strength: [{ kind: 'path', d: 'M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11' }],
  gym: [
    { kind: 'path', d: 'M14.4 14.4 9.6 9.6M18.7 21.5l2.8-2.8M2.5 5.3l2.8-2.8' },
    {
      kind: 'path',
      d: 'M6.4 21.6a2 2 0 1 1-2.8-2.8l1.8-1.8-1.4-1.4 2.8-2.8 8.5 8.5-2.8 2.8-1.4-1.4zM17.6 2.4a2 2 0 1 1 2.8 2.8l-1.8 1.8 1.4 1.4-2.8 2.8-8.5-8.5 2.8-2.8 1.4 1.4z',
    },
  ],
  mobility: [
    { kind: 'circle', cx: 12, cy: 4.5, r: 2 },
    { kind: 'path', d: 'M4 9l8 1.5L20 9M12 10.5V15l-4 6M12 15l4 6' },
  ],
  phone: [
    { kind: 'rect', x: 6, y: 2.5, width: 12, height: 19, rx: 2.5 },
    { kind: 'path', d: 'M11 18.5h2' },
  ],
  camera: [
    {
      kind: 'path',
      d: 'M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z',
    },
    { kind: 'circle', cx: 12, cy: 13.5, r: 3.5 },
  ],
  hand: [
    {
      kind: 'path',
      d: 'M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8',
    },
    {
      kind: 'path',
      d: 'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15',
    },
  ],
  pencil: [
    { kind: 'path', d: 'M12 20h9' },
    { kind: 'path', d: 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z' },
  ],
  leaf: [
    {
      kind: 'path',
      d: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z',
    },
    { kind: 'path', d: 'M2 21c0-3 1.9-5.4 5.1-6' },
  ],
  plus: [{ kind: 'path', d: 'M12 5v14M5 12h14' }],
  share: [
    { kind: 'path', d: 'M12 3v13' },
    { kind: 'path', d: 'm7 8 5-5 5 5' },
    { kind: 'path', d: 'M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5' },
  ],
  lock: [
    { kind: 'rect', x: 4, y: 11, width: 16, height: 10, rx: 2 },
    { kind: 'path', d: 'M8 11V7a4 4 0 0 1 8 0v4' },
  ],
  minus: [{ kind: 'path', d: 'M5 12h14' }],
  deleteKey: [
    { kind: 'path', d: 'M21 5H9l-7 7 7 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z' },
    { kind: 'path', d: 'm17 9-6 6M11 9l6 6' },
  ],
  pause: [{ kind: 'path', d: 'M8 5v14M16 5v14' }],
  play: [{ kind: 'path', d: 'M7 4l13 8-13 8z' }],
  flip: [
    { kind: 'path', d: 'M4 12a8 8 0 0 1 14-5.3L20 9M20 12a8 8 0 0 1-14 5.3L4 15' },
    { kind: 'path', d: 'M20 4v5h-5M4 20v-5h5' },
  ],
  pin: [
    { kind: 'path', d: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z' },
    { kind: 'circle', cx: 12, cy: 9.5, r: 2.5 },
  ],
  eyeOff: [
    { kind: 'path', d: 'M3 3l18 18' },
    {
      kind: 'path',
      d: 'M10.6 5.1A10 10 0 0 1 22 12a17 17 0 0 1-3 3.8M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 4.4-1',
    },
  ],
  message: [{ kind: 'path', d: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z' }],
  forward: [{ kind: 'path', d: 'm9 18 6-6-6-6' }],
  moon: [{ kind: 'path', d: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z' }],
  spark: [{ kind: 'path', d: 'M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z' }],
  settings: [
    { kind: 'circle', cx: 12, cy: 12, r: 3 },
    {
      kind: 'path',
      d: 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    },
  ],
  eye: [
    { kind: 'path', d: 'M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z' },
    { kind: 'circle', cx: 12, cy: 12, r: 3 },
  ],
  heart: [
    {
      kind: 'path',
      d: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z',
    },
  ],
  watch: [
    { kind: 'rect', x: 6, y: 6, width: 12, height: 12, rx: 3 },
    { kind: 'path', d: 'M9 6l.7-3h4.6l.7 3M9 18l.7 3h4.6l.7-3M12 9.5V12l1.5 1' },
  ],
  star: [
    { kind: 'path', d: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z' },
  ],
  key: [
    { kind: 'circle', cx: 8, cy: 15, r: 4 },
    { kind: 'path', d: 'm10.8 12.2 8.7-8.7M16 7l3 3M14 9l2 2' },
  ],
  help: [
    { kind: 'circle', cx: 12, cy: 12, r: 9 },
    { kind: 'path', d: 'M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.2-2.5 3.9M12 17h.01' },
  ],
  trophy: [
    { kind: 'path', d: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z' },
    { kind: 'path', d: 'M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3' },
  ],
  users: [
    { kind: 'circle', cx: 9, cy: 8, r: 3.5 },
    { kind: 'path', d: 'M2.5 20a6.5 6.5 0 0 1 13 0' },
    { kind: 'path', d: 'M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14a6.5 6.5 0 0 1 3 6' },
  ],
  external: [
    { kind: 'path', d: 'M14 4h6v6M20 4l-9 9' },
    { kind: 'path', d: 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5' },
  ],
  bellOff: [
    { kind: 'path', d: 'M3 3l18 18' },
    {
      kind: 'path',
      d: 'M8.7 3.9A6 6 0 0 1 18 8c0 3 .6 5.2 1.3 6.6M17 17H3s3-2 3-9c0-.5 0-1 .1-1.5',
    },
    { kind: 'path', d: 'M10.3 21a1.9 1.9 0 0 0 3.4 0' },
  ],
  doc: [
    { kind: 'path', d: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z' },
    { kind: 'path', d: 'M14 3v5h5M9 13h6M9 17h6' },
  ],
  history: [
    { kind: 'path', d: 'M3 12a9 9 0 1 0 3-6.7L3 8' },
    { kind: 'path', d: 'M3 3v5h5M12 7v5l3 2' },
  ],
  calendar: [
    { kind: 'rect', x: 3, y: 5, width: 18, height: 16, rx: 2 },
    { kind: 'path', d: 'M3 10h18M8 3v4M16 3v4' },
  ],
  clap: [
    {
      kind: 'path',
      d: 'M7 11 4.6 8.6a1.5 1.5 0 0 1 2.1-2.1L11 10.8M9 9 6.4 6.4a1.5 1.5 0 0 1 2.1-2.1l5.6 5.6M11.5 7.5l-1-1a1.5 1.5 0 0 1 2.1-2.1l5.2 5.2a6 6 0 0 1-8.5 8.5L4.6 13.4a1.5 1.5 0 0 1 2.1-2.1l2.6 2.6',
    },
  ],
  inbox: [
    { kind: 'path', d: 'M3 13h5l1.5 3h5L16 13h5' },
    { kind: 'path', d: 'M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z' },
  ],
  flame: [
    {
      kind: 'path',
      d: 'M12 2.5c1 3.5 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2.4 1.2-3.8 2.5-5 .3 1.6 1 2.6 2 3 0-3 .5-5.5.5-8.5z',
    },
  ],
  repeat: [
    { kind: 'path', d: 'M17 2l4 4-4 4' },
    { kind: 'path', d: 'M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4' },
    { kind: 'path', d: 'M21 13v2a3 3 0 0 1-3 3H3' },
  ],
  bookmark: [{ kind: 'path', d: 'M6 3h12v18l-6-4-6 4z' }],
  link: [
    { kind: 'path', d: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7' },
    { kind: 'path', d: 'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7' },
  ],
  more: [
    { kind: 'circle', cx: 5, cy: 12, r: 1.2, fill: 'solid' },
    { kind: 'circle', cx: 12, cy: 12, r: 1.2, fill: 'solid' },
    { kind: 'circle', cx: 19, cy: 12, r: 1.2, fill: 'solid' },
  ],
  alert: [
    { kind: 'circle', cx: 12, cy: 12, r: 9 },
    { kind: 'path', d: 'M12 8v4.5M12 16h.01' },
  ],
};
