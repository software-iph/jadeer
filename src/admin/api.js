async function request(method, url, body, isForm) {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status })
  return data
}

export const api = {
  me: () => request('GET', '/api/auth/me'),
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  logout: () => request('POST', '/api/auth/logout'),
  changePassword: (current, next) => request('POST', '/api/auth/password', { current, next }),
  getContent: () => request('GET', '/api/content'),
  getDefaults: () => request('GET', '/api/content/defaults'),
  saveContent: (data) => request('PUT', '/api/content', data),
  uploads: () => request('GET', '/api/uploads'),
  builtin: () => request('GET', '/api/media/builtin'),
  deleteUpload: (id) => request('DELETE', `/api/uploads/${id}`),
  applications: () => request('GET', '/api/applications'),
  setApplicationStatus: (id, status) => request('PATCH', `/api/applications/${id}`, { status }),
  deleteApplication: (id) => request('DELETE', `/api/applications/${id}`),
  upload: (file) => { const fd = new FormData(); fd.append('file', file); return request('POST', '/api/uploads', fd, true) },
}
