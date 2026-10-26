/** A pull past this many points closes the sheet; anything shorter springs back. */
export const SHEET_DISMISS_DISTANCE = 120;
/** A quick flick closes it however short the pull. */
export const SHEET_DISMISS_VELOCITY = 1;
/** Below this, a touch is still a tap on a row or a button. */
const DRAG_SLOP = 8;

interface PullStart {
  dx: number;
  dy: number;
  /** How far the sheet's content is scrolled; the sheet only moves once it is back at the top. */
  scrollOffsetY: number;
  canDismiss: boolean;
}

/** A mostly vertical, downward pull on a sheet whose content is at the top. */
export function isSheetPull({ dx, dy, scrollOffsetY, canDismiss }: PullStart): boolean {
  return canDismiss && scrollOffsetY <= 0 && dy > DRAG_SLOP && dy > Math.abs(dx) * 1.5;
}

export function isSheetDismissal({ dy, vy }: { dy: number; vy: number }): boolean {
  return dy > SHEET_DISMISS_DISTANCE || vy > SHEET_DISMISS_VELOCITY;
}
