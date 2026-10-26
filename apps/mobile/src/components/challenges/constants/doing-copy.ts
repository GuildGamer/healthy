import type { GlucoseContext } from '@product/client';

export const SAVE_OFFLINE_MESSAGE =
  'That didn’t save. Your numbers are still here, so try again when you’re back online.';
export const SAVE_FAILED_MESSAGE = 'That didn’t save. Your numbers are still here, so try again.';
export const SAVE_RETRY_LABEL = 'Try again';
export const NOT_ON_TODAY = 'This challenge isn’t on today’s list.';

export const READING_COPY = {
  bloodPressure: 'Blood pressure',
  topLabel: 'Top number',
  bottomLabel: 'Bottom number',
  addPulseOrNote: 'Add pulse or a note',
  pulsePlaceholder: 'Pulse',
  notePlaceholder: 'A note about this reading',
  saveReading: 'Save reading',
  save: 'Save',
  glucose: 'Glucose',
  glucoseUnit: 'mmol/L',
  peakFlow: 'Peak flow',
  peakFlowTitle: 'Your best of three',
  peakFlowUnit: 'L/min',
  carbs: 'Carbs',
  carbsUnit: 'grams',
  writeNote: 'Write a note instead',
  useGrams: 'Enter grams instead',
  carbsNotePlaceholder: 'Rice and beans at lunch',
  water: 'Hydration',
  waterTitle: 'How much so far?',
  waterUnit: 'glasses',
  sleep: 'Sleep',
  sleepTitle: 'Last night',
  wentToBed: 'Went to bed',
  wokeUp: 'Woke up',
  restedPrompt: 'How rested do you feel?',
  saveSleep: 'Save sleep',
  editTimes: 'Edit times',
  fromAppleHealth: 'From Apple Health',
  fromHealthConnect: 'From Health Connect',
  inBedFromAppleHealth: 'In bed · from Apple Health',
  inBedFromHealthConnect: 'In bed · from Health Connect',
  checkInDone: 'Mark as done',
} as const;

export const SLEEP_RESTED_CHOICES = [1, 2, 3, 4, 5] as const;

export const GLUCOSE_CONTEXT_CHOICES: readonly { id: GlucoseContext; label: string }[] = [
  { id: 'fasting', label: 'Fasting' },
  { id: 'before_meal', label: 'Before a meal' },
  { id: 'after_meal', label: 'After a meal' },
];

export const PHOTO_CHECK_COPY = {
  eyebrow: 'Quick photo check',
  readingSaved: 'Reading saved',
  monitorTitle: 'Show us the monitor.',
  actTitle: 'Show us you did it.',
  why: 'We check a reading now and then, so the board stays fair.',
  checkingTitle: 'Checking your photo…',
  checkingSub: 'This takes a few seconds.',
  rejectedMonitorTitle: 'We couldn’t see the monitor.',
  rejectedActTitle: 'We couldn’t see it in that photo.',
  rejectedSub: 'Your reading is still saved. Fill the frame and take another.',
  takeAnother: 'Take another',
  expiredTitle: 'Time ran out.',
  expiredSub: 'Your reading is still saved. These checks are random, so most days there isn’t one.',
  penaltyFact: 'points for this check',
  penaltyIfMissed: 'points if time runs out',
  ok: 'OK',
  allowCamera: 'Allow camera',
  cameraNeeded: 'The check needs the camera.',
  simulator: 'The camera isn’t available on a simulator.',
  closed: 'This photo check is no longer open.',
} as const;

export const WALK_COPY = {
  movement: 'Movement',
  recording: 'Recording',
  paused: 'Paused',
  goalReached: 'Goal reached',
  shortOfGoal: 'Short of the goal',
  startWalk: 'Start walk',
  finish: 'Finish',
  finishWalk: 'Finish walk',
  keepWalking: 'Keep walking',
  byHand: 'Log it by hand',
  useThis: 'Use this',
  foundOnPhone: 'Found on your phone',
  keepGoing: 'Keep going, or finish when you like.',
  locationOffTitle: 'Location is off for Healthy.',
  locationOffBody:
    'We use it only while you record, to measure the walk. You can turn it on in Settings.',
  openSettings: 'Open Settings',
  distance: 'distance',
  steps: 'steps today',
  stepsUnread: 'Healthy can’t read steps on this phone.',
  pause: 'Pause',
  resume: 'Resume',
  close: 'Close',
} as const;

export const POSE_COPY = {
  stepBack: 'Step back until your whole body fits the outline',
  startsByItself: 'Counting starts when you’re in position',
  startNow: 'Start now',
  stop: 'Stop',
  tryAgain: 'Try again',
  notNow: 'Not now',
  saving: 'Saving your set…',
  savingProof: 'Saving your proof clip…',
  goal: 'Goal',
  proofClip: 'Proof clip',
  proofClipNote: 'Films you and the count',
  proofRecording: 'REC',
  proofHint: 'Films you and the count. It stays on this phone unless you share it.',
  proofFailed: 'Your proof clip didn’t save.',
  proofDiscardTitle: 'Discard this proof clip?',
  proofDiscardBody: 'It will be removed from this phone.',
  proofDiscardConfirm: 'Discard',
  proofDiscardCancel: 'Keep',
  proofShare: 'Share clip',
  proofPostToGroup: 'Post to group',
  proofPublishFailed: 'Could not share the clip. Try again.',
  proofAlreadyPostedToday:
    'You already posted a clip to this group today. Save this one to Photos instead.',
  proofDiscard: 'Discard',
  proofWatch: 'Watch your proof clip',
  saveToPhotos: 'Save to Photos',
  savedToPhotos: 'Saved to Photos',
  saveToPhotosFailed: 'Could not save to Photos.',
  savedNotShared: 'Saved to Photos. Share the clip too so anyone can check its code.',
  savedNotPosted: 'Saved to Photos. Post it too so your group can check its code.',
} as const;

export const GYM_COPY = {
  pill: 'Gym check-in',
  hint: 'Your face, with the gym behind you',
  retake: 'Retake',
  usePhoto: 'Use photo',
  checking: 'Checking your photo…',
  rejected: 'We couldn’t see you at the gym in that one. Retake it with the gym behind you.',
  flip: 'Flip camera',
  close: 'Close camera',
} as const;

export const SHARE_COPY = {
  title: 'Share',
  share: 'Share',
  close: 'Close',
  brand: 'Healthy',
  failed: 'That didn’t share. Try again.',
} as const;
