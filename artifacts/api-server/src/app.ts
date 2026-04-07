import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./lib/swagger.js";

import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app: Express = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",
});
app.use(limiter);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/api-docs.json", (_req, res) => res.json(swaggerSpec));

app.use("/api", router);

app.use(errorHandler);

export default app;
