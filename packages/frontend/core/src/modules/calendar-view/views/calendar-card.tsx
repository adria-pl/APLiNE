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
      style={{ left, backgroundColor: card.color }}
      onClick={() => workbench.openDoc(card.docId)}
      title={`${card.title}\n${card.sourceName}\n${card.startDate}`}
    />
  );
};
