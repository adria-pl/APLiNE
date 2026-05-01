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
