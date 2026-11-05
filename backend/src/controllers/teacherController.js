import prisma from "../db/prisma.js";

// Función para limpiar strings (trim) y evitar errores de validación
const clean = (v) => (typeof v === "string" ? v.trim() : v);

// Las asignaturas deben existir, estar activas y no tener otro docente
const validateSubjects = async (ids, teacherId = null) => {
  const subjects = await prisma.subject.findMany({ where: { id: { in: ids } } });
  if (subjects.length !== ids.length)
    return { status: 400, message: "Alguna asignatura no existe" };
  if (subjects.some((s) => !s.active))
    return { status: 409, message: "Todas las asignaturas deben estar activas" };
  if (subjects.some((s) => s.teacherId && s.teacherId !== teacherId))
    return { status: 409, message: "Alguna asignatura ya tiene otro docente" };
  return null;
};

// Controladores para la entidad Teacher
export const getTeachers = async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      include: { subjects: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toma un maestro por su id y lo devuelve en formato JSON
export const getTeacherById = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: req.params.id },
      include: { subjects: true },
    });
    if (!teacher) return res.status(404).json({ message: "Maestro no encontrado" });
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crea un nuevo maestro en la base de datos y lo devuelve en formato JSON
export const createTeacher = async (req, res) => {
  try {
    const name = clean(req.body.name);
    const email = clean(req.body.email)?.toLowerCase();
    const ids = [...new Set(req.body.subjectIds || [])];

    if (!name || !email)
      return res.status(400).json({ message: "name y email son obligatorios" });
    if (ids.length === 0)
      return res.status(400).json({ message: "Debes asignar al menos una asignatura" });

    const err = await validateSubjects(ids);
    if (err) return res.status(err.status).json({ message: err.message });

    const teacher = await prisma.teacher.create({
      data: { name, email, subjects: { connect: ids.map((id) => ({ id })) } },
      include: { subjects: true },
    });
    res.status(201).json(teacher);
  } catch (error) {
    if (error.code === "P2002")
      return res.status(409).json({ message: "Ese email ya está registrado" });
    res.status(500).json({ message: error.message });
  }
};

// Actualiza un maestro existente en la base de datos y lo devuelve en formato JSON
export const updateTeacher = async (req, res) => {
  try {
    const data = {};

    if (req.body.name !== undefined) {
      data.name = clean(req.body.name);
      if (!data.name) return res.status(400).json({ message: "name no puede estar vacío" });
    }
    if (req.body.email !== undefined) {
      data.email = String(clean(req.body.email)).toLowerCase();
      if (!data.email) return res.status(400).json({ message: "email no puede estar vacío" });
    }

    // Solo toca las asignaturas si mandas subjectIds (es la lista final)
    if (req.body.subjectIds !== undefined) {
      const ids = [...new Set(req.body.subjectIds)];
      if (ids.length === 0)
        return res.status(400).json({ message: "Debes asignar al menos una asignatura" });

      const err = await validateSubjects(ids, req.params.id);
      if (err) return res.status(err.status).json({ message: err.message });

      data.subjects = { set: ids.map((id) => ({ id })) };
    }

    const teacher = await prisma.teacher.update({
      where: { id: req.params.id },
      data,
      include: { subjects: true },
    });
    res.json(teacher);
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ message: "Maestro no encontrado" });
    if (error.code === "P2002")
      return res.status(409).json({ message: "Ese email ya está registrado" });
    res.status(500).json({ message: error.message });
  }
};

// Elimina un maestro existente en la base de datos
export const deleteTeacher = async (req, res) => {
  try {
    // Sus asignaturas quedan sin docente (onDelete: SetNull)
    await prisma.teacher.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ message: "Maestro no encontrado" });
    res.status(500).json({ message: error.message });
  }
};