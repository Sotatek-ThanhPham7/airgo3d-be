/* eslint-disable @typescript-eslint/no-var-requires */
import * as cors from "cors";
import * as express from "express";
import * as morgan from "morgan";
const swaggerUi = require("swagger-ui-express");
import swaggerSpec from "./config/swagger";
import logger from "./logger";
import s3Routes from "./routes/s3Routes";
import panoramaRoutes from "./routes/panoramaRoutes";
import tagRoutes from "./routes/tagRoutes";

const app = express();
app.use(cors());
app.use(morgan("tiny"));
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "AirGo3D API Documentation",
  })
);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: Hello
 */
app.get("/", (req, res) => {
  res.status(200).send("Hello");
});

app.use("/api/s3", s3Routes);

app.use("/api/panorama", panoramaRoutes);

app.use("/api/tags", tagRoutes);

app.use((err: any, req: any, res: any, next: any) => {
  if (err) {
    logger.error(err);
    res.status(500).send();
  } else {
    next();
  }
});
// catch 404 and forward to error handler
app.use((req: any, res: any) => {
  res.status(404).send();
});

export default app;
