/* Constants shared between components — storage moved to backend */

export const STATUS_OPTIONS = [
  { value: 'raw',      label: 'RAW',      color: 'var(--text-dim)',    bg: 'rgba(74,74,70,0.15)' },
  { value: 'parked',   label: 'PARKED',   color: 'var(--amber)',       bg: 'var(--amber-dim)' },
  { value: 'active',   label: 'ACTIVE',   color: 'var(--accent)',      bg: 'var(--accent-dim)' },
  { value: 'shipped',  label: 'SHIPPED',  color: 'var(--cyan)',        bg: 'var(--cyan-dim)' },
  { value: 'archived', label: 'ARCHIVED', color: 'var(--text-dim)',    bg: 'transparent' },
];

export const TAG_COLORS = [
  'var(--accent)',
  'var(--cyan)',
  'var(--purple)',
  'var(--amber)',
  'var(--red)',
];

export const getStatusMeta = (value) =>
  STATUS_OPTIONS.find(s => s.value === value) || STATUS_OPTIONS[0];