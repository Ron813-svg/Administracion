# Administración escolar

Aplicación web para administrar **docentes** y **asignaturas**. Un docente puede dar varias asignaturas, y cada asignatura tiene como máximo un docente.

- **Backend:** API REST con Express, Prisma y una base de datos PostgreSQL en Supabase.
- **Frontend:** React con Vite. Dos pestañas (Docentes y Asignaturas) para crear, editar y eliminar.

## Tecnologías

| Parte | Tecnología |
|---|---|
| Backend | Node.js, Express 5, Prisma 6, `cors`, `dotenv` |
| Base de datos | PostgreSQL en Supabase (se usa solo como base de datos, sin Supabase Auth) |
| Frontend | React 19, Vite 8 |

## Estructura del proyecto

```
Administracion/
├── backend/
│   ├── .env                          (no se sube a Git)
│   ├── index.js                      servidor Express
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma             modelos Teacher y Subject
│   └── src/
│       ├── config.js                 lee variables de entorno
│       ├── db/prisma.js              cliente de Prisma
│       ├── controllers/
│       │   ├── teacherController.js
│       │   └── subjectController.js
│       └── routes/
│           ├── teacherRoutes.js
│           └── subjectRoutes.js
└── frontend/
    └── Administracion/
        ├── index.html
        ├── vite.config.js
        └── src/
            ├── main.jsx
            ├── App.jsx               pestañas, carga de datos y avisos
            ├── api.js                llamadas al backend
            ├── index.css             estilos
            └── components/
                ├── Teachers.jsx
                ├── Subjects.jsx
                └── Modal.jsx
```

## Requisitos

- Node.js 22 (se recomienda 22.12 o superior) y npm.
- Un proyecto de Supabase con su base de datos PostgreSQL.

## Puesta en marcha

### 1. Backend

```bash
cd backend
npm install
```

Crea el archivo `backend/.env` (ver [Variables de entorno](#variables-de-entorno)) y luego crea las tablas:

```bash
npx prisma migrate dev --name init
```

Inicia el servidor:

```bash
npm run dev
```

Debe mostrar `Servidor en http://localhost:3000`.

Scripts de `backend/package.json`:

| Script | Comando | Uso |
|---|---|---|
| `npm run dev` | `node --watch index.js` | Desarrollo, reinicia al guardar |
| `npm start` | `node index.js` | Producción |

El `package.json` del backend debe incluir `"type": "module"` porque el código usa `import`.

### 2. Frontend

En otra terminal:

```bash
cd frontend/Administracion
npm install
npm run dev
```

Abre la dirección que muestre Vite (normalmente `http://localhost:5173`). El backend debe estar corriendo.

Scripts de `frontend/Administracion/package.json`:

| Script | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación para producción |
| `npm run preview` | Ver la compilación localmente |
| `npm run lint` | Revisar el código con oxlint |

## Variables de entorno

### Backend (`backend/.env`)

```env
DATABASE_URL="postgresql://postgres.TU_REF:TU_PASSWORD@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.TU_REF:TU_PASSWORD@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
PORT="3000"
```

| Variable | Para qué sirve |
|---|---|
| `DATABASE_URL` | Conexión de la aplicación (transaction pooler, puerto 6543) |
| `DIRECT_URL` | Conexión que usan las migraciones (puerto 5432) |
| `PORT` | Puerto del servidor Express. No uses 5432, que es el de Postgres |

Cómo obtenerlas: en Supabase, botón **Connect** del dashboard. Reglas importantes:

- El usuario es `postgres.TU_REF`, no solo `postgres`.
- Sin corchetes alrededor de la contraseña.
- Si la contraseña tiene caracteres especiales (`@ # / : ? %`), codifícalos (`@` → `%40`, `#` → `%23`, `/` → `%2F`) o resetea la contraseña a una con letras y números.

### Frontend (opcional)

Por defecto el frontend llama a `http://localhost:3000/api`. Para cambiarlo, crea `frontend/Administracion/.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

## Modelo de datos

Definido en `backend/prisma/schema.prisma`.

```prisma
model Teacher {
  id        String    @id @default(uuid())
  name      String
  email     String    @unique
  subjects  Subject[]
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@map("teachers")
}

model Subject {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  active      Boolean  @default(true)

  teacherId   String?  @map("teacher_id")
  teacher     Teacher? @relation(fields: [teacherId], references: [id], onDelete: SetNull)

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("subjects")
}
```

- Relación de uno a muchos: un docente tiene varias asignaturas, una asignatura tiene un solo docente.
- En la base las tablas son `teachers` y `subjects`, con columnas como `created_at`. En el código se usa `prisma.teacher`, `prisma.subject` y `createdAt`.
- `onDelete: SetNull`: si se elimina un docente, sus asignaturas quedan con `teacherId = null`.

Cada vez que cambies el schema:

```bash
npx prisma migrate dev --name nombre_del_cambio
```

Después **detén el servidor (Ctrl+C) y vuelve a iniciarlo**. `node --watch` no detecta que el cliente de Prisma se regeneró y seguiría usando el anterior.

## Reglas de negocio

| Regla | Dónde se aplica |
|---|---|
| El correo del docente es único. Se guarda en minúsculas | Base de datos (`@unique`) y controlador |
| El nombre de la asignatura es único, sin distinguir mayúsculas ni espacios al inicio o final | Controlador (`nameTaken`) |
| Un docente debe tener al menos una asignatura | Controlador |
| Las asignaturas de un docente deben existir, estar activas y no tener otro docente | Controlador (`validateSubjects`) |
| Una asignatura con docente debe estar activa | Controlador |
| No se puede eliminar una asignatura que tiene docente | Controlador |
| No se puede cambiar o quitar el docente de una asignatura si el docente anterior se quedaría sin asignaturas | Controlador (`updateSubject`) |
| Al eliminar un docente, sus asignaturas quedan sin docente | Base de datos (`SetNull`) |

Para dejar de usar una asignatura que tiene docente, primero quítale el docente y luego desactívala.

## API REST

URL base: `http://localhost:3000/api`. Todas las respuestas son JSON. Los errores tienen la forma `{ "message": "..." }`.

Códigos de estado: `200` correcto, `201` creado, `204` eliminado (sin cuerpo), `400` datos inválidos, `404` no existe, `409` conflicto con una regla, `500` error del servidor.

### Docentes (`/api/teachers`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/teachers` | Lista de docentes con sus asignaturas, del más nuevo al más antiguo |
| GET | `/api/teachers/:id` | Un docente (404 si no existe) |
| POST | `/api/teachers` | Crea un docente |
| PUT | `/api/teachers/:id` | Actualiza un docente |
| DELETE | `/api/teachers/:id` | Elimina un docente |

**POST** `/api/teachers`

```json
{
  "name": "Ana Pérez",
  "email": "ana@escuela.com",
  "subjectIds": ["id-asignatura-1", "id-asignatura-2"]
}
```

- `name`, `email` y `subjectIds` (al menos uno) son obligatorios.
- `400`: faltan datos, no hay asignaturas o alguna no existe.
- `409`: alguna asignatura está inactiva o ya tiene otro docente, o el correo ya está registrado.

**PUT** `/api/teachers/:id`. Todos los campos son opcionales:

```json
{ "name": "Ana María Pérez" }
```

```json
{ "subjectIds": ["id-asignatura-1"] }
```

- Si no envías `subjectIds`, las asignaturas no cambian.
- Si lo envías, es la **lista final**: las que estén en la lista quedan asignadas y las que no, quedan sin docente.
- `subjectIds: []` devuelve `400`, porque el docente debe tener al menos una.

### Asignaturas (`/api/subjects`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/subjects` | Lista con su docente. Filtro opcional: `?active=true` o `?active=false` |
| GET | `/api/subjects/:id` | Una asignatura (404 si no existe) |
| POST | `/api/subjects` | Crea una asignatura |
| PUT | `/api/subjects/:id` | Actualiza una asignatura |
| DELETE | `/api/subjects/:id` | Elimina una asignatura |

**POST** `/api/subjects`

```json
{
  "name": "Matemáticas",
  "description": "Álgebra básica",
  "active": true,
  "teacherId": null
}
```

- Solo `name` es obligatorio. `active` es `true` por defecto.
- `400`: nombre vacío, `active` no booleano o el docente no existe.
- `409`: nombre repetido, o se intenta crear con docente y `active: false`.

**PUT** `/api/subjects/:id`. Todos los campos son opcionales:

```json
{ "teacherId": "id-del-docente" }
```

```json
{ "active": false }
```

- `409`: nombre repetido, asignatura con docente y `active: false`, o el docente anterior se quedaría sin asignaturas.
- Para quitar el docente envía `"teacherId": null`.

**DELETE** `/api/subjects/:id` devuelve `409` si la asignatura tiene docente.

## Frontend

Una sola página con dos pestañas.

- **Docentes:** tabla con nombre, correo y asignaturas. El formulario pide nombre, correo y las asignaturas disponibles (activas y sin otro docente, más las que ya son del docente al editarlo).
- **Asignaturas:** tabla con docente y estado. En el formulario, al elegir un docente la casilla "activa" se marca y se bloquea. El botón Eliminar está deshabilitado si la asignatura tiene docente.
- Los errores del backend se muestran dentro del formulario o en un aviso.
- Tras cada cambio se recargan docentes y asignaturas, porque dependen entre sí.
- Si el backend no está disponible, aparece un aviso con el botón "Reintentar".
- No usa librerías adicionales a React. Los estilos están en `src/index.css`, con modo claro y oscuro.

## Datos de prueba

Orden recomendado para probar con Postman o PowerShell. Primero las asignaturas y después el docente.

1. `POST /api/subjects` con `{ "name": "Matemáticas", "description": "Álgebra básica" }`. Copia el `id`.
2. `POST /api/subjects` con `{ "name": "Física", "description": "Mecánica" }`. Copia el `id`.
3. `POST /api/teachers` con `{ "name": "Ana Pérez", "email": "ana@escuela.com", "subjectIds": ["ID_MATEMATICAS", "ID_FISICA"] }`.

Pruebas de reglas:

| Petición | Resultado esperado |
|---|---|
| `POST /api/subjects` con `{ "name": "matemáticas" }` | `409` nombre repetido |
| `POST /api/teachers` sin `subjectIds` | `400` debe tener al menos una asignatura |
| `POST /api/teachers` con una asignatura que ya tiene docente | `409` |
| `DELETE /api/subjects/ID_MATEMATICAS` | `409` tiene docente |
| `PUT /api/subjects/ID_MATEMATICAS` con `{ "active": false }` | `409` debe estar activa |
| `PUT /api/teachers/ID_ANA` con `{ "subjectIds": [] }` | `400` |
| `DELETE /api/teachers/ID_ANA` | `204`, sus asignaturas quedan sin docente |

Ejemplo en PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/subjects `
  -ContentType "application/json" `
  -Body '{"name":"Matemáticas","description":"Álgebra básica"}'

Invoke-RestMethod http://localhost:3000/api/teachers
```

## Solución de problemas

| Error | Causa y solución |
|---|---|
| `P1000: Authentication failed` | Usuario o contraseña incorrectos. Usa el usuario `postgres.TU_REF`, sin corchetes, y revisa los caracteres especiales de la contraseña |
| `migrate dev` se queda colgado | Está usando el puerto 6543. Las migraciones necesitan `DIRECT_URL` (puerto 5432) y que el schema tenga `directUrl = env("DIRECT_URL")` |
| `Drift detected` y piden resetear | La base tiene tablas que no están en tus migraciones (por ejemplo una tabla `Prueba`). Bórrala en el SQL Editor de Supabase con `DROP TABLE "Prueba";` o usa `npx prisma migrate reset` (borra todo el schema `public`) |
| `The column subjects.active does not exist` | Falta aplicar la migración. Corre `npx prisma migrate dev --name add_subject_active` y reinicia el servidor |
| `Unknown argument teacherId` | El cliente de Prisma no coincide con el schema. Corre `npx prisma generate` y reinicia el servidor con Ctrl+C y `npm run dev` |
| `Cannot find native binding` (Vite, rolldown) | Los módulos se instalaron en otro sistema operativo o fallaron las dependencias opcionales. En `frontend/Administracion` borra `node_modules` y `package-lock.json`, y corre `npm install` de nuevo. Si persiste, actualiza Node a la última 22 LTS |
| El frontend muestra "No se pudo conectar con el servidor" | El backend no está corriendo o usa otro puerto. Revisa `PORT` en `backend/.env` y `VITE_API_URL` |

## Seguridad

- `backend/.env` contiene la contraseña de la base de datos. Está en `.gitignore`: no lo subas a Git ni lo compartas.
- Si la contraseña se compartió por error, resetéala en Supabase (Project Settings → Database → Reset database password) y actualiza el `.env`.
- Al comprimir el proyecto para compartirlo, excluye `.env` y `node_modules`.
- El backend usa `cors()` abierto, que sirve para desarrollo. En producción limita los orígenes permitidos.
- La API no tiene autenticación: cualquiera que llegue a ella puede crear y eliminar datos.

---

**P. D.:** Este trabajo me parece mediocre.
