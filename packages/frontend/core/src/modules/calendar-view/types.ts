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
