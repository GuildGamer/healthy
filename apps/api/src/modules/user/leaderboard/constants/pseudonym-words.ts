/**
 * Chosen to be warm and unmistakably non-identifying. Nothing here should ever
 * read as a slight, since users are assigned one without being asked.
 *
 * Both lists are append-only: a name is derived from these positions, so
 * reordering or removing a word silently renames existing users.
 */
export const pseudonymAdjectives: readonly string[] = [
  'Swift',
  'Bright',
  'Calm',
  'Bold',
  'Steady',
  'Keen',
  'Sunny',
  'Brave',
  'Quiet',
  'Nimble',
  'Cheery',
  'Clever',
  'Gentle',
  'Lively',
  'Merry',
  'Plucky',
];

export const pseudonymAnimals: readonly string[] = [
  'Otter',
  'Falcon',
  'Heron',
  'Badger',
  'Marten',
  'Ibex',
  'Lynx',
  'Puffin',
  'Kestrel',
  'Osprey',
  'Sparrow',
  'Dolphin',
  'Panda',
  'Fox',
  'Hare',
  'Seal',
];
