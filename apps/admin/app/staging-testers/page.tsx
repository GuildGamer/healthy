'use client';

import type {
  SetStagingTesterGrantEnabledInput,
  UpsertStagingTesterGrantInput,
} from '@product/contract';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export default function StagingTestersPage() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  const listQuery = useQuery({
    queryKey: ['admin', 'staging-testers'],
    queryFn: () => adminApi.listStagingTesterGrants(),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'staging-testers'] });
  };

  const upsertMutation = useMutation({
    mutationFn: (input: UpsertStagingTesterGrantInput) =>
      adminApi.upsertStagingTesterGrant(input),
    onSuccess: async () => {
      setEmail('');
      setNote('');
      await invalidate();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (input: SetStagingTesterGrantEnabledInput) =>
      adminApi.setStagingTesterGrantEnabled(input),
    onSuccess: () => invalidate(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteStagingTesterGrant({ id }),
    onSuccess: () => invalidate(),
  });

  const items = listQuery.data?.items ?? [];

  return (
    <Shell>
      <div className="page stack">
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Staging testers</h1>
        <p className="muted">
          Only honored when the API <code>NODE_ENV</code> is <code>staging</code>.
          Each enabled email gets free membership on staging without payment.
          Toggling off revokes access immediately.
        </p>

        <form
          className="card stack"
          onSubmit={(event) => {
            event.preventDefault();
            upsertMutation.mutate({
              email: email.trim(),
              enabled: true,
              note: note.trim() ? note.trim() : null,
            });
          }}
        >
          <strong>Add tester</strong>
          <div className="row">
            <input
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tester@example.com"
              required
              type="email"
              value={email}
            />
            <input
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional note"
              value={note}
            />
            <button className="btn btn-primary" type="submit">
              Add
            </button>
          </div>
          {upsertMutation.error ? (
            <p className="error">
              {errorMessage(upsertMutation.error, 'Could not save tester')}
            </p>
          ) : null}
        </form>

        {listQuery.error ? (
          <p className="error">
            {errorMessage(listQuery.error, 'Could not load staging testers')}
          </p>
        ) : null}

        <div className="card">
          {listQuery.isPending ? (
            <p className="muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="muted">No staging testers yet. Add an email above.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Note</th>
                  <th>Access</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.email}</td>
                    <td>{row.note ?? '—'}</td>
                    <td>
                      <button
                        className={row.enabled ? 'btn btn-primary' : 'btn btn-ghost'}
                        disabled={toggleMutation.isPending}
                        onClick={() =>
                          toggleMutation.mutate({
                            id: row.id,
                            enabled: !row.enabled,
                          })
                        }
                        type="button"
                      >
                        {row.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td>{new Date(row.updatedAt).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remove ${row.email} from staging tester access?`,
                            )
                          ) {
                            deleteMutation.mutate(row.id);
                          }
                        }}
                        type="button"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {toggleMutation.error ? (
            <p className="error">
              {errorMessage(toggleMutation.error, 'Could not update access')}
            </p>
          ) : null}
          {deleteMutation.error ? (
            <p className="error">
              {errorMessage(deleteMutation.error, 'Could not remove tester')}
            </p>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
