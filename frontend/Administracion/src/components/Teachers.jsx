import { useState } from 'react'
import { api } from '../api.js'
import Modal, { ConfirmDialog } from './Modal.jsx'

export default function Teachers({ teachers, subjects, onChange }) {
  const [editing, setEditing] = useState(null) // null | 'new' | docente
  const [deleting, setDeleting] = useState(null)

  async function save(payload) {
    if (editing === 'new') {
      await api.teachers.create(payload)
      await onChange('Docente creado')
    } else {
      await api.teachers.update(editing.id, payload)
      await onChange('Docente actualizado')
    }
  }

  return (
    <section>
      <div className="section-head">
        <h2>Docentes</h2>
        <button type="button" className="btn primary" onClick={() => setEditing('new')}>
          Nuevo docente
        </button>
      </div>

      {teachers.length === 0 ? (
        <p className="empty">
          Todavía no hay docentes. Crea primero una asignatura activa y luego agrega al docente que
          la dará.
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Asignaturas</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td className="strong">{t.name}</td>
                  <td>{t.email}</td>
                  <td>
                    <ul className="chips">
                      {t.subjects.map((s) => (
                        <li key={s.id}>{s.name}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="row-actions">
                    <button type="button" className="btn small" onClick={() => setEditing(t)}>
                      Editar
                    </button>
                    <button type="button" className="btn small danger" onClick={() => setDeleting(t)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <TeacherForm
          key={editing === 'new' ? 'new' : editing.id}
          teacher={editing === 'new' ? null : editing}
          subjects={subjects}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Eliminar docente"
          confirmLabel="Eliminar docente"
          onConfirm={async () => {
            await api.teachers.remove(deleting.id)
            await onChange('Docente eliminado')
          }}
          onClose={() => setDeleting(null)}
        >
          Se eliminará a <strong>{deleting.name}</strong>. Sus asignaturas quedarán sin docente.
        </ConfirmDialog>
      )}
    </section>
  )
}

function TeacherForm({ teacher, subjects, onSave, onClose }) {
  const [name, setName] = useState(teacher?.name ?? '')
  const [email, setEmail] = useState(teacher?.email ?? '')
  const [selected, setSelected] = useState(() => new Set(teacher?.subjects.map((s) => s.id) ?? []))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Se puede elegir: las que ya son de este docente y las activas sin docente
  const options = subjects.filter(
    (s) => (teacher && s.teacherId === teacher.id) || (s.active && !s.teacherId),
  )

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (selected.size === 0) {
      setError('Elige al menos una asignatura.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), email: email.trim(), subjectIds: [...selected] })
      onClose()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal title={teacher ? 'Editar docente' : 'Nuevo docente'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="teacher-name">Nombre</label>
          <input
            id="teacher-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="teacher-email">Correo</label>
          <input
            id="teacher-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <fieldset>
          <legend>Asignaturas</legend>
          {options.length === 0 ? (
            <p className="hint">
              No hay asignaturas disponibles. Crea una asignatura activa sin docente para poder
              asignarla.
            </p>
          ) : (
            <>
              <ul className="checks">
                {options.map((s) => (
                  <li key={s.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggle(s.id)}
                      />
                      {s.name}
                    </label>
                  </li>
                ))}
              </ul>
              <p className="hint">
                Elige al menos una. Solo aparecen asignaturas activas que no tienen otro docente.
              </p>
            </>
          )}
        </fieldset>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn primary"
            disabled={saving || options.length === 0}
          >
            {saving ? 'Guardando…' : teacher ? 'Guardar cambios' : 'Crear docente'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
