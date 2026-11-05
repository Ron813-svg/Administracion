// Dirección del backend. Se puede cambiar con VITE_API_URL en un archivo .env
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

async function request(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Revisa que el backend esté corriendo en el puerto 3000.',
    )
  }

  // DELETE responde 204 sin cuerpo
  if (res.status === 204) return null

  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}`)
  return data
}

export const api = {
  teachers: {
    list: () => request('/teachers'),
    create: (body) => request('/teachers', { method: 'POST', body }),
    update: (id, body) => request(`/teachers/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/teachers/${id}`, { method: 'DELETE' }),
  },
  subjects: {
    list: () => request('/subjects'),
    create: (body) => request('/subjects', { method: 'POST', body }),
    update: (id, body) => request(`/subjects/${id}`, { method: 'PUT', body }),
    remove: (id) => request(`/subjects/${id}`, { method: 'DELETE' }),
  },
}
