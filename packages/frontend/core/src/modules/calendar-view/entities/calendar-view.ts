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
