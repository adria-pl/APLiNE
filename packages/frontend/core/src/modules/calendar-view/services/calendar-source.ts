import { LiveData, Service } from '@toeverything/infra';

import type { DocsService } from '../../doc';
import type { CalendarSource } from '../types';
import type { CalendarSourceStore } from '../store/calendar-source';

export type DiscoveredDatabase = {
  docId: string;
  databaseBlockId: string;
  name: string;
  docTitle: string;
};

export class CalendarSourceService extends Service {
  private readonly _discoveredDatabases$ = new LiveData<DiscoveredDatabase[]>([]);

  constructor(
    private readonly store: CalendarSourceStore,
    private readonly docsService: DocsService
  ) {
    super();
  }

  sources$ = this.store.watchSources$;

  get discoveredDatabases$(): LiveData<DiscoveredDatabase[]> {
    return this._discoveredDatabases$;
  }

  addSource(docId: string, databaseBlockId: string, name: string) {
    return this.store.addSource(docId, databaseBlockId, name);
  }

  removeSource(id: string) {
    this.store.removeSource(id);
  }

  updateSourceDateProperty(sourceId: string, datePropertyId: string) {
    this.store.updateSourceDateProperty(sourceId, datePropertyId);
  }

  getSource(id: string): CalendarSource | undefined {
    return this.sources$.value.find(s => s.id === id);
  }

  async discoverDatabases(): Promise<DiscoveredDatabase[]> {
    const docRecords = this.docsService.list.docs$.value;
    const results: DiscoveredDatabase[] = [];

    for (const record of docRecords) {
      const docId = record.id;
      let docRef: { doc: any; release: () => void } | undefined;

      try {
        const trash = record.trash$.value;
        if (trash) continue;

        docRef = this.docsService.open(docId);
        const bsDoc = docRef.doc.blockSuiteDoc;

        if (!bsDoc.ready) {
          bsDoc.load();
        }

        const dbBlocks: Array<{ id: string; model: any }> =
          bsDoc.getBlocksByFlavour('affine:database');

        const docTitle = docRef.doc.title$.value || 'Untitled';

        for (const dbBlock of dbBlocks) {
          const dbModel = dbBlock.model;
          const name =
            dbModel?.props?.title?.yText?.toString?.() ??
            dbModel?.props?.title?.toString?.() ??
            'Untitled Database';

          results.push({
            docId,
            databaseBlockId: dbBlock.id,
            name,
            docTitle,
          });
        }
      } catch (err) {
        console.warn('[calendar-view] failed to scan doc', docId, err);
      } finally {
        docRef?.release();
      }
    }

    this._discoveredDatabases$.next(results);
    return results;
  }

  isAlreadyConnected(databaseBlockId: string): boolean {
    return this.sources$.value.some(s => s.id === databaseBlockId);
  }

  addDiscoveredDatabase(db: DiscoveredDatabase) {
    return this.store.addSource(db.docId, db.databaseBlockId, db.name);
  }
}
