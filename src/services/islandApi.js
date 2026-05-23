function buildHeaders(token, isJson = true) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function handleResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const message = normalizeErrorMessage(payload, res.status);
    throw new Error(message || 'Request failed');
  }
  return payload;
}

function normalizeErrorMessage(payload, status) {
  if (payload && payload.message) {
    return payload.message;
  }
  if (typeof payload !== 'string') {
    return '请求失败，请稍后重试';
  }
  const raw = payload.trim();
  if (!raw) {
    return '请求失败，请稍后重试';
  }
  const preMatch = raw.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  const readable = preMatch ? preMatch[1] : raw;
  const withoutTags = readable.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (/Cannot\s+(GET|POST|PUT|DELETE)\s+\/api\/ai\/config/i.test(withoutTags)) {
    return 'AI 配置接口暂不可用，请重启后端服务后再试';
  }
  if (/^<!doctype html/i.test(raw) || /<html[\s>]/i.test(raw)) {
    return status === 404 ? '接口不存在，请确认后端服务已更新并重启' : '后端返回异常页面，请稍后重试';
  }
  return withoutTags.slice(0, 120) || '请求失败，请稍后重试';
}

export async function registerAccount(payload) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

export async function fetchFriends(token) {
  const res = await fetch('/api/friends', {
    headers: buildHeaders(token, false)
  });
  return handleResponse(res);
}

export async function requestFriend(targetId, token) {
  const res = await fetch('/api/friends/request', {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({ targetId })
  });
  return handleResponse(res);
}

export async function acceptFriend(targetId, token) {
  const res = await fetch(`/api/friends/${targetId}/accept`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({})
  });
  return handleResponse(res);
}

export async function deleteFriend(targetId, token) {
  const res = await fetch(`/api/friends/${targetId}`, {
    method: 'DELETE',
    headers: buildHeaders(token, false)
  });
  return handleResponse(res);
}

export async function fetchSettings(token) {
  const res = await fetch('/api/settings', {
    headers: buildHeaders(token, false)
  });
  return handleResponse(res);
}

export async function saveSettings(settings, token) {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: buildHeaders(token),
    body: JSON.stringify(settings)
  });
  return handleResponse(res);
}

export async function askAssistant(prompt, token) {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({ prompt })
  });
  return handleResponse(res);
}

export async function fetchAiConfig(token) {
  const res = await fetch('/api/ai/config', {
    headers: buildHeaders(token, false)
  });
  return handleResponse(res);
}

export async function saveAiConfig(config, token) {
  const res = await fetch('/api/ai/config', {
    method: 'PUT',
    headers: buildHeaders(token),
    body: JSON.stringify(config)
  });
  return handleResponse(res);
}

export async function uploadIslandFile(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/upload/file');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    };
    xhr.onload = () => {
      const contentType = xhr.getResponseHeader('content-type') || '';
      const payload = contentType.includes('application/json')
        ? JSON.parse(xhr.responseText || '{}')
        : xhr.responseText;
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
      } else {
        reject(new Error(payload && payload.message ? payload.message : '文件上传失败'));
      }
    };
    xhr.onerror = () => reject(new Error('文件上传失败'));
    xhr.send(formData);
  });
}

export async function fetchAbout() {
  const res = await fetch('/api/system/about');
  return handleResponse(res);
}
