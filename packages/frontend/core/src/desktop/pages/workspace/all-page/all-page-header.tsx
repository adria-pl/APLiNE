import { type MenuProps, IconType } from '@affine/component';
import { usePageHelper } from '@affine/core/blocksuite/block-suite-page-list/utils';
import { ExplorerDisplayMenuButton } from '@affine/core/components/explorer/display-menu';
import { ViewToggle } from '@affine/core/components/explorer/display-menu/view-toggle';
import type { DocListItemView } from '@affine/core/components/explorer/docs-view/doc-list-item';
import { ExplorerNavigation } from '@affine/core/components/explorer/header/navigation';
import type { ExplorerDisplayPreference } from '@affine/core/components/explorer/types';
import { PageListNewPageButton } from '@affine/core/components/page-list/docs/page-list-new-page-button';
import { WorkspaceDialogService } from '@affine/core/modules/dialogs';
import { DocsService } from '@affine/core/modules/doc';
import { ExplorerIconService } from '@affine/core/modules/explorer-icon/services/explorer-icon';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { inferOpenMode } from '@affine/core/utils';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';
import { useService } from '@toeverything/infra';
import { useCallback, useRef } from 'react';

import * as styles from './all-page-header.css';

const menuProps: Partial<MenuProps> = {
  contentOptions: {
    side: 'bottom',
    align: 'end',
    alignOffset: 0,
    sideOffset: 8,
  },
};
export const AllDocsHeader = ({
  displayPreference,
  onDisplayPreferenceChange,
  view,
  onViewChange,
}: {
  displayPreference: ExplorerDisplayPreference;
  onDisplayPreferenceChange: (
    displayPreference: ExplorerDisplayPreference
  ) => void;
  view: DocListItemView;
  onViewChange: (view: DocListItemView) => void;
}) => {
  const t = useI18n();
  const workspaceService = useService(WorkspaceService);
  const workspaceDialogService = useService(WorkspaceDialogService);
  const workbenchService = useService(WorkbenchService);
  const docsService = useService(DocsService);
  const explorerIconService = useService(ExplorerIconService);
  const workbench = workbenchService.workbench;
  const { createEdgeless, createPage } = usePageHelper(
    workspaceService.workspace.docCollection
  );
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDocs = useCallback(
    (result: {
      docIds: string[];
      entryId?: string;
      isWorkspaceFile?: boolean;
    }) => {
      const { docIds, entryId, isWorkspaceFile } = result;
      if (isWorkspaceFile && entryId) {
        workbench.openDoc(entryId);
      } else if (!docIds.length) {
        return;
      }
      if (docIds.length > 1) {
        workbench.openAll();
      } else {
        workbench.openDoc(docIds[0]);
      }
    },
    [workbench]
  );

  const onImportFile = useCallback(() => {
    track.$.header.importModal.open();
    workspaceDialogService.open('import', undefined, payload => {
      if (!payload) {
        return;
      }
      handleOpenDocs(payload);
    });
  }, [workspaceDialogService, handleOpenDocs]);

  const handlePdfUpload = useCallback(() => {
    pdfInputRef.current?.click();
  }, []);

  const onPdfFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';

      const title = file.name.replace(/\.pdf$/i, '');
      const docRecord = docsService.createDoc({ title });
      const { doc, release } = docsService.open(docRecord.id);

      try {
        await doc.waitForSyncReady();

        const store = doc.blockSuiteDoc;
        const noteBlock = store.getBlocksByFlavour('affine:note').at(0);
        if (!noteBlock) throw new Error('No note block found');

        const sourceId =
          await workspaceService.workspace.docCollection.blobSync.set(file);
        const attachmentBlockId = store.addBlock(
          'affine:attachment' as never,
          {
            name: file.name,
            size: file.size,
            type: 'application/pdf',
            sourceId,
            embed: true,
          },
          noteBlock.id
        );

        doc.setCustomProperty('pdf', attachmentBlockId);

        explorerIconService.setIcon({
          where: 'doc',
          id: docRecord.id,
          icon: { type: IconType.Emoji, unicode: '\uD83D\uDCC4' },
        });
      } finally {
        release();
      }
    },
    [docsService, explorerIconService, workspaceService]
  );

  return (
    <div className={styles.header}>
      <ExplorerNavigation active="docs" />

      <div className={styles.actions}>
        <ViewToggle view={view} onViewChange={onViewChange} />
        <ExplorerDisplayMenuButton
          menuProps={menuProps}
          displayPreference={displayPreference}
          onDisplayPreferenceChange={onDisplayPreferenceChange}
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={onPdfFileSelected}
        />
        <PageListNewPageButton
          size="small"
          onCreateEdgeless={e => createEdgeless({ at: inferOpenMode(e) })}
          onCreatePage={e => createPage('page', { at: inferOpenMode(e) })}
          onCreateDoc={e => createPage(undefined, { at: inferOpenMode(e) })}
          onImportFile={onImportFile}
          onUploadPdf={handlePdfUpload}
          data-testid="new-page-button-trigger"
        >
          <span className={styles.newPageButtonLabel}>{t['New Page']()}</span>
        </PageListNewPageButton>
      </div>
    </div>
  );
};
