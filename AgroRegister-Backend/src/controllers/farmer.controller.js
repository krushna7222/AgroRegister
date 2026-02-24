import { asyncHandler } from "../utils/asyncHandeler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { generateCertificate } from "../utils/certificateGenerator.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import Farmer from "../models/farmer.model.js";
import PDFDocument from "pdfkit";
import razorpay from "../utils/razorpay.js";
import {
  prepareCertificateData,
  generatePdfFromTemplate,
} from "../utils/certificate.service.js";
import crypto from "crypto";

/**
 * @desc    Farmer Registration + Razorpay Order
 * @route   POST /api/farmer/purchase
 * @access  Public
 */

const FarmerRegistration = asyncHandler(async (req, res) => {
  try {
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
      where: { adharNo, isPayment: true },
    });

    if (existing) {
      throw new ApiError(400, "This Aadhaar already registered");
    }

    // ===== Aadhaar Front Upload =====
    const adharFrontPath = req.files?.adharFrontImg?.[0]?.path;
    // console.log(adharFrontPath);

    if (!adharFrontPath) {
      throw new ApiError(400, "Aadhaar Front image is required");
    }

    const uploadedFront = await uploadOnCloudinary(adharFrontPath);
    if (!uploadedFront?.url) {
      throw new ApiError(400, "Aadhaar Front upload failed");
    }
    // console.log(uploadedFront);

    // ===== Aadhaar Back Upload =====
    const adharBackPath = req.files?.adharBackImg?.[0]?.path;
    if (!adharBackPath) {
      throw new ApiError(400, "Aadhaar Back image is required");
    }

    const uploadedBack = await uploadOnCloudinary(adharBackPath);
    if (!uploadedBack?.url) {
      throw new ApiError(400, "Aadhaar Back upload failed");
    }

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
      isPayment: false,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, farmer, "Farmer Registered Successfully"));
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Something went wrong",
    });
  }
});

const createFarmerOrder = asyncHandler(async (req, res) => {
  const { farmerId } = req.body;

  const farmer = await Farmer.findByPk(farmerId);

  if (!farmer) {
    throw new ApiError(404, "Farmer not found");
  }

  if (farmer.isPayment) {
    throw new ApiError(400, "Payment already completed");
  }

  const options = {
    amount: Number(farmer.amount) * 100,
    currency: "INR",
    receipt: `farmer_${farmer.mobile}_${Date.now()}`,
    notes: {
      mobile: farmer.mobile,
      adharNo: farmer.adharNo,
    },
  };

  const order = await razorpay.orders.create(options);

  // Save orderId in farmer
  farmer.orderId = order.id;
  await farmer.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
      },
      "Order created successfully",
    ),
  );
});

// const verifyFarmerPayment = asyncHandler(async (req, res) => {
//   const {
//     razorpay_order_id,
//     razorpay_payment_id,
//     razorpay_signature,
//   } = req.body;

//   const farmer = await Farmer.findOne({
//     where: { orderId: razorpay_order_id },
//   });

//   if (!farmer) {
//     throw new ApiError(404, "Farmer not found");
//   }

//   const generatedSignature = crypto
//     .createHmac("sha256", process.env.RAZORPAY_SECRET)
//     .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//     .digest("hex");

//   if (generatedSignature !== razorpay_signature) {
//     throw new ApiError(400, "Payment verification failed");
//   }

//   farmer.isPayment = true;
//   farmer.paymentId = razorpay_payment_id;

//   await farmer.save();

//   return res.status(200).json(
//     new ApiResponse(200, null, "Payment verified successfully")
//   );
// });

/**
 * @desc    Verify Farmer Payment
 * @route   POST /api/farmer/verify
 * @access  Public
 */

const verifyFarmerPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    farmerId,
  } = req.body;

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    throw new ApiError(400, "❌ Payment verification failed");
  }

  // ===== UPDATE FARMER =====
  await Farmer.update(
    {
      isPayment: true,
      paymentId: razorpay_payment_id,
    },
    {
      where: { id: farmerId },
    },
  );

  console.log("Farmer payment verify done");

  return res
    .status(200)
    .json(
      new ApiResponse(200, null, "✅ Payment verified and farmer registered"),
    );
});

const downloadCertificateByAadhar = asyncHandler(async (req, res) => {
  const { adharNo } = req.body;

  if (!adharNo) {
    throw new ApiError(400, "Aadhar number required");
  }

  const farmer = await Farmer.findOne({
    where: { adharNo },
  });

  if (!farmer) {
    throw new ApiError(404, "Farmer not found");
  }

  // Generate Certificate
  const result = await generateCertificate(farmer);

  // Save path in DB
  farmer.certificatePath = result.filePath;
  await farmer.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        certificateUrl: `/${result.filePath}`,
        certificateId: result.certificateId,
        isPayment: farmer.isPayment,
      },
      "Certificate generated successfully",
    ),
  );
});

const getCertificate = asyncHandler(async (req, res) => {
  const { adharNo } = req.body;

  const farmer = await Farmer.findOne({
    where: { adharNo },
  });

  if (!farmer) throw new ApiError(404, "Farmer not found");

  // 1) Prepare safe data
  const certData = prepareCertificateData(farmer);

  // 2) Generate PDF (server side)
  const pdfPath = await generatePdfFromTemplate(certData);

  farmer.certificatePath = pdfPath;
  await farmer.save();

  // 3) Return BOTH
  res.status(200).json(
    new ApiResponse(
      200,
      {
        certificateData: certData,
        pdfUrl: `/${pdfPath}`,
      },
      "Certificate Ready",
    ),
  );
});

const COMPANY_NAME = "Agro Registry Pvt Ltd";

const getCertificateByAdhar = async (req, res) => {
  try {
    const { adharNo } = req.params;

    if (!adharNo) {
      throw new ApiError(400, "Aadhaar number is required");
    }

    const farmer = await Farmer.findOne({ where: { adharNo } });

    if (!farmer) {
      throw new ApiError(404, "Farmer not registered");
    }

    const certificateId = generateCertificateId(COMPANY_NAME, adharNo);

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=certificate-${certificateId}.pdf`,
    );

    doc.pipe(res);

    // ===== HEADER =====
    doc.fontSize(20).text(COMPANY_NAME, { align: "center" }).moveDown(0.5);

    doc
      .fontSize(14)
      .text("FARMER REGISTRATION CERTIFICATE", { align: "center" })
      .moveDown(1);

    doc
      .fontSize(12)
      .text(`Certificate ID: ${certificateId}`, { align: "right" })
      .moveDown(1);

    // ===== BODY =====
    doc.fontSize(12);

    doc.text(`Farmer Name: ${farmer.name}`);
    doc.text(`Aadhaar Number: ${farmer.adharNo}`);
    doc.text(`Mobile Number: ${farmer.mobile}`);
    doc.text(`Gat No: ${farmer.gatNo}`);
    doc.text(`Total Area: ${farmer.totalArea}`);
    doc.text(`Village: ${farmer.village}`);
    doc.text(`Taluka: ${farmer.taluka}`);
    doc.text(`District: ${farmer.district}`);
    doc.text(`Registration Fee: Rs ${farmer.amount}`);
    doc.moveDown(1);

    // ===== PAYMENT STATUS STAMP =====
    doc
      .fontSize(14)
      .fillColor(farmer.isPayment ? "green" : "red")
      .text(farmer.isPayment ? "PAID" : "UNPAID", 400, 200, {
        align: "center",
      });

    doc.fillColor("black");

    // ===== DECLARATION =====
    doc.moveDown(3);
    doc.text(
      "This is to certify that the above-mentioned farmer is registered under Agro Registry System.",
      { align: "justify" },
    );

    // ===== SEAL / SIGN SPACE =====
    doc.moveDown(4);

    doc.text("_________________________", 70, 650);
    doc.text("Authorized Signature", 70, 665);

    doc.text("_________________________", 350, 650);
    doc.text("Official Seal & Stamp", 350, 665);

    doc.end();
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to generate certificate",
    });
  }
};

const generateCertificateId = (companyName, adharNo) => {
  const firstLetter = companyName.charAt(0).toUpperCase();

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const last6 = adharNo.slice(-6);

  return `${firstLetter}${year}${month}${last6}`;
};

export {
  FarmerRegistration,
  createFarmerOrder,
  verifyFarmerPayment,
  getCertificateByAdhar,
  downloadCertificateByAadhar,
  getCertificate,
};
