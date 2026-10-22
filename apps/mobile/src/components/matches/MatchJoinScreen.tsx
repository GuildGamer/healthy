import type { MatchPreview } from '@product/client';
import { fontWeight, spacing } from '@product/brand';
import { matchTimeLeft } from '@product/contract/match-board';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { DeckButton, DeckNoteCard, DeckPageNav, DeckSheetMessage } from '@/components/deck';
import { ScreenLoader } from '@/components/feedback';
import { Glyph } from '@/components/icons';
import { apiClient } from '@/lib/api';
import { useSession } from '@/lib/auth-client';
import { stashDeferredInviteToken } from '@/lib/deferred-invite';
import { goBackOrHome } from '@/lib/go-back';
import { type Theme, useTheme, useThemedStyles } from '@/theme';
import { GroupCard, GroupCardLine } from './GroupCard';
import { GroupFace } from './GroupFace';
import { GroupPage } from './GroupPage';
import { groupRuleBody, groupRuleTitle, sharedWithGroupLine } from './group-rule-copy';
import { JOIN_COPY } from './match-copy';

const HOST_FACE_SIZE = 64;
const LEAVE_HREF = '/(tabs)/challenges';

/**
 * Opening an invite should feel like being handed something: the host's face,
 * the contest in plain words, and how many are in. Nobody but the host is
 * named, because the link holder has not agreed to anything yet.
 */
export function MatchJoinScreen({ token }: { token: string }) {
  const { data: session, isPending: isSessionPending } = useSession();
  const previewQuery = useQuery({
    queryKey: ['matches', 'preview', token],
    queryFn: () => apiClient.previewMatch({ token }),
    enabled: Boolean(session),
  });

  if (isSessionPending) {
    return <ScreenLoader />;
  }

  if (!session) {
    void stashDeferredInviteToken(token, 'deep_link');
    // Challenge-first: new recipients should create an account, not hunt for login.
    return <Redirect href="/onboarding" />;
  }

  if (previewQuery.isPending) {
    return <ScreenLoader testID="match-join-loading" />;
  }

  const preview = previewQuery.data;
  if (!preview || previewQuery.isError) {
    return <InvalidInvite />;
  }

  if (preview.alreadyJoined) {
    return <Redirect href={`/matches/${preview.matchId}`} />;
  }

  return <Invite preview={preview} token={token} />;
}

function Invite({ preview, token }: { preview: MatchPreview; token: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { deckCards } = useTheme();
  const styles = useThemedStyles(createStyles);
  const join = useMutation({
    mutationFn: () => apiClient.joinMatch({ token }),
    onSuccess: async (board) => {
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      router.replace(`/matches/${board.id}`);
    },
  });
  const isEnded = preview.status !== 'open';
  const isFull = preview.participantCount >= preview.participantCap;
  const canJoin = !isEnded && !isFull;
  const host = preview.hostDisplayName;

  return (
    <GroupPage
      dock={
        <>
          {join.isError ? <DeckSheetMessage message={JOIN_COPY.joinFailed} /> : null}
          {canJoin ? (
            <DeckButton
              label={JOIN_COPY.join(host)}
              loading={join.isPending}
              onPress={() => join.mutate()}
              testID="match-join-accept"
            />
          ) : (
            <DeckButton
              label={JOIN_COPY.startOwnCta}
              onPress={() => router.replace('/matches/create')}
              testID="match-join-start-own"
            />
          )}
          <DeckButton
            label={JOIN_COPY.notNow}
            onPress={() => goBackOrHome(LEAVE_HREF)}
            testID="match-join-dismiss"
            variant="quiet"
          />
        </>
      }
      nav={<DeckPageNav isClose onBack={() => goBackOrHome(LEAVE_HREF)} />}
      testID="match-join-screen"
    >
      <View style={styles.host}>
        <GroupFace
          image={preview.hostImage ?? null}
          look="lit"
          name={host}
          size={HOST_FACE_SIZE}
          userId={preview.token}
        />
        <Text style={styles.hostLine}>{JOIN_COPY.invitedYou(host)}</Text>
      </View>
      {canJoin ? (
        <>
          <GroupCard
            corner={matchTimeLeft(preview.endsAt)}
            rules={preview}
            testID="match-join-card"
            title={groupRuleTitle(preview)}
          >
            <GroupCardLine>{groupRuleBody(preview)}</GroupCardLine>
            <View style={styles.seats}>
              <Glyph color={deckCards.text} name="users" size={17} strokeWidth={2} />
              <Text style={styles.seatsText}>{JOIN_COPY.joined(preview.participantCount)}</Text>
            </View>
          </GroupCard>
          <Text style={styles.privacy}>{sharedWithGroupLine(preview)}</Text>
        </>
      ) : (
        <DeckNoteCard
          body={JOIN_COPY.startOwn(host)}
          glyph="clock"
          testID="match-join-closed"
          title={isEnded ? JOIN_COPY.endedTitle : JOIN_COPY.fullTitle}
        />
      )}
    </GroupPage>
  );
}

function InvalidInvite() {
  const router = useRouter();

  return (
    <GroupPage
      dock={
        <DeckButton
          label={JOIN_COPY.goToday}
          onPress={() => router.replace('/(tabs)')}
          testID="match-join-go-today"
          variant="tonal"
        />
      }
      nav={<DeckPageNav isClose onBack={() => goBackOrHome(LEAVE_HREF)} />}
      testID="match-join-missing"
    >
      <DeckNoteCard body={JOIN_COPY.invalidBody} glyph="link" title={JOIN_COPY.invalidTitle} />
    </GroupPage>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    host: {
      alignItems: 'center',
      marginTop: 18,
    },
    hostLine: {
      color: theme.colors.text,
      fontSize: 19,
      fontWeight: fontWeight.semibold,
      marginTop: 12,
    },
    seats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: spacing.md,
    },
    seatsText: {
      color: theme.deckCards.subtext,
      fontSize: 14,
    },
    privacy: {
      color: theme.colors.muted,
      fontSize: 14.5,
      lineHeight: 21,
      marginTop: 14,
      textAlign: 'center',
    },
  });
