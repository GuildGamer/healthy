# Social

How the app grows through people, and the constraints that keep it from becoming
Strava. Tenets are enforced as a Cursor rule in
[`.cursor/rules/12-social.mdc`](../.cursor/rules/12-social.mdc); this document is
the reasoning and the delivery plan behind them.

## Position

Social has one *place*: **a group challenge** — a private, time-boxed contest
over a shared goal, joined by invite link. There is no follow graph, no feed, no
club, and no public directory.

Alongside it sits one thing that is deliberately *not* a place: **a crew**, a
saved set of people you have already competed with. A crew is an address-book
entry, in the sense that a beneficiary list in a banking app is an address book.
It exists to skip re-inviting the same five friends every week. It has no page,
no feed, no activity, and no notifications of its own. See "Crews" below.

The primitive already exists. `Match` (`packages/contract/src/matches.ts`,
`apps/api/src/modules/user/matches`) is a host, an invite token, a metric, a
scoring mode, a window, capped participants, standings, and lazy settlement on
read. A group challenge is the same row with a different scoring rule. We extend
it rather than build a second system beside it.

## Why not the Strava shape

Strava runs four overlapping social systems: a follow graph with a kudos feed,
clubs with their own feeds and events, segment leaderboards, and sponsored
challenges. Each carries its own membership concept, leaderboard rules, and
notifications, so a user cannot answer "where am I competing, and against whom"
without stopping to think. The privacy settings then have to reconcile all four,
which is why they read as a maze.

One object with one membership concept removes that whole class of confusion
before it can start.

## Tenets

1. **One social place.** If you can see another person's activity, you are in a
   group challenge with them. A crew is a selection shortcut, never a
   destination — the moment it grows a feed or a member count on Home, it has
   become a club.
2. **No fifth tab.** A group challenge is a challenge; it lives under Challenges.
3. **Zero extra logging.** Group score derives from daily challenges the member
   already completes. Never ask for the same rep twice.
4. **One primary action per screen.**
5. **Reactions are one tap and finite.** No comment threads and no free text —
   which also means no moderation queue and no report flow.
6. **Notification budget.** At most one group push per group per day, plus the
   settlement result.
7. **Identity is scoped.** Display name inside a group you were invited to,
   pseudonym on the global leaderboard. This replaces a privacy matrix with one
   rule.
8. **Activity, never condition.** Nothing about a group may imply hypertension,
   diabetes, or asthma.
9. **Private by invite.** Nothing discoverable, nothing public. Fail closed.
10. **Every group challenge ends.** Time-boxed, with one-tap "Run it back" on
    the result. Crews persist; contests never do. That split is what lets the
    relationships last without the app filling up with dormant rooms.

Tenet 10 carries more weight than it looks. A group that ends produces a result
moment, a shareable card, and a natural re-engagement prompt, and it keeps the
group list short without anyone having to prune it.

## Scoring modes

The host picks how the group is won at creation. Three modes ship together —
they are the three questions people actually argue about, and offering only one
of them forces the other two groups to misuse it.

| Mode | Question it answers | Score |
|------|--------------------|-------|
| `best_single` | Who can do the most at one go? | Highest single attempt in the window |
| `cumulative_total` | Who can do the most overall? | Sum of every attempt in the window |
| `days_completed` | Who shows up most consistently? | Count of distinct days completed |

`best_single` ships today. `cumulative_total` reads the same `MatchAttempt`
rows with a different accumulator. `days_completed` needs no new writes at all —
it is a query over `UserChallenge` rows within the window, which makes it
naturally idempotent and safe to retry.

A walk contest also reads the member's own tracked walks (`DeviceActivityLog`),
so finishing the daily walk challenge scores the board without walking twice.
Only sensor-measured sources count; a hand-confirmed walk never scores, and the
group's walk screen writes an attempt and no activity log, so nothing is
counted twice.

### One ranking rule across all three

Every mode reduces to the same shape: a score per member, and the moment that
member's score first reached its final value. Ties break on that moment —
**same score, whoever got there first wins**. For `best_single` that is the first
attempt matching their best; for `cumulative_total` the attempt that completed
their total; for `days_completed` the completion that closed their final day.

This is worth holding to. It gives one `computeStandings` function taking an
accumulator rather than three parallel implementations, one tie-break to test,
and one sentence of copy that is true in every group.

### What the host can combine

Not every mode fits every metric, so the create screen derives the available
options rather than offering all of them and rejecting the bad ones.

| Mode | Metrics | Shortest contest |
|------|---------|------------------|
| `best_single` | `pushups` | One day |
| `cumulative_total` | `pushups`, `walk` | One day |
| `days_completed` | Any finished daily occurrence, or `pushups` / `walk` when the host narrows it | Two days |

`MATCH_MODES_BY_METRIC` in the contract is the single source for the metric
column. `walk` deliberately has no `best_single`: "longest single walk" is the
one pairing that rewards pushing a single session past what the walker should
do, which is exactly what the cumulative cap below exists to prevent.

`MATCH_MIN_DAYS_BY_SCORING_MODE` in the contract is the single source: a
one-day consistency contest is not a contest, so `days_completed` needs two.
`MATCH_WINDOWS_BY_SCORING_MODE` — the shortcut tiles the create screen offers —
is derived from it, so the row cannot drift from the rule custom lengths are
checked against.

### How long a contest runs

The shortcuts are Today, 7 days, and 30 days. Today is calendar-bounded and
ends at the host's next local midnight; the rest are spans of whole days from
the moment the contest starts.

A host who needs something else sends `durationDays` instead of `window` —
1 to `MATCH_LENGTH_MAX_DAYS` (365). The two are alternatives, never both, so
there is no precedence rule: the contract rejects a request carrying each.
A year is the ceiling because settlement stays lazy-on-read, and a contest
nobody finishes is a club with extra steps.

### Health guardrail on cumulative

`cumulative_total` is the one mode that rewards volume, which in an app used by
people managing chronic conditions can pull toward overexertion. Cumulative
groups cap how much a single day can contribute to the total, so the winning
strategy is returning daily rather than grinding one session. The cap is a
constant, not a host setting — it is a safety floor, not a preference.

The cap is per metric (`MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC`), because a day's
reasonable effort is 300 push-ups or 120 minutes of walking and one number
cannot mean both. A walk is scored in **minutes**, not distance: distance
rewards pace, which is the wrong pull for someone managing hypertension, and
minutes still count on a treadmill where there is no route to measure.

`team_total`, where members pool toward one shared target rather than compete,
remains deferred. It is a different relationship to the score (co-operative, not
ranked) and can wait until groups are shown to stick.

## Condition safety

`days_completed` counts **any** finished daily occurrence by default rather than
binding a group to one chosen challenge. That was originally planned as an admin
allowlist (`Challenge.isGroupEligible`), and counting anything turned out to be
both simpler and safer:

- Nothing in the standings hints at what a member actually did, so no group can
  imply a diagnosis.
- People managing different conditions can compete on the same board, because
  the contest is about showing up rather than about a shared activity.
- There is no challenge picker in the create flow and no admin curation step
  before groups can launch.

A host who wants a one-habit race can narrow a streak to the contest's activity
(`dailyScope: chosen_activity`), which filters completions by
`Challenge.deviceMetric`. The scope is an **activity**, never a category or a
named challenge, so the safety above holds: a walking streak says the group
walks, not what anyone is managing. `any_challenge` stays the default, and the
Activity tile the host picks is what the board and the rule sentence then name.

Standings expose a name and a score. They never expose a category, a vital, or a
challenge a member did outside the group.

## Crews

Re-inviting the same people for every new contest is the friction that stops
groups from becoming a habit. A crew fixes it the way a beneficiary list does:
you pick people once, then select them forever.

### Crews are a by-product, not a thing you create

There is no "create a crew" flow, no member-picker, and no empty state to fill.
A crew is offered **retroactively**, from a contest that already happened: the
result screen shows "Run it back" and "Save this crew", and saving takes one
tap because the roster is already known.

This is the whole trick. Crews accumulate as a side effect of playing, exactly
as beneficiaries accumulate as a side effect of paying. Nobody is ever asked to
assemble a list of friends from nothing.

Default crew labels are derived from member names, reusing the
`matchContestTitle` approach ("Tunde, Ada +2"). Renaming is optional. A derived
default means saving costs one tap rather than one tap and a keyboard, and it
keeps host-authored free text out of the product for anyone who does not want
it.

If a crew with an identical member set already exists for that owner, offer it
instead of saving a duplicate. Beneficiary lists rot precisely because nothing
dedupes them.

### Selecting one

The create screen gains a "Who's in" row above the mode tiles: **New group**
(share a link, today's behaviour) or a saved crew. Picking a crew seats those
members immediately, so the host never touches a link.

### Consent

Being seated is not the same as agreeing to play. Members added from a crew are
**seated pending**: they get one push, and they show greyed in standings until
they open the contest. They are never scored or nudged before accepting.

Crew membership is mutual and revocable — any member can leave a crew they are
in, not just the owner, and leaving prevents re-adding. Without that, a saved
crew becomes a channel for repeatedly pulling someone into contests they have
stopped wanting. Fail closed: the person being added holds the veto.

Leaving sets `CrewMember.leftAt` rather than deleting the row, so the unique
key on `[crewId, userId]` is what prevents re-adding. The veto is enforced by
the schema, not by a check a future caller could forget. An owner leaving has
nothing left to own, so the crew goes with them.

Consent is enforced in `computeStandings` itself: a pending member gets no
progress entry, so they cannot be scored even if a caller passes their events
in. For `days_completed` the service also never queries a pending member's
challenge rows, so no health data is read before they accept. Opening the
contest, or logging a set, is the accept — there is no extra tap. The person
who shared the invite gets one push that names who accepted. A retried open
does not send it again, and a failed push does not undo the accept.

## Usernames

Two capabilities are bundled in the request, and only one of them needs
usernames:

| Capability | Needs usernames? |
|-----------|------------------|
| Reuse a group I already played with | **No** — the roster is already stored as `MatchParticipant` rows |
| Add a specific person who is not in a crew, without sending them a link | Yes |

Crew reuse is the stated need, and it requires no identity change at all. That
is worth doing first and shipping on its own.

### The cost of adding handles

A person already carries `User.name` from Better Auth, an optional
`UserProfile.displayName` (2–24 chars, **not unique**), and a derived pseudonym
from `publicNameFor`. A username is a fourth identity string, and the first one
that must be globally unique — which brings normalisation, case folding,
confusable characters, a reserved-word list, squatting, and a rename policy.

The sharper problem is discovery. A searchable handle directory means anyone can
find and add a person who is in this app to manage hypertension, diabetes, or
asthma. Tenet 9 is private by invite, and a directory is the opposite of that.

### If handles ship, the shape

Two constraints keep them from undoing the privacy model:

- **A username is an address, not a name.** It is a lookup key and is displayed
  nowhere. Standings keep showing `displayName`, the global leaderboard keeps
  showing the pseudonym. This sidesteps "which name appears where" entirely.
- **Exact match only.** No search, no autocomplete, no browsing, no "did you
  mean". You add someone by knowing their handle already, the way you add a
  contact by knowing their phone number. Lookups are rate-limited against
  enumeration, and discoverability is opt-in with a default of false.

Deferred to phase 4 and conditional on evidence that link sharing is actually
insufficient. If link sharing plus crews covers the need, handles never need to
exist.

## Surface

The Challenges tab gains a segmented control: **Mine** and **Groups**. That is
the entire navigation change. Matches, today reachable only from a Home card or a
deep link, move under Groups and become discoverable for the first time.

### Creating a group

The create screen stays a single screen with no wizard: **Who's in**, **What
counts**, **How long**, one button. Each row reuses `MatchCreateScreen`'s
existing tile pattern — `colors.accentSurface` fill and `colors.accent` border
when selected.

"Who's in" defaults to New group and is the only row that can be skipped
without a thought, since a first-time host has no crews and sees a single
tile.

Mode tiles are labelled in plain language, never by enum name:

| Mode | Tile label | Tile hint |
|------|-----------|-----------|
| `best_single` | Best set | Most in one go |
| `cumulative_total` | Total | Most added up |
| `days_completed` | Streak | Most days done |

Underneath, the existing `MATCH_RULE` line becomes a live sentence that rewrites
itself as the host picks — "Highest single set wins", "Every set adds up;
highest total when time runs out wins", "One point for each day you show up;
most days wins". That sentence is what keeps three options from feeling like
configuration. The host never has to decode a mode name, because the screen has
already told them what will happen.

Selecting a mode filters the window tiles to the legal set rather than showing
options that will be rejected.

### Reading the board

Group rows are divider list rows on `colors.background`, the same shape as a
leaderboard row: live/ended pip in `colors.accent` against
`colors.disabledText`, `fontSize.sm` title, `fontSize.xs` muted meta carrying
the mode and time remaining, and the score on the right. See "Visual
consistency" below for why this replaces the current per-row card.

The score is mode-dependent and so is the small label beneath it — `best`,
`total`, or `days`. That pairing is the whole mechanism by which the board
reflects the mode; there is no separate leaderboard layout per mode. The
standings bar already normalises against the leader, which holds for all three.

The one display-face numeral on the board is the member's own score in the hero,
matching `streakValue` on Home. Standings rows use the body face. Under
`days_completed` the hero tints `colors.streak` on an unbroken run — the role
exists so celebration never rides on `warning`. As a phase 2 polish, a 7-day
window can render a row of filled and unfilled day dots in place of the number,
which is the same visual language as the today strip below. Windows longer than
7 days keep the number.

The group board keeps the `MatchBoardScreen` skeleton: kicker, title, your row,
standings, one primary button. The single addition is a **today strip** above
standings — members who have completed today filled in `colors.accent`, the rest
muted. That row is the whole accountability mechanic and it is what we ship
instead of a feed.

- Tapping a filled member sends a **cheer**: one tap, accent flash, haptic.
- Tapping an empty member offers a **nudge**, capped at one per pair per day and
  idempotent on `(groupId, fromUserId, toUserId, day)`.

The primary button stays singular, and the mode decides what it says: **Do a
set** for `best_single` and `cumulative_total`, **Open today's challenge** for
`days_completed`. Before that it is **Share link** while the group is under cap,
and after settlement it is **Run it back**.

## Visual consistency

The matches screens drifted from the rest of the app. They read as a separate
product, and group work must not inherit that. Three concrete divergences, all
fixable without new design:

**Display-face inflation.** `apps/mobile/src/lib/fonts.ts` documents
`displayFontFamily` (Archivo Black) as reserved for hero moments — splash
wordmark, auth titles, streak and points numerals, celebration headlines. The
rest of the app honours that: `HomeScreen` uses it on `streakValue` and nothing
else, `PointsScreen` on `balanceValue` and nothing else. Matches applies it to
every screen title (`MatchCreateScreen`, `MatchJoinScreen`, `MatchBoardScreen`)
*and* to repeating row values — the count on every list row and every standings
row. A face used on every row stops being emphasis and starts being a typeface
choice, which is why the section feels foreign.

**Card-per-row instead of a divider list.** The two screens most analogous to a
group board already share one idiom: `LeaderboardScreen` and `ChallengesScreen`
both render rows directly on `colors.background`, separated by a
`StyleSheet.hairlineWidth` rule in `colors.border`, with the last divider
omitted. Matches instead wraps each item in its own `colors.surface` card at
`radii.md`. That is the soulless-card pattern the app otherwise avoids.

**Louder row type.** Challenge rows title at `fontSize.sm` regular with
`fontSize.xs` muted meta. Match rows title at `fontSize.md` semibold and add a
display-face numeral. Same information, two different volumes.

### Why it drifted

Matches built a private chrome kit — `MatchCard`, `MatchKicker`, `MatchChip`,
`MatchRankMark`, `MATCH_CARD_RADIUS` — instead of shared primitives, so nothing
pulled it back toward the app. `MATCH_CARD_RADIUS` is a local alias for
`radii.md`, a second name for an existing brand token. And `MatchRankMark`
already imports `podiumMedalColor` from the leaderboard, which is the proof that
these are the same surface wearing two different skins.

### Remedy

- Groups list and standings become divider lists on `colors.background`,
  matching leaderboard and challenges. Delete the per-row card.
- Reserve the display face for **one** numeral per screen — the member's own
  score on the board hero, the same role `streakValue` plays on Home. Screen
  titles take the standard title treatment; standings numbers become
  `fontSize.md` semibold in the body face.
- Row type scale matches `ChallengesScreen`: `fontSize.sm` title,
  `fontSize.xs` muted meta.
- Keep `MatchKicker`. The uppercase `fontSize.xs` / `letterSpacing: 0.6` label
  in accent or muted is already the shared idiom (`doNextTitle`, `upNextTitle`),
  so promote it to a shared `SectionKicker` rather than reinventing it.
- Promote the rank mark and `podium` helpers out of the leaderboard folder into
  shared chrome, and have leaderboard, challenges, and groups consume one row
  component instead of three near-copies.
- Drop `MATCH_CARD_RADIUS` and use `radii.md`.

Cards are not banned — they are for a single emphasised block per screen, like
the board's own-score hero or the create screen's rule card. They are not the
default container for a list item.

This cleanup lands in Phase 1, alongside the Challenges-tab segment, because
moving groups next to challenges is exactly when the mismatch becomes visible.

## Growth loop

Invites are `https://www.gethealthyapp.com/match/<token>`. The apex host
308-redirects to www, and a redirected URL cannot be a universal or app link,
so the shared link uses www. The path deliberately matches the app's
`app/match/[token]` route, so the universal link resolves with no extra
linking config, and the same URL is a real web page for anyone without the app.

The URL is built server-side from `WEBSITE_URL` and handed to clients as
`MatchBoard.inviteUrl`. No client composes an invite link, so a staging API
cannot mint a production one.

The web page is static and token-agnostic: it explains what a group challenge
is and points at the store, or at the waitlist while the app is unlisted. It
does not name the host. Personalising it would mean a public endpoint that
turns a guessed token into someone's display name, and the conversion it buys
is not worth that surface. A small script reads the token from the path and
offers "Open in the app" by custom scheme, which is the recovery path when a
link is opened inside a webview that swallows universal links.

Association files are generated from environment values (`IOS_APP_ID`,
`ANDROID_SHA256_CERT_FINGERPRINTS`). Unset means the files claim nothing, so
an unverifiable association degrades to the web page rather than breaking the
link.

Group creation and joining stay free. The invite link is the acquisition loop;
gating it behind an entitlement would trade growth for a small amount of revenue.

Extend the existing challenge share card to group results — the end-of-season
recap is the most shareable artifact the app produces.

## Contract and data

Additive only. Store clients linger and `oasdiff` has to stay green.

- Contract: `cumulative_total` and `days_completed` on `matchScoringModeSchema`,
  `month` on `matchWindowSchema`, `scoringMode` on the create input (defaulting
  to `best_single` so older clients keep working), and a `refine` rejecting an
  illegal mode/window pair at the boundary.
- Prisma: two new `MatchScoringMode` values and an index on
  `user_challenges(userId, frequency, status, completedAt)` for consistency
  scoring. Cheers and nudges get their own table with a unique key when phase 3
  lands.
- Crews: `Crew` (owner, name, timestamps) and `CrewMember`
  (`@@unique([crewId, userId])`), plus a nullable `crewId` on `matches` so a
  contest records where its roster came from. `MatchParticipant` gains a
  nullable `acceptedAt` for the seated-pending state; existing rows backfill to
  their `joinedAt`, so nothing already played changes meaning.
- Create input gains an optional `crewId`. Crew endpoints stay to four: list,
  save from a finished contest, rename, leave.
- Settlement stays lazy-on-read (`settleIfDue`). No background job is introduced.

### Renaming the score field

`MatchStanding.bestCount`, `MatchBoard.yourBestCount`, and
`MatchListItem.yourBestCount` are all named for the one mode that existed when
they were written. Under three modes the name is wrong two thirds of the time.

Add `score` alongside each of them and keep the old field populated with the
same value, so clients already in the store keep working and read a sensible
number for `best_single` groups. Mark the old fields deprecated in the contract,
and drop them once store telemetry shows the old builds are gone. Do not rename
in place — `oasdiff` must stay green.

The unit a score is counted in is derived from `scoringMode` on the client. It
is not a separate field; two sources of truth for the same fact is how the board
starts disagreeing with itself.

User-facing copy moves from "Match" to "Group" in this work. The `matches` module
and tables keep their names until a separate mechanical rename, so the feature
diff stays reviewable.

## Phases

| Phase | Scope |
|-------|-------|
| 0 | ✅ `https` invite links, app links config, website invite page, copy rename |
| 1 | ✅ All three scoring modes, Challenges-tab segment, chrome cleanup onto shared divider lists |
| 2 | ✅ Crews — save from a result, select at create, seated-pending, leave |
| 3 | Cheers, nudges, notification budget, recap share card |
| 4 | More metrics (steps, walk distance), possibly `team_total`; handles only if link sharing proves insufficient |

## Not building

A follow graph, an activity feed, comments, public or discoverable groups, and
photos inside groups. No crew page, crew feed, or crew chat — the three
additions that would quietly turn an address-book entry into a club. No
searchable user directory. Recorded here so they do not creep back in as "small
additions".
