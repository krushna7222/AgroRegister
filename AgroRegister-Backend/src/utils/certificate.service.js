import ejs from "ejs";
import puppeteer from "puppeteer";
import QRCode from "qrcode";
import moment from "moment";
import path from "path";

export const prepareCertificateData = (farmer) => {
  const last6 = farmer.adharNo.slice(-6);

  const certificateId = `KS-${moment().format("YYMM")}-${last6}`;

  return {
    name: farmer.name,
    gatNo: farmer.gatNo,
    totalArea: farmer.totalArea,
    maskedAadhar: `XXXX-XXXX-${last6}`,
    mobile: farmer.mobile,
    village: farmer.village,
    taluka: farmer.taluka,
    district: farmer.district,
    amount: farmer.amount,
    isPayment: farmer.isPayment,
    certificateId,
    date: moment().format("DD MMM YYYY"),
  };
};

export const generatePdfFromTemplate = async (data) => {
  const qr = await QRCode.toDataURL(
    `https://yourdomain.com/verify/${data.certificateId}`,
  );

  const html = await ejs.renderFile("templates/certificate.ejs", {
    ...data,
    qr,
  });

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(html);

  const filePath = `public/certificates/${data.certificateId}.pdf`;

  await page.pdf({
    path: filePath,
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return filePath;
};
