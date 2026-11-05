import prisma from "../db/prisma.js";

const clean = (v) => (typeof v === "string" ? v.trim() : v);

// Nombre único sin distinguir mayúsculas
const nameTaken = async (name, excludeId = null) => {
  const found = await prisma.subject.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(excludeId && { NOT: { id: excludeId } }),
    },
  });
  return !!found;
};

// Controladores para la entidad Subject
export const getSubjects = async (req, res) => {
  try {
    // Opcional: /api/subjects?active=true
    const where =
      req.query.active !== undefined ? { active: req.query.active === "true" } : {};
    const subjects = await prisma.subject.findMany({
      where,
      include: { teacher: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toma una asignatura por su id y la devuelve en formato JSON
export const getSubjectById = async (req, res) => {
  try {
    const subject = await prisma.subject.findUnique({
      where: { id: req.params.id },
      include: { teacher: true },
    });
    if (!subject) return res.status(404).json({ message: "Asignatura no encontrada" });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crea una nueva asignatura en la base de datos y la devuelve en formato JSON
export const createSubject = async (req, res) => {
  try {
    const name = clean(req.body.name);
    const { description } = req.body;
    const teacherId = req.body.teacherId || null;
    const active = req.body.active ?? true;

    if (!name) return res.status(400).json({ message: "name es obligatorio" });
    if (typeof active !== "boolean")
      return res.status(400).json({ message: "active debe ser true o false" });
    if (teacherId && !active)
      return res.status(409).json({ message: "Una asignatura con docente debe estar activa" });
    if (await nameTaken(name))
      return res.status(409).json({ message: "Ya existe una asignatura con ese nombre" });

    const subject = await prisma.subject.create({
      data: { name, description, teacherId, active },
      include: { teacher: true },
    });
    res.status(201).json(subject);
  } catch (error) {
    if (error.code === "P2002")
      return res.status(409).json({ message: "Ya existe una asignatura con ese nombre" });
    if (error.code === "P2003")
      return res.status(400).json({ message: "El maestro indicado no existe" });
    res.status(500).json({ message: error.message });
  }
};

// Actualiza una asignatura existente en la base de datos y la devuelve en formato JSON
export const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await prisma.subject.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: "Asignatura no encontrada" });

    const data = {};

    if (req.body.name !== undefined) {
      const name = clean(req.body.name);
      if (!name) return res.status(400).json({ message: "name no puede estar vacío" });
      if (await nameTaken(name, id))
        return res.status(409).json({ message: "Ya existe una asignatura con ese nombre" });
      data.name = name;
    }
    if (req.body.description !== undefined) data.description = req.body.description;

    const newActive = req.body.active ?? current.active;
    const newTeacherId =
      req.body.teacherId !== undefined ? req.body.teacherId || null : current.teacherId;

    if (typeof newActive !== "boolean")
      return res.status(400).json({ message: "active debe ser true o false" });

    // Un docente solo puede estar en una asignatura activa
    if (newTeacherId && !newActive)
      return res.status(409).json({
        message: "Una asignatura con docente debe estar activa. Quita el docente antes de desactivarla",
      });

    // Si cambia el docente, el anterior no puede quedarse sin asignaturas
    if (current.teacherId && newTeacherId !== current.teacherId) {
      const others = await prisma.subject.count({
        where: { teacherId: current.teacherId, NOT: { id } },
      });
      if (others === 0)
        return res.status(409).json({
          message: "El docente actual se quedaría sin asignaturas",
        });
    }

    data.active = newActive;
    data.teacherId = newTeacherId;

    const subject = await prisma.subject.update({
      where: { id },
      data,
      include: { teacher: true },
    });
    res.json(subject);
  } catch (error) {
    if (error.code === "P2025")
      return res.status(404).json({ message: "Asignatura no encontrada" });
    if (error.code === "P2002")
      return res.status(409).json({ message: "Ya existe una asignatura con ese nombre" });
    if (error.code === "P2003")
      return res.status(400).json({ message: "El maestro indicado no existe" });
    res.status(500).json({ message: error.message });
  }
};

// Elimina una asignatura existente en la base de datos
export const deleteSubject = async (req, res) => {
  try {
    const subject = await prisma.subject.findUnique({ where: { id: req.params.id } });
    if (!subject) return res.status(404).json({ message: "Asignatura no encontrada" });

    if (subject.teacherId)
      return res.status(409).json({
        message: "No se puede eliminar: la asignatura tiene un docente asignado",
      });

    await prisma.subject.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};