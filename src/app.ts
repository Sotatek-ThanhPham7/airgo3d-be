import * as cors from "cors";
import * as express from "express";
import * as morgan from "morgan";
import logger from "./logger";
import s3Routes from "./routes/s3Routes";
import panoramaRoutes from "./routes/panoramaRoutes";

const app = express();
app.use(cors());
app.use(morgan("tiny"));
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));

app.get("/", (req, res) => {
  res.status(200).send("Hello");
});

// S3 routes
app.use("/api/s3", s3Routes);

// Panorama routes
app.use("/api/panorama", panoramaRoutes);
// error handler
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
