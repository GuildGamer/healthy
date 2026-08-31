'use client';

import type {
  AdjustAdminMemberPointsInput,
  SetAdminMemberActiveInput,
} from '@product/contract';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export default function MembersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [selectedEmail, setSelectedEmail] = useState('');
  const [pointsDelta, setPointsDelta] = useState('10');
  const [reason, setReason] = useState('');

  const listQuery = useQuery({
    queryKey: ['admin', 'members', submitted],
    queryFn: () =>
      adminApi.listMembers(submitted ? { query: submitted } : undefined),
  });

  const lookup = useQuery({
    queryKey: ['admin', 'member', selectedEmail],
    queryFn: () => adminApi.lookupMember({ email: selectedEmail }),
    enabled: selectedEmail.length > 0,
  });

  const member = lookup.data?.member;
  const members = listQuery.data?.members ?? [];
  const selectedId = member?.id;

  const invalidateMember = async () => {
    await Promise.all([
      lookup.refetch(),
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] }),
    ]);
  };

  const pointsMutation = useMutation({
    mutationFn: (input: AdjustAdminMemberPointsInput) =>
      adminApi.adjustMemberPoints(input),
    onSuccess: () => invalidateMember(),
  });
  const activeMutation = useMutation({
    mutationFn: (input: SetAdminMemberActiveInput) =>
      adminApi.setMemberActive(input),
    onSuccess: () => invalidateMember(),
  });

  const emptyCopy = useMemo(() => {
    if (listQuery.isPending) {
      return 'Loading members…';
    }

    if (submitted) {
      return 'No members match that search.';
    }

    return 'No members have signed up yet.';
  }, [listQuery.isPending, submitted]);

  return (
    <Shell>
      <div className="page stack">
        <h1 style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Members</h1>
        <form
          className="row"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(search.trim());
          }}
        >
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email"
            value={search}
          />
          <button className="btn btn-primary" type="submit">
            Search
          </button>
          {submitted ? (
            <button
              className="btn btn-ghost"
              onClick={() => {
                setSearch('');
                setSubmitted('');
              }}
              type="button"
            >
              Clear
            </button>
          ) : null}
        </form>
        {listQuery.error ? (
          <p className="error">
            {errorMessage(listQuery.error, 'Could not load members')}
          </p>
        ) : null}
        <div className="card">
          <p className="muted">
            {listQuery.data
              ? `${listQuery.data.totalCount} member${listQuery.data.totalCount === 1 ? '' : 's'}`
              : ' '}
          </p>
          {members.length === 0 ? (
            <p className="muted">{emptyCopy}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Points</th>
                  <th>Streak</th>
                  <th>Categories</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button
                        className="btn btn-ghost"
                        onClick={() => setSelectedEmail(row.email)}
                        type="button"
                      >
                        {row.displayName || row.name || 'Unnamed'}
                      </button>
                    </td>
                    <td>{row.email}</td>
                    <td>{row.pointsBalance}</td>
                    <td>{row.currentStreakDays}</td>
                    <td>{row.categories.join(', ') || '—'}</td>
                    <td>{row.deactivatedAt ? 'Deactivated' : 'Active'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {lookup.error ? (
          <p className="error">{errorMessage(lookup.error, 'Member not found')}</p>
        ) : null}
        {member && selectedId ? (
          <>
            <div className="card stack">
              <strong>{member.displayName}</strong>
              <span className="muted">{member.email}</span>
              <p>
                {member.pointsBalance} points · {member.currentStreakDays} day streak
                {member.deactivatedAt ? ' · deactivated' : ''}
              </p>
              <p className="muted">
                {member.categories.join(', ') || 'No categories'} ·{' '}
                {member.countryCode ?? '—'} · {member.timeZone}
              </p>
              <form
                className="row"
                onSubmit={(event) => {
                  event.preventDefault();
                  pointsMutation.mutate({
                    userId: member.id,
                    delta: Number(pointsDelta),
                    reason,
                  });
                }}
              >
                <input
                  onChange={(event) => setPointsDelta(event.target.value)}
                  type="number"
                  value={pointsDelta}
                />
                <input
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Reason"
                  value={reason}
                />
                <button className="btn btn-primary" type="submit">
                  Adjust points
                </button>
              </form>
              {pointsMutation.error ? (
                <p className="error">
                  {errorMessage(pointsMutation.error, 'Could not adjust points')}
                </p>
              ) : null}
              <button
                className={member.deactivatedAt ? 'btn btn-primary' : 'btn btn-danger'}
                onClick={() =>
                  activeMutation.mutate({
                    userId: member.id,
                    isActive: Boolean(member.deactivatedAt),
                    reason: reason || 'Support request',
                  })
                }
                type="button"
              >
                {member.deactivatedAt ? 'Reactivate' : 'Deactivate'}
              </button>
            </div>
            <div className="card">
              <h2>Recent completions</h2>
              <table>
                <thead>
                  <tr>
                    <th>Challenge</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Outcome</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {(lookup.data?.occurrences ?? []).map((occurrence) => (
                    <tr key={occurrence.id}>
                      <td>{occurrence.title}</td>
                      <td>{occurrence.periodKey}</td>
                      <td>{occurrence.status}</td>
                      <td>{occurrence.outcome ?? '—'}</td>
                      <td>{occurrence.pointsDelta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card">
              <h2>Points ledger</h2>
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Delta</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {(lookup.data?.ledger ?? []).map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.createdAt).toLocaleString()}</td>
                      <td>{entry.delta}</td>
                      <td>{entry.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </Shell>
  );
}
