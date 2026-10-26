import {
  isSheetDismissal,
  isSheetPull,
  SHEET_DISMISS_DISTANCE,
  SHEET_DISMISS_VELOCITY,
} from './sheet-drag';

describe('isSheetPull', () => {
  const pull = { dx: 2, dy: 20, scrollOffsetY: 0, canDismiss: true };

  it('takes a downward pull when the content is at the top', () => {
    expect(isSheetPull(pull)).toBe(true);
  });

  it('leaves the content to scroll back up first', () => {
    expect(isSheetPull({ ...pull, scrollOffsetY: 40 })).toBe(false);
  });

  it('leaves taps, upward drags and sideways swipes alone', () => {
    expect(isSheetPull({ ...pull, dy: 4 })).toBe(false);
    expect(isSheetPull({ ...pull, dy: -20 })).toBe(false);
    expect(isSheetPull({ ...pull, dx: 30, dy: 20 })).toBe(false);
  });

  it('never moves a sheet that must stay, such as mid-save', () => {
    expect(isSheetPull({ ...pull, canDismiss: false })).toBe(false);
  });
});

describe('isSheetDismissal', () => {
  it('closes after a long pull or a quick flick', () => {
    expect(isSheetDismissal({ dy: SHEET_DISMISS_DISTANCE + 1, vy: 0 })).toBe(true);
    expect(isSheetDismissal({ dy: 30, vy: SHEET_DISMISS_VELOCITY + 0.2 })).toBe(true);
  });

  it('springs back after a short, slow pull', () => {
    expect(isSheetDismissal({ dy: 60, vy: 0.2 })).toBe(false);
  });
});
