import fs from "fs/promises";

import { uploadVideo, deleteObject } from "../services/storage.service.js";
import { createVideo } from "../services/video.service.js";
import { videoQueue } from "../queues/video.queue.js";

export async function uploadVideoController(req, res) {
  let objectKey = null;

  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        message: "Title is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Video file is required",
      });
    }

    objectKey = await uploadVideo(
      req.file.path,
      req.file.originalname
    );

    const video = await createVideo({
      title,
      originalObjectKey: objectKey,
    });

    await videoQueue.add(
      "process-video",
      {
        videoId: video.id,
      },
      {
        jobId: `process-video-${video.id}`,
      }
    );

    /*
     * Step 4:
     * Remove temporary local file.
     */
    await fs.unlink(req.file.path);

    /*
     * Step 5:
     * Return response immediately.
     */
    return res.status(201).json({
      videoId: video.id,
      status: video.status,
    });
  } catch (error) {
    console.error("Video upload failed:", error);

    if (objectKey) {
  try {
    await deleteObject(objectKey);
  } catch (cleanupError) {
    console.error(
      "Failed to clean up MinIO object:",
      cleanupError
    );
  }
}

    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch {
        // File may already have been deleted.
      }
    }

    return res.status(500).json({
      message: "Video upload failed",
    });
  }
}