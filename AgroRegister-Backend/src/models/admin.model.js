import { DataTypes, Model } from "sequelize";
import bcrypt from "bcryptjs";
import sequelize from "../db/connection.js";
import jwt from "jsonwebtoken";

const Admin = sequelize.define(
  "Admin",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    refreshToken: {
      type: DataTypes.TEXT,
    },
  },

  {
    timestamps: true,
    tableName: "admins",
  },
);

// ===== PASSWORD HASH =====
Admin.beforeCreate(async (admin) => {
  admin.password = await bcrypt.hash(admin.password, 10);
});

// ===== COMPARE PASSWORD =====
Admin.prototype.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// ===== ACCESS TOKEN =====
Admin.prototype.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this.id,
      email: this.email,
      username: this.username,
      role: "admin",
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );
};

// ===== REFRESH TOKEN =====
Admin.prototype.generateRefreshToken = function () {
  return jwt.sign(
    {
      id: this.id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    },
  );
};

export default Admin;
