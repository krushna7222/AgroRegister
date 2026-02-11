import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

export const app = express();

// Dynamic CORS config
const allowedOrigins = [process.env.CORS_ORIGIN];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new ApiError("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// app.use(
//   cors({
//     origin: "http://localhost:5173",
//     origin: "http://localhost:5174",
//     // origin: process.env.CORS_ORIGIN,
//     credentials: true,
//   })
// );

app.use(express.json({ limit: "16kb" }));
//app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

//Routes import

// import userRouter from "./routes/user.routes.js";
// import blogRouter from "./routes/blog.routes.js";
// import adminRouter from "./routes/admin.routes.js";
// import courseRouter from "./routes/course.routes.js";
// import { ApiError } from "./utils/ApiError.js";
// import paymentRouter from "./routes/payment.routes.js";

// Your API routes will go here

// app.use("/api/v1/users", userRouter);
// app.use("/api/v1/blog", blogRouter);
// app.use("/api/v1/admin", adminRouter);
// app.use("/api/v1/course", courseRouter);
// app.use("/api/v1/payment", paymentRouter);

export default app;
