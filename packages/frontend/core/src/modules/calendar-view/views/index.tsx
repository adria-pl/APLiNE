import { CalendarView } from '@affine/core/modules/calendar-view/entities/calendar-view';
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
