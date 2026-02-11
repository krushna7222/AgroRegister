import { DataTypes } from "sequelize";
import sequelize from "../db/connection.js";

const Farmer = sequelize.define(
  "Farmer",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    gatNo: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    totalArea: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    adharNo: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    mobile: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    village: {
      type: DataTypes.STRING,
    },

    taluka: {
      type: DataTypes.STRING,
    },

    district: {
      type: DataTypes.STRING,
    },

    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    // Razorpay
    orderId: {
      type: DataTypes.STRING,
    },

    paymentId: {
      type: DataTypes.STRING,
    },

    isPayment: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    certificatePath: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: true,
    tableName: "farmers",
  },
);

export default Farmer;
