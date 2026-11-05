import { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'
import Teachers from './components/Teachers.jsx'
import Subjects from './components/Subjects.jsx'

async function fetchAll() {
  const [teachers, subjects] = await Promise.all([api.teachers.list(), api.subjects.list()])
  return { teachers, subjects }
}

export default function App() {
  const [tab, setTab] = useState('teachers')
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState(null)

  // Recarga ambas listas (se usa tras cada cambio y en "Reintentar")
  const load = useCallback(async () => {
    try {
      const data = await fetchAll()
      setTeachers(data.teachers)
      setSubjects(data.subjects)
      setLoadError('')
    } catch (e) {
      setLoadError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Carga inicial
  useEffect(() => {
    let ignore = false
    fetchAll()
      .then((data) => {
        if (ignore) return
        setTeachers(data.teachers)
        setSubjects(data.subjects)
      })
      .catch((e) => {
        if (!ignore) setLoadError(e.message)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [])

  // Los avisos de éxito se cierran solos
  useEffect(() => {
    if (notice?.type !== 'ok') return
    const id = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(id)
  }, [notice])

  // Docentes y asignaturas dependen entre sí: tras cada cambio se recargan ambos
  const onChange = async (message) => {
    await load()
    setNotice({ type: 'ok', text: message })
  }

  return (
    <div className="shell">
      <h1>Administración escolar</h1>

      <div className="tabs" role="tablist" aria-label="Secciones">
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab === 'teachers'}
          onClick={() => setTab('teachers')}
        >
          Docentes <span className="count">{teachers.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab === 'subjects'}
          onClick={() => setTab('subjects')}
        >
          Asignaturas <span className="count">{subjects.length}</span>
        </button>
      </div>

      {notice && (
        <div
          className={`notice ${notice.type}`}
          role={notice.type === 'error' ? 'alert' : 'status'}
        >
          <span>{notice.text}</span>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}

      <main role="tabpanel">
        {loading ? (
          <p className="empty">Cargando…</p>
        ) : loadError ? (
          <div className="empty">
            <p>{loadError}</p>
            <p>
              <button type="button" className="btn" onClick={load}>
                Reintentar
              </button>
            </p>
          </div>
        ) : tab === 'teachers' ? (
          <Teachers teachers={teachers} subjects={subjects} onChange={onChange} />
        ) : (
          <Subjects teachers={teachers} subjects={subjects} onChange={onChange} />
        )}
      </main>
    </div>
  )
}
