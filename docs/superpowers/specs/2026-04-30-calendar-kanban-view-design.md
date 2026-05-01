# Calendar + Kanban Linked View

## Summary

A calendar and timeline view in the AFFiNE main editor area that aggregates cards from multiple kanban/database boards. Each card is traceable across both the kanban board and the calendar/timeline. A sidebar button opens the view.

## Approach

**Approach A: Standalone React module in `@affine/core`.** A new `calendar-view` module reads card data from existing BlockSuite databases via the workspace data layer. Does not modify BlockSuite's view preset framework.

## Module Structure

```
packages/frontend/core/src/modules/calendar-view/
  index.ts                          # configureCalendarViewModule (DI registration)
  services/
    calendar-view.ts                # CalendarViewService - reads DB rows, aggregates cards
    calendar-source.ts              # CalendarSourceService - manages connected databases
  entities/
    calendar-view.ts                # CalendarView entity - view state (mode, date range)
  views/
    index.tsx                       # CalendarViewRoot - main page component
    calendar-grid.tsx               # Month/week grid view
    calendar-gantt.tsx              # Gantt/timeline bar view
    calendar-card.tsx               # Card component (used in both views)
    source-selector.tsx             # UI to pick/add database sources
    calendar-view.css.ts            # Vanilla Extract styles
  types.ts                          # CalendarCard, CalendarSource, ViewMode types
```

DI registration follows the existing module pattern:

```ts
export function configureCalendarViewModule(framework: Framework) {
  framework.service(CalendarViewService).service(CalendarSourceService).entity(CalendarView, [CalendarSourceService]);
}
```

## Data Model

### CalendarSource

Represents a connected database board.

```ts
type CalendarSource = {
  id: string; // database block ID
  docId: string; // doc containing the database
  name: string; // database name
  color: string; // assigned color from a fixed palette
  datePropertyId?: string; // which property to use for dates
};
```

### CalendarCard

Represents a single card/row from any connected database.

```ts
type CalendarCard = {
  id: string; // unique composite key (sourceId + rowId)
  title: string; // row's title/text property
  startDate: string; // "YYYY-MM-DD"
  endDate?: string; // "YYYY-MM-DD" (undefined = single date)
  sourceId: string; // which database this card comes from
  sourceName: string; // database name for display
  color: string; // per-source color
  rowId: string; // block ID in the database
  docId: string; // doc containing the database
  status?: string; // kanban column/group value if available
  member?: string; // card member value if available
};
```

### ViewMode

```ts
type CalendarViewMode = 'month' | 'week' | 'gantt';
```

## Services

### CalendarSourceService

Manages which databases are connected as data sources.

- `sources$: LiveData<CalendarSource[]>` — reactive list of connected databases
- `addSource(docId: string, databaseBlockId: string)` — scans the database for date properties, auto-selects the first one, assigns the next color from the palette
- `removeSource(id: string)` — disconnects a database
- `updateSourceDateProperty(sourceId: string, propertyId: string)` — switch which date field drives the calendar
- Sources stored in workspace metadata via `GlobalState`

**Auto-detection**: When adding a source, finds the first date-type property. If the database has both a "start date" and an "end date" property, uses them as a range. Otherwise uses the single date property as `startDate`.

**Color palette**: Fixed set of distinct colors (e.g., `['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']`). Sources cycle through the palette in order.

### CalendarViewService

Aggregates cards from all connected sources.

- `cards$: LiveData<CalendarCard[]>` — reacts to all connected sources, reads their rows, extracts date values
- `cardsByDate$(date: string): LiveData<CalendarCard[]>` — filtered for a specific date
- `cardsInRange$(start: string, end: string): LiveData<CalendarCard[]>` — cards visible in the current range
- Uses `DatabaseBlockDataSource` to read row data from each source database
- Scans all properties of type `date` on each row
- For each row, builds a `CalendarCard` with the source's color
- Re-queries when sources change or rows are modified

## Sidebar Integration

A `CalendarButton` component added to the top `SidebarContainer` in `root-app-sidebar/index.tsx`, placed after `AppSidebarJournalButton`:

```tsx
<AppSidebarJournalButton />
<CalendarButton />
<NotificationButton />
```

- Uses `MenuLinkItem` with a calendar icon, navigating to `/calendar`
- Shows active state when current route is `/calendar`
- Follows the same pattern as `AppSidebarJournalButton`

The `baseContainer` CSS class is unchanged — the button is a sibling component inside the same container.

## Route Registration

Add to `workbenchRoutes`:

```ts
{ path: '/calendar', lazy: () => import('./pages/workspace/calendar/index') },
```

Placed alongside the existing `/journals` route.

## Main Calendar Page

**Route component** (`pages/workspace/calendar/index.tsx`):

- Uses `ViewHeader` + `ViewBody` layout (same pattern as journals page)
- Sets `ViewTitle` to "Calendar" and `ViewIcon` to a calendar icon
- Query param `?date=YYYY-MM-DD` drives the current viewed date
- Header controls:
  - **View mode toggle**: Month | Week | Gantt (radio group or segmented control)
  - **Date navigation**: Previous / Next / Today buttons, with current range label
  - **Connect Board button**: Opens the source selector

## Source Selector

- Triggered by the "Connect Board" button in the header
- Opens a popover that lists all databases in the workspace
- Connected sources shown with their colors and a remove button
- Adding a source: lists available databases, auto-detects date properties, lets user confirm or switch the date property
- Uses existing popover/menu patterns from `@affine/component`

## Grid Calendar View (`calendar-grid.tsx`)

### Month Mode

- 7-column grid (Mon–Sun), rows = weeks in the month
- Day cells contain colored pills for cards on that `startDate`
- Multi-day cards span across days visually (absolute positioning within the grid row)
- Single-date cards show as a single pill
- Cards are color-coded by source database

### Week Mode

- Same 7-column structure but single row, taller cells
- More card detail visible (title + truncated status + member)
- Better suited for dense days

### Grid Behavior (both modes)

- Click a card → `workbench.openDoc(docId)` to navigate to the source doc
- Cards with `status` show a small status badge (kanban column name)
- Empty days are clickable to create a new card (future enhancement, not in scope)

## Gantt/Timeline View (`calendar-gantt.tsx`)

- Horizontal timeline with date columns on the x-axis
- Source databases shown as collapsible groups (section header with name + color)
- Cards with a date range render as horizontal bars spanning `startDate` → `endDate`
- Cards with a single date render as a diamond/circle marker on that date
- Today marked with a vertical dashed line
- Click a card → `workbench.openDoc(docId)`
- Scroll to navigate horizontally; the visible range matches the month/week context
- Cards show title text inside the bar (truncated if too narrow)

## CalendarCard Component (`calendar-card.tsx`)

Shared card rendering used by both views:

- Title text
- Source color dot
- Status badge if present (kanban column name)
- Click handler → `workbench.openDoc(docId)`
- Hover tooltip with full details (source name, date range, status)

## Styling

- Uses Vanilla Extract (`@vanilla-extract/css`) matching the project convention
- Follows existing theme tokens and spacing from `@affine/component`
- Uses existing Radix UI primitives for popovers, tooltips, scroll areas

## Dependencies

- `@affine/component` — UI primitives (button, popover, tooltip, menu, scroll area)
- `@toeverything/infra` — Framework DI, LiveData, services
- `@blocksuite/affine` — `DatabaseBlockDataSource`, database model types
- `react-router-dom` — route param access
- `dayjs` — date manipulation (already used in the project)

## Out of Scope

- Creating/editing cards directly from the calendar (future enhancement)
- Drag-and-drop to reschedule cards
- Recurring events
- External calendar sync integration (already handled by `CalendarIntegration` module)
- Time-of-day scheduling (date-level only, no hours)
