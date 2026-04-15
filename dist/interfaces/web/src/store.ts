import { create } from 'zustand';
import { api, Article, Topic } from './api';

interface PipelineStore {
  // Data
  articles: Article[];
  topics: Topic[];
  loading: boolean;
  error: string | null;

  // Actions
  loadData: () => Promise<void>;
  addArticle: (article: Article) => void;
  updateArticleLocal: (id: string, updates: Partial<Article>) => void;
  removeArticle: (id: string) => void;
  addTopic: (topic: Topic) => void;
  updateTopicLocal: (id: string, updates: Partial<Topic>) => void;
  removeTopic: (id: string) => void;

  // Derived
  articlesByStatus: (status: Article['status']) => Article[];
  backlogTopics: () => Topic[];
}

export const useStore = create<PipelineStore>((set, get) => ({
  articles: [],
  topics: [],
  loading: true,
  error: null,

  loadData: async () => {
    try {
      set({ loading: true, error: null });
      const { articles, topics } = await api.getDashboardData();
      set({ articles, topics, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addArticle: (article) => {
    set((s) => ({ articles: [article, ...s.articles] }));
  },

  updateArticleLocal: (id, updates) => {
    set((s) => ({
      articles: s.articles.map((a) =>
        a.id === id ? { ...a, ...updates, updated_at: Date.now() } : a
      ),
    }));
  },

  removeArticle: (id) => {
    set((s) => ({ articles: s.articles.filter((a) => a.id !== id) }));
  },

  addTopic: (topic) => {
    set((s) => ({ topics: [topic, ...s.topics] }));
  },

  updateTopicLocal: (id, updates) => {
    set((s) => ({
      topics: s.topics.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));
  },

  removeTopic: (id) => {
    set((s) => ({ topics: s.topics.filter((t) => t.id !== id) }));
  },

  articlesByStatus: (status) => {
    return get().articles.filter((a) => a.status === status);
  },

  backlogTopics: () => {
    return get().topics
      .filter((t) => t.status === 'backlog')
      .sort((a, b) => {
        // High priority first, then by most recent
        if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
        return b.created_at - a.created_at;
      });
  },
}));
