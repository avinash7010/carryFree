import multer from "multer";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

// NOTE: file.mimetype is client-provided and can be spoofed. This filter
// provides a basic sanity check but is NOT a secure content-type verification.
// A production system should additionally inspect magic bytes (e.g. using
// the `file-type` package) before uploading to Cloudinary.
const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

export default upload;
