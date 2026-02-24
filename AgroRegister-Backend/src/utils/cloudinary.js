import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECKRET,
});

const uploadOnCloudinary = async (localfilepath) => {
  try {
    if (!localfilepath) return null;
    //upload the file on the cloudinary
    const response = await cloudinary.uploader.upload(localfilepath, {
      resource_type: "auto",
      folder: "Farmer_Adhar",
    });
    // file was successfully uploaded
    // console.log("File is uploaded on cloudinary ", response.url);
    fs.unlinkSync(localfilepath);
    return response;
  } catch (error) {
    // console.log(error);

    fs.unlinkSync(localfilepath);
    return null;
  }
};

export { uploadOnCloudinary };
