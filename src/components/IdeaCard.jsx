import { formatDistanceToNow } from '../utils/time';
import { getStatusMeta } from '../utils/storage';
import { ChevronRight } from 'lucide-react';
import styles from './IdeaCard.module.css';

export default function IdeaCard({ idea, onClick }) {
  const status = getStatusMeta(idea.status);
  const age = formatDistanceToNow(idea.createdAt);

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.topRow}>
        <span
          className={styles.status}
          style={{ color: status.color, background: status.bg }}
        >
          {status.label}
        </span>
        <span className={styles.age}>{age}</span>
      </div>

      <h3 className={styles.title}>
        {idea.hook || <span className={styles.empty}>Untitled idea...</span>}
      </h3>

      {idea.seed && (
        <p className={styles.seed}>{idea.seed}</p>
      )}

      <div className={styles.bottomRow}>
        <div className={styles.tags}>
          {idea.tags?.slice(0, 4).map(tag => (
            <span key={tag} className={styles.tag}>#{tag}</span>
          ))}
        </div>
        <ChevronRight size={12} className={styles.arrow} />
      </div>
    </div>
  );
}
