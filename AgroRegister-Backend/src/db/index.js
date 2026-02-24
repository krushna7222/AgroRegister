import mysql from "mysql2/promise";

const connectDB = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      connectTimeout: 20000, // 20 seconds (helps debugging timeout)
    });

    console.log("✅ MySQL database connected successfully!");
    return connection;
  } catch (error) {
    console.error("❌ MySQL DB connection failed !!!", error);
    throw error;
  }
};

export default connectDB;

// import mysql from "mysql2/promise";

// const connectDB = async () => {
//   try {
//     const connection = await mysql.createConnection({
//       host: process.env.DB_HOST,
//       port: process.env.DB_PORT,
//       user: process.env.DB_USER,
//       password: process.env.DB_PASS,
//       database: process.env.DB_NAME,
//     });

//     console.log("✅ MySQL database connected successfully!");
//     return connection;
//   } catch (error) {
//     console.error("❌ MySQL DB connection failed !!!", error);
//     throw error;
//   }
// };

// export default connectDB;
