import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import moment from "moment";
import QRCode from "qrcode";

export const generateCertificate = async (farmer) => {
  // ===== Certificate ID Logic =====
  const companyPrefix = "KSA";
  const datePart = moment().format("YYMM");
  const last6Aadhar = farmer.adharNo.slice(-6);

  const certificateId = `${companyPrefix}-${datePart}-${last6Aadhar}`;

  const fileName = `certificate_${certificateId}.pdf`;
  const filePath = path.join("public/certificates", fileName);

  // Create folder if not exists
  fs.mkdirSync("public/certificates", { recursive: true });

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(fs.createWriteStream(filePath));

  // ===== Header =====
  doc
    .fontSize(22)
    .text("KRUSHI SETU AGROSCIENCE PVT. LTD.", { align: "center" });

  doc.moveDown(0.5);

  doc.fontSize(16).text("FARMER REGISTRATION CERTIFICATE", { align: "center" });

  doc.moveDown(1);

  // ===== Farmer Details =====

  doc.fontSize(12);

  doc.text(`Certificate ID : ${certificateId}`);
  doc.text(`Date : ${moment().format("DD-MM-YYYY")}`);

  doc.moveDown(1);

  doc.text(`Name : ${farmer.name}`);
  doc.text(`Gat No : ${farmer.gatNo}`);
  doc.text(`Total Area : ${farmer.totalArea} Gunthe`);
  doc.text(`Aadhar No : XXXX-XXXX-${last6Aadhar}`);
  doc.text(`Mobile : ${farmer.mobile}`);
  doc.text(`Village : ${farmer.village}`);
  doc.text(`Taluka : ${farmer.taluka}`);
  doc.text(`District : ${farmer.district}`);

  doc.moveDown(1);

  doc.text(`Amount : ₹ ${farmer.amount}`);

  // ===== PAID / UNPAID STAMP =====

  const stampColor = farmer.isPayment ? "green" : "red";
  const stampText = farmer.isPayment ? "PAID" : "UNPAID";

  doc
    .fillColor(stampColor)
    .fontSize(28)
    .text(stampText, 400, 350, { rotate: 20 });

  doc.fillColor("black");

  // ===== QR Code =====

  const qrData = `https://yourdomain.com/verify/${certificateId}`;

  const qrImage = await QRCode.toDataURL(qrData);

  doc.image(qrImage, 420, 100, { width: 100 });

  // ===== Signature (From Admin Upload) =====

  if (farmer.adminSignPath) {
    doc.image(farmer.adminSignPath, 400, 420, {
      width: 120,
      height: 60,
    });
  }

  doc.text("Authorized Sign", 420, 490);

  doc.end();

  return {
    filePath,
    certificateId,
  };
};
