import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandeler.js";
import Admin from "../models/admin.model.js";

const adminAuth = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Not authorized. Please login again.");
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired token");
  }

  const admin = await Admin.findByPk(decoded.id);

  if (!admin) {
    throw new ApiError(401, "Admin not found");
  }

  // Optional: check refresh token match (extra security)

  const hashedIncomingRefreshToken = admin.hashToken(req.cookies?.refreshToken);

  if (admin.refreshToken !== hashedIncomingRefreshToken) {
    throw new ApiError(401, "Session expired");
  }

  // if (admin.refreshToken !== req.cookies?.refreshToken) {
  //   throw new ApiError(401, "Session expired");
  // }

  req.admin = admin;

  next();
});

export default adminAuth;
