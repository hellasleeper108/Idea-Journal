const STORAGE_KEY = 'idea-journal-v1';

export const loadIdeas = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveIdeas = (ideas) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
  } catch (e) {
    console.error('Failed to save ideas:', e);
  }
};

export const generateId = () =>
  `idea_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

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
