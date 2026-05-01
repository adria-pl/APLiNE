import { LiveData, Service } from '@toeverything/infra';
import { DatabaseBlockDataSource } from '@blocksuite/affine/blocks/database';
import dayjs from 'dayjs';

import type { DocsService } from '../../doc';
import type { CalendarCard, CalendarSource } from '../types';
import type { CalendarSourceService } from './calendar-source';

export class CalendarViewService extends Service {
  constructor(
    private readonly sourceService: CalendarSourceService,
    private readonly docsService: DocsService
  ) {
    super();
  }

  cards$ = LiveData.computed(get => {
    const sources = get(this.sourceService.sources$) ?? [];
    const cards: CalendarCard[] = [];
    for (const source of sources) {
      try {
        const sourceCards = this.readCardsFromSource(source);
        cards.push(...sourceCards);
      } catch {
        // source doc may not be loaded yet
      }
    }
    return cards;
  });

  cardsByDate$(date: string) {
    return LiveData.computed(get => {
      const allCards = get(this.cards$);
      return allCards.filter(
        c => date >= c.startDate && (!c.endDate || date <= c.endDate)
      );
    });
  }

  cardsInRange$(start: string, end: string) {
    return LiveData.computed(get => {
      const allCards = get(this.cards$);
      return allCards.filter(
        c => c.startDate <= end && (!c.endDate || c.endDate >= start)
      );
    });
  }

  private readCardsFromSource(source: CalendarSource): CalendarCard[] {
    const docRef = this.docsService.open(source.docId);
    const bsDoc = docRef.doc.blockSuiteDoc;

    if (!bsDoc.ready) {
      bsDoc.load();
    }

    const dbBlock = bsDoc.getBlock(source.id);
    if (!dbBlock || dbBlock.flavour !== 'affine:database') return [];

    const dbModel = dbBlock.model;
    if (!dbModel) return [];

    const dataSource = new DatabaseBlockDataSource(dbModel);
    const rowIds: string[] = (dataSource.rows$ as any)?.value ?? (dbModel as any).children?.map((c: any) => c.id) ?? [];
    const propertyIds: string[] = (dataSource.properties$ as any)?.value ?? [];

    const cards: CalendarCard[] = [];

    for (const rowId of rowIds) {
      const card = this.extractCard(dataSource, rowId, propertyIds, source);
      if (card) cards.push(card);
    }

    return cards;
  }

  private extractCard(
    dataSource: DatabaseBlockDataSource,
    rowId: string,
    propertyIds: string[],
    source: CalendarSource
  ): CalendarCard | null {
    let startDate: string | undefined;
    let endDate: string | undefined;
    let status: string | undefined;
    let title: string | undefined;

    for (const propId of propertyIds) {
      try {
        const cellValue = (dataSource as any).cellValueGet$?.(rowId, propId)?.value
          ?? (dataSource as any).cellValueGet?.(rowId, propId);
        const propType = (dataSource as any).propertyTypeGet$?.(propId)?.value
          ?? (dataSource as any).propertyTypeGet?.(propId);
        const propName = (dataSource as any).propertyNameGet$?.(propId)?.value
          ?? (dataSource as any).propertyNameGet?.(propId);

        if (propType === 'title' || propName === 'title' || propName === 'Title') {
          title = typeof cellValue === 'string' ? cellValue : String(cellValue ?? '');
        }

        if (propType === 'date') {
          const val = this.extractDateValue(cellValue);
          if (val) {
            if (!startDate) {
              startDate = val;
            } else if (!endDate) {
              endDate = val;
            }
          }
        }

        if (propType === 'select' || propType === 'multi-select') {
          status = typeof cellValue === 'string' ? cellValue : Array.isArray(cellValue) ? cellValue[0] : undefined;
        }
      } catch {
        // skip properties that fail to read
      }
    }

    if (!startDate) return null;

    return {
      id: `${source.id}-${rowId}`,
      title: title || 'Untitled',
      startDate,
      endDate: endDate !== startDate ? endDate : undefined,
      sourceId: source.id,
      sourceName: source.name,
      color: source.color,
      rowId,
      docId: source.docId,
      status,
    };
  }

  private extractDateValue(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : undefined;
    }
    if (typeof value === 'number' && value > 0) {
      const d = dayjs(value);
      return d.isValid() ? d.format('YYYY-MM-DD') : undefined;
    }
    return undefined;
  }
}
