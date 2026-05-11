// =============================================
// Утилиты для работы с турнирами
// Генерация матчей, подсчёт статистики, seeding
// =============================================

import type {
  TournamentFormat,
  GroupMatch,
  TeamStats,
  PlayoffMatch,
  PlayoffRound,
} from './tournament-types';

// --------------------------------------------------
// Генератор уникальных ID
// --------------------------------------------------
let _idCounter = 0;
export function uid(prefix: string = 'id'): string {
  _idCounter += 1;
  return `${prefix}-${Date.now()}-${_idCounter}`;
}

// --------------------------------------------------
// Следующая степень двойки >= n
// --------------------------------------------------
export function nextPowerOf2(n: number): number {
  if (n <= 1) return 2;
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

// --------------------------------------------------
// Стандартный seeding для турнирной сетки
// Возвращает порядок сидов: [1, 8, 4, 5, 2, 7, 3, 6] для size=8
// --------------------------------------------------
function generateSeedOrder(size: number): number[] {
  if (size === 1) return [1];
  if (size === 2) return [1, 2];

  const half = generateSeedOrder(size / 2);
  const result: number[] = [];
  for (const seed of half) {
    result.push(seed);
    result.push(size + 1 - seed);
  }
  return result;
}

// =============================================
// Групповой этап — круговая система
// =============================================

/**
 * Генерирует матчи круговой системы (каждый с каждым).
 * Используется метод «кругового вращения» (Berger tables).
 */
export function generateGroupMatches(participants: string[]): GroupMatch[] {
  const n = participants.length;
  if (n < 2) return [];

  // Для нечётного количества добавляем фиктивную команду (BYE)
  const teams = [...participants];
  const hasBye = n % 2 !== 0;
  if (hasBye) teams.push('BYE');

  const size = teams.length;
  const totalRounds = size - 1;
  const allMatches: GroupMatch[] = [];

  // Текущий раунд: фиксируем первую команду, остальные вращаем
  const currentRound = [...teams];

  for (let round = 0; round < totalRounds; round++) {
    for (let i = 0; i < size / 2; i++) {
      const home = currentRound[i];
      const away = currentRound[size - 1 - i];

      // Пропускаем матчи с BYE
      if (home !== 'BYE' && away !== 'BYE') {
        allMatches.push({
          id: uid('gm'),
          home,
          away,
          homeScore: null,
          awayScore: null,
          played: false,
        });
      }
    }

    // Вращение: первый фиксируется, остальные сдвигаются по кругу
    const last = currentRound.pop()!;
    currentRound.splice(1, 0, last);
  }

  return allMatches;
}

/**
 * Вычисляет статистику команд на основе сыгранных матчей.
 * Победа = 3 очка, ничья = 1, поражение = 0.
 * Результат отсортирован по убыванию очков.
 */
export function calculateTeamStats(
  matches: GroupMatch[],
  participants: string[],
): TeamStats[] {
  const statsMap = new Map<string, TeamStats>();

  // Инициализация
  for (const name of participants) {
    statsMap.set(name, {
      name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  // Обработка результатов
  for (const m of matches) {
    if (!m.played || m.homeScore === null || m.awayScore === null) continue;

    const home = statsMap.get(m.home);
    const away = statsMap.get(m.away);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (m.homeScore < m.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  // Подсчёт разницы мячей и сортировка
  const stats = Array.from(statsMap.values());
  for (const s of stats) {
    s.goalDifference = s.goalsFor - s.goalsAgainst;
  }

  stats.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  return stats;
}

/**
 * Группирует матчи по турам для удобного отображения.
 */
export function getGroupRounds(
  matches: GroupMatch[],
  participants: string[],
): GroupMatch[][] {
  const totalRounds =
    participants.length % 2 === 0
      ? participants.length - 1
      : participants.length;
  const rounds: GroupMatch[][] = Array.from({ length: totalRounds }, () => []);

  const matchesPerRound = Math.floor(participants.length / 2);
  matches.forEach((m, i) => {
    rounds[Math.floor(i / matchesPerRound)].push(m);
  });

  return rounds;
}

// =============================================
// Плей-офф — олимпийская система
// =============================================

/**
 * Генерирует сетку плей-офф.
 * Автоматически подстраивается под ближайшую степень двойки.
 * Если участников не хватает — генерируются бай (пропуски).
 */
export function generatePlayoffMatches(participants: string[]): PlayoffMatch[] {
  const n = participants.length;
  if (n < 2) return [];

  const bracketSize = nextPowerOf2(n);
  const totalRounds = Math.log2(bracketSize);
  const allMatches: PlayoffMatch[] = [];

  // Стандартный seeding
  const seedOrder = generateSeedOrder(bracketSize);

  // Создаём слоты: участники + null (бай)
  const slots: (string | null)[] = new Array(bracketSize).fill(null);
  for (let i = 0; i < n; i++) {
    slots[i] = participants[i];
  }

  // Раунд 1: пары по seeding-порядку
  for (let i = 0; i < bracketSize / 2; i++) {
    const homeSeed = seedOrder[i * 2] - 1;
    const awaySeed = seedOrder[i * 2 + 1] - 1;
    const home = slots[homeSeed];
    const away = slots[awaySeed];
    const isBye = home === null || away === null;

    allMatches.push({
      id: uid('pm'),
      round: 0,
      position: i,
      home,
      away,
      homeScore: null,
      awayScore: null,
      winner: isBye ? (home ?? away) : null, // При бае — автопобеда
      isBye,
    });
  }

  // Последующие раунды: пустые слоты (победители определятся позже)
  let matchesInRound = bracketSize / 2;
  for (let round = 1; round < totalRounds; round++) {
    matchesInRound = matchesInRound / 2;
    for (let pos = 0; pos < matchesInRound; pos++) {
      allMatches.push({
        id: uid('pm'),
        round,
        position: pos,
        home: null,
        away: null,
        homeScore: null,
        awayScore: null,
        winner: null,
        isBye: false,
      });
    }
  }

  // Заполняем ссылки на следующие матчи и propagate баи
  propagateByesAndLinks(allMatches, bracketSize, totalRounds);

  return allMatches;
}

/**
 * Заполняет связи между матчами (какой матч ведёт в какой).
 * Пропагирует баи в следующие раунды.
 */
function propagateByesAndLinks(
  matches: PlayoffMatch[],
  bracketSize: number,
  totalRounds: number,
) {
  // Для каждого матча находим, в какой матч он ведёт
  const matchByRoundPos = new Map<string, PlayoffMatch>();
  for (const m of matches) {
    matchByRoundPos.set(`${m.round}-${m.position}`, m);
  }

  // Заполняем home/away для матчей раунда > 0 на основе победителей
  for (let round = 0; round < totalRounds - 1; round++) {
    const roundMatches = matches.filter((m) => m.round === round);
    for (const m of roundMatches) {
      const nextMatch = matchByRoundPos.get(`${round + 1}-${Math.floor(m.position / 2)}`);
      if (!nextMatch) continue;

      if (m.position % 2 === 0) {
        // Чётная позиция → home
        if (m.winner !== null) {
          nextMatch.home = m.winner;
        }
      } else {
        // Нечётная → away
        if (m.winner !== null) {
          nextMatch.away = m.winner;
        }
      }
    }

    // Если у следующего матча оба участника определены — проверяем бай
    const nextRoundMatches = matches.filter((mm) => mm.round === round + 1);
    for (const nm of nextRoundMatches) {
      if (nm.home !== null && nm.away === null && nm.home.startsWith('__bye_')) {
        nm.winner = nm.home;
        nm.isBye = true;
      } else if (nm.away !== null && nm.home === null && nm.away.startsWith('__bye_')) {
        nm.winner = nm.away;
        nm.isBye = true;
      }
    }
  }
}

/**
 * Обновляет победителя матча и продвигает его в следующий раунд.
 */
export function advancePlayoffWinner(
  matches: PlayoffMatch[],
  matchId: string,
  winner: string,
): PlayoffMatch[] {
  const updated = matches.map((m) => ({ ...m }));
  const match = updated.find((m) => m.id === matchId);
  if (!match) return updated;

  match.winner = winner;

  // Найти следующий матч
  const nextMatch = updated.find(
    (m) =>
      m.round === match.round + 1 &&
      m.position === Math.floor(match.position / 2),
  );

  if (nextMatch) {
    if (match.position % 2 === 0) {
      nextMatch.home = winner;
    } else {
      nextMatch.away = winner;
    }

    // Если оба участника определены и один из них — «авто» (bye propagation),
    // проверяем, нужно ли продвинуть автоматически
    if (nextMatch.home !== null && nextMatch.away !== null) {
      // Не автовыбор — ждём ручного ввода
    }
  }

  return updated;
}

/**
 * Организует матчи плей-офф по раундам.
 */
export function getPlayoffRounds(matches: PlayoffMatch[]): PlayoffRound[] {
  const totalRounds =
    matches.length > 0 ? Math.max(...matches.map((m) => m.round)) + 1 : 0;

  const roundNames: Record<number, string> = {};
  if (totalRounds >= 1)
    roundNames[totalRounds - 1] = '🏆 Финал';
  if (totalRounds >= 2) roundNames[totalRounds - 2] = 'Полуфинал';
  if (totalRounds >= 3) roundNames[totalRounds - 3] = 'Четвертьфинал';

  const rounds: PlayoffRound[] = [];
  for (let r = 0; r < totalRounds; r++) {
    rounds.push({
      roundNumber: r,
      name: roundNames[r] || `Раунд ${r + 1}`,
      matches: matches
        .filter((m) => m.round === r)
        .sort((a, b) => a.position - b.position),
    });
  }

  return rounds;
}

/**
 * Проверяет, завершён ли турнир (определён победитель финала).
 */
export function isPlayoffComplete(matches: PlayoffMatch[]): boolean {
  const finalRound = Math.max(0, ...matches.map((m) => m.round));
  const finalMatch = matches.find(
    (m) => m.round === finalRound && m.position === 0,
  );
  return finalMatch?.winner !== null && finalMatch?.winner !== undefined;
}

/**
 * Проверяет, все ли матчи группового этапа сыграны.
 */
export function isGroupComplete(matches: GroupMatch[]): boolean {
  return matches.length > 0 && matches.every((m) => m.played);
}
