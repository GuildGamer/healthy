import type { MatchBoard, MatchHonor, MatchHonorKind } from '@product/client';
import { resultShareLine } from './group-history';
import { HONOR_PRIMARY_ORDER } from './honor-primary-order';

export type HonorCarouselSlide =
  | { type: 'honor'; honor: MatchHonor; isYours: boolean }
  | { type: 'recap' }
  | { type: 'board' };

const KIND_ORDER: readonly MatchHonorKind[] = [
  'champion',
  'comeback',
  'fastest_set',
  'best_set',
  'biggest_day',
  'photo_finish',
  'first_score',
  'iron_week',
];

function sortByKind(honors: readonly MatchHonor[]): MatchHonor[] {
  return [...honors].sort(
    (left, right) => KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind),
  );
}

function primaryMine(mine: readonly MatchHonor[]): MatchHonor | null {
  for (const kind of HONOR_PRIMARY_ORDER) {
    const hit = mine.find((row) => row.kind === kind);
    if (hit) {
      return hit;
    }
  }
  return null;
}

/**
 * Builds the result-screen carousel. Viewer with an honor opens on that
 * poster; everyone else opens on the group recap.
 */
export function honorCarouselSlides(board: MatchBoard, viewerId: string): HonorCarouselSlide[] {
  const honors = board.honors ?? [];
  const mine = honors.filter((row) => row.userId === viewerId);
  const others = sortByKind(honors.filter((row) => row.userId !== viewerId));
  const primary = primaryMine(mine);
  const slides: HonorCarouselSlide[] = [];

  if (primary) {
    slides.push({ type: 'honor', honor: primary, isYours: true });
    const second = mine.find((row) => row.kind !== primary.kind);
    if (second) {
      slides.push({ type: 'honor', honor: second, isYours: true });
    }
    for (const honor of others) {
      slides.push({ type: 'honor', honor, isYours: false });
    }
    slides.push({ type: 'recap' });
    if (honors.length >= 2 || mine.length > 0) {
      slides.push({ type: 'board' });
    }
    return slides;
  }

  slides.push({ type: 'recap' });
  for (const honor of others) {
    slides.push({ type: 'honor', honor, isYours: false });
  }
  if (honors.length >= 1) {
    slides.push({ type: 'board' });
  }
  return slides;
}

export function honorSlideShareText(board: MatchBoard, slide: HonorCarouselSlide): string {
  if (slide.type === 'honor') {
    return slide.honor.shareText;
  }
  if (slide.type === 'board') {
    return 'Our group honors on Healthy.';
  }
  return resultShareLine(board);
}
