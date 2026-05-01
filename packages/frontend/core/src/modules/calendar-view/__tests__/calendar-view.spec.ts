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
