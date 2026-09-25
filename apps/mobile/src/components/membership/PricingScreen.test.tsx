import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Metrics } from 'react-native-safe-area-context';
import { isAppleIapNativeAvailable } from '@/lib/apple-membership';
import { apiClient } from '@/lib/api';
import { PricingScreen } from './PricingScreen';

jest.mock('@product/contract', () => ({
  formatMembershipAmount: (currency: string, amountMinor: number) =>
    currency === 'NGN'
      ? `₦${Math.trunc(amountMinor / 100)}`
      : `$${(amountMinor / 100).toFixed(2)}`,
}));

jest.mock('@/lib/apple-membership', () => {
  const actual = jest.requireActual('@/lib/apple-membership') as typeof import('@/lib/apple-membership');
  return {
    ...actual,
    isAppleIapNativeAvailable: jest.fn(() => true),
  };
});

const offer = {
  planId: 'plan-month',
  slug: 'healthy-starter',
  name: 'Healthy',
  tagline: 'Monthly',
  features: ['Full catalog'],
  interval: 'month' as const,
  headline: 'Stay a step ahead',
  ctaLabel: null,
  countryCode: 'NG' as const,
  marketKey: 'NG',
  currency: 'NGN' as const,
  amountMinor: 100_000,
  paymentMethods: [
    { id: 'card' as const, label: 'Card', hint: 'Visa or Mastercard' },
  ],
  hasMembership: false,
  currentSubscription: null,
  appleProductId: 'com.healthyapp.app.premium.month',
  plans: [
    {
      planId: 'plan-month',
      slug: 'healthy-starter',
      name: 'Healthy',
      tagline: 'Monthly',
      features: ['Full catalog'],
      interval: 'month' as const,
      headline: 'Stay a step ahead',
      ctaLabel: null,
      currency: 'NGN' as const,
      amountMinor: 100_000,
      appleProductId: 'com.healthyapp.app.premium.month',
    },
  ],
};

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    getMembershipOffer: jest.fn(async () => offer),
    syncApplePurchase: jest.fn(),
  },
  apiQuery: {},
}));

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderPricing(os: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={client}>
      <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
        <PricingScreen onClose={jest.fn()} />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
}

describe('PricingScreen Apple IAP', () => {
  it('hides method chips on iOS and shows Subscribe plus Restore', async () => {
    renderPricing('ios');

    expect(await screen.findByTestId('pricing-pay')).toBeOnTheScreen();
    expect(screen.getByText('Subscribe')).toBeOnTheScreen();
    expect(screen.getByTestId('pricing-restore')).toBeOnTheScreen();
    expect(screen.queryByTestId('pricing-method-card')).toBeNull();
  });

  it('keeps method chips and the checkout stub on Android', async () => {
    renderPricing('android');

    expect(await screen.findByTestId('pricing-method-card')).toBeOnTheScreen();
    expect(screen.queryByTestId('pricing-restore')).toBeNull();
    fireEvent.press(screen.getByTestId('pricing-pay'));
    expect(
      screen.getByText(
        'Payments are almost ready. Your plan and methods are saved. Checkout lands next.',
      ),
    ).toBeOnTheScreen();
  });

  it('keeps Subscribe and Restore visible when StoreKit is not linked', async () => {
    jest.mocked(isAppleIapNativeAvailable).mockReturnValueOnce(false);
    renderPricing('ios');

    expect(await screen.findByTestId('pricing-pay')).toBeOnTheScreen();
    expect(screen.getByTestId('pricing-restore')).toBeOnTheScreen();
    expect(
      screen.queryByText(
        'This iOS install cannot take Apple payments yet. Rebuild the app and open it again.',
      ),
    ).toBeNull();

    fireEvent.press(screen.getByTestId('pricing-pay'));
    expect(
      screen.getByText(
        'This iOS install cannot take Apple payments yet. Rebuild the app and open it again.',
      ),
    ).toBeOnTheScreen();
  });

  it('keeps Subscribe enabled when the offer has no Apple product id', async () => {
    jest.mocked(apiClient.getMembershipOffer).mockResolvedValueOnce({
      ...offer,
      appleProductId: null,
      plans: offer.plans.map((plan) => ({ ...plan, appleProductId: null })),
    });

    renderPricing('ios');

    const subscribe = await screen.findByTestId('pricing-pay');
    expect(subscribe.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false }),
    );
  });
});
