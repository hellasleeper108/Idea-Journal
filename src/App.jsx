import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useIdeas } from './hooks/useIdeas';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import IdeaCard from './components/IdeaCard';
import IdeaModal from './components/IdeaModal';
import EmptyState from './components/EmptyState';
import styles from './App.module.css';

export default function App() {
  const { ideas, addIdea, updateIdea, deleteIdea, getAllTags } = useIdeas();
  const [activeId, setActiveId] = useState(null);
  const [filter, setFilter] = useState({ status: null, tag: null });
  const [search, setSearch] = useState('');

  const allTags = getAllTags();

  const filtered = useMemo(() => {
    return ideas.filter(idea => {
      if (filter.status && idea.status !== filter.status) return false;
      if (filter.tag && !idea.tags?.includes(filter.tag)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          idea.hook?.toLowerCase().includes(q) ||
          idea.seed?.toLowerCase().includes(q) ||
          idea.footprint?.toLowerCase().includes(q) ||
          idea.tags?.some(t => t.includes(q))
        );
      }
      return true;
    });
  }, [ideas, filter, search]);

  const handleNew = () => {
    const id = addIdea({ hook: '', seed: '', footprint: '', tags: [], status: 'raw' });
    setActiveId(id);
  };

  const activeIdea = ideas.find(i => i.id === activeId);
  const hasFilter = !!(filter.status || filter.tag || search);

  return (
    <div className={styles.app}>
      <Header ideaCount={ideas.length} onNew={handleNew} />

      <div className={styles.layout}>
        <Sidebar
          ideas={ideas}
          filter={filter}
          onFilter={setFilter}
          allTags={allTags}
        />

        <main className={styles.main}>
          <div className={styles.searchBar}>
            <Search size={13} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="search ideas..."
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>

          {(hasFilter || ideas.length > 0) && (
            <div className={styles.resultsHeader}>
              <span className={styles.resultsCount}>
                {filtered.length} idea{filtered.length !== 1 ? 's' : ''}
                {hasFilter ? ' matched' : ''}
              </span>
              {hasFilter && (
                <button
                  className={styles.clearFilter}
                  onClick={() => { setFilter({ status: null, tag: null }); setSearch(''); }}
                >
                  clear filters ×
                </button>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState hasFilter={hasFilter} onNew={handleNew} />
          ) : (
            <div className={styles.grid}>
              {filtered.map(idea => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onClick={() => setActiveId(idea.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {activeIdea && (
        <IdeaModal
          idea={activeIdea}
          onClose={() => setActiveId(null)}
          onUpdate={updateIdea}
          onDelete={deleteIdea}
        />
      )}
    </div>
  );
}
