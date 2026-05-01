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
                  <div key={card.id} className={styles.ganttRow}>
                    <CalendarCardBar
                      card={card}
                      left={left}
                      width={width}
                    />
                  </div>
                );
              }
              return (
                <div key={card.id} className={styles.ganttRow}>
                  <CalendarCardDiamond
                    card={card}
                    left={left + DAY_WIDTH / 2 - 6}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
