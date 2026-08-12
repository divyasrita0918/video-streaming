import express from "express";

import { uploadVideo } from "../middleware/upload.middleware.js";
import { uploadVideoController } from "../controllers/video.controller.js";

const router = express.Router();

router.post(
  "/upload",
  uploadVideo.single("video"),
  uploadVideoController
);

export default router;