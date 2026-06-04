const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const ideasApi = {
  list(params = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.tag) qs.set('tag', params.tag);
    if (params.search) qs.set('search', params.search);
    const query = qs.toString();
    return request(`/ideas${query ? `?${query}` : ''}`);
  },

  get(id) {
    return request(`/ideas/${id}`);
  },

  create(data) {
    return request('/ideas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(id, patch) {
    return request(`/ideas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  delete(id) {
    return request(`/ideas/${id}`, { method: 'DELETE' });
  },

  tags() {
    return request('/tags');
  },
};