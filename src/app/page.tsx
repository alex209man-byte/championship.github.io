'use client';

import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  Users,
  ChevronRight,
  ArrowLeft,
  Medal,
  Save,
  Swords,
  LayoutGrid,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useTournamentStore } from '@/lib/tournament-store';
import { calculateTeamStats, getGroupRounds, getPlayoffRounds } from '@/lib/tournament-utils';
import type { GroupMatch, PlayoffMatch } from '@/lib/tournament-types';
import { toast } from 'sonner';

// =============================================
// Главная страница — Управление турнирами
// =============================================

export default function Home() {
  const {
    tournaments,
    activeTournamentId,
    setActiveTournament,
    createTournament,
    deleteTournament,
    addParticipant,
    removeParticipant,
    startTournament,
    resetTournament,
    saveGroupResult,
    savePlayoffResult,
    setPlayoffScore,
    groupMatches,
    playoffMatches,
  } = useTournamentStore();

  const activeTournament = tournaments.find((t) => t.id === activeTournamentId) ?? null;

  // Форма создания турнира
  const [newName, setNewName] = useState('');
  const [newFormat, setNewFormat] = useState<'group' | 'playoff'>('group');

  // Форма добавления участника
  const [participantName, setParticipantName] = useState('');

  // Текущие матчи активного турнира
  const currentGroupMatches = activeTournamentId ? groupMatches[activeTournamentId] ?? [] : [];
  const currentPlayoffMatches = activeTournamentId ? playoffMatches[activeTournamentId] ?? [] : [];

  // ---------- Обработчики ----------

  const handleCreateTournament = () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Введите название турнира');
      return;
    }
    createTournament(name, newFormat);
    setNewName('');
    toast.success(`Турнир "${name}" создан`);
  };

  const handleAddParticipant = () => {
    const name = participantName.trim();
    if (!name || !activeTournamentId) return;
    if (activeTournament?.participants.includes(name)) {
      toast.error('Такой участник уже есть');
      return;
    }
    addParticipant(activeTournamentId, name);
    setParticipantName('');
    toast.success(`Участник "${name}" добавлен`);
  };

  const handleStartTournament = () => {
    if (!activeTournamentId) return;
    if ((activeTournament?.participants.length ?? 0) < 2) {
      toast.error('Нужно минимум 2 участника');
      return;
    }
    startTournament(activeTournamentId);
    toast.success('Турнир начат!');
  };

  const handleResetTournament = () => {
    if (!activeTournamentId) return;
    resetTournament(activeTournamentId);
    toast.success('Турнир сброшен');
  };

  // ---------- Рендер ----------

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Шапка */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-emerald-600" />
          <h1 className="text-lg font-bold tracking-tight">Турнирный менеджер</h1>
          {activeTournament && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <Badge variant="secondary" className="font-semibold">
                {activeTournament.name}
              </Badge>
              <Badge
                variant={activeTournament.status === 'completed' ? 'default' : 'outline'}
                className={
                  activeTournament.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : activeTournament.status === 'completed'
                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : ''
                }
              >
                {activeTournament.status === 'setup' && 'Настройка'}
                {activeTournament.status === 'active' && 'Активен'}
                {activeTournament.status === 'completed' && 'Завершён'}
              </Badge>
            </>
          )}
          {activeTournament && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto lg:hidden"
              onClick={() => setActiveTournament(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Все турниры
            </Button>
          )}
        </div>
      </header>

      {/* Основной контент */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {!activeTournament ? (
          /* ========== Список турниров ========== */
          <TournamentListView
            tournaments={tournaments}
            onSelect={setActiveTournament}
            onDelete={deleteTournament}
            newName={newName}
            setNewName={setNewName}
            newFormat={newFormat}
            setNewFormat={setNewFormat}
            onCreate={handleCreateTournament}
          />
        ) : (
          /* ========== Активный турнир ========== */
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Боковая панель (десктоп) */}
            <aside className="hidden lg:flex flex-col gap-4">
              {/* Информация о турнире */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{activeTournament.name}</CardTitle>
                  <CardDescription>
                    {activeTournament.format === 'group' ? 'Групповой этап' : 'Плей-офф'} ·{' '}
                    {activeTournament.participants.length} уч.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setActiveTournament(null)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Все турниры
                  </Button>
                </CardContent>
              </Card>

              {/* Список других турниров */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground">Другие турниры</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {tournaments
                    .filter((t) => t.id !== activeTournamentId)
                    .map((t) => (
                      <button
                        key={t.id}
                        className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors truncate"
                        onClick={() => setActiveTournament(t.id)}
                      >
                        {t.name}
                      </button>
                    ))}
                  {tournaments.length <= 1 && (
                    <p className="text-xs text-muted-foreground px-3 py-2">
                      Нет других турниров
                    </p>
                  )}
                </CardContent>
              </Card>
            </aside>

            {/* Основная панель */}
            <div className="space-y-6">
              <Tabs defaultValue="setup" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="setup" className="gap-1.5">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Участники</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="matches"
                    disabled={activeTournament.status === 'setup'}
                    className="gap-1.5"
                  >
                    {activeTournament.format === 'group' ? (
                      <LayoutGrid className="h-4 w-4" />
                    ) : (
                      <Swords className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Матчи</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="standings"
                    disabled={activeTournament.status === 'setup'}
                    className="gap-1.5"
                  >
                    <Medal className="h-4 w-4" />
                    <span className="hidden sm:inline">Таблица</span>
                  </TabsTrigger>
                </TabsList>

                {/* ---- Вкладка: Участники ---- */}
                <TabsContent value="setup" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-emerald-600" />
                        Управление участниками
                      </CardTitle>
                      <CardDescription>
                        Добавьте минимум 2 участников, чтобы начать турнир
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {activeTournament.status === 'setup' && (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Имя участника"
                            value={participantName}
                            onChange={(e) => setParticipantName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddParticipant()}
                            className="flex-1"
                          />
                          <Button onClick={handleAddParticipant} disabled={!participantName.trim()}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {activeTournament.participants.length > 0 ? (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {activeTournament.participants.map((p, i) => (
                            <div
                              key={`${p}-${i}`}
                              className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground w-6">
                                  {i + 1}.
                                </span>
                                <span className="font-medium text-sm">{p}</span>
                              </div>
                              {activeTournament.status === 'setup' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    removeParticipant(activeTournamentId!, p);
                                    toast.success(`"${p}" удалён`);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Пока нет участников</p>
                        </div>
                      )}

                      <Separator />

                      <div className="flex flex-wrap gap-2">
                        {activeTournament.status === 'setup' && (
                          <Button
                            onClick={handleStartTournament}
                            disabled={activeTournament.participants.length < 2}
                            className="bg-emerald-600 hover:bg-emerald-700"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Начать турнир
                          </Button>
                        )}
                        {activeTournament.status !== 'setup' && (
                          <Button variant="outline" onClick={handleResetTournament}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Сбросить турнир
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Удалить турнир
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить турнир?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Турнир &laquo;{activeTournament.name}&raquo; и все его данные будут
                                безвозвратно удалены.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  deleteTournament(activeTournamentId!);
                                  toast.success('Турнир удалён');
                                }}
                                className="bg-destructive text-white hover:bg-destructive/90"
                              >
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ---- Вкладка: Матчи ---- */}
                <TabsContent value="matches" className="mt-4">
                  {activeTournament.format === 'group' ? (
                    <GroupMatchesView
                      matches={currentGroupMatches}
                      tournamentId={activeTournamentId!}
                      onSave={saveGroupResult}
                      participants={activeTournament.participants}
                    />
                  ) : (
                    <PlayoffBracketView
                      matches={currentPlayoffMatches}
                      tournamentId={activeTournamentId!}
                      onWinnerClick={savePlayoffResult}
                      onSetScore={setPlayoffScore}
                    />
                  )}
                </TabsContent>

                {/* ---- Вкладка: Таблица / Результат ---- */}
                <TabsContent value="standings" className="mt-4">
                  {activeTournament.format === 'group' ? (
                    <StandingsView
                      matches={currentGroupMatches}
                      participants={activeTournament.participants}
                    />
                  ) : (
                    <PlayoffResultView matches={currentPlayoffMatches} />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </main>

      {/* Футер */}
      <footer className="border-t mt-auto py-4 text-center text-xs text-muted-foreground bg-white/80 backdrop-blur-md">
        Турнирный менеджер · Данные хранятся в браузере
      </footer>
    </div>
  );
}

// =============================================
// Компонент: Список турниров
// =============================================

function TournamentListView({
  tournaments,
  onSelect,
  onDelete,
  newName,
  setNewName,
  newFormat,
  setNewFormat,
  onCreate,
}: {
  tournaments: { id: string; name: string; format: string; participants: string[]; status: string; createdAt: number }[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  newName: string;
  setNewName: (v: string) => void;
  newFormat: 'group' | 'playoff';
  setNewFormat: (v: 'group' | 'playoff') => void;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Форма создания */}
      <Card className="border-emerald-200/50 bg-gradient-to-br from-emerald-50/50 to-white">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-600" />
            Создать турнир
          </CardTitle>
          <CardDescription>Заполните данные и нажмите «Создать»</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Название</label>
            <Input
              placeholder="Например: Чемпионат офиса"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onCreate()}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Формат</label>
            <Select value={newFormat} onValueChange={(v) => setNewFormat(v as 'group' | 'playoff')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="group">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Групповой этап (каждый с каждым)
                  </div>
                </SelectItem>
                <SelectItem value="playoff">
                  <div className="flex items-center gap-2">
                    <Swords className="h-4 w-4" />
                    Олимпийская система (плей-офф)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onCreate} disabled={!newName.trim()} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Создать турнир
          </Button>
        </CardContent>
      </Card>

      {/* Список существующих турниров */}
      {tournaments.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            Ваши турниры ({tournaments.length})
          </h2>
          <div className="space-y-2">
            {tournaments.map((t) => (
              <Card
                key={t.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => onSelect(t.id)}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{t.name}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {t.format === 'group' ? 'Группы' : 'Плей-офф'}
                      </Badge>
                      <span>{t.participants.length} уч.</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          t.status === 'active'
                            ? 'border-emerald-300 text-emerald-600'
                            : t.status === 'completed'
                            ? 'border-amber-300 text-amber-600'
                            : ''
                        }`}
                      >
                        {t.status === 'setup' && 'Настройка'}
                        {t.status === 'active' && 'Активен'}
                        {t.status === 'completed' && 'Завершён'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить турнир?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Турнир &laquo;{t.name}&raquo; будет удалён навсегда.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(t.id);
                              toast.success('Турнир удалён');
                            }}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tournaments.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Trophy className="h-16 w-16 mx-auto mb-4 opacity-15" />
          <p className="text-lg font-medium">Нет турниров</p>
          <p className="text-sm mt-1">Создайте первый турнир, чтобы начать</p>
        </div>
      )}
    </div>
  );
}

// =============================================
// Компонент: Матчи группового этапа
// =============================================

function GroupMatchesView({
  matches,
  tournamentId,
  onSave,
  participants,
}: {
  matches: GroupMatch[];
  tournamentId: string;
  onSave: (tid: string, mid: string, hs: number, as: number) => void;
  participants: string[];
}) {
  const rounds = useMemo(() => getGroupRounds(matches, participants), [matches, participants]);

  // Локальное состояние для ввода счёта
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});

  // Инициализируем начальные значения
  React.useEffect(() => {
    const initial: Record<string, { home: string; away: string }> = {};
    for (const m of matches) {
      initial[m.id] = {
        home: m.homeScore !== null ? String(m.homeScore) : '',
        away: m.awayScore !== null ? String(m.awayScore) : '',
      };
    }
    setScores(initial);
  }, [matches]);

  const handleSave = (matchId: string) => {
    const s = scores[matchId];
    if (!s) return;
    const hs = parseInt(s.home, 10);
    const as = parseInt(s.away, 10);
    if (isNaN(hs) || isNaN(as)) {
      toast.error('Введите корректный счёт');
      return;
    }
    if (hs < 0 || as < 0) {
      toast.error('Счёт не может быть отрицательным');
      return;
    }
    onSave(tournamentId, matchId, hs, as);
    toast.success('Результат сохранён');
  };

  const playedCount = matches.filter((m) => m.played).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-emerald-600" />
          Расписание матчей
        </CardTitle>
        <CardDescription>
          Сыграно {playedCount} из {matches.length} матчей
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {rounds.map((round, ri) => (
          <div key={ri}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Тур {ri + 1}
            </h3>
            <div className="space-y-2">
              {round.map((match) => (
                <div
                  key={match.id}
                  className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border ${
                    match.played ? 'bg-emerald-50/50 border-emerald-200/50' : 'bg-muted/30'
                  }`}
                >
                  {/* Команды */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    {match.played && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    )}
                    {!match.played && (
                      <Circle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                    )}
                    <span className={`font-medium text-sm truncate ${match.played && match.homeScore! > match.awayScore! ? 'text-emerald-700' : ''}`}>
                      {match.home}
                    </span>
                    <span className="text-muted-foreground text-xs">vs</span>
                    <span className={`font-medium text-sm truncate ${match.played && match.awayScore! > match.homeScore! ? 'text-emerald-700' : ''}`}>
                      {match.away}
                    </span>
                  </div>

                  {/* Счёт */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        className="w-14 h-8 text-center text-sm"
                        value={scores[match.id]?.home ?? ''}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [match.id]: {
                              home: e.target.value,
                              away: prev[match.id]?.away ?? '',
                            },
                          }))
                        }
                      />
                      <span className="text-muted-foreground font-bold">:</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        className="w-14 h-8 text-center text-sm"
                        value={scores[match.id]?.away ?? ''}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [match.id]: {
                              home: prev[match.id]?.home ?? '',
                              away: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleSave(match.id)}>
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Результат */}
                  {match.played && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {match.homeScore} : {match.awayScore}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            {ri < rounds.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// =============================================
// Компонент: Турнирная таблица (статистика)
// =============================================

function StandingsView({
  matches,
  participants,
}: {
  matches: GroupMatch[];
  participants: string[];
}) {
  const stats = useMemo(
    () => calculateTeamStats(matches, participants),
    [matches, participants],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Medal className="h-5 w-5 text-emerald-600" />
          Турнирная таблица
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 text-center">#</TableHead>
                <TableHead>Команда</TableHead>
                <TableHead className="text-center">И</TableHead>
                <TableHead className="text-center">В</TableHead>
                <TableHead className="text-center">Н</TableHead>
                <TableHead className="text-center">П</TableHead>
                <TableHead className="text-center">МЗ</TableHead>
                <TableHead className="text-center">МП</TableHead>
                <TableHead className="text-center">РМ</TableHead>
                <TableHead className="text-center font-bold">О</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((s, i) => (
                <TableRow
                  key={s.name}
                  className={i === 0 && stats[0]?.points > 0 ? 'bg-emerald-50/70' : ''}
                >
                  <TableCell className="text-center font-bold text-muted-foreground">
                    {i + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {i === 0 && stats[0]?.points > 0 && (
                        <span className="text-lg">🥇</span>
                      )}
                      {i === 1 && stats[1]?.points > 0 && (
                        <span className="text-lg">🥈</span>
                      )}
                      {i === 2 && stats[2]?.points > 0 && (
                        <span className="text-lg">🥉</span>
                      )}
                      {s.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{s.played}</TableCell>
                  <TableCell className="text-center text-emerald-600 font-medium">{s.won}</TableCell>
                  <TableCell className="text-center text-amber-600">{s.drawn}</TableCell>
                  <TableCell className="text-center text-destructive">{s.lost}</TableCell>
                  <TableCell className="text-center">{s.goalsFor}</TableCell>
                  <TableCell className="text-center">{s.goalsAgainst}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={
                        s.goalDifference > 0
                          ? 'text-emerald-600'
                          : s.goalDifference < 0
                          ? 'text-destructive'
                          : ''
                      }
                    >
                      {s.goalDifference > 0 ? '+' : ''}
                      {s.goalDifference}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-bold text-base">{s.points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================
// Компонент: Сетка плей-офф (визуализация)
// =============================================

function PlayoffBracketView({
  matches,
  tournamentId,
  onWinnerClick,
  onSetScore,
}: {
  matches: PlayoffMatch[];
  tournamentId: string;
  onWinnerClick: (tid: string, mid: string, winner: string) => void;
  onSetScore: (tid: string, mid: string, hs: number, as: number, winner: string) => void;
}) {
  const rounds = useMemo(() => getPlayoffRounds(matches), [matches]);
  const totalRounds = rounds.length;
  const finalRound = totalRounds - 1;

  // Локальное состояние для ввода счёта
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  const handleScoreSubmit = (matchId: string) => {
    const hs = parseInt(homeScore, 10);
    const as = parseInt(awayScore, 10);
    if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0) {
      toast.error('Введите корректный счёт');
      return;
    }
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;
    const winner = hs > as ? match.home : as > hs ? match.away : '';
    if (!winner) {
      toast.error('В плей-офф не бывает ничьих! Введите разные счёты.');
      return;
    }
    onSetScore(tournamentId, matchId, hs, as, winner);
    setEditingMatchId(null);
    setHomeScore('');
    setAwayScore('');
    toast.success('Результат сохранён');
  };

  const handleQuickWinner = (matchId: string, winner: string) => {
    onWinnerClick(tournamentId, matchId, winner);
    toast.success(`${winner} побеждает!`);
  };

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Нет матчей для отображения
        </CardContent>
      </Card>
    );
  }

  // Финальный матч для отображения крупно
  const finalMatch = rounds[finalRound]?.matches[0];

  return (
    <div className="space-y-6">
      {/* Финал — крупно */}
      {finalMatch && (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-white">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">🏆 Финал</CardTitle>
          </CardHeader>
          <CardContent>
            <FinalMatchCard
              match={finalMatch}
              isEditing={editingMatchId === finalMatch.id}
              homeScore={homeScore}
              awayScore={awayScore}
              onStartEdit={() => {
                setEditingMatchId(finalMatch.id);
                setHomeScore('');
                setAwayScore('');
              }}
              onCancelEdit={() => setEditingMatchId(null)}
              onHomeScoreChange={setHomeScore}
              onAwayScoreChange={setAwayScore}
              onSubmit={() => handleScoreSubmit(finalMatch.id)}
              onQuickWinner={(w) => handleQuickWinner(finalMatch.id, w)}
            />
          </CardContent>
        </Card>
      )}

      {/* Полная сетка — горизонтальная прокрутка */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Swords className="h-5 w-5 text-emerald-600" />
            Турнирная сетка
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-4">
            <div className="min-w-fit">
              <BracketTree
                rounds={rounds}
                totalRounds={totalRounds}
                editingMatchId={editingMatchId}
                homeScore={homeScore}
                awayScore={awayScore}
                onStartEdit={(id) => {
                  setEditingMatchId(id);
                  setHomeScore('');
                  setAwayScore('');
                }}
                onCancelEdit={() => setEditingMatchId(null)}
                onHomeScoreChange={setHomeScore}
                onAwayScoreChange={setAwayScore}
                onSubmit={handleScoreSubmit}
                onQuickWinner={handleQuickWinner}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================
// Компонент: Финальная карточка матча
// =============================================

function FinalMatchCard({
  match,
  isEditing,
  homeScore,
  awayScore,
  onStartEdit,
  onCancelEdit,
  onHomeScoreChange,
  onAwayScoreChange,
  onSubmit,
  onQuickWinner,
}: {
  match: PlayoffMatch;
  isEditing: boolean;
  homeScore: string;
  awayScore: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onHomeScoreChange: (v: string) => void;
  onAwayScoreChange: (v: string) => void;
  onSubmit: () => void;
  onQuickWinner: (w: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-4">
        {/* Команда 1 */}
        <button
          className={`px-4 py-3 rounded-lg border-2 text-center min-w-[140px] transition-all ${
            match.winner === match.home
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md'
              : match.winner && match.winner !== match.home
              ? 'border-muted bg-muted/30 opacity-60'
              : match.isBye
              ? 'border-muted bg-muted/30'
              : 'border-border hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer'
          }`}
          onClick={() => {
            if (match.home && !match.winner && !match.isBye) {
              onQuickWinner(match.home!);
            }
          }}
          disabled={match.isBye || match.winner !== null}
        >
          <div className="font-bold text-sm">
            {match.home ?? '—'}
          </div>
        </button>

        {/* Счёт / VS */}
        <div className="flex flex-col items-center gap-1">
          {match.winner ? (
            <div className="text-2xl font-bold">
              {match.homeScore ?? '-'} : {match.awayScore ?? '-'}
            </div>
          ) : isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="0"
                className="w-14 h-9 text-center"
                value={homeScore}
                onChange={(e) => onHomeScoreChange(e.target.value)}
                autoFocus
              />
              <span className="font-bold text-lg">:</span>
              <Input
                type="number"
                min="0"
                className="w-14 h-9 text-center"
                value={awayScore}
                onChange={(e) => onAwayScoreChange(e.target.value)}
              />
            </div>
          ) : (
            <span className="text-xl font-bold text-muted-foreground">VS</span>
          )}
          {match.isBye && (
            <span className="text-xs text-amber-600 font-medium">Авто</span>
          )}
        </div>

        {/* Команда 2 */}
        <button
          className={`px-4 py-3 rounded-lg border-2 text-center min-w-[140px] transition-all ${
            match.winner === match.away
              ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md'
              : match.winner && match.winner !== match.away
              ? 'border-muted bg-muted/30 opacity-60'
              : match.isBye
              ? 'border-muted bg-muted/30'
              : 'border-border hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer'
          }`}
          onClick={() => {
            if (match.away && !match.winner && !match.isBye) {
              onQuickWinner(match.away!);
            }
          }}
          disabled={match.isBye || match.winner !== null}
        >
          <div className="font-bold text-sm">
            {match.away ?? '—'}
          </div>
        </button>
      </div>

      {/* Кнопки управления */}
      {!match.winner && !match.isBye && match.home && match.away && (
        <div className="flex justify-center gap-2">
          {isEditing ? (
            <>
              <Button size="sm" onClick={onSubmit} className="bg-emerald-600 hover:bg-emerald-700">
                <Save className="h-3.5 w-3.5 mr-1" />
                Сохранить
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                Отмена
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={onStartEdit}>
              Ввести счёт
            </Button>
          )}
        </div>
      )}

      {/* Победитель */}
      {match.winner && (
        <div className="text-center pt-2">
          <Badge className="bg-amber-500 text-white text-sm px-3 py-1">
            🏆 Победитель: {match.winner}
          </Badge>
        </div>
      )}
    </div>
  );
}

// =============================================
// Компонент: Дерево скобок (рекурсивный рендеринг)
// =============================================

function BracketTree({
  rounds,
  totalRounds,
  editingMatchId,
  homeScore,
  awayScore,
  onStartEdit,
  onCancelEdit,
  onHomeScoreChange,
  onAwayScoreChange,
  onSubmit,
  onQuickWinner,
}: {
  rounds: { roundNumber: number; name: string; matches: PlayoffMatch[] }[];
  totalRounds: number;
  editingMatchId: string | null;
  homeScore: string;
  awayScore: string;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onHomeScoreChange: (v: string) => void;
  onAwayScoreChange: (v: string) => void;
  onSubmit: (id: string) => void;
  onQuickWinner: (id: string, w: string) => void;
}) {
  // Финальный матч — корень дерева
  const finalMatch = rounds[totalRounds - 1]?.matches[0];
  if (!finalMatch) return null;

  return (
    <div className="flex items-stretch justify-start">
      <BracketNode
        match={finalMatch}
        rounds={rounds}
        roundIndex={totalRounds - 1}
        editingMatchId={editingMatchId}
        homeScore={homeScore}
        awayScore={awayScore}
        onStartEdit={onStartEdit}
        onCancelEdit={onCancelEdit}
        onHomeScoreChange={onHomeScoreChange}
        onAwayScoreChange={onAwayScoreChange}
        onSubmit={onSubmit}
        onQuickWinner={onQuickWinner}
        isFinal={false}
      />
    </div>
  );
}

function BracketNode({
  match,
  rounds,
  roundIndex,
  editingMatchId,
  homeScore,
  awayScore,
  onStartEdit,
  onCancelEdit,
  onHomeScoreChange,
  onAwayScoreChange,
  onSubmit,
  onQuickWinner,
  isFinal,
}: {
  match: PlayoffMatch;
  rounds: { roundNumber: number; name: string; matches: PlayoffMatch[] }[];
  roundIndex: number;
  editingMatchId: string | null;
  homeScore: string;
  awayScore: string;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onHomeScoreChange: (v: string) => void;
  onAwayScoreChange: (v: string) => void;
  onSubmit: (id: string) => void;
  onQuickWinner: (id: string, w: string) => void;
  isFinal: boolean;
}) {
  // Первый раунд — листовой узел
  if (roundIndex === 0) {
    return (
      <BracketMatchCard
        match={match}
        isEditing={editingMatchId === match.id}
        homeScore={homeScore}
        awayScore={awayScore}
        onStartEdit={() => onStartEdit(match.id)}
        onCancelEdit={onCancelEdit}
        onHomeScoreChange={onHomeScoreChange}
        onAwayScoreChange={onAwayScoreChange}
        onSubmit={() => onSubmit(match.id)}
        onQuickWinner={(w) => onQuickWinner(match.id, w)}
      />
    );
  }

  // Находим детей в предыдущем раунде
  const prevRound = rounds[roundIndex - 1];
  // Позиция текущего матча в текущем раунде (совпадает с match.position)
  const currentRoundMatches = rounds[roundIndex].matches;
  const currentPos = currentRoundMatches.findIndex((m) => m.id === match.id);
  const leftChild = prevRound.matches[currentPos * 2];
  const rightChild = prevRound.matches[currentPos * 2 + 1];

  return (
    <div className="flex items-stretch">
      {/* Дерево слева */}
      <div className="flex flex-col">
        <div className="flex-1 flex items-center">
          {leftChild && (
            <BracketNode
              match={leftChild}
              rounds={rounds}
              roundIndex={roundIndex - 1}
              editingMatchId={editingMatchId}
              homeScore={homeScore}
              awayScore={awayScore}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onHomeScoreChange={onHomeScoreChange}
              onAwayScoreChange={onAwayScoreChange}
              onSubmit={onSubmit}
              onQuickWinner={onQuickWinner}
              isFinal={false}
            />
          )}
        </div>
        <div className="flex-1 flex items-center">
          {rightChild && (
            <BracketNode
              match={rightChild}
              rounds={rounds}
              roundIndex={roundIndex - 1}
              editingMatchId={editingMatchId}
              homeScore={homeScore}
              awayScore={awayScore}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onHomeScoreChange={onHomeScoreChange}
              onAwayScoreChange={onAwayScoreChange}
              onSubmit={onSubmit}
              onQuickWinner={onQuickWinner}
              isFinal={false}
            />
          )}
        </div>
      </div>

      {/* Соединительные линии */}
      <div className="w-6 sm:w-8 flex-shrink-0 relative">
        {/* Вертикальная линия справа */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-border" />
        {/* Горизонтальная линия по центру */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-border -translate-y-px" />
      </div>

      {/* Текущий матч */}
      <div className="flex items-center px-1 sm:px-2">
        <BracketMatchCard
          match={match}
          isEditing={editingMatchId === match.id}
          homeScore={homeScore}
          awayScore={awayScore}
          onStartEdit={() => onStartEdit(match.id)}
          onCancelEdit={onCancelEdit}
          onHomeScoreChange={onHomeScoreChange}
          onAwayScoreChange={onAwayScoreChange}
          onSubmit={() => onSubmit(match.id)}
          onQuickWinner={(w) => onQuickWinner(match.id, w)}
        />
      </div>
    </div>
  );
}

// =============================================
// Компонент: Карточка матча в сетке
// =============================================

function BracketMatchCard({
  match,
  isEditing,
  homeScore,
  awayScore,
  onStartEdit,
  onCancelEdit,
  onHomeScoreChange,
  onAwayScoreChange,
  onSubmit,
  onQuickWinner,
}: {
  match: PlayoffMatch;
  isEditing: boolean;
  homeScore: string;
  awayScore: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onHomeScoreChange: (v: string) => void;
  onAwayScoreChange: (v: string) => void;
  onSubmit: () => void;
  onQuickWinner: (w: string) => void;
}) {
  const canPlay = match.home !== null && match.away !== null && !match.winner && !match.isBye;

  return (
    <div
      className={`w-[160px] sm:w-[180px] rounded-lg border bg-card shadow-sm overflow-hidden ${
        match.winner ? 'border-emerald-200' : canPlay ? 'border-border hover:shadow-md transition-shadow' : 'border-muted'
      }`}
    >
      {/* Home */}
      <button
        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
          match.winner === match.home
            ? 'bg-emerald-50 font-bold text-emerald-700'
            : match.winner
            ? 'opacity-50'
            : canPlay
            ? 'hover:bg-emerald-50/50 cursor-pointer'
            : ''
        }`}
        onClick={() => canPlay && onQuickWinner(match.home!)}
        disabled={!canPlay}
      >
        <span className="flex-1 truncate">{match.home ?? '—'}</span>
        {match.winner === match.home && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />}
        {match.homeScore !== null && (
          <span className="font-mono font-bold text-sm">{match.homeScore}</span>
        )}
      </button>

      <div className="h-px bg-border" />

      {/* Away */}
      <button
        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
          match.winner === match.away
            ? 'bg-emerald-50 font-bold text-emerald-700'
            : match.winner
            ? 'opacity-50'
            : canPlay
            ? 'hover:bg-emerald-50/50 cursor-pointer'
            : ''
        }`}
        onClick={() => canPlay && onQuickWinner(match.away!)}
        disabled={!canPlay}
      >
        <span className="flex-1 truncate">{match.away ?? '—'}</span>
        {match.winner === match.away && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />}
        {match.awayScore !== null && (
          <span className="font-mono font-bold text-sm">{match.awayScore}</span>
        )}
      </button>

      {/* Действия */}
      {canPlay && (
        <div className="px-2 py-1.5 bg-muted/30 flex items-center gap-1">
          {isEditing ? (
            <>
              <Input
                type="number"
                min="0"
                placeholder="0"
                className="w-10 h-6 text-[10px] text-center p-0"
                value={homeScore}
                onChange={(e) => onHomeScoreChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              <span className="text-[10px] font-bold">:</span>
              <Input
                type="number"
                min="0"
                placeholder="0"
                className="w-10 h-6 text-[10px] text-center p-0"
                value={awayScore}
                onChange={(e) => onAwayScoreChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                className="ml-auto text-emerald-600 hover:text-emerald-700 p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onSubmit();
                }}
              >
                <Save className="h-3 w-3" />
              </button>
              <button
                className="text-muted-foreground hover:text-foreground p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelEdit();
                }}
              >
                ✕
              </button>
            </>
          ) : (
            <button
              className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
            >
              Ввести счёт
            </button>
          )}
        </div>
      )}

      {/* Bye */}
      {match.isBye && (
        <div className="px-2 py-1.5 bg-amber-50 text-center">
          <span className="text-[10px] text-amber-600 font-medium">
            {match.winner ? `→ ${match.winner}` : 'Авто'}
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================
// Компонент: Результат плей-офф (таблица)
// =============================================

function PlayoffResultView({ matches }: { matches: PlayoffMatch[] }) {
  const rounds = useMemo(() => getPlayoffRounds(matches), [matches]);
  const finalMatch = rounds.length > 0 ? rounds[rounds.length - 1].matches[0] : null;
  const isComplete = finalMatch?.winner !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-emerald-600" />
          Результаты плей-офф
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isComplete && finalMatch && (
          <div className="text-center py-6 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-200">
            <div className="text-4xl mb-3">🏆</div>
            <div className="text-2xl font-bold text-amber-700">{finalMatch.winner}</div>
            <div className="text-sm text-amber-600 mt-1">Победитель турнира!</div>
            {finalMatch.homeScore !== null && finalMatch.awayScore !== null && (
              <div className="text-lg font-mono mt-2 text-amber-800">
                {finalMatch.home} {finalMatch.homeScore} : {finalMatch.awayScore} {finalMatch.away}
              </div>
            )}
          </div>
        )}

        {!isComplete && (
          <div className="text-center py-8 text-muted-foreground">
            <Swords className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Турнир ещё не завершён</p>
            <p className="text-xs mt-1">Определите победителей всех матчей</p>
          </div>
        )}

        {/* История по раундам */}
        {rounds.map((round) => (
          <div key={round.roundNumber}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">{round.name}</h3>
            <div className="space-y-2">
              {round.matches.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    m.winner ? 'bg-emerald-50/50' : 'bg-muted/30'
                  }`}
                >
                  <span className={m.winner === m.home ? 'font-bold text-emerald-700' : ''}>
                    {m.home ?? '—'}
                  </span>
                  {m.winner ? (
                    <span className="font-mono font-bold">
                      {m.homeScore ?? '-'} : {m.awayScore ?? '-'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">vs</span>
                  )}
                  <span className={m.winner === m.away ? 'font-bold text-emerald-700' : ''}>
                    {m.away ?? '—'}
                  </span>
                  {m.isBye && (
                    <Badge variant="outline" className="text-[10px] ml-auto">Бай</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
