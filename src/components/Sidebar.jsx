import { Tag, Filter } from 'lucide-react';
import { STATUS_OPTIONS } from '../utils/storage';
import styles from './Sidebar.module.css';

export default function Sidebar({ ideas, filter, onFilter, allTags }) {
  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = ideas.filter(i => i.status === s.value).length;
    return acc;
  }, {});

  return (
    <aside className={styles.sidebar}>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          <Filter size={10} />
          STATUS
        </div>
        <button
          className={`${styles.filterBtn} ${!filter.status ? styles.active : ''}`}
          onClick={() => onFilter({ ...filter, status: null })}
        >
          <span>ALL</span>
          <span className={styles.count}>{ideas.length}</span>
        </button>
        {STATUS_OPTIONS.map(s => (
          <button
            key={s.value}
            className={`${styles.filterBtn} ${filter.status === s.value ? styles.active : ''}`}
            onClick={() => onFilter({ ...filter, status: filter.status === s.value ? null : s.value })}
            style={filter.status === s.value ? { color: s.color } : {}}
          >
            <span className={styles.dot} style={{ background: s.color }} />
            <span>{s.label}</span>
            <span className={styles.count}>{counts[s.value] || 0}</span>
          </button>
        ))}
      </div>

      {allTags.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>
            <Tag size={10} />
            TAGS
          </div>
          <div className={styles.tags}>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`${styles.tag} ${filter.tag === tag ? styles.tagActive : ''}`}
                onClick={() => onFilter({ ...filter, tag: filter.tag === tag ? null : tag })}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
