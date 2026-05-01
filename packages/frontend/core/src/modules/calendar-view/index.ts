import { type Framework } from '@toeverything/infra';

import { DocsService } from '../doc';
import { GlobalState } from '../storage';
import { WorkspaceScope } from '../workspace';
import { CalendarView } from './entities/calendar-view';
import { CalendarSourceService } from './services/calendar-source';
import { CalendarViewService } from './services/calendar-view';
import { CalendarSourceStore } from './store/calendar-source';

export { CalendarViewService } from './services/calendar-view';
export { CalendarSourceService } from './services/calendar-source';
export { CalendarView } from './entities/calendar-view';
export type { CalendarCard, CalendarSource, CalendarViewMode } from './types';
export type { DiscoveredDatabase } from './services/calendar-source';

export function configureCalendarViewModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .store(CalendarSourceStore, [GlobalState])
    .service(CalendarSourceService, [CalendarSourceStore, DocsService])
    .service(CalendarViewService, [CalendarSourceService, DocsService])
    .entity(CalendarView);
}
