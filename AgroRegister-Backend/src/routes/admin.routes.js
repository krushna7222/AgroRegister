import { Router } from "express";
import express from "express";
import { upload } from "../middleware/multer.middleware.js";
import {
  adminLogin,
  updateAdminPassword,
  refreshAccessToken,
  logoutAdmin,
  getAllFarmers,
  getCurrentAdmin,
  exportFarmersExcel,
  markAsPaid,
  adminFarmerCashRegistration,
  findCertificate,
} from "../controllers/admin.controller.js";
import adminAuth from "../middleware/adminAuth.middleware.js";

const router = express.Router();

router.route("/login").post(adminLogin);

//Secured Routes

router.route("/refresh-token").post(refreshAccessToken);
router.route("/logout").post(adminAuth, logoutAdmin);
router.route("/update-password").patch(adminAuth, updateAdminPassword);
router.route("/get-farmers").get(adminAuth, getAllFarmers);
router.route("/export-excel").get(adminAuth, exportFarmersExcel);
router.route("/mark-paid/:id").patch(adminAuth, markAsPaid);
router.route("/current-user").get(adminAuth, getCurrentAdmin);
router.route("/find-certificate").post(adminAuth, findCertificate);

router.post(
  "/farmer-register-byAdmin",
  upload.fields([
    { name: "adharFrontImg", maxCount: 1 },
    { name: "adharBackImg", maxCount: 1 },
  ]),
  adminAuth,
  adminFarmerCashRegistration,
);

export default router;
