import type { HealthCategory } from '@product/client';

export interface HealthTip {
  id: string;
  category: HealthCategory;
  /** Short enough to sit on one line as the home screen preview. */
  title: string;
  body: string;
}

export const healthTips: readonly HealthTip[] = [
  {
    id: 'salt',
    category: 'hypertension',
    title: 'Reduce salt today for better blood pressure',
    body: 'Most sodium comes from packaged food rather than the salt shaker. Check the labels on bread, sauces and cured meats before you reach for seasoning.',
  },
  {
    id: 'same-time-reading',
    category: 'hypertension',
    title: 'Take your reading at the same time each day',
    body: 'Blood pressure drifts through the day. Measuring at a consistent time, seated and rested for five minutes, makes the trend much easier to read.',
  },
  {
    id: 'post-meal-walk',
    category: 'hypertension',
    title: 'Walk for twenty minutes after your largest meal',
    body: 'A gentle walk after eating softens the post-meal rise in blood pressure, and attaching it to a meal you already eat makes the habit stick.',
  },
  {
    id: 'meal-order',
    category: 'diabetes',
    title: 'Eat protein or fibre before the carbohydrate',
    body: 'Order matters. Starting a meal with vegetables or protein slows how quickly glucose arrives in your bloodstream.',
  },
  {
    id: 'foot-check',
    category: 'diabetes',
    title: 'Check your feet when you take your socks off',
    body: 'Attaching the check to something you already do every day makes it stick. Look for cuts, blisters and changes in colour.',
  },
  {
    id: 'fast-carb',
    category: 'diabetes',
    title: 'Keep a fast-acting carbohydrate within reach',
    body: 'Glucose tablets or a small juice in your bag turns a low into a minor interruption rather than an emergency.',
  },
  {
    id: 'rinse-inhaler',
    category: 'asthma',
    title: 'Rinse your mouth after your preventer inhaler',
    body: 'A quick rinse and spit reduces irritation and the risk of thrush from inhaled steroids.',
  },
  {
    id: 'inhaler-technique',
    category: 'asthma',
    title: 'Check your inhaler technique once a month',
    body: 'Technique slips quietly over time. A slow, deep breath held for ten seconds delivers far more of the dose than a fast one.',
  },
  {
    id: 'trigger-notes',
    category: 'asthma',
    title: 'Note what you were doing when symptoms start',
    body: 'Patterns show up quickly once written down, whether that is cold air, dust, exercise or one particular room.',
  },
  {
    id: 'water-before-meals',
    category: 'general',
    title: 'Drink a glass of water before each meal',
    body: 'It is the easiest hydration habit to remember, because the reminder is already built into your day.',
  },
  {
    id: 'hourly-movement',
    category: 'general',
    title: 'Stand up and move for two minutes every hour',
    body: 'Breaking up long stretches of sitting does more for circulation and stiffness than any single workout.',
  },
  {
    id: 'sleep-schedule',
    category: 'general',
    title: 'Keep your sleep and wake times consistent',
    body: 'A steady schedule does more for how rested you feel than the total number of hours you spend in bed.',
  },
];
