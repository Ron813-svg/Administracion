import { useState } from 'react'
import { api } from '../api.js'
import Modal, { ConfirmDialog } from './Modal.jsx'

export default function Subjects({ teachers, subjects, onChange }) {
  const [editing, setEditing] = useState(null) // null | 'new' | asignatura
  const [deleting, setDeleting] = useState(null)

  async function save(payload) {
    if (editing === 'new') {
      await api.subjects.create(payload)
      await onChange('Asignatura creada')
    } else {
      await api.subjects.update(editing.id, payload)
      await onChange('Asignatura actualizada')
    }
  }

  return (
    <section>
      <div className="section-head">
        <h2>Asignaturas</h2>
        <button type="button" className="btn primary" onClick={() => setEditing('new')}>
          Nueva asignatura
        </button>
      </div>

      {subjects.length === 0 ? (
        <p className="empty">Todavía no hay asignaturas. Crea la primera para poder asignar docentes.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Asignatura</th>
                <th>Docente</th>
                <th>Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td className="strong">
                    {s.name}
                    {s.description && <span className="sub">{s.description}</span>}
                  </td>
                  <td>
                    {s.teacher ? s.teacher.name : <span className="badge warn">Sin docente</span>}
                  </td>
                  <td>
                    <span className={`badge ${s.active ? 'on' : 'off'}`}>
                      {s.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="row-actions">
                    <button type="button" className="btn small" onClick={() => setEditing(s)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn small danger"
                      onClick={() => setDeleting(s)}
                      disabled={!!s.teacherId}
                      title={s.teacherId ? 'Quita el docente antes de eliminarla' : undefined}
                    >
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
        <SubjectForm
          key={editing === 'new' ? 'new' : editing.id}
          subject={editing === 'new' ? null : editing}
          teachers={teachers}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Eliminar asignatura"
          confirmLabel="Eliminar asignatura"
          onConfirm={async () => {
            await api.subjects.remove(deleting.id)
            await onChange('Asignatura eliminada')
          }}
          onClose={() => setDeleting(null)}
        >
          Se eliminará la asignatura <strong>{deleting.name}</strong>. Esta acción no se puede
          deshacer.
        </ConfirmDialog>
      )}
    </section>
  )
}

function SubjectForm({ subject, teachers, onSave, onClose }) {
  const [name, setName] = useState(subject?.name ?? '')
  const [description, setDescription] = useState(subject?.description ?? '')
  const [active, setActive] = useState(subject?.active ?? true)
  const [teacherId, setTeacherId] = useState(subject?.teacherId ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Una asignatura con docente tiene que estar activa
  const hasTeacher = teacherId !== ''

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        active: hasTeacher ? true : active,
        teacherId: teacherId || null,
      })
      onClose()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal title={subject ? 'Editar asignatura' : 'Nueva asignatura'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="subject-name">Nombre</label>
          <input
            id="subject-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <p className="hint">No puede repetirse, aunque cambien las mayúsculas.</p>
        </div>

        <div className="field">
          <label htmlFor="subject-description">Descripción (opcional)</label>
          <textarea
            id="subject-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="subject-teacher">Docente</label>
          <select
            id="subject-teacher"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          >
            <option value="">Sin docente</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="inline">
            <input
              type="checkbox"
              checked={hasTeacher || active}
              disabled={hasTeacher}
              onChange={(e) => setActive(e.target.checked)}
            />
            Asignatura activa
          </label>
          {hasTeacher && (
            <p className="hint">Una asignatura con docente debe estar activa.</p>
          )}
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Guardando…' : subject ? 'Guardar cambios' : 'Crear asignatura'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
