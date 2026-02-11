import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";
import sequelize from "./db/connection.js";
// import User from "./models/user.model.js";
// import Blog from "./models/blog.model.js";
// import Course from "./models/course.model.js";
// import Enquiry from "./models/enquiry.model.js";
import Farmer from "./models/farmers.model.js";
import Admin from "./models/admin.model.js";

// import "./models/user.model.js";
// import "./models/course.model.js";
// import "./models/purchasedCourse.model.js";
import "./models/farmers.model.js";
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

sequelize.sync({ alter: true }).then(() => {
  console.log("✅ All models were synchronized successfully.");
});
