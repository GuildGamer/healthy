# Product

Healthy is the app a group chat uses to settle "who's stronger".

The product is a short, camera-verified fitness contest between people who
already know each other. One person starts a contest, shares a link that says
"Think you can beat me?", and the reply is a set counted by the camera. Every
screen, push, and string either feeds that loop or gets out of its way.

## Core loop

1. Host does a set (camera counts it).
2. Host shares: "I did 40. Think you can beat me?"
3. WhatsApp / Messages preview shows the name, score, rule, and deadline.
4. Invite page gets the recipient into TestFlight or the app.
5. Sign-up asks for a first name only.
6. Recipient is auto-joined and lands on "Beat 40".
7. They do a set. The host gets "Ada just passed you".
8. Ada shares onward.

## What we sell

- **Proof.** The camera counts reps, so scores can be trusted.
- **Groups and crews.** Private contests between real people, plus saved
  rosters for "run it back".
- **Lifecycle.** Contests are time-boxed and end in a result moment.

Fitness and competitive fitness are the primary goal. Condition management
(blood pressure, blood sugar, breathing) is hidden, not deleted — see
`CONDITION_FEATURES_ENABLED`.

## Voice guide

### Use

beat, reps, set, hold, top spot, settle it, your turn, run it back, contest,
challenge, score, board

### Avoid

health, readings, condition, manage, log (as a verb for fitness work), vital,
diagnosis, cuff, glucose

Em dashes (`—`) and double hyphens (`--`) in user-facing copy. Prefer a period,
comma, or middot (`·`). Empty placeholders may stay as a single en dash (`–`).

### Examples

| Instead of | Write |
|------------|-------|
| Check your blood pressure | Most push-ups by Sunday |
| Log your water | Longest plank wins |
| Stay healthy | Think you can beat me? |
| Someone invited you to a group challenge | Nurul did 40 push-ups. Think you can beat that? |

## Identity

- **Inside a group:** first name from the account (`User.name`).
- **Global leaderboard:** chosen display name, or a pseudonym if none is set.
- Do not leak one into the other.

## Related docs

- [`docs/social.md`](social.md) — group challenges, invite loop, tenets
- [`.cursor/rules/12-social.mdc`](../.cursor/rules/12-social.mdc) — enforced rules
