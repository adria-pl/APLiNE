import { CalendarSourceService } from '@affine/core/modules/calendar-view/services/calendar-source';
import type { CalendarSource } from '@affine/core/modules/calendar-view/types';
import { useLiveData, useService } from '@toeverything/infra';
import type { FC } from 'react';
import { useState } from 'react';

import * as styles from './calendar-view.css';

export const SourceSelector: FC = () => {
  const sourceService = useService(CalendarSourceService);
  const sources = useLiveData(sourceService.sources$);
  const discovered = useLiveData(sourceService.discoveredDatabases$);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [scanning, setScanning] = useState(false);

  const unconnected = discovered.filter(
    db => !sources.some(s => s.id === db.databaseBlockId)
  );

  const handleScan = async () => {
    setScanning(true);
    try {
      await sourceService.discoverDatabases();
    } finally {
      setScanning(false);
    }
  };

  return (
    <div style={{ minWidth: 280 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Connected Boards</div>
      {sources.length === 0 && (
        <div style={{ color: 'var(--affine-text-secondary-color)', fontSize: 12, marginBottom: 8 }}>
          No boards connected. Click "Scan for Boards" below.
        </div>
      )}
      {sources.map(source => (
        <SourceItem
          key={source.id}
          source={source}
          onRemove={() => sourceService.removeSource(source.id)}
        />
      ))}

      <div style={{ marginTop: 12, borderTop: '1px solid var(--affine-border-color)', paddingTop: 8 }}>
        <button
          onClick={() => {
            setShowDiscovery(!showDiscovery);
            if (!showDiscovery && discovered.length === 0) {
              handleScan();
            }
          }}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: 'var(--affine-brand-color)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {showDiscovery ? 'Hide Available Boards' : 'Scan for Boards'}
        </button>

        {showDiscovery && (
          <div style={{ marginTop: 8 }}>
            {scanning && (
              <div style={{ color: 'var(--affine-text-secondary-color)', fontSize: 11 }}>
                Scanning workspace for databases...
              </div>
            )}
            {!scanning && unconnected.length === 0 && discovered.length > 0 && (
              <div style={{ color: 'var(--affine-text-secondary-color)', fontSize: 11 }}>
                All databases are already connected.
              </div>
            )}
            {!scanning && discovered.length === 0 && (
              <div style={{ color: 'var(--affine-text-secondary-color)', fontSize: 11 }}>
                No databases found. Create a database in a doc first.
              </div>
            )}
            {unconnected.map(db => (
              <div
                key={db.databaseBlockId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 0',
                }}
              >
                <span style={{ flex: 1, fontSize: 12 }}>
                  <span style={{ color: 'var(--affine-text-secondary-color)', fontSize: 10 }}>
                    {db.docTitle}
                  </span>
                  <br />
                  {db.name}
                </span>
                <button
                  onClick={() => sourceService.addDiscoveredDatabase(db)}
                  style={{
                    border: '1px solid var(--affine-border-color)',
                    background: 'transparent',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 11,
                    padding: '2px 8px',
                    color: 'var(--affine-brand-color)',
                  }}
                >
                  Add
                </button>
              </div>
            ))}
            {!scanning && (
              <button
                onClick={handleScan}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: 'var(--affine-text-secondary-color)',
                  fontSize: 11,
                  marginTop: 4,
                }}
              >
                Re-scan
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SourceItem: FC<{
  source: CalendarSource;
  onRemove: () => void;
}> = ({ source, onRemove }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 0',
      }}
    >
      <span
        className={styles.sourceColorDot}
        style={{ backgroundColor: source.color }}
      />
      <span style={{ flex: 1, fontSize: 13 }}>{source.name}</span>
      <button
        onClick={onRemove}
        style={{
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--affine-text-secondary-color)',
          fontSize: 12,
        }}
      >
        ✕
      </button>
    </div>
  );
};
