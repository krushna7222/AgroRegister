import { asyncHandler } from "../utils/asyncHandeler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Admin from "../models/admin.model.js";
import Farmer from "../models/farmer.model.js";
import ExcelJS from "exceljs";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Op } from "sequelize";
import jwt from "jsonwebtoken";

const isProduction = process.env.NODE_ENV === "production";

const generateAccessAndRefreshToken = async (adminId) => {
  const admin = await Admin.findByPk(adminId);

  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  const accessToken = admin.generateAccessToken();
  const refreshToken = admin.generateRefreshToken();

  const hashedRefreshToken = admin.hashToken(refreshToken);

  admin.refreshToken = hashedRefreshToken;
  await admin.save({ validate: false });

  return { accessToken, refreshToken };
};

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  let decoded;

  try {
    decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const admin = await Admin.findByPk(decoded.id);

  if (!admin) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const hashedIncomingToken = admin.hashToken(incomingRefreshToken);

  if (hashedIncomingToken !== admin.refreshToken) {
    throw new ApiError(401, "Refresh token expired or already used");
  }

  // Rotate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    admin.id,
  );

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "strict",
    path: "/",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, { accessToken }, "Access token refreshed"));
});

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const admin = await Admin.findOne({ where: { email } });

  if (!admin) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordValid = await admin.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  // Generate tokens
  const accessToken = admin.generateAccessToken();
  const refreshToken = admin.generateRefreshToken();

  // Hash refresh token before storing
  const hashedRefreshToken = admin.hashToken(refreshToken);

  admin.refreshToken = hashedRefreshToken;
  await admin.save({ validate: false });

  const isProduction = process.env.NODE_ENV === "production";

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "strict",
    path: "/",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          id: admin.id,
          username: admin.username,
          email: admin.email,
        },
        "Admin logged in successfully",
      ),
    );
});

// const adminLogin = asyncHandler(async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     throw new ApiError(400, "Email and password are required");
//   }

//   const admin = await Admin.findOne({ where: { email } });

//   if (!admin) {
//     throw new ApiError(401, "Invalid credentials");
//   }

//   const isPasswordValid = await admin.isPasswordCorrect(password);

//   if (!isPasswordValid) {
//     throw new ApiError(401, "Invalid credentials");
//   }

//   const accessToken = admin.generateAccessToken();
//   const refreshToken = admin.generateRefreshToken();

//   admin.refreshToken = refreshToken;
//   await admin.save();

//   const cookieOptions = {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     sameSite: "none",
//   };

//   return res
//     .status(200)
//     .cookie("accessToken", accessToken, cookieOptions)
//     .cookie("refreshToken", refreshToken, cookieOptions)
//     .json(
//       new ApiResponse(
//         200,
//         {
//           id: admin.id,
//           username: admin.username,
//           email: admin.email,
//         },
//         "Admin logged in successfully",
//       ),
//     );
// });

const updateAdminPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old and new password required");
  }

  const admin = await Admin.findByPk(req.admin.id);

  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  const isMatch = await admin.isPasswordCorrect(oldPassword);

  if (!isMatch) {
    throw new ApiError(401, "Old password incorrect");
  }

  admin.password = newPassword; // will hash via hook
  await admin.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password updated successfully"));
});

const logoutAdmin = asyncHandler(async (req, res) => {
  const adminId = req.admin?.id;

  if (!adminId) {
    throw new ApiError(401, "Unauthorized request");
  }

  // Remove refresh token from DB
  await Admin.update({ refreshToken: null }, { where: { id: adminId } });

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "strict",
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, null, "Admin logged out successfully"));
});

const getAllFarmers = asyncHandler(async (req, res) => {
  const { search, paid, dateFrom, dateTo } = req.query;

  const whereClause = {};

  // 🔎 Aadhaar Search
  if (search) {
    whereClause.adharNo = {
      [Op.like]: `%${search}%`,
    };
  }

  // 💳 Paid / Unpaid Filter
  if (paid !== undefined) {
    whereClause.isPayment = paid === "true";
  }

  // 📅 Date Range Filter
  if (dateFrom || dateTo) {
    whereClause.createdAt = {};

    if (dateFrom) {
      whereClause.createdAt[Op.gte] = new Date(dateFrom);
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      whereClause.createdAt[Op.lte] = endDate;
    }
  }

  const farmers = await Farmer.findAll({
    where: whereClause,
    order: [["createdAt", "DESC"]],
    attributes: { exclude: ["password"] },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, farmers, "Farmers fetched successfully"));
});

// const getAllFarmers = asyncHandler(async (req, res) => {
//   const farmers = await Farmer.findAll({
//     order: [["createdAt", "DESC"]],
//     attributes: { exclude: ["password"] },
//   });

//   return res
//     .status(200)
//     .json(new ApiResponse(200, farmers, "Farmers fetched successfully"));
// });

const exportFarmersExcel = asyncHandler(async (req, res) => {
  try {
    const { type, fromDate, toDate } = req.query;

    let whereCondition = {};

    // ===== Payment Filter =====
    if (type === "paid") {
      whereCondition.isPayment = true;
    } else if (type === "unpaid") {
      whereCondition.isPayment = false;
    }

    // ===== Date Filter =====
    if (fromDate && toDate) {
      whereCondition.createdAt = {
        [Op.between]: [new Date(fromDate), new Date(toDate)],
      };
    }

    const farmers = await Farmer.findAll({
      where: whereCondition,
      order: [["createdAt", "DESC"]],
    });

    // ===== Create Workbook =====
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Farmers Data");

    // ===== Define Columns =====
    worksheet.columns = [
      { header: "#", key: "index", width: 5 },
      { header: "Name", key: "name", width: 20 },
      { header: "Gat No", key: "gatNo", width: 10 },
      { header: "Total Area", key: "totalArea", width: 12 },
      { header: "Adhar No", key: "adharNo", width: 20 },
      { header: "Mobile", key: "mobile", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Village", key: "village", width: 15 },
      { header: "Taluka", key: "taluka", width: 15 },
      { header: "District", key: "district", width: 15 },
      { header: "Amount", key: "amount", width: 10 },
      { header: "Payment Status", key: "paymentStatus", width: 15 },
      { header: "Order ID", key: "orderId", width: 25 },
      { header: "Payment ID", key: "paymentId", width: 25 },
      { header: "Date", key: "date", width: 15 },
    ];

    // ===== Add Rows =====
    farmers.forEach((farmer, index) => {
      worksheet.addRow({
        index: index + 1,
        name: farmer.name,
        gatNo: farmer.gatNo,
        totalArea: farmer.totalArea,
        adharNo: farmer.adharNo,
        mobile: farmer.mobile,
        email: farmer.email,
        village: farmer.village,
        taluka: farmer.taluka,
        district: farmer.district,
        amount: farmer.amount,
        paymentStatus: farmer.isPayment ? "Paid" : "Unpaid",
        orderId: farmer.orderId || "",
        paymentId: farmer.paymentId || "",
        date: farmer.createdAt.toISOString().split("T")[0],
      });
    });

    // ===== Set Header =====
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader("Content-Disposition", `attachment; filename=farmers.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Excel export failed" });
  }
});

const markAsPaid = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const farmer = await Farmer.findByPk(id);

  if (!farmer) {
    throw new ApiError(404, "Farmer not found");
  }

  // If already paid
  if (farmer.isPayment === true) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Farmer already marked as Paid"));
  }

  // Update payment fields
  farmer.isPayment = true;
  farmer.orderId = "CASH"; // since admin cash
  farmer.paymentId = "CASH"; // no razorpay
  await farmer.save();

  return res
    .status(200)
    .json(new ApiResponse(200, farmer, "Farmer marked as Paid successfully"));
});

const adminFarmerCashRegistration = asyncHandler(async (req, res) => {
  const {
    name,
    gatNo,
    totalArea,
    adharNo,
    mobile,
    email,
    village,
    taluka,
    district,
    amount,
  } = req.body;

  // ===== VALIDATION =====
  if (!name || !gatNo || !totalArea || !adharNo || !mobile || !amount) {
    throw new ApiError(400, "Please fill all required fields");
  }

  // Prevent duplicate Aadhaar
  const existing = await Farmer.findOne({
    where: { adharNo },
  });

  if (existing) {
    throw new ApiError(400, "This Aadhaar already registered");
  }

  // ===== Aadhaar Front Upload =====
  const adharFrontPath = req.files?.adharFrontImg?.[0]?.path;
  if (!adharFrontPath) {
    throw new ApiError(400, "Aadhaar Front image is required");
  }

  const uploadedFront = await uploadOnCloudinary(adharFrontPath);
  if (!uploadedFront?.url) {
    throw new ApiError(400, "Aadhaar Front upload failed");
  }

  // ===== Aadhaar Back Upload =====
  const adharBackPath = req.files?.adharBackImg?.[0]?.path;
  if (!adharBackPath) {
    throw new ApiError(400, "Aadhaar Back image is required");
  }

  const uploadedBack = await uploadOnCloudinary(adharBackPath);
  if (!uploadedBack?.url) {
    throw new ApiError(400, "Aadhaar Back upload failed");
  }

  // ===== Create Farmer as Paid (CASH) =====
  const farmer = await Farmer.create({
    name,
    gatNo,
    totalArea,
    adharNo,
    mobile,
    email,
    village,
    taluka,
    district,
    amount,
    adharFrontImg: uploadedFront.url,
    adharBackImg: uploadedBack.url,
    isPayment: true,
    orderId: "CASH",
    paymentId: "CASH",
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        farmer,
        "Farmer registered successfully (Cash Payment)",
      ),
    );
});

// const exportExcel = asyncHandler(async (req, res) => {
//   const { status, from, to } = req.query;

//   let where = {};

//   if (status && status !== "All") {
//     where.paymentStatus = status;
//   }

//   if (from && to) {
//     where.createdAt = {
//       [Op.between]: [new Date(from), new Date(to)],
//     };
//   }

//   const farmers = await Farmer.findAll({ where });

//   const workbook = new ExcelJS.Workbook();
//   const sheet = workbook.addWorksheet("Farmers");

//   sheet.columns = [
//     { header: "Name", key: "name" },
//     { header: "Aadhaar", key: "aadhaar" },
//     { header: "Mobile", key: "mobile" },
//     { header: "Amount", key: "amount" },
//     { header: "Status", key: "paymentStatus" },
//   ];

//   farmers.forEach((farmer) => {
//     sheet.addRow(farmer.toJSON());
//   });

//   res.setHeader(
//     "Content-Type",
//     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//   );

//   res.setHeader("Content-Disposition", "attachment; filename=farmers.xlsx");

//   await workbook.xlsx.write(res);
//   res.end();
// });

const findCertificate = asyncHandler(async (req, res) => {
  const { adharNo } = req.body;

  const farmer = await Farmer.findOne({
    where: { adharNo },
  });

  if (!farmer) {
    throw new ApiError(404, "Farmer not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, farmer, "Certificate found"));
});

const getCurrentAdmin = asyncHandler(async (req, res) => {
  const admin = req.admin;

  const safeAdmin = {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    createdAt: admin.createdAt,
  };

  return res.status(200).json({
    success: true,
    data: safeAdmin,
  });
});

export {
  adminLogin,
  refreshAccessToken,
  updateAdminPassword,
  logoutAdmin,
  getCurrentAdmin,
  getAllFarmers,
  exportFarmersExcel,
  markAsPaid,
  adminFarmerCashRegistration,
  findCertificate,
};
