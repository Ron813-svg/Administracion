import express from "express";
import cors from "cors";
import { config } from "./src/config.js";
import teacherRoutes from "./src/routes/teacherRoutes.js";
import subjectRoutes from "./src/routes/subjectRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/teachers", teacherRoutes);
app.use("/api/subjects", subjectRoutes);

app.listen(config.port, () =>
  console.log(`Servidor en http://localhost:${config.port}`)
);