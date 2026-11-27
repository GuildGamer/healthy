'use client';

import type { SendAdminNotificationInput } from '@product/contract';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Shell } from '@/components/shell';
import { adminApi } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `broadcast-${Date.now()}`;
}

export default function NotificationsPage() {
  const [title, setTitle] = useState('Do one now');
  const [body, setBody] = useState('Got a few minutes?');
  const [sendPush, setSendPush] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInbox, setSendInbox] = useState(true);
  const [audience, setAudience] =
    useState<SendAdminNotificationInput['audience']>('reminders_on');
  const [memberEmail, setMemberEmail] = useState('');
  const [destination, setDestination] =
    useState<SendAdminNotificationInput['destination']>('today');
  const [challengeId, setChallengeId] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const memberLookup = useQuery({
    queryKey: ['admin', 'member', memberEmail],
    queryFn: () => adminApi.lookupMember({ email: memberEmail.trim() }),
    enabled: audience === 'member' && memberEmail.trim().length > 3,
  });

  const send = useMutation({
    mutationFn: (input: SendAdminNotificationInput) =>
      adminApi.sendNotification(input),
    onSuccess: () => {
      setIdempotencyKey(newIdempotencyKey());
    },
  });

  const memberId = memberLookup.data?.member?.id;

  const canSubmit = useMemo(() => {
    if (!title.trim() || !body.trim()) {
      return false;
    }

    if (!sendPush && !sendEmail && !sendInbox) {
      return false;
    }

    if (audience === 'member' && !memberId) {
      return false;
    }

    if (destination === 'challenge' && !challengeId) {
      return false;
    }

    return true;
  }, [
    audience,
    body,
    challengeId,
    destination,
    memberId,
    sendEmail,
    sendInbox,
    sendPush,
    title,
  ]);

  return (
    <Shell>
      <div className="page stack">
        <div>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', margin: 0 }}>
            Send a notification
          </h1>
          <p className="muted" style={{ margin: '8px 0 0' }}>
            Write an action line, pick the channels, and send a push, email, and
            inbox item.
          </p>
        </div>

        <form
          className="card stack"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit || send.isPending) {
              return;
            }

            send.mutate({
              idempotencyKey,
              title: title.trim(),
              body: body.trim(),
              sendPush,
              sendEmail,
              sendInbox,
              audience,
              memberUserId: audience === 'member' ? memberId : undefined,
              destination,
              challengeId:
                destination === 'challenge' ? challengeId : undefined,
            });
          }}
        >
          <label className="stack">
            <span>Action title</span>
            <input
              maxLength={80}
              onChange={(event) => setTitle(event.target.value)}
              value={title}
            />
          </label>

          <label className="stack">
            <span>Second line</span>
            <textarea
              maxLength={280}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              value={body}
            />
          </label>

          <fieldset className="stack">
            <legend>Channels</legend>
            <label className="row">
              <input
                checked={sendPush}
                onChange={(event) => setSendPush(event.target.checked)}
                type="checkbox"
              />
              Push
            </label>
            <label className="row">
              <input
                checked={sendEmail}
                onChange={(event) => setSendEmail(event.target.checked)}
                type="checkbox"
              />
              Email
            </label>
            <label className="row">
              <input
                checked={sendInbox}
                onChange={(event) => setSendInbox(event.target.checked)}
                type="checkbox"
              />
              In-app inbox
            </label>
          </fieldset>

          <fieldset className="stack">
            <legend>Audience</legend>
            <label className="row">
              <input
                checked={audience === 'reminders_on'}
                name="audience"
                onChange={() => setAudience('reminders_on')}
                type="radio"
              />
              Everyone with Daily reminders on
            </label>
            <label className="row">
              <input
                checked={audience === 'member'}
                name="audience"
                onChange={() => setAudience('member')}
                type="radio"
              />
              One member
            </label>
            {audience === 'member' ? (
              <label className="stack">
                <span>Member email</span>
                <input
                  onChange={(event) => setMemberEmail(event.target.value)}
                  placeholder="ada@example.com"
                  value={memberEmail}
                />
                {memberLookup.isFetching ? (
                  <span className="muted">Looking up…</span>
                ) : null}
                {memberLookup.data?.member ? (
                  <span className="muted">
                    Found {memberLookup.data.member.name} (
                    {memberLookup.data.member.email})
                  </span>
                ) : null}
                {memberLookup.isError ? (
                  <span className="error">
                    {errorMessage(memberLookup.error, 'Member not found')}
                  </span>
                ) : null}
              </label>
            ) : null}
          </fieldset>

          <fieldset className="stack">
            <legend>Opens</legend>
            <label className="row">
              <input
                checked={destination === 'today'}
                name="destination"
                onChange={() => setDestination('today')}
                type="radio"
              />
              Today
            </label>
            <label className="row">
              <input
                checked={destination === 'challenges'}
                name="destination"
                onChange={() => setDestination('challenges')}
                type="radio"
              />
              Challenges
            </label>
            <label className="row">
              <input
                checked={destination === 'challenge'}
                name="destination"
                onChange={() => setDestination('challenge')}
                type="radio"
              />
              One challenge
            </label>
            {destination === 'challenge' ? (
              <label className="stack">
                <span>Challenge id</span>
                <input
                  onChange={(event) => setChallengeId(event.target.value)}
                  placeholder="Challenge id from the catalog"
                  value={challengeId}
                />
              </label>
            ) : null}
          </fieldset>

          <button disabled={!canSubmit || send.isPending} type="submit">
            {send.isPending ? 'Sending…' : 'Send'}
          </button>
        </form>

        {send.error ? (
          <p className="error">
            {errorMessage(send.error, 'Could not send the notification')}
          </p>
        ) : null}

        {send.data ? (
          <div className="card stack">
            <p style={{ margin: 0 }}>
              {send.data.replayed
                ? 'That send was already recorded.'
                : 'Sent.'}
            </p>
            <p className="muted" style={{ margin: 0 }}>
              Audience {send.data.audienceCount} · push {send.data.pushSentCount}{' '}
              · email {send.data.emailSentCount} · inbox{' '}
              {send.data.inboxWrittenCount} · no device{' '}
              {send.data.skippedNoDeviceCount}
            </p>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
