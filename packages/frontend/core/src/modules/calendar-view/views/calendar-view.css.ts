import { style } from '@vanilla-extract/css';

export const gridContainer = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: 1,
  backgroundColor: 'var(--affine-border-color)',
  borderRadius: 8,
  overflow: 'hidden',
});

export const gridCell = style({
  backgroundColor: 'var(--affine-background-primary-color)',
  minHeight: 120,
  padding: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
});

export const gridCellHeader = style({
  display: 'flex',
  justifyContent: 'flex-end',
  padding: '2px 6px',
  fontSize: 12,
  color: 'var(--affine-text-secondary-color)',
  selectors: {
    '&[data-today="true"]': {
      color: 'var(--affine-brand-color)',
      fontWeight: 600,
    },
  },
});

export const cardPill = style({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '1px 6px',
  borderRadius: 4,
  fontSize: 11,
  cursor: 'pointer',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  selectors: {
    '&:hover': {
      opacity: 0.85,
    },
  },
});

export const cardDot = style({
  width: 6,
  height: 6,
  borderRadius: '50%',
  flexShrink: 0,
});

export const ganttContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  overflowX: 'auto',
});

export const ganttGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

export const ganttGroupHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 0',
  fontSize: 13,
  fontWeight: 600,
});

export const ganttRow = style({
  display: 'flex',
  alignItems: 'center',
  height: 28,
  position: 'relative',
});

export const ganttBar = style({
  position: 'absolute',
  height: 20,
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  paddingLeft: 6,
  paddingRight: 6,
  fontSize: 11,
  color: '#fff',
  cursor: 'pointer',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  selectors: {
    '&:hover': {
      opacity: 0.85,
    },
  },
});

export const ganttDiamond = style({
  position: 'absolute',
  width: 12,
  height: 12,
  borderRadius: 2,
  transform: 'rotate(45deg)',
  cursor: 'pointer',
  top: 8,
  selectors: {
    '&:hover': {
      opacity: 0.85,
    },
  },
});

export const ganttTimelineHeader = style({
  display: 'flex',
  borderBottom: '1px solid var(--affine-border-color)',
  marginBottom: 8,
});

export const ganttDayColumn = style({
  flex: '0 0 40px',
  textAlign: 'center',
  fontSize: 10,
  color: 'var(--affine-text-secondary-color)',
  padding: '4px 0',
});

export const sourceColorDot = style({
  width: 10,
  height: 10,
  borderRadius: '50%',
  flexShrink: 0,
});

export const headerControls = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
});

export const modeToggle = style({
  display: 'flex',
  borderRadius: 6,
  overflow: 'hidden',
  border: '1px solid var(--affine-border-color)',
});

export const modeButton = style({
  padding: '4px 12px',
  fontSize: 12,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  selectors: {
    '&[data-active="true"]': {
      backgroundColor: 'var(--affine-hover-color)',
    },
  },
});

export const statusBadge = style({
  fontSize: 9,
  padding: '0 4px',
  borderRadius: 3,
  opacity: 0.8,
});
