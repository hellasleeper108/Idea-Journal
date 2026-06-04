import { useState, useCallback, useEffect } from 'react';
import { ideasApi } from '../utils/api';

export const useIdeas = () => {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ideasApi.list().then(setIdeas).catch(console.error).finally(() => setLoading(false));
  }, []);

  const addIdea = useCallback(async (data) => {
    const idea = await ideasApi.create(data);
    setIdeas(prev => [idea, ...prev]);
    return idea.id;
  }, []);

  const updateIdea = useCallback(async (id, patch) => {
    const updated = await ideasApi.update(id, patch);
    setIdeas(prev => prev.map(i => (i.id === id ? updated : i)));
  }, []);

  const deleteIdea = useCallback(async (id) => {
    await ideasApi.delete(id);
    setIdeas(prev => prev.filter(i => i.id !== id));
  }, []);

  const getAllTags = useCallback(() => {
    // Compute tags from loaded ideas (avoids extra API call on every render)
    const tags = new Set();
    ideas.forEach(i => i.tags?.forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [ideas]);

  return { ideas, addIdea, updateIdea, deleteIdea, getAllTags, loading };
};