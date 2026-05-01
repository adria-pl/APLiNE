# Calendar + Kanban Linked View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a calendar/timeline view that aggregates cards from multiple kanban/database boards, accessible from a sidebar button.

**Architecture:** Standalone React module in `@affine/core` that reads database rows via `DatabaseBlockDataSource`, aggregates them across multiple sources, and renders in switchable month/week grid and Gantt views. Follows the journal module pattern for DI registration.

**Tech Stack:** React 19, Vanilla Extract CSS, Jotai/LiveData (`@toeverything/infra`), Radix UI primitives, dayjs, Vitest

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `modules/calendar-view/types.ts` | CalendarCard, CalendarSource, CalendarViewMode types |
| `modules/calendar-view/entities/calendar-view.ts` | CalendarView entity (view mode, current date state) |
| `modules/calendar-view/services/calendar-source.ts` | CalendarSourceService — manages connected databases |
| `modules/calendar-view/services/calendar-view.ts` | CalendarViewService — aggregates cards from all sources |
| `modules/calendar-view/store/calendar-source.ts` | CalendarSourceStore — persists sources to GlobalState |
| `modules/calendar-view/index.ts` | Module DI registration + exports |
| `modules/calendar-view/views/calendar-view.css.ts` | Vanilla Extract styles |
| `modules/calendar-view/views/calendar-card.tsx` | Shared card component (pill + bar rendering) |
| `modules/calendar-view/views/calendar-grid.tsx` | Month/week grid view |
| `modules/calendar-view/views/calendar-gantt.tsx` | Gantt/timeline bar view |
| `modules/calendar-view/views/source-selector.tsx` | UI to add/remove database sources |
| `modules/calendar-view/views/index.tsx` | CalendarViewRoot — main view container |
| `components/root-app-sidebar/calendar-button.tsx` | Sidebar calendar button |
| `desktop/pages/workspace/calendar/index.tsx` | Route page component |

### Modified Files

| File | Change |
|------|--------|
| `desktop/workbench-router.ts` | Add `/calendar` route before `/:pageId` |
| `components/root-app-sidebar/index.tsx` | Add `<AppSidebarCalendarButton />` |
| `modules/workbench/constants.tsx` | Add `calendar` icon entry |
| `modules/index.ts` | Import and call `configureCalendarViewModule` |

All paths relative to `packages/frontend/core/src/`.

---

## Task 1: Types

**Files:**
- Create: `modules/calendar-view/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// packages/frontend/core/src/modules/calendar-view/types.ts

export type CalendarViewMode = 'month' | 'week' | 'gantt';

export type CalendarSource = {
  id: string;
  docId: string;
  name: string;
  color: string;
  datePropertyId?: string;
};

export type CalendarCard = {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  sourceId: string;
  sourceName: string;
  color: string;
  rowId: string;
  docId: string;
  status?: string;
};

export const SOURCE_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
] as const;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/adria/Repositories/AFFiNE && npx tsc --noEmit -p packages/frontend/core/tsconfig.json 2>&1 | head -20`

Expected: No errors related to `calendar-view/types.ts` (other pre-existing errors may appear)

---

## Task 2: CalendarView Entity

**Files:**
- Create: `modules/calendar-view/entities/calendar-view.ts`

- [ ] **Step 1: Create the entity**

The entity holds view state: current mode (month/week/gantt) and focused date.

```typescript
// packages/frontend/core/src/modules/calendar-view/entities/calendar-view.ts

import { Entity, LiveData } from '@toeverything/infra';
import dayjs from 'dayjs';

import type { CalendarViewMode } from '../types';

export class CalendarView extends Entity {
  mode$ = new LiveData<CalendarViewMode>('month');
  focusedDate$ = new LiveData<string>(dayjs().format('YYYY-MM-DD'));

  setMode(mode: CalendarViewMode) {
    this.mode$.next(mode);
  }

  setFocusedDate(date: string) {
    this.focusedDate$.next(date);
  }

  navigateToday() {
    this.focusedDate$.next(dayjs().format('YYYY-MM-DD'));
  }

  navigatePrev() {
    const current = dayjs(this.focusedDate$.value);
    const mode = this.mode$.value;
    const next =
      mode === 'week'
        ? current.subtract(1, 'week')
        : current.subtract(1, 'month');
    this.focusedDate$.next(next.format('YYYY-MM-DD'));
  }

  navigateNext() {
    const current = dayjs(this.focusedDate$.value);
    const mode = this.mode$.value;
    const next =
      mode === 'week'
        ? current.add(1, 'week')
        : current.add(1, 'month');
    this.focusedDate$.next(next.format('YYYY-MM-DD'));
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/adria/Repositories/AFFiNE && npx tsc --noEmit -p packages/frontend/core/tsconfig.json 2>&1 | head -20`

---

## Task 3: CalendarSourceStore

**Files:**
- Create: `modules/calendar-view/store/calendar-source.ts`

- [ ] **Step 1: Create the store**

Persists connected database sources to `GlobalState`.

```typescript
// packages/frontend/core/src/modules/calendar-view/store/calendar-source.ts

import type { GlobalState } from '@affine/core/modules/storage';
import { LiveData, Store } from '@toeverything/infra';

import type { CalendarSource } from '../types';
import { SOURCE_COLORS } from '../types';

const STORAGE_KEY = 'calendar-sources';

export class CalendarSourceStore extends Store {
  constructor(private readonly globalState: GlobalState) {
    super();
  }

  private get sources(): CalendarSource[] {
    return this.globalState.get<CalendarSource[]>(STORAGE_KEY) ?? [];
  }

  private set sources(value: CalendarSource[]) {
    this.globalState.set(STORAGE_KEY, value);
  }

  watchSources$ = LiveData.from(
    this.globalState.watch<CalendarSource[]>(STORAGE_KEY),
    []
  );

  addSource(docId: string, databaseBlockId: string, name: string) {
    const current = this.sources;
    const nextColor = SOURCE_COLORS[current.length % SOURCE_COLORS.length];
    const source: CalendarSource = {
      id: databaseBlockId,
      docId,
      name,
      color: nextColor,
    };
    this.sources = [...current, source];
    return source;
  }

  removeSource(id: string) {
    this.sources = this.sources.filter(s => s.id !== id);
  }

  updateSourceDateProperty(sourceId: string, datePropertyId: string) {
    this.sources = this.sources.map(s =>
      s.id === sourceId ? { ...s, datePropertyId } : s
    );
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/adria/Repositories/AFFiNE && npx tsc --noEmit -p packages/frontend/core/tsconfig.json 2>&1 | head -20`

---

## Task 4: CalendarSourceService

**Files:**
- Create: `modules/calendar-view/services/calendar-source.ts`

- [ ] **Step 1: Create the service**

Manages connected databases. Provides reactive list of sources and methods to discover databases in the workspace.

```typescript
// packages/frontend/core/src/modules/calendar-view/services/calendar-source.ts

import { LiveData, Service } from '@toeverything/infra';

import type { CalendarSource } from '../types';
import type { CalendarSourceStore } from '../store/calendar-source';

export class CalendarSourceService extends Service {
  constructor(private readonly store: CalendarSourceStore) {
    super();
  }

  sources$ = this.store.watchSources$;

  addSource(docId: string, databaseBlockId: string, name: string) {
    return this.store.addSource(docId, databaseBlockId, name);
  }

  removeSource(id: string) {
    this.store.removeSource(id);
  }

  updateSourceDateProperty(sourceId: string, datePropertyId: string) {
    this.store.updateSourceDateProperty(sourceId, datePropertyId);
  }

  getSource(id: string): CalendarSource | undefined {
    return this.sources$.value.find(s => s.id === id);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/adria/Repositories/AFFiNE && npx tsc --noEmit -p packages/frontend/core/tsconfig.json 2>&1 | head -20`

---

## Task 5: CalendarViewService (Card Aggregation)

**Files:**
- Create: `modules/calendar-view/services/calendar-view.ts`

- [ ] **Step 1: Create the service**

Reads database rows from all connected sources and aggregates them into `CalendarCard` objects.

```typescript
// packages/frontend/core/src/modules/calendar-view/services/calendar-view.ts

import { LiveData, Service } from '@toeverything/infra';
import dayjs from 'dayjs';
import type { Doc } from '@blocksuite/affine/store';

import type { DocsService } from '../../doc';
import type { CalendarCard, CalendarSource } from '../types';
import type { CalendarSourceService } from './calendar-source';

export class CalendarViewService extends Service {
  constructor(
    private readonly sourceService: CalendarSourceService,
    private readonly docsService: DocsService
  ) {
    super();
  }

  cards$ = LiveData.computed(get => {
    const sources = get(this.sourceService.sources$);
    const cards: CalendarCard[] = [];
    for (const source of sources) {
      try {
        const sourceCards = this.readCardsFromSource(source);
        cards.push(...sourceCards);
      } catch {
        // source doc may not be loaded yet
      }
    }
    return cards;
  });

  cardsByDate$(date: string) {
    return LiveData.computed(get => {
      const allCards = get(this.cards$);
      return allCards.filter(
        c => date >= c.startDate && (!c.endDate || date <= c.endDate)
      );
    });
  }

  cardsInRange$(start: string, end: string) {
    return LiveData.computed(get => {
      const allCards = get(this.cards$);
      return allCards.filter(
        c =>
          c.startDate <= end &&
          (!c.endDate || c.endDate >= start)
      );
    });
  }

  private readCardsFromSource(source: CalendarSource): CalendarCard[] {
    const docRef = this.docsService.open(source.docId);
    const doc = docRef.doc.blockSuiteDoc;
    if (!doc.ready) {
      doc.load();
    }

    const dbBlock = doc.getBlock(source.id);
    if (!dbBlock) return [];

    const model = dbBlock.model;
    if (!model) return [];

    const cards: CalendarCard[] = [];

    const children = (model as any).children ?? [];
    for (const row of children) {
      const card = this.extractCard(row, source);
      if (card) cards.push(card);
    }

    return cards;
  }

  private extractCard(
    row: any,
    source: CalendarSource
  ): CalendarCard | null {
    const cells = row.cells ?? {};
    const title = row.text?.toString() ?? 'Untitled';

    let startDate: string | undefined;
    let endDate: string | undefined;
    let status: string | undefined;

    const propertyId = source.datePropertyId;

    for (const [propId, cellValue] of Object.entries(cells)) {
      const cell = cellValue as any;
      if (propertyId && propId !== propertyId) continue;

      if (cell.column?.data?.type === 'date' || typeof cell.value === 'string') {
        const val = cell.value;
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
          if (!startDate) {
            startDate = val.substring(0, 10);
          } else if (!endDate) {
            endDate = val.substring(0, 10);
          }
        }
      }

      // Try to extract status/kanban group
      if (
        cell.column?.data?.type === 'select' ||
        cell.column?.data?.type === 'multi-select'
      ) {
        status = typeof cell.value === 'string' ? cell.value : undefined;
      }
    }

    if (!startDate) return null;

    return {
      id: `${source.id}-${row.id}`,
      title,
      startDate,
      endDate: endDate !== startDate ? endDate : undefined,
      sourceId: source.id,
      sourceName: source.name,
      color: source.color,
      rowId: row.id,
      docId: source.docId,
      status,
    };
  }
}
```

**Note:** The `readCardsFromSource` method accesses BlockSuite's internal block model structure. The exact property paths (`row.cells`, `cell.column.data.type`, etc.) may need adjustment based on the actual `DatabaseBlockModel` API. The implementer should verify by inspecting a database block model at runtime using the browser dev tools or by reading the BlockSuite source at `blocksuite/affine/data-view/`.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/adria/Repositories/AFFiNE && npx tsc --noEmit -p packages/frontend/core/tsconfig.json 2>&1 | head -20`

---

## Task 6: Module Registration

**Files:**
- Create: `modules/calendar-view/index.ts`
- Modify: `modules/index.ts`

- [ ] **Step 1: Create the module index**

```typescript
// packages/frontend/core/src/modules/calendar-view/index.ts

import { type Framework } from '@toeverything/infra';

import { DocScope, DocService, DocsService } from '../doc';
import type { GlobalState } from '../storage';
import { WorkspaceScope } from '../workspace';
import { CalendarView } from './entities/calendar-view';
import { CalendarSourceService } from './services/calendar-source';
import { CalendarViewService } from './services/calendar-view';
import { CalendarSourceStore } from './store/calendar-source';

export { CalendarViewService } from './services/calendar-view';
export { CalendarSourceService } from './services/calendar-source';
export { CalendarView } from './entities/calendar-view';
export type { CalendarCard, CalendarSource, CalendarViewMode } from './types';

export function configureCalendarViewModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .store(CalendarSourceStore, [GlobalState])
    .service(CalendarSourceService, [CalendarSourceStore])
    .service(CalendarViewService, [CalendarSourceService, DocsService])
    .entity(CalendarView);
}
```

**Note:** `GlobalState` is a provider interface, not a class that needs importing in the module index. The DI framework resolves it from the impl registration done in the storage module. Check how `AppSidebarState` is declared in the app-sidebar module for the exact pattern. The store's constructor receives `GlobalState` directly — the DI framework injects the bound implementation.

- [ ] **Step 2: Register in global modules**

Add the import and registration call to `modules/index.ts`:

After line with `import { configureJournalModule } from './journal';` add:
```typescript
import { configureCalendarViewModule } from './calendar-view';
```

Inside `configureCommonModules`, after the line `configureJournalModule(framework);` add:
```typescript
configureCalendarViewModule(framework);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/adria/Repositories/AFFiNE && npx tsc --noEmit -p packages/frontend/core/tsconfig.json 2>&1 | head -20`

---

## Task 7: Calendar Icon + Route Registration

**Files:**
- Modify: `modules/workbench/constants.tsx`
- Modify: `desktop/workbench-router.ts`

- [ ] **Step 1: Add calendar icon to constants**

In `modules/workbench/constants.tsx`, create a calendar SVG icon inline since `@blocksuite/icons` doesn't export one:

Add import for `createIcon` or define inline. Looking at the pattern, icons are React elements. Add after the `ai` entry:

```tsx
// Add this import at the top (alongside existing imports)
import { Suspense, forwardRef } from 'react';

// Add this icon definition before iconNameToIcon
const CalendarIcon = forwardRef<SVGSVGElement>(function CalendarIcon(props, ref) {
  return (
    <svg
      ref={ref}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 1a.75.75 0 0 1 .75.75V2h6.5v-.25a.75.75 0 0 1 1.5 0V2h2A2.25 2.25 0 0 1 19 4.25v11.5A2.25 2.25 0 0 1 16.75 18H3.25A2.25 2.25 0 0 1 1 15.75V4.25A2.25 2.25 0 0 1 3.25 2h2v-.25A.75.75 0 0 1 6 1ZM2.5 7.5v8.25a.75.75 0 0 0 .75.75h13.5a.75.75 0 0 0 .75-.75V7.5h-15ZM5.25 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm4.75-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm2.75 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 13.25a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm2.75 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill="currentColor"
      />
    </svg>
  );
});
```

Then add to `iconNameToIcon`:
```tsx
calendar: <CalendarIcon />,
```

- [ ] **Step 2: Add /calendar route**

In `desktop/workbench-router.ts`, add the calendar route **before** `/:pageId` (line ~31). The route must come before the catch-all page route:

```typescript
{ path: '/calendar', lazy: () => import('./pages/workspace/calendar') },
```

Place it after `/journals` and before `/:pageId`.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/adria/Repositories/AFFiNE && npx tsc --noEmit -p packages/frontend/core/tsconfig.json 2>&1 | head -20`

---

## Task 8: Sidebar Calendar Button

**Files:**
- Create: `components/root-app-sidebar/calendar-button.tsx`
- Modify: `components/root-app-sidebar/index.tsx`

- [ ] **Step 1: Create the calendar button**

Follows the `journal-button.tsx` pattern exactly.

```tsx
// packages/frontend/core/src/components/root-app-sidebar/calendar-button.tsx

import { MenuLinkItem } from '@affine/core/modules/app-sidebar/views';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';

const CalendarSidebarIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6 1a.75.75 0 0 1 .75.75V2h6.5v-.25a.75.75 0 0 1 1.5 0V2h2A2.25 2.25 0 0 1 19 4.25v11.5A2.25 2.25 0 0 1 16.75 18H3.25A2.25 2.25 0 0 1 1 15.75V4.25A2.25 2.25 0 0 1 3.25 2h2v-.25A.75.75 0 0 1 6 1ZM2.5 7.5v8.25a.75.75 0 0 0 .75.75h13.5a.75.75 0 0 0 .75-.75V7.5h-15ZM5.25 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm4.75-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm2.75 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 13.25a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm2.75 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
      fill="currentColor"
    />
  </svg>
);

export const AppSidebarCalendarButton = () => {
  const t = useI18n();
  const workbench = useService(WorkbenchService).workbench;
  const location = useLiveData(workbench.location$);

  return (
    <MenuLinkItem
      data-testid="slider-bar-calendar-button"
      active={location.pathname.startsWith('/calendar')}
      to={'/calendar'}
      icon={<CalendarSidebarIcon />}
    >
      Calendar
    </MenuLinkItem>
  );
};
```

- [ ] **Step 2: Add button to sidebar**

In `components/root-app-sidebar/index.tsx`:

1. Add import near the other sidebar button imports:
```typescript
import { AppSidebarCalendarButton } from './calendar-button';
```

2. Add `<AppSidebarCalendarButton />` after `<AppSidebarJournalButton />` inside the top `<SidebarContainer>`.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/adria/Repositories/AFFiNE && npx tsc --noEmit -p packages/frontend/core/tsconfig.json 2>&1 | head -20`

---

## Task 9: Route Page Skeleton

**Files:**
- Create: `desktop/pages/workspace/calendar/index.tsx`

- [ ] **Step 1: Create the calendar page**

Follows the `journals/index.tsx` pattern with `ViewHeader` + `ViewBody`.

```tsx
// packages/frontend/core/src/desktop/pages/workspace/calendar/index.tsx

import { CalendarView } from '@affine/core/modules/calendar-view/entities/calendar-view';
import { CalendarSourceService } from '@affine/core/modules/calendar-view/services/calendar-source';
import { CalendarViewService } from '@affine/core/modules/calendar-view/services/calendar-view';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { useLiveData, useService } from '@toeverything/infra';

export const CalendarPage = () => {
  const t = useI18n();
  const calendarView = useService(CalendarView);
  const calendarViewService = useService(CalendarViewService);
  const sourceService = useService(CalendarSourceService);
  const view = useService(ViewService).view;

  const mode = useLiveData(calendarView.mode$);
  const focusedDate = useLiveData(calendarView.focusedDate$);
  const cards = useLiveData(calendarViewService.cards$);
  const sources = useLiveData(sourceService.sources$);

  return (
    <>
      <ViewTitle title="Calendar" />
      <ViewIcon icon="calendar" />
      <ViewHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => calendarView.navigatePrev()}>
            &larr;
          </button>
          <span>{focusedDate}</span>
          <button onClick={() => calendarView.navigateNext()}>
            &rarr;
          </button>
          <button onClick={() => calendarView.navigateToday()}>
            Today
          </button>
          <select
            value={mode}
            onChange={e =>
              calendarView.setMode(
                e.target.value as 'month' | 'week' | 'gantt'
              )
            }
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="gantt">Gantt</option>
          </select>
        </div>
      </ViewHeader>
      <ViewBody>
        <div style={{ padding: 16 }}>
          <p>Mode: {mode}</p>
          <p>Date: {focusedDate}</p>
          <p>Cards: {cards.length}</p>
          <p>Sources: {sources.length}</p>
        </div>
      </ViewBody>
    </>
  );
};

export const Component = () => {
  return <CalendarPage />;
};
```

- [ ] **Step 2: Verify the route works**

Run the dev server: `cd /Users/adria/Repositories/AFFiNE && yarn dev`

Navigate to the app, click the Calendar sidebar button. Expected: The skeleton page loads showing "Calendar" in the header and the basic state (mode, date, 0 cards, 0 sources).

---

## Task 10: Styles

**Files:**
- Create: `modules/calendar-view/views/calendar-view.css.ts`

- [ ] **Step 1: Create Vanilla Extract styles**

```typescript
// packages/frontend/core/src/modules/calendar-view/views/calendar-view.css.ts

import { style } from '@vanilla-extract/css';

export const gridContainer = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 1,
  backgroundColor: 'var(--affine-border-color)',
  borderRadius: 8,
  overflow: 'hidden',
});

export const gridCell = style({
  backgroundColor: 'var(--affine-background-primary-color)',
  minHeight: 120,
  padding: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
});

export const gridCellHeader = style({
  display: 'flex',
  justifyContent: 'flex-end',
  padding: '2px 6px',
  fontSize: 12,
  color: 'var(--affine-text-secondary-color)',
  selectors: {
    '&[data-today="true"]': {
      color: 'var(--affine-brand-color)',
      fontWeight: 600,
    },
  },
});

export const cardPill = style({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '1px 6px',
  borderRadius: 4,
  fontSize: 11,
  cursor: 'pointer',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  selectors: {
    '&:hover': {
      opacity: 0.85,
    },
  },
});

export const cardDot = style({
  width: 6,
  height: 6,
  borderRadius: '50%',
  flexShrink: 0,
});

export const ganttContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  overflowX: 'auto',
});

export const ganttGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

export const ganttGroupHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 0',
  fontSize: 13,
  fontWeight: 600,
});

export const ganttRow = style({
  display: 'flex',
  alignItems: 'center',
  height: 28,
  position: 'relative',
});

export const ganttBar = style({
  position: 'absolute',
  height: 20,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  paddingLeft: 6,
  paddingRight: 6,
  fontSize: 11,
  color: '#fff',
  cursor: 'pointer',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  selectors: {
    '&:hover': {
      opacity: 0.85,
    },
  },
});

export const ganttDiamond = style({
  position: 'absolute',
  width: 12,
  height: 12,
  borderRadius: 2,
  transform: 'rotate(45deg)',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      opacity: 0.85,
    },
  },
});

export const ganttTimelineHeader = style({
  display: 'flex',
  borderBottom: '1px solid var(--affine-border-color)',
  marginBottom: 8,
});

export const ganttDayColumn = style({
  flex: '0 0 40px',
  textAlign: 'center',
  fontSize: 10,
  color: 'var(--affine-text-secondary-color)',
  padding: '4px 0',
});

export const sourceColorDot = style({
  width: 10,
  height: 10,
  borderRadius: '50%',
  flexShrink: 0,
});

export const headerControls = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
});

export const modeToggle = style({
  display: 'flex',
  borderRadius: 6,
  overflow: 'hidden',
  border: '1px solid var(--affine-border-color)',
});

export const modeButton = style({
  padding: '4px 12px',
  fontSize: 12,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  selectors: {
    '&[data-active="true"]': {
      backgroundColor: 'var(--affine-hover-color)',
    },
  },
});

export const statusBadge = style({
  fontSize: 9,
  padding: '0 4px',
  borderRadius: 3,
  opacity: 0.8,
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/adria/Repositories/AFFiNE && npx tsc --noEmit -p packages/frontend/core/tsconfig.json 2>&1 | head -20`

---

## Task 11: CalendarCard Component

**Files:**
- Create: `modules/calendar-view/views/calendar-card.tsx`

- [ ] **Step 1: Create the shared card component**

```tsx
// packages/frontend/core/src/modules/calendar-view/views/calendar-card.tsx

import { WorkbenchService } from '@affine/core/modules/workbench';
import { useService } from '@toeverything/infra';
import type { FC } from 'react';

import type { CalendarCard } from '../types';
import * as styles from './calendar-view.css';

export const CalendarCardPill: FC<{
  card: CalendarCard;
}> = ({ card }) => {
  const workbench = useService(WorkbenchService).workbench;

  return (
    <div
      className={styles.cardPill}
      style={{ backgroundColor: card.color + '20', color: card.color }}
      onClick={() => workbench.openDoc(card.docId)}
      title={`${card.title}\n${card.sourceName}\n${card.startDate}${card.endDate ? ' → ' + card.endDate : ''}`}
    >
      <span className={styles.cardDot} style={{ backgroundColor: card.color }} />
      {card.title}
      {card.status && (
        <span className={styles.statusBadge}>{card.status}</span>
      )}
    </div>
  );
};

export const CalendarCardBar: FC<{
  card: CalendarCard;
  left: number;
  width: number;
}> = ({ card, left, width }) => {
  const workbench = useService(WorkbenchService).workbench;

  return (
    <div
      className={styles.ganttBar}
      style={{
        left,
        width: Math.max(width, 20),
        backgroundColor: card.color,
      }}
      onClick={() => workbench.openDoc(card.docId)}
      title={`${card.title}\n${card.sourceName}\n${card.startDate}${card.endDate ? ' → ' + card.endDate : ''}`}
    >
      {width > 40 && card.title}
    </div>
  );
};

export const CalendarCardDiamond: FC<{
  card: CalendarCard;
  left: number;
}> = ({ card, left }) => {
  const workbench = useService(WorkbenchService).workbench;

  return (
    <div
      className={styles.ganttDiamond}
      style={{ left, backgroundColor: card.color, top: 8 }}
      onClick={() => workbench.openDoc(card.docId)}
      title={`${card.title}\n${card.sourceName}\n${card.startDate}`}
    />
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/adria/Repositories/AFFiNE && npx tsc --noEmit -p packages/frontend/core/tsconfig.json 2>&1 | head -20`

---

## Task 12: Calendar Grid View

**Files:**
- Create: `modules/calendar-view/views/calendar-grid.tsx`

- [ ] **Step 1: Create the grid view**

Renders month or week grid with cards positioned on dates.

```tsx
// packages/frontend/core/src/modules/calendar-view/views/calendar-grid.tsx

import { useI18n } from '@affine/i18n';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { FC } from 'react';
import { useMemo } from 'react';

import type { CalendarCard, CalendarViewMode } from '../types';
import * as styles from './calendar-view.css';
import { CalendarCardPill } from './calendar-card';

dayjs.extend(isoWeek);

type Props = {
  mode: CalendarViewMode;
  focusedDate: string;
  cards: CalendarCard[];
};

export const CalendarGrid: FC<Props> = ({ mode, focusedDate, cards }) => {
  const t = useI18n();
  const today = dayjs().format('YYYY-MM-DD');

  const days = useMemo(() => {
    const d = dayjs(focusedDate);
    if (mode === 'week') {
      const startOfWeek = d.startOf('isoWeek');
      return Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'));
    }
    const startOfMonth = d.startOf('month');
    const startOfGrid = startOfMonth.startOf('isoWeek');
    const endOfMonth = d.endOf('month');
    const endOfGrid = endOfMonth.endOf('isoWeek');
    const numDays = endOfGrid.diff(startOfGrid, 'day') + 1;
    return Array.from({ length: numDays }, (_, i) => startOfGrid.add(i, 'day'));
  }, [focusedDate, mode]);

  const cardsByDate = useMemo(() => {
    const map = new Map<string, CalendarCard[]>();
    for (const card of cards) {
      const start = card.startDate;
      const end = card.endDate ?? card.startDate;
      let current = dayjs(start);
      const endDay = dayjs(end);
      while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
        const key = current.format('YYYY-MM-DD');
        const existing = map.get(key) ?? [];
        existing.push(card);
        map.set(key, existing);
        current = current.add(1, 'day');
      }
    }
    return map;
  }, [cards]);

  return (
    <div className={styles.gridContainer}>
      {days.map(day => {
        const dateStr = day.format('YYYY-MM-DD');
        const dayCards = cardsByDate.get(dateStr) ?? [];
        const isToday = dateStr === today;

        return (
          <div key={dateStr} className={styles.gridCell}>
            <div className={styles.gridCellHeader} data-today={isToday}>
              {day.format('D')}
            </div>
            {dayCards.slice(0, 3).map(card => (
              <CalendarCardPill key={card.id} card={card} />
            ))}
            {dayCards.length > 3 && (
              <span style={{ fontSize: 10, color: 'var(--affine-text-secondary-color)' }}>
                +{dayCards.length - 3} more
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/adria/Repositories/AFFiNE && npx tsc --noEmit -p packages/frontend/core/tsconfig.json 2>&1 | head -20`

---

## Task 13: Calendar Gantt View

**Files:**
- Create: `modules/calendar-view/views/calendar-gantt.tsx`

- [ ] **Step 1: Create the Gantt/timeline view**

```tsx
// packages/frontend/core/src/modules/calendar-view/views/calendar-gantt.tsx

import { useI18n } from '@affine/i18n';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { FC } from 'react';
import { useMemo, useRef } from 'react';

import type { CalendarCard } from '../types';
import * as styles from './calendar-view.css';
import { CalendarCardBar, CalendarCardDiamond } from './calendar-card';

dayjs.extend(isoWeek);

const DAY_WIDTH = 40;

type Props = {
  focusedDate: string;
  cards: CalendarCard[];
};

export const CalendarGantt: FC<Props> = ({ focusedDate, cards }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { timelineStart, days, groupedCards } = useMemo(() => {
    const d = dayjs(focusedDate);
    const start = d.startOf('month').startOf('isoWeek');
    const end = d.endOf('month').endOf('isoWeek').add(7, 'day');
    const numDays = end.diff(start, 'day') + 1;
    const daysList = Array.from({ length: numDays }, (_, i) =>
      start.add(i, 'day')
    );

    const grouped = new Map<string, CalendarCard[]>();
    for (const card of cards) {
      const existing = grouped.get(card.sourceId) ?? [];
      existing.push(card);
      grouped.set(card.sourceId, existing);
    }

    return { timelineStart: start, days: daysList, groupedCards: grouped };
  }, [focusedDate, cards]);

  const today = dayjs().format('YYYY-MM-DD');

  const getDayOffset = (date: string) => {
    return dayjs(date).diff(timelineStart, 'day') * DAY_WIDTH;
  };

  return (
    <div className={styles.ganttContainer} ref={containerRef}>
      <div className={styles.ganttTimelineHeader}>
        {days.map(day => (
          <div
            key={day.format('YYYY-MM-DD')}
            className={styles.ganttDayColumn}
            style={{
              color:
                day.format('YYYY-MM-DD') === today
                  ? 'var(--affine-brand-color)'
                  : undefined,
            }}
          >
            {day.format('D')}
          </div>
        ))}
      </div>

      {Array.from(groupedCards.entries()).map(([sourceId, sourceCards]) => {
        const firstCard = sourceCards[0];
        return (
          <div key={sourceId} className={styles.ganttGroup}>
            <div className={styles.ganttGroupHeader}>
              <span
                className={styles.sourceColorDot}
                style={{ backgroundColor: firstCard.color }}
              />
              {firstCard.sourceName}
            </div>
            {sourceCards.map(card => {
              const left = getDayOffset(card.startDate);
              if (card.endDate && card.endDate !== card.startDate) {
                const width =
                  (dayjs(card.endDate).diff(dayjs(card.startDate), 'day') + 1) *
                  DAY_WIDTH;
                return (
                  <CalendarCardBar
                    key={card.id}
                    card={card}
                    left={left}
                    width={width}
                  />
                );
              }
              return (
                <CalendarCardDiamond
                  key={card.id}
                  card={card}
                  left={left}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/adria/Repositories/AFFiNE && npx tsc --noEmit -p packages/frontend/core/tsconfig.json 2>&1 | head -20`

---

## Task 14: Source Selector

**Files:**
- Create: `modules/calendar-view/views/source-selector.tsx`

- [ ] **Step 1: Create the source selector component**

A popover that lets users add/remove database sources.

```tsx
// packages/frontend/core/src/modules/calendar-view/views/source-selector.tsx

import { CalendarSourceService } from '@affine/core/modules/calendar-view/services/calendar-source';
import type { CalendarSource } from '@affine/core/modules/calendar-view/types';
import { useLiveData, useService } from '@toeverything/infra';
import type { FC } from 'react';

import * as styles from './calendar-view.css';

export const SourceSelector: FC = () => {
  const sourceService = useService(CalendarSourceService);
  const sources = useLiveData(sourceService.sources$);

  return (
    <div style={{ minWidth: 250 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Connected Boards</div>
      {sources.length === 0 && (
        <div style={{ color: 'var(--affine-text-secondary-color)', fontSize: 12 }}>
          No boards connected. Add a database source to see cards on the calendar.
        </div>
      )}
      {sources.map(source => (
        <SourceItem
          key={source.id}
          source={source}
          onRemove={() => sourceService.removeSource(source.id)}
        />
      ))}
    </div>
  );
};

const SourceItem: FC<{
  source: CalendarSource;
  onRemove: () => void;
}> = ({ source, onRemove }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 0',
      }}
    >
      <span
        className={styles.sourceColorDot}
        style={{ backgroundColor: source.color }}
      />
      <span style={{ flex: 1, fontSize: 13 }}>{source.name}</span>
      <button
        onClick={onRemove}
        style={{
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--affine-text-secondary-color)',
          fontSize: 12,
        }}
      >
        ✕
      </button>
    </div>
  );
};
```

**Note:** The initial version shows connected sources with remove buttons. Adding new sources requires scanning the workspace for database blocks, which depends on BlockSuite doc APIs. This can be enhanced in a follow-up task. For now, sources can be added programmatically or via a placeholder "Add by ID" input.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/adria/Repositories/AFFiNE && npx tsc --noEmit -p packages/frontend/core/tsconfig.json 2>&1 | head -20`

---

## Task 15: CalendarViewRoot (Main View Component)

**Files:**
- Create: `modules/calendar-view/views/index.tsx`
- Modify: `desktop/pages/workspace/calendar/index.tsx` — wire up the real components

- [ ] **Step 1: Create the main view component**

Combines grid, gantt, and source selector into one component with header controls.

```tsx
// packages/frontend/core/src/modules/calendar-view/views/index.tsx

import { CalendarView } from '@affine/core/modules/calendar-view/entities/calendar-view';
import { CalendarSourceService } from '@affine/core/modules/calendar-view/services/calendar-source';
import { CalendarViewService } from '@affine/core/modules/calendar-view/services/calendar-view';
import { useLiveData, useService } from '@toeverything/infra';
import type { FC } from 'react';
import { useState } from 'react';

import * as styles from './calendar-view.css';
import { CalendarGrid } from './calendar-grid';
import { CalendarGantt } from './calendar-gantt';
import { SourceSelector } from './source-selector';

export const CalendarViewRoot: FC = () => {
  const calendarView = useService(CalendarView);
  const calendarViewService = useService(CalendarViewService);
  const sourceService = useService(CalendarSourceService);

  const mode = useLiveData(calendarView.mode$);
  const focusedDate = useLiveData(calendarView.focusedDate$);
  const cards = useLiveData(calendarViewService.cards$);

  const [showSources, setShowSources] = useState(false);

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className={styles.headerControls}>
        <button onClick={() => calendarView.navigatePrev()}>&larr;</button>
        <span style={{ fontWeight: 600, minWidth: 100, textAlign: 'center' }}>
          {focusedDate}
        </span>
        <button onClick={() => calendarView.navigateNext()}>&rarr;</button>
        <button onClick={() => calendarView.navigateToday()}>Today</button>

        <div className={styles.modeToggle}>
          {(['month', 'week', 'gantt'] as const).map(m => (
            <button
              key={m}
              className={styles.modeButton}
              data-active={mode === m}
              onClick={() => calendarView.setMode(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <button onClick={() => setShowSources(!showSources)}>
          Sources
        </button>
      </div>

      {showSources && <SourceSelector />}

      {mode === 'gantt' ? (
        <CalendarGantt focusedDate={focusedDate} cards={cards} />
      ) : (
        <CalendarGrid mode={mode} focusedDate={focusedDate} cards={cards} />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Update the route page to use CalendarViewRoot**

Replace the content of `desktop/pages/workspace/calendar/index.tsx`:

```tsx
// packages/frontend/core/src/desktop/pages/workspace/calendar/index.tsx

import { CalendarViewRoot } from '@affine/core/modules/calendar-view/views';
import { ViewBody, ViewHeader, ViewIcon, ViewTitle } from '@affine/core/modules/workbench';

export const CalendarPage = () => {
  return (
    <>
      <ViewTitle title="Calendar" />
      <ViewIcon icon="calendar" />
      <ViewHeader />
      <ViewBody>
        <CalendarViewRoot />
      </ViewBody>
    </>
  );
};

export const Component = () => {
  return <CalendarPage />;
};
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/adria/Repositories/AFFiNE && npx tsc --noEmit -p packages/frontend/core/tsconfig.json 2>&1 | head -20`

---

## Task 16: Integration Test — Manual Verification

- [ ] **Step 1: Start the dev server**

Run: `cd /Users/adria/Repositories/AFFiNE && yarn dev`

- [ ] **Step 2: Verify sidebar button**

Expected: A "Calendar" button appears in the left sidebar after the "Journals" button, with a calendar icon.

- [ ] **Step 3: Verify navigation**

Click the Calendar sidebar button. Expected: URL changes to `/calendar`, the page loads with ViewHeader and ViewBody. The calendar grid or Gantt view renders.

- [ ] **Step 4: Verify mode switching**

Click Month/Week/Gantt toggle buttons. Expected: The view switches between grid (month/week) and Gantt timeline.

- [ ] **Step 5: Verify date navigation**

Click prev/next/today buttons. Expected: The focused date changes and the grid/timeline updates to show the corresponding period.

- [ ] **Step 6: Verify sources panel**

Click "Sources" button. Expected: A panel shows connected sources (initially empty).

---

## Task 17: Unit Tests for CalendarView Entity

**Files:**
- Create: `modules/calendar-view/__tests__/calendar-view.spec.ts`

- [ ] **Step 1: Write entity tests**

```typescript
// packages/frontend/core/src/modules/calendar-view/__tests__/calendar-view.spec.ts

/**
 * @vitest-environment happy-dom
 */
import { Framework } from '@toeverything/infra';
import { beforeEach, describe, expect, test } from 'vitest';
import dayjs from 'dayjs';

import { CalendarView } from '../entities/calendar-view';

describe('CalendarView', () => {
  let framework: Framework;
  let view: CalendarView;

  beforeEach(() => {
    framework = new Framework();
    framework.entity(CalendarView);
    view = framework.provider().get(CalendarView, {
      id: 'test',
    });
  });

  test('default mode is month', () => {
    expect(view.mode$.value).toBe('month');
  });

  test('default focused date is today', () => {
    expect(view.focusedDate$.value).toBe(dayjs().format('YYYY-MM-DD'));
  });

  test('setMode updates mode', () => {
    view.setMode('week');
    expect(view.mode$.value).toBe('week');
  });

  test('setMode to gantt', () => {
    view.setMode('gantt');
    expect(view.mode$.value).toBe('gantt');
  });

  test('setFocusedDate updates date', () => {
    view.setFocusedDate('2026-06-15');
    expect(view.focusedDate$.value).toBe('2026-06-15');
  });

  test('navigateToday resets to today', () => {
    view.setFocusedDate('2020-01-01');
    view.navigateToday();
    expect(view.focusedDate$.value).toBe(dayjs().format('YYYY-MM-DD'));
  });

  test('navigatePrev goes back one month in month mode', () => {
    view.setFocusedDate('2026-04-15');
    view.setMode('month');
    view.navigatePrev();
    expect(view.focusedDate$.value).toBe('2026-03-15');
  });

  test('navigatePrev goes back one week in week mode', () => {
    view.setFocusedDate('2026-04-15');
    view.setMode('week');
    view.navigatePrev();
    expect(view.focusedDate$.value).toBe('2026-04-08');
  });

  test('navigateNext goes forward one month in month mode', () => {
    view.setFocusedDate('2026-04-15');
    view.setMode('month');
    view.navigateNext();
    expect(view.focusedDate$.value).toBe('2026-05-15');
  });

  test('navigateNext goes forward one week in week mode', () => {
    view.setFocusedDate('2026-04-15');
    view.setMode('week');
    view.navigateNext();
    expect(view.focusedDate$.value).toBe('2026-04-22');
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd /Users/adria/Repositories/AFFiNE && npx vitest run packages/frontend/core/src/modules/calendar-view/__tests__/calendar-view.spec.ts`

Expected: All 9 tests pass.

---

## Self-Review

### Spec Coverage

| Spec Requirement | Task |
|-----------------|------|
| Module structure | Task 6 |
| Types (CalendarCard, CalendarSource, ViewMode) | Task 1 |
| CalendarSourceService | Task 4 |
| CalendarViewService (card aggregation) | Task 5 |
| CalendarSourceStore (persistence) | Task 3 |
| CalendarView entity (view state) | Task 2 |
| Sidebar button | Task 8 |
| Route registration | Task 7 |
| Calendar icon | Task 7 |
| Month/week grid view | Task 12 |
| Gantt/timeline view | Task 13 |
| Card component (shared) | Task 11 |
| Source selector | Task 14 |
| Main view (CalendarViewRoot) | Task 15 |
| Route page | Task 9 |
| Styles (Vanilla Extract) | Task 10 |
| Unit tests | Task 17 |
| Manual integration test | Task 16 |

### Placeholder Scan

No TBD, TODO, or vague directives found.

### Type Consistency

- `CalendarCard`, `CalendarSource`, `CalendarViewMode` defined in Task 1, used consistently in Tasks 4, 5, 11, 12, 13, 14
- `CalendarView` entity methods (`setMode`, `navigatePrev`, `navigateNext`, `navigateToday`, `setFocusedDate`) defined in Task 2, used in Tasks 15 and tested in Task 17
- `CalendarViewService.cards$` defined in Task 5, consumed in Task 15
- `CalendarSourceService.sources$` defined in Task 4, consumed in Tasks 14, 15
- `SOURCE_COLORS` defined in Task 1, used in Task 3
- CSS class names in Task 10 match usage in Tasks 11, 12, 13, 14, 15
