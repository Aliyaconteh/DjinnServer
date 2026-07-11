const express = require("express");
const multer = require("multer");
const path = require("path");
const os = require("os");
const fs = require("fs");
const AIController = require("./ai.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

const router = express.Router();

const uploadDirectory = path.join(os.tmpdir(), "quizroom");
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-_]/g, "_");
      cb(null, `${timestamp}-${safeName}`);
    }
  }),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const extension = path.extname(file.originalname || "").toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return cb(new Error("Unsupported file type. Only PDF, DOCX, and TXT are allowed."));
    }

    cb(null, true);
  }
});

router.use(authMiddleware);
router.post("/generate", upload.single("document"), (req, res) => AIController.generateQuiz(req, res));

router.use((err, req, res, next) => {
  if (req.file?.path) {
    fs.unlink(req.file.path, () => {});
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err) {
    return res.status(400).json({ success: false, message: err.message || "File upload failed" });
  }

  next();
});

module.exports = router;
