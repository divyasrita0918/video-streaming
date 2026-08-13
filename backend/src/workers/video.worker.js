import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { prisma } from "../config/prisma.js";

import {
  downloadObject,
} from "../services/storage.service.js";

import {
  probeVideo,
} from "../services/ffmpeg.service.js";

import {
  createTempDirectory,
} from "../utils/temp.js";

import path from "path";

const worker = new Worker(
  "video-processing",

  async (job) => {
    const { videoId } = job.data;

    console.log(`Processing video: ${videoId}`);

    const video = await prisma.video.findUnique({
      where: {
        id: videoId,
      },
    });

    if (!video) {
      throw new Error(
        `Video not found: ${videoId}`
      );
    }

    await prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        status: "PROCESSING",
      },
    });

    const tempDirectory =
      await createTempDirectory(videoId);

    const originalPath = path.join(
      tempDirectory,
      "original.mp4"
    );

    console.log(
      `Downloading original video: ${video.originalObjectKey}`
    );

    await downloadObject(
      video.originalObjectKey,
      originalPath
    );

    console.log("Original video downloaded");

    const metadata =
      await probeVideo(originalPath);

    console.log(
      "Video metadata:",
      JSON.stringify(metadata, null, 2)
    );

    return {
      videoId,
      metadata,
    };
  },

  {
    connection: redisConnection,
  }
);

worker.on("completed", (job) => {
  console.log(
    `Job ${job.id} completed`
  );
});

worker.on("failed", (job, error) => {
  console.error(
    `Job ${job?.id} failed:`,
    error.message
  );
});

console.log("Video worker started");