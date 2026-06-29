import type { IconName } from '../core/ui/Icon';

/**
 * Achievement definitions. Each tracks a single numeric `stat` against a `goal`;
 * the player store keeps a counter per stat and unlocks an achievement when the
 * counter crosses the goal, granting its reward once.
 */
export type AchievementStat =
  | 'gamesPlayed'
  | 'wins'
  | 'correctAnswers'
  | 'perfectRounds'
  | 'dailyChallenges'
  | 'bestStreak'
  | 'coinsEarned'
  | 'modesPlayed'
  | 'level';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: IconName;
  stat: AchievementStat;
  goal: number;
  reward: { coins: number; gems: number };
  secret?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'ach_first_game',
    name: 'Willkommen!',
    description: 'Spiele dein erstes Spiel',
    icon: 'game-controller',
    stat: 'gamesPlayed',
    goal: 1,
    reward: { coins: 50, gems: 0 },
  },
  {
    id: 'ach_10_games',
    name: 'Stammgast',
    description: 'Spiele 10 Spiele',
    icon: 'game-controller',
    stat: 'gamesPlayed',
    goal: 10,
    reward: { coins: 150, gems: 0 },
  },
  {
    id: 'ach_50_games',
    name: 'Süchtig',
    description: 'Spiele 50 Spiele',
    icon: 'flame',
    stat: 'gamesPlayed',
    goal: 50,
    reward: { coins: 400, gems: 5 },
  },
  {
    id: 'ach_first_win',
    name: 'Erster Sieg',
    description: 'Gewinne ein Spiel',
    icon: 'trophy',
    stat: 'wins',
    goal: 1,
    reward: { coins: 80, gems: 0 },
  },
  {
    id: 'ach_25_wins',
    name: 'Seriensieger',
    description: 'Gewinne 25 Spiele',
    icon: 'trophy',
    stat: 'wins',
    goal: 25,
    reward: { coins: 500, gems: 10 },
  },
  {
    id: 'ach_100_correct',
    name: 'Klugscheißer',
    description: 'Beantworte 100 Fragen richtig',
    icon: 'bulb',
    stat: 'correctAnswers',
    goal: 100,
    reward: { coins: 300, gems: 5 },
  },
  {
    id: 'ach_perfect',
    name: 'Makellos',
    description: 'Spiele 5 perfekte Runden',
    icon: 'sparkles',
    stat: 'perfectRounds',
    goal: 5,
    reward: { coins: 250, gems: 5 },
  },
  {
    id: 'ach_streak_7',
    name: 'Treue Seele',
    description: 'Erreiche eine 7-Tage-Serie',
    icon: 'calendar',
    stat: 'bestStreak',
    goal: 7,
    reward: { coins: 350, gems: 10 },
  },
  {
    id: 'ach_daily_10',
    name: 'Tägliche Dosis',
    description: 'Schließe 10 Tages-Challenges ab',
    icon: 'today',
    stat: 'dailyChallenges',
    goal: 10,
    reward: { coins: 300, gems: 5 },
  },
  {
    id: 'ach_explorer',
    name: 'Entdecker',
    description: 'Spiele 5 verschiedene Modi',
    icon: 'compass',
    stat: 'modesPlayed',
    goal: 5,
    reward: { coins: 200, gems: 5 },
  },
  {
    id: 'ach_level_10',
    name: 'Aufstieg',
    description: 'Erreiche Level 10',
    icon: 'trending-up',
    stat: 'level',
    goal: 10,
    reward: { coins: 300, gems: 5 },
  },
  {
    id: 'ach_rich',
    name: 'Reich',
    description: 'Verdiene insgesamt 5000 Münzen',
    icon: 'cash',
    stat: 'coinsEarned',
    goal: 5000,
    reward: { coins: 0, gems: 25 },
  },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);
