'use client';

import {
  MEMBERSHIP_DEFAULT_MARKET,
  formatMembershipAmount,
  type MembershipPaymentMethodId,
  type UpsertMembershipPlanInput,
} from '@product/contract';
import { useMemo, useState } from 'react';

const empty: UpsertMembershipPlanInput = {
  slug: 'healthy-starter',
  name: 'Healthy',
  tagline: 'Keep the streak honest. One clear membership.',
  features: [
    'Full challenge catalog for your conditions',
    'Pose, steps, and gym challenges',
    'Up to five reminders per challenge',
    'Finish-what-you-started nudges',
  ],
  interval: 'month',
  isActive: true,
  sortOrder: 0,
  headline: 'Stay a step ahead',
  ctaLabel: null,
  paymentMethodIds: [],
  prices: [
    { marketKey: 'NG', currency: 'NGN', amountMinor: 100_000 },
    { marketKey: MEMBERSHIP_DEFAULT_MARKET, currency: 'USD', amountMinor: 200 },
  ],
};

const METHOD_OPTIONS: { id: MembershipPaymentMethodId; label: string }[] = [
  { id: 'apple_pay', label: 'Apple Pay' },
  { id: 'google_pay', label: 'Google Pay' },
  { id: 'card', label: 'Card' },
  { id: 'bank_transfer', label: 'Bank transfer' },
  { id: 'ussd', label: 'USSD' },
];

export function MembershipPlanForm({
  initial,
  onSubmit,
  pending,
}: {
  initial?: UpsertMembershipPlanInput;
  onSubmit: (input: UpsertMembershipPlanInput) => void;
  pending: boolean;
}) {
  const [value, setValue] = useState<UpsertMembershipPlanInput>(
    initial ?? empty,
  );
  const [previewMarket, setPreviewMarket] = useState<'NG' | typeof MEMBERSHIP_DEFAULT_MARKET>(
    'NG',
  );

  const previewPrice = useMemo(() => {
    return (
      value.prices.find((price) => price.marketKey === previewMarket) ??
      value.prices.find((price) => price.marketKey === MEMBERSHIP_DEFAULT_MARKET) ??
      value.prices[0]
    );
  }, [previewMarket, value.prices]);

  const ngPrice = value.prices.find((price) => price.marketKey === 'NG');
  const usdPrice = value.prices.find(
    (price) => price.marketKey === MEMBERSHIP_DEFAULT_MARKET,
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 340px)',
        gap: 24,
        alignItems: 'start',
      }}
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(value);
        }}
      >
        <label>
          Name
          <input
            onChange={(event) =>
              setValue((current) => ({ ...current, name: event.target.value }))
            }
            value={value.name}
          />
        </label>
        <label>
          Slug
          <input
            onChange={(event) =>
              setValue((current) => ({ ...current, slug: event.target.value }))
            }
            value={value.slug}
          />
        </label>
        <label>
          Headline
          <input
            onChange={(event) =>
              setValue((current) => ({
                ...current,
                headline: event.target.value || null,
              }))
            }
            value={value.headline ?? ''}
          />
        </label>
        <label>
          Tagline
          <input
            onChange={(event) =>
              setValue((current) => ({ ...current, tagline: event.target.value }))
            }
            value={value.tagline}
          />
        </label>
        <label>
          Features (one per line)
          <textarea
            onChange={(event) =>
              setValue((current) => ({
                ...current,
                features: event.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean),
              }))
            }
            rows={5}
            value={value.features.join('\n')}
          />
        </label>
        <div className="row">
          <label>
            Interval
            <select
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  interval: event.target.value as 'month' | 'year',
                }))
              }
              value={value.interval}
            >
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </label>
          <label>
            Sort
            <input
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  sortOrder: Number(event.target.value) || 0,
                }))
              }
              type="number"
              value={value.sortOrder}
            />
          </label>
        </div>
        <label>
          CTA label (optional)
          <input
            onChange={(event) =>
              setValue((current) => ({
                ...current,
                ctaLabel: event.target.value || null,
              }))
            }
            placeholder="Leave blank to use Pay {amount}"
            value={value.ctaLabel ?? ''}
          />
        </label>
        <div className="row">
          <label>
            Nigeria (kobo)
            <input
              onChange={(event) => {
                const amountMinor = Number(event.target.value) || 0;
                setValue((current) => ({
                  ...current,
                  prices: [
                    {
                      marketKey: 'NG',
                      currency: 'NGN',
                      amountMinor,
                    },
                    ...(current.prices.filter((price) => price.marketKey !== 'NG') ),
                  ],
                }));
              }}
              type="number"
              value={ngPrice?.amountMinor ?? 100_000}
            />
          </label>
          <label>
            Default USD (cents)
            <input
              onChange={(event) => {
                const amountMinor = Number(event.target.value) || 0;
                setValue((current) => ({
                  ...current,
                  prices: [
                    ...(current.prices.filter(
                      (price) => price.marketKey !== MEMBERSHIP_DEFAULT_MARKET,
                    )),
                    {
                      marketKey: MEMBERSHIP_DEFAULT_MARKET,
                      currency: 'USD',
                      amountMinor,
                    },
                  ],
                }));
              }}
              type="number"
              value={usdPrice?.amountMinor ?? 200}
            />
          </label>
        </div>
        <fieldset className="stack" style={{ border: 'none', padding: 0 }}>
          <legend className="muted">Payment methods (empty = regional defaults)</legend>
          {METHOD_OPTIONS.map((option) => {
            const checked = value.paymentMethodIds.includes(option.id);
            return (
              <label key={option.id} style={{ display: 'flex', gap: 8 }}>
                <input
                  checked={checked}
                  onChange={() =>
                    setValue((current) => ({
                      ...current,
                      paymentMethodIds: checked
                        ? current.paymentMethodIds.filter((id) => id !== option.id)
                        : [...current.paymentMethodIds, option.id],
                    }))
                  }
                  type="checkbox"
                />
                {option.label}
              </label>
            );
          })}
        </fieldset>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            checked={value.isActive}
            onChange={(event) =>
              setValue((current) => ({
                ...current,
                isActive: event.target.checked,
              }))
            }
            type="checkbox"
          />
          Active
        </label>
        <button className="btn btn-primary" disabled={pending} type="submit">
          {pending ? 'Saving…' : 'Save plan'}
        </button>
      </form>

      <div className="stack">
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn"
            onClick={() => setPreviewMarket('NG')}
            type="button"
          >
            Preview NG
          </button>
          <button
            className="btn"
            onClick={() => setPreviewMarket(MEMBERSHIP_DEFAULT_MARKET)}
            type="button"
          >
            Preview USD
          </button>
        </div>
        <div
          style={{
            background: '#0B1220',
            color: '#F4F7FB',
            borderRadius: 24,
            padding: 20,
            minHeight: 520,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div>
            <p
              style={{
                color: '#3DDC97',
                fontSize: 12,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                margin: '0 0 6px',
              }}
            >
              Membership
            </p>
            <h2
              style={{
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: 24,
                margin: '0 0 6px',
                lineHeight: 1.2,
              }}
            >
              {value.headline || value.name}
            </h2>
            <p style={{ margin: 0 }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: '#3DDC97',
                }}
              >
                {previewPrice
                  ? formatMembershipAmount(
                      previewPrice.currency,
                      previewPrice.amountMinor,
                    )
                  : '—'}
              </span>
              <span style={{ color: '#9AA8BF', fontSize: 13 }}>
                {' '}
                {value.interval === 'month' ? 'per month' : 'per year'}.{' '}
                {previewMarket === 'NG' ? 'Nigeria' : 'USD'}.
              </span>
            </p>
            <p
              style={{
                color: '#9AA8BF',
                margin: '8px 0 0',
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              {value.tagline}
            </p>
            <ul
              style={{
                listStyle: 'none',
                margin: '10px 0 0',
                padding: 0,
                display: 'grid',
                gap: 6,
              }}
            >
              {value.features.map((feature) => (
                <li
                  key={feature}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    fontSize: 13,
                    color: '#F4F7FB',
                  }}
                >
                  <span style={{ color: '#3DDC97' }}>✦</span>
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: '#F4F7FB',
              }}
            >
              Pay the way that fits you
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              {(previewMarket === 'NG'
                ? [
                    { label: 'Card', hint: 'Visa or Mastercard' },
                    { label: 'Bank transfer', hint: 'Pay into account' },
                    { label: 'USSD', hint: 'Dial from your phone' },
                    { label: 'Apple Pay', hint: 'Face ID or Touch ID' },
                    { label: 'Google Pay', hint: 'One tap' },
                  ]
                : [
                    { label: 'Apple Pay', hint: 'Face ID or Touch ID' },
                    { label: 'Google Pay', hint: 'One tap' },
                    { label: 'Card', hint: 'Visa or Mastercard' },
                  ]
              ).map((method, index) => (
                <div
                  key={method.label}
                  style={{
                    padding: '12px 12px',
                    borderRadius: 16,
                    background: index === 0 ? '#163528' : '#121A2B',
                    border:
                      index === 0 ? '2px solid #3DDC97' : '2px solid transparent',
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: index === 0 ? '#3DDC97' : '#F4F7FB',
                    }}
                  >
                    {method.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#9AA8BF', marginTop: 2 }}>
                    {method.hint}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            style={{
              width: '100%',
              border: 'none',
              borderRadius: 20,
              padding: '14px 16px',
              background: '#3DDC97',
              color: '#0B1220',
              fontWeight: 700,
            }}
            type="button"
          >
            {value.ctaLabel ||
              (previewPrice
                ? `Pay ${formatMembershipAmount(
                    previewPrice.currency,
                    previewPrice.amountMinor,
                  )}`
                : 'Pay')}
          </button>
        </div>
      </div>
    </div>
  );
}
