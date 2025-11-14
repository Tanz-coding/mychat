const API_BASE = '/api/news';

function buildHeaders(token, isJson = true) {
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function handleResponse(res) {
  if (res.status === 204) {
    return null;
  }
  const contentType = res.headers.get('content-type') || '';
  let payload;
  if (contentType.includes('application/json')) {
    payload = await res.json();
  } else {
    payload = await res.text();
  }
  if (!res.ok) {
    const message = payload && payload.message ? payload.message : (typeof payload === 'string' ? payload : 'Request failed');
    throw new Error(message || 'Request failed');
  }
  return payload;
}

export async function fetchNewsList(params = {}, token) {
  const query = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      query.append(key, params[key]);
    }
  });
  const url = query.toString() ? `${API_BASE}?${query.toString()}` : API_BASE;
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(token, false)
  });
  return handleResponse(res);
}

export async function fetchHotNews(limit = 10) {
  const res = await fetch(`${API_BASE}/hot?limit=${limit}`);
  return handleResponse(res);
}

export async function fetchRecentNews(limit = 10) {
  const res = await fetch(`${API_BASE}/recent?limit=${limit}`);
  return handleResponse(res);
}

export async function fetchNewsDetail(id, token) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'GET',
    headers: buildHeaders(token, false)
  });
  return handleResponse(res);
}

export async function createNews(payload, token) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

export async function updateNews(id, payload, token) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: buildHeaders(token),
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

export async function deleteNews(id, token) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(token, false)
  });
  return handleResponse(res);
}

export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  return handleResponse(res);
}

export async function createCategory(payload, token) {
  const res = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

export async function updateCategory(id, payload, token) {
  const res = await fetch(`${API_BASE}/categories/${id}`, {
    method: 'PUT',
    headers: buildHeaders(token),
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

export async function deleteCategory(id, token) {
  const res = await fetch(`${API_BASE}/categories/${id}`, {
    method: 'DELETE',
    headers: buildHeaders(token, false)
  });
  return handleResponse(res);
}

export async function fetchComments(newsId, params = {}, token) {
  const query = new URLSearchParams();
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      query.append(key, params[key]);
    }
  });
  const url = `${API_BASE}/${newsId}/comments${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(token, false)
  });
  return handleResponse(res);
}

export async function createComment(newsId, content, token) {
  const res = await fetch(`${API_BASE}/${newsId}/comments`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({ content })
  });
  return handleResponse(res);
}

export async function deleteComment(newsId, commentId, token) {
  const res = await fetch(`${API_BASE}/${newsId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: buildHeaders(token, false)
  });
  return handleResponse(res);
}

export async function incrementView(newsId) {
  await fetch(`${API_BASE}/${newsId}/views`, { method: 'POST' });
}

export async function fetchAuditLogs(limit = 200, token) {
  const res = await fetch(`${API_BASE}/audit/logs?limit=${limit}`, {
    method: 'GET',
    headers: buildHeaders(token, false)
  });
  return handleResponse(res);
}

export async function fetchStats(token) {
  const res = await fetch(`${API_BASE}/stats`, {
    method: 'GET',
    headers: buildHeaders(token, false)
  });
  return handleResponse(res);
}

export async function fetchBackupInfo(token) {
  const res = await fetch(`${API_BASE}/admin/backup`, {
    method: 'GET',
    headers: buildHeaders(token, false)
  });
  return handleResponse(res);
}

export async function backupNews(token) {
  const res = await fetch(`${API_BASE}/admin/backup`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({})
  });
  return handleResponse(res);
}

export async function restoreNews(token) {
  const res = await fetch(`${API_BASE}/admin/restore`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({})
  });
  return handleResponse(res);
}

export async function resetNews(token) {
  const res = await fetch(`${API_BASE}/admin/reset`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({})
  });
  return handleResponse(res);
}

export async function seedNews(token, payload = {}) {
  const res = await fetch(`${API_BASE}/admin/seed`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

export async function fetchProfile(token) {
  const res = await fetch(`${API_BASE}/me`, {
    method: 'GET',
    headers: buildHeaders(token, false)
  });
  return handleResponse(res);
}
