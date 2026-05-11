// =============================================
// Хранилище состояния турниров (Zustand + localStorage)
// Все данные турнира сохраняются в localStorage
// =============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tournament, GroupMatch, PlayoffMatch } from './tournament-types';
import {
  generateGroupMatches,
  generatePlayoffMatches,
  calculateTeamStats,
  isGroupComplete,
  isPlayoffComplete,
} from './tournament-utils';

// ---------- Состояние хранилища ----------

interface TournamentStore {
  // Данные
  tournaments: Tournament[];
  activeTournamentId: string | null;
  groupMatches: Record<string, GroupMatch[]>;     // tournamentId → матчи
  playoffMatches: Record<string, PlayoffMatch[]>;  // tournamentId → матчи

  // Вычисляемые (derived) — получаем через геттеры вне zustанда

  // Действия
  createTournament: (name: string, format: 'group' | 'playoff') => string;
  deleteTournament: (id: string) => void;
  setActiveTournament: (id: string | null) => void;
  renameTournament: (id: string, name: string) => void;

  addParticipant: (tournamentId: string, name: string) => void;
  removeParticipant: (tournamentId: string, name: string) => void;

  startTournament: (tournamentId: string) => void;
  resetTournament: (tournamentId: string) => void;

  saveGroupResult: (
    tournamentId: string,
    matchId: string,
    homeScore: number,
    awayScore: number,
  ) => void;

  savePlayoffResult: (
    tournamentId: string,
    matchId: string,
    winner: string,
  ) => void;

  setPlayoffScore: (
    tournamentId: string,
    matchId: string,
    homeScore: number,
    awayScore: number,
    winner: string,
  ) => void;
}

// ---------- Утилита для генерации ID ----------

let _c = 0;
function makeId(): string {
  _c += 1;
  return `t-${Date.now()}-${_c}`;
}

// ---------- Хранилище ----------

export const useTournamentStore = create<TournamentStore>()(
  persist(
    (set, get) => ({
      // Начальное состояние
      tournaments: [],
      activeTournamentId: null,
      groupMatches: {},
      playoffMatches: {},

      // Создание турнира
      createTournament: (name, format) => {
        const id = makeId();
        const tournament: Tournament = {
          id,
          name,
          format,
          participants: [],
          status: 'setup',
          createdAt: Date.now(),
        };
        set((state) => ({
          tournaments: [...state.tournaments, tournament],
          activeTournamentId: id,
        }));
        return id;
      },

      // Удаление турнира
      deleteTournament: (id) => {
        set((state) => {
          const newTournaments = state.tournaments.filter((t) => t.id !== id);
          const newActive =
            state.activeTournamentId === id
              ? newTournaments.length > 0
                ? newTournaments[0].id
                : null
              : state.activeTournamentId;

          // Очистка матчей
          const newGroupMatches = { ...state.groupMatches };
          const newPlayoffMatches = { ...state.playoffMatches };
          delete newGroupMatches[id];
          delete newPlayoffMatches[id];

          return {
            tournaments: newTournaments,
            activeTournamentId: newActive,
            groupMatches: newGroupMatches,
            playoffMatches: newPlayoffMatches,
          };
        });
      },

      // Переключение активного турнира
      setActiveTournament: (id) => set({ activeTournamentId: id }),

      // Переименование турнира
      renameTournament: (id, name) =>
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === id ? { ...t, name } : t,
          ),
        })),

      // Добавление участника
      addParticipant: (tournamentId, name) =>
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId && !t.participants.includes(name)
              ? { ...t, participants: [...t.participants, name] }
              : t,
          ),
        })),

      // Удаление участника (только в фазе setup)
      removeParticipant: (tournamentId, name) =>
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId && t.status === 'setup'
              ? { ...t, participants: t.participants.filter((p) => p !== name) }
              : t,
          ),
        })),

      // Старт турнира — генерация матчей
      startTournament: (tournamentId) => {
        const state = get();
        const tournament = state.tournaments.find((t) => t.id === tournamentId);
        if (!tournament || tournament.participants.length < 2) return;

        if (tournament.format === 'group') {
          const matches = generateGroupMatches(tournament.participants);
          set((s) => ({
            groupMatches: { ...s.groupMatches, [tournamentId]: matches },
            tournaments: s.tournaments.map((t) =>
              t.id === tournamentId ? { ...t, status: 'active' as const } : t,
            ),
          }));
        } else {
          const matches = generatePlayoffMatches(tournament.participants);
          set((s) => ({
            playoffMatches: { ...s.playoffMatches, [tournamentId]: matches },
            tournaments: s.tournaments.map((t) =>
              t.id === tournamentId ? { ...t, status: 'active' as const } : t,
            ),
          }));
        }
      },

      // Сброс турнира в фазу настройки
      resetTournament: (tournamentId) =>
        set((state) => ({
          tournaments: state.tournaments.map((t) =>
            t.id === tournamentId
              ? { ...t, status: 'setup' as const }
              : t,
          ),
          groupMatches: {
            ...state.groupMatches,
            [tournamentId]: [],
          },
          playoffMatches: {
            ...state.playoffMatches,
            [tournamentId]: [],
          },
        })),

      // Сохранение результата матча группового этапа
      saveGroupResult: (tournamentId, matchId, homeScore, awayScore) =>
        set((state) => {
          const matches = state.groupMatches[tournamentId] ?? [];
          const updated = matches.map((m) =>
            m.id === matchId
              ? { ...m, homeScore, awayScore, played: true }
              : m,
          );

          // Проверяем завершённость
          const tournament = state.tournaments.find(
            (t) => t.id === tournamentId,
          );
          let status = tournament?.status ?? 'active';
          if (isGroupComplete(updated)) {
            status = 'completed';
          }

          return {
            groupMatches: { ...state.groupMatches, [tournamentId]: updated },
            tournaments: state.tournaments.map((t) =>
              t.id === tournamentId ? { ...t, status: status as Tournament['status'] } : t,
            ),
          };
        }),

      // Сохранение победителя плей-офф (клик по команде)
      savePlayoffResult: (tournamentId, matchId, winner) =>
        set((state) => {
          const matches = state.playoffMatches[tournamentId] ?? [];
          const updated = matches.map((m) =>
            m.id === matchId ? { ...m, winner } : m,
          );

          // Продвигаем победителя в следующий раунд
          const match = updated.find((m) => m.id === matchId);
          if (match) {
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
            }
          }

          // Проверяем завершённость
          const tournament = state.tournaments.find(
            (t) => t.id === tournamentId,
          );
          let status = tournament?.status ?? 'active';
          if (isPlayoffComplete(updated)) {
            status = 'completed';
          }

          return {
            playoffMatches: { ...state.playoffMatches, [tournamentId]: updated },
            tournaments: state.tournaments.map((t) =>
              t.id === tournamentId ? { ...t, status: status as Tournament['status'] } : t,
            ),
          };
        }),

      // Сохранение счёта плей-офф с определением победителя
      setPlayoffScore: (tournamentId, matchId, homeScore, awayScore, winner) =>
        set((state) => {
          const matches = state.playoffMatches[tournamentId] ?? [];
          const updated = matches.map((m) =>
            m.id === matchId
              ? { ...m, homeScore, awayScore, winner }
              : m,
          );

          // Продвигаем победителя
          const match = updated.find((m) => m.id === matchId);
          if (match) {
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
            }
          }

          // Проверяем завершённость
          const tournament = state.tournaments.find(
            (t) => t.id === tournamentId,
          );
          let status = tournament?.status ?? 'active';
          if (isPlayoffComplete(updated)) {
            status = 'completed';
          }

          return {
            playoffMatches: { ...state.playoffMatches, [tournamentId]: updated },
            tournaments: state.tournaments.map((t) =>
              t.id === tournamentId ? { ...t, status: status as Tournament['status'] } : t,
            ),
          };
        }),
    }),
    {
      name: 'tournament-manager-storage',
    },
  ),
);
