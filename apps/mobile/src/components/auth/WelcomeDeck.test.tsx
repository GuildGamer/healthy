import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import {
  WELCOME_DECK_DEAL_MS,
  WELCOME_DECK_DWELL_MS,
  WELCOME_DECK_SETTLE_MS,
} from './constants/welcome-deck';
import { WelcomeDeck } from './WelcomeDeck';

const DEAL_SETTLED_MS = Math.max(WELCOME_DECK_DEAL_MS, WELCOME_DECK_SETTLE_MS) + 50;

async function renderDeck() {
  render(<WelcomeDeck />);
  await act(async () => undefined);
  return screen.getByTestId('welcome-deck');
}

function advance(milliseconds: number) {
  act(() => {
    jest.advanceTimersByTime(milliseconds);
  });
}

/**
 * The touch and accessibility handlers are called directly: the testing
 * library skips events on a view whose responder declines touch start, which
 * the swipe handlers do so the page can still scroll.
 */
describe('WelcomeDeck', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('reads as one element listing the examples', async () => {
    const deck = await renderDeck();

    expect(deck).toHaveAccessibleName(
      'Examples of daily challenges: Most push-ups by Sunday, Longest plank wins, Gym vs office: squats',
    );
    expect(deck.props.accessibilityValue).toEqual({ text: 'Most push-ups by Sunday, 1 of 3' });
  });

  it('deals the next example after the dwell', async () => {
    const deck = await renderDeck();

    advance(WELCOME_DECK_DWELL_MS + DEAL_SETTLED_MS);

    expect(deck.props.accessibilityValue).toEqual({ text: 'Longest plank wins, 2 of 3' });
  });

  it('holds the top card while it is touched', async () => {
    const deck = await renderDeck();

    act(() => {
      deck.props.onTouchStart();
    });
    advance(WELCOME_DECK_DWELL_MS * 2);

    expect(deck.props.accessibilityValue).toEqual({ text: 'Most push-ups by Sunday, 1 of 3' });
  });

  it('deals on the Next example action', async () => {
    const deck = await renderDeck();

    act(() => {
      deck.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
    });
    advance(DEAL_SETTLED_MS);

    expect(deck.props.accessibilityValue).toEqual({ text: 'Longest plank wins, 2 of 3' });
  });

  it('does not advance by itself with Reduce Motion on', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const deck = await renderDeck();

    advance(WELCOME_DECK_DWELL_MS * 2);

    expect(deck.props.accessibilityValue).toEqual({ text: 'Most push-ups by Sunday, 1 of 3' });
  });
});
