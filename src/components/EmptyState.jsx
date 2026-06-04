import { Zap } from 'lucide-react';
import styles from './EmptyState.module.css';

export default function EmptyState({ hasFilter, onNew }) {
  if (hasFilter) {
    return (
      <div className={styles.empty}>
        <span className={styles.glyph}>∅</span>
        <p>No ideas match the current filter.</p>
      </div>
    );
  }
  return (
    <div className={styles.empty}>
      <span className={styles.glyph}>_</span>
      <p className={styles.headline}>No ideas yet.</p>
      <p className={styles.sub}>
        When creative brilliance strikes, capture it here before it evaporates.
      </p>
      <button className={styles.btn} onClick={onNew}>
        <Zap size={12} /> LOG FIRST IDEA
      </button>
    </div>
  );
}
