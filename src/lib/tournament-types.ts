// =============================================
// Типы данных для системы управления турнирами
// =============================================

/** Формат турнира */
export type TournamentFormat = 'group' | 'playoff';

/** Статус турнира */
export type TournamentStatus = 'setup' | 'active' | 'completed';

/** Турнир */
export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  participants: string[];
  status: TournamentStatus;
  createdAt: number;
}

/** Матч группового этапа */
export interface GroupMatch {
  id: string;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
}

/** Статистика команды в групповом этапе */
export interface TeamStats {
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

/** Матч плей-офф */
export interface PlayoffMatch {
  id: string;
  round: number;
  position: number;
  home: string | null;
  away: string | null;
  homeScore: number | null;
  awayScore: number | null;
  winner: string | null;
  isBye: boolean;
}

/** Раунд плей-офф */
export interface PlayoffRound {
  roundNumber: number;
  name: string;
  matches: PlayoffMatch[];
}
