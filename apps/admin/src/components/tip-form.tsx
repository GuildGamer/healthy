'use client';

import type { UpsertAdminTipInput } from '@product/contract';
import { useState } from 'react';

const empty: UpsertAdminTipInput = {
  slug: '',
  category: 'general',
  title: '',
  body: '',
  isActive: true,
  sortOrder: 0,
  challengeSlug: null,
  activityKey: null,
  source: null,
  sourceUrl: null,
};

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function TipForm({
  initial,
  onSubmit,
  pending,
}: {
  initial?: UpsertAdminTipInput;
  onSubmit: (input: UpsertAdminTipInput) => void;
  pending: boolean;
}) {
  const [value, setValue] = useState<UpsertAdminTipInput>(initial ?? empty);

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      <label>
        Title
        <input
          onChange={(event) =>
            setValue((current) => ({ ...current, title: event.target.value }))
          }
          value={value.title}
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
        Body
        <textarea
          onChange={(event) =>
            setValue((current) => ({ ...current, body: event.target.value }))
          }
          value={value.body}
        />
      </label>
      <label>
        Challenge slug
        <input
          onChange={(event) =>
            setValue((current) => ({
              ...current,
              challengeSlug: optionalText(event.target.value),
            }))
          }
          placeholder="twenty-push-ups"
          value={value.challengeSlug ?? ''}
        />
      </label>
      <label>
        Activity key
        <input
          onChange={(event) =>
            setValue((current) => ({
              ...current,
              activityKey: optionalText(event.target.value),
            }))
          }
          placeholder="pushups"
          value={value.activityKey ?? ''}
        />
      </label>
      <label>
        Source
        <input
          onChange={(event) =>
            setValue((current) => ({
              ...current,
              source: optionalText(event.target.value),
            }))
          }
          placeholder="WHO physical activity"
          value={value.source ?? ''}
        />
      </label>
      <label>
        Source URL
        <input
          onChange={(event) =>
            setValue((current) => ({
              ...current,
              sourceUrl: optionalText(event.target.value),
            }))
          }
          placeholder="https://…"
          value={value.sourceUrl ?? ''}
        />
      </label>
      <div className="row">
        <label>
          Category
          <select
            onChange={(event) =>
              setValue((current) => ({
                ...current,
                category: event.target.value as UpsertAdminTipInput['category'],
              }))
            }
            value={value.category}
          >
            <option value="hypertension">Blood pressure</option>
            <option value="diabetes">Blood sugar</option>
            <option value="asthma">Breathing</option>
            <option value="general">Everyday</option>
          </select>
        </label>
        <label>
          Sort order
          <input
            onChange={(event) =>
              setValue((current) => ({
                ...current,
                sortOrder: Number(event.target.value),
              }))
            }
            type="number"
            value={value.sortOrder}
          />
        </label>
        <label>
          <span>
            <input
              checked={value.isActive}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
              type="checkbox"
            />{' '}
            Active
          </span>
        </label>
      </div>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? 'Saving…' : 'Save tip'}
      </button>
    </form>
  );
}
