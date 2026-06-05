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

async function streamRequest(path, data, onChunk) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) return '';

  const decoder = new TextDecoder();
  let output = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    output += chunk;
    onChunk?.(chunk, output);
  }
  return output;
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

  active() {
    return request('/ideas/active');
  },
};

export const claudeApi = {
  expand(ideaId, instruction = '') {
    return request('/claude/expand', {
      method: 'POST',
      body: JSON.stringify({ ideaId, instruction }),
    });
  },

  scaffold(ideaId, instruction = '') {
    return request('/claude/scaffold', {
      method: 'POST',
      body: JSON.stringify({ ideaId, instruction }),
    });
  },

  score(daysOld = 14) {
    return request('/claude/score', {
      method: 'POST',
      body: JSON.stringify({ daysOld }),
    });
  },

  command(ideaId, command, onChunk) {
    return streamRequest('/claude/command', { ideaId, command }, onChunk);
  },
};

export const codexApi = {
  expand(ideaId, instruction = '') {
    return request('/codex/expand', {
      method: 'POST',
      body: JSON.stringify({ ideaId, instruction }),
    });
  },

  scaffold(ideaId, instruction = '') {
    return request('/codex/scaffold', {
      method: 'POST',
      body: JSON.stringify({ ideaId, instruction }),
    });
  },

  plan(ideaId, instruction = '') {
    return request('/codex/plan', {
      method: 'POST',
      body: JSON.stringify({ ideaId, instruction }),
    });
  },

  command(ideaId, command, onChunk) {
    return streamRequest('/codex/command', { ideaId, command }, onChunk);
  },
};
