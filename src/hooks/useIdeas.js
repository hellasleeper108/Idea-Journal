import { useState, useCallback } from 'react';
import { loadIdeas, saveIdeas, generateId } from '../utils/storage';

const persist = (ideas) => {
  saveIdeas(ideas);
  return ideas;
};

export const useIdeas = () => {
  const [ideas, setIdeas] = useState(() => loadIdeas());

  const addIdea = useCallback((data) => {
    const idea = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'raw',
      hook: '',
      seed: '',
      footprint: '',
      tags: [],
      score: null,
      ...data,
    };
    setIdeas(prev => persist([idea, ...prev]));
    return idea.id;
  }, []);

  const updateIdea = useCallback((id, patch) => {
    setIdeas(prev =>
      persist(prev.map(i =>
        i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i
      ))
    );
  }, []);

  const deleteIdea = useCallback((id) => {
    setIdeas(prev => persist(prev.filter(i => i.id !== id)));
  }, []);

  const getAllTags = useCallback(() => {
    const tags = new Set();
    ideas.forEach(i => i.tags?.forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [ideas]);

  return { ideas, addIdea, updateIdea, deleteIdea, getAllTags };
};
