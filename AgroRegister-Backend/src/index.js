import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";
import sequelize from "./db/connection.js";

import Farmer from "./models/farmer.model.js";
import Admin from "./models/admin.model.js";

import "./models/farmer.model.js";
import "./models/admin.model.js";

// Load environment variables
dotenv.config({
  path: "./.env",
});

// Call connectDB to connect MySQL
connectDB()
  .then(() => {
    // Start server after DB connection
    app.listen(process.env.PORT || 8000, () => {
      console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("❌ MySQL DB connection failed !!! ", err);
  });

sequelize.sync().then(() => {
  console.log("✅ All models were synchronized successfully.");
});
// sequelize.sync({ alter: true }).then(() => {
//   console.log("✅ All models were synchronized successfully.");
// });
