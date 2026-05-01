import type { GlobalState } from '../../storage';
import { LiveData, Store } from '@toeverything/infra';
import { map } from 'rxjs';

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
    this.globalState.watch<CalendarSource[]>(STORAGE_KEY).pipe(
      map((v) => v ?? [])
    ),
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
