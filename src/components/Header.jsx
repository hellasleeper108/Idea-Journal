import { Zap, BookOpen } from 'lucide-react';
import styles from './Header.module.css';

export default function Header({ ideaCount, onNew }) {
  const now = new Date();
  const stamp = now.toISOString().replace('T', ' ').slice(0, 19);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logo}>
          <BookOpen size={14} strokeWidth={1.5} />
          <span className={styles.logoText}>IDEA<span className={styles.accent}>_</span>JOURNAL</span>
        </div>
        <span className={styles.meta}>// {ideaCount} entries · {stamp}Z</span>
      </div>
      <button className={styles.newBtn} onClick={onNew}>
        <Zap size={12} />
        NEW IDEA
      </button>
    </header>
  );
}
