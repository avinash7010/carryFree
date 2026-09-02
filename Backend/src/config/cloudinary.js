import { v2 as cloudinary } from "cloudinary";

const isConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const defaultUpload = async (fileBuffer, folder = "carryfree") => {
  if (!isConfigured) {
    throw new Error("Cloudinary is not configured");
  }

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });

  return result.secure_url;
};

export const uploadService = {
  uploadImage: defaultUpload,
};

export const uploadImage = (fileBuffer, folder) =>
  uploadService.uploadImage(fileBuffer, folder);

export default cloudinary;
