import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/ApiError.js";

export const app = express();

// ===== CORS CONFIG =====
const allowedOrigins = process.env.CORS_ORIGIN;

app.use(
  cors({
    origin: function (origin, callback) {
      // allow mobile apps / postman with no origin
      if (!origin || allowedOrigins) {
        callback(null, true);
      } else {
        callback(new ApiError(403, "Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// ===== BODY PARSERS =====
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// ===== STATIC FILES =====
app.use("/certificates", express.static("certificates"));
app.use(express.static("public"));

app.use(cookieParser());

// ===== HEALTH CHECK =====
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Farmer-Regestry API Running",
    time: new Date(),
  });
});

// ===== ROUTES =====
import farmerRouter from "./routes/farmer.routes.js";
import adminRouter from "./routes/admin.routes.js";

app.use("/api/v1/farmer", farmerRouter);
app.use("/api/v1/admin", adminRouter);

// ===== 404 HANDLER =====
app.use((req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
});

// ===== GLOBAL ERROR HANDLER =====
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export default app;
