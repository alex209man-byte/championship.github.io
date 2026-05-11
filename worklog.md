---
Task ID: 1
Agent: Main Developer
Task: Build a comprehensive Tournament Management Web Application

Work Log:
- Explored project structure: Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Zustand
- Created `src/lib/tournament-types.ts` — TypeScript types for Tournament, GroupMatch, PlayoffMatch, TeamStats
- Created `src/lib/tournament-utils.ts` — Utility functions:
  - `generateGroupMatches()` — round-robin (Berger tables) circle method
  - `calculateTeamStats()` — W/D/L/GF/GA/GD/Points calculation with sorting
  - `generatePlayoffMatches()` — bracket with standard seeding, auto-adjusts to nearest power of 2
  - `propagateByesAndLinks()` — handles bye propagation through rounds
  - `getPlayoffRounds()`, `getGroupRounds()`, `isPlayoffComplete()`, `isGroupComplete()`
- Created `src/lib/tournament-store.ts` — Zustand store with `persist` middleware (localStorage):
  - CRUD operations for tournaments
  - Participant management
  - Match generation and result saving
  - Winner advancement in playoff bracket
- Created `src/app/page.tsx` — Full-featured main page with all UI components:
  - TournamentListView: creation form + tournament list with delete confirmation
  - GroupMatchesView: match schedule by rounds with score entry and save buttons
  - StandingsView: full standings table with И/В/Н/П/МЗ/МП/РМ/О columns, medals for top 3
  - PlayoffBracketView: recursive bracket tree with CSS connectors, final match highlight
  - BracketMatchCard: clickable teams for quick winner selection + score entry
  - PlayoffResultView: round-by-round results + winner celebration card
- Responsive design: mobile sidebar hidden, horizontal scroll for bracket, flex/grid layouts
- Color scheme: emerald accent, amber for finals, standard shadcn/ui theme

Stage Summary:
- Fully functional tournament manager with group stage and playoff modes
- All data persisted to localStorage via Zustand
- No lint errors, compiles successfully
- Responsive design for mobile and desktop
- Key files: `src/lib/tournament-types.ts`, `src/lib/tournament-utils.ts`, `src/lib/tournament-store.ts`, `src/app/page.tsx`
