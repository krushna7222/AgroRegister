import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandeler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const adminAuth = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.adminToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Not Authorized. Please login again.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.email !== process.env.ADMIN_EMAIL) {
      throw new ApiError(403, "Access Denied: Invalid Admin Credentials");
    }

    req.admin = decoded;

    next();
  } catch (error) {
    console.error("Admin Auth Error:", error.message);

    const statusCode = error.statusCode || 401;
    const message = error.message || "Invalid or Expired Token";

    return res
      .status(statusCode)
      .json(new ApiResponse(statusCode, null, message));
  }
});

export default adminAuth;
