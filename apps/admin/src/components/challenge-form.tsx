'use client';

import type { UpsertAdminChallengeInput } from '@product/contract';
import { useState } from 'react';

const empty: UpsertAdminChallengeInput = {
  slug: '',
  title: '',
  description: '',
  instruction: '',
  category: 'general',
  icon: 'checkbox-marked-circle-outline',
  rewardPoints: 100,
  defaultFrequency: 'daily',
  isDefault: false,
  requiresMembership: false,
  isActive: true,
  completionKind: 'check_in',
  captureKind: 'self_report',
  deviceMetric: null,
  targetDurationMinutes: null,
  targetDistanceMeters: null,
  targetCount: null,
  surpriseEvidenceChancePercent: 0,
  surpriseEvidenceWindowSeconds: 60,
  surpriseEvidencePenaltyPoints: 25,
};

export function ChallengeForm({
  initial,
  onSubmit,
  pending,
}: {
  initial?: UpsertAdminChallengeInput;
  onSubmit: (input: UpsertAdminChallengeInput) => void;
  pending: boolean;
}) {
  const [value, setValue] = useState<UpsertAdminChallengeInput>(
    initial ?? empty,
  );

  function set<K extends keyof UpsertAdminChallengeInput>(
    key: K,
    next: UpsertAdminChallengeInput[K],
  ) {
    setValue((current) => ({ ...current, [key]: next }));
  }

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      <div className="row">
        <label>
          Title
          <input onChange={(e) => set('title', e.target.value)} value={value.title} />
        </label>
        <label>
          Slug
          <input onChange={(e) => set('slug', e.target.value)} value={value.slug} />
        </label>
      </div>
      <label>
        Description
        <textarea
          onChange={(e) => set('description', e.target.value)}
          value={value.description}
        />
      </label>
      <label>
        Instruction
        <textarea
          onChange={(e) => set('instruction', e.target.value)}
          value={value.instruction}
        />
      </label>
      <div className="row">
        <label>
          Category
          <select
            onChange={(e) =>
              set('category', e.target.value as UpsertAdminChallengeInput['category'])
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
          Frequency
          <select
            onChange={(e) =>
              set(
                'defaultFrequency',
                e.target.value as UpsertAdminChallengeInput['defaultFrequency'],
              )
            }
            value={value.defaultFrequency}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label>
          Reward points
          <input
            onChange={(e) => set('rewardPoints', Number(e.target.value))}
            type="number"
            value={value.rewardPoints}
          />
        </label>
        <label>
          Icon
          <input onChange={(e) => set('icon', e.target.value)} value={value.icon} />
        </label>
      </div>
      <div className="row">
        <label>
          Completion
          <select
            onChange={(e) =>
              set(
                'completionKind',
                e.target.value as UpsertAdminChallengeInput['completionKind'],
              )
            }
            value={value.completionKind}
          >
            <option value="check_in">Check-in</option>
            <option value="vitals_bp">Blood pressure</option>
            <option value="evidence_photo">Gym photo</option>
            <option value="glucose">Glucose</option>
            <option value="peak_flow">Peak flow</option>
            <option value="water">Water</option>
            <option value="carbs">Carbs</option>
          </select>
        </label>
        <label>
          Capture
          <select
            onChange={(e) =>
              set(
                'captureKind',
                e.target.value as UpsertAdminChallengeInput['captureKind'],
              )
            }
            value={value.captureKind}
          >
            <option value="self_report">Self-report</option>
            <option value="structured_log">Structured log</option>
            <option value="photo">Photo</option>
            <option value="device_sample">Device sample</option>
            <option value="device_session">Device session</option>
          </select>
        </label>
        <label>
          Device metric
          <select
            onChange={(e) =>
              set(
                'deviceMetric',
                e.target.value === ''
                  ? null
                  : (e.target.value as NonNullable<
                      UpsertAdminChallengeInput['deviceMetric']
                    >),
              )
            }
            value={value.deviceMetric ?? ''}
          >
            <option value="">None</option>
            <option value="walk">Walk</option>
            <option value="run">Run</option>
            <option value="cycle">Cycle</option>
            <option value="steps">Steps</option>
            <option value="sleep">Sleep</option>
            <option value="weight">Weight</option>
            <option value="heart_rate">Heart rate</option>
            <option value="pushups">Push-ups</option>
          </select>
        </label>
      </div>
      <div className="row">
        <label>
          Target minutes
          <input
            onChange={(e) =>
              set(
                'targetDurationMinutes',
                e.target.value ? Number(e.target.value) : null,
              )
            }
            type="number"
            value={value.targetDurationMinutes ?? ''}
          />
        </label>
        <label>
          Target metres
          <input
            onChange={(e) =>
              set(
                'targetDistanceMeters',
                e.target.value ? Number(e.target.value) : null,
              )
            }
            type="number"
            value={value.targetDistanceMeters ?? ''}
          />
        </label>
        <label>
          Target count
          <input
            onChange={(e) =>
              set('targetCount', e.target.value ? Number(e.target.value) : null)
            }
            type="number"
            value={value.targetCount ?? ''}
          />
        </label>
      </div>
      <div className="row">
        <label>
          Surprise chance %
          <input
            onChange={(e) =>
              set('surpriseEvidenceChancePercent', Number(e.target.value))
            }
            type="number"
            value={value.surpriseEvidenceChancePercent}
          />
        </label>
        <label>
          Surprise window (sec)
          <input
            onChange={(e) =>
              set('surpriseEvidenceWindowSeconds', Number(e.target.value))
            }
            type="number"
            value={value.surpriseEvidenceWindowSeconds}
          />
        </label>
        <label>
          Surprise penalty
          <input
            onChange={(e) =>
              set('surpriseEvidencePenaltyPoints', Number(e.target.value))
            }
            type="number"
            value={value.surpriseEvidencePenaltyPoints}
          />
        </label>
      </div>
      <div className="row">
        <label>
          <span>
            <input
              checked={value.isDefault}
              onChange={(e) => set('isDefault', e.target.checked)}
              type="checkbox"
            />{' '}
            Default for category
          </span>
        </label>
        <label>
          <span>
            <input
              checked={value.requiresMembership}
              onChange={(e) => set('requiresMembership', e.target.checked)}
              type="checkbox"
            />{' '}
            Requires membership
          </span>
        </label>
        <label>
          <span>
            <input
              checked={value.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
              type="checkbox"
            />{' '}
            Active
          </span>
        </label>
      </div>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? 'Saving…' : 'Save challenge'}
      </button>
    </form>
  );
}
