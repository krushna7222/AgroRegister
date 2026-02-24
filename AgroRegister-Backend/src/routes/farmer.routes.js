import express from "express";
import { upload } from "../middleware/multer.middleware.js";

import {
  FarmerRegistration,
  createFarmerOrder,
  verifyFarmerPayment,
  getCertificateByAdhar,
  downloadCertificateByAadhar,
  getCertificate,
} from "../controllers/farmer.controller.js";

const router = express.Router();

router.post(
  "/register",
  upload.fields([
    { name: "adharFrontImg", maxCount: 1 },
    { name: "adharBackImg", maxCount: 1 },
  ]),
  FarmerRegistration,
);

router.post("/create-order", createFarmerOrder);
router.post("/verify-payment", verifyFarmerPayment);
router.get("/certificate/:adharNo", getCertificateByAdhar);

router.post("/certificate/download", downloadCertificateByAadhar);
router.post("/getCertificate", getCertificate);

export default router;
