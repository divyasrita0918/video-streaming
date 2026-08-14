import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { prisma } from "../config/prisma.js";
import { getAvailableVariants } from "../utils/video-variants.js";

import {
  downloadObject,
  uploadObject,
} from "../services/storage.service.js";

import {
  generateThumbnail,
  probeVideo,
  transcodeVideo,
} from "../services/ffmpeg.service.js";

import {
  createTempDirectory,
} from "../utils/temp.js";

import {
  extractVideoMetadata,
} from "../utils/video-metadata.js";

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

    const videoMetadata =
      extractVideoMetadata(metadata);

    console.log(
      "Video metadata:",
      videoMetadata
    );

    await prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        duration: videoMetadata.duration,
      },
    });

    const thumbnailPath = path.join(
      tempDirectory,
      "thumbnail.jpg"
    );

    console.log("Generating thumbnail...");

    await generateThumbnail(
      originalPath,
      thumbnailPath
    );

    console.log("Thumbnail generated");

    const thumbnailObjectKey =
      `thumbnails/${videoId}.jpg`;

    await uploadObject(
      thumbnailPath,
      thumbnailObjectKey,
      "image/jpeg"
    );

    console.log(
      `Thumbnail uploaded: ${thumbnailObjectKey}`
    );

    await prisma.video.update({
      where: {
        id: videoId,
      },
      data: {
        thumbnailObjectKey,
      },
    });

    console.log(
      "Thumbnail information saved"
    );

    const availableVariants =
  getAvailableVariants(
    videoMetadata.width,
    videoMetadata.height
  );

console.log(
  "Available variants:",
  availableVariants
);

for (const variant of availableVariants) {
  const outputPath = path.join(
    tempDirectory,
    `${variant.resolution}.mp4`
  );

  console.log(
    `Generating ${variant.resolution}...`
  );

  await transcodeVideo(
    originalPath,
    outputPath,
    variant.width,
    variant.height
  );

  console.log(
    `${variant.resolution} generated`
  );

  const objectKey =
    `variants/${videoId}/${variant.resolution}.mp4`;

  await uploadObject(
    outputPath,
    objectKey,
    "video/mp4"
  );

  console.log(
    `${variant.resolution} uploaded: ${objectKey}`
  );
}
    console.log(
      "720p video generated"
    );

    const variantObjectKey =
      `variants/${videoId}/720p.mp4`;

    await uploadObject(
      output720Path,
      variantObjectKey,
      "video/mp4"
    );

    console.log(
      `720p video uploaded: ${variantObjectKey}`
    );

    return {
      videoId,
      metadata: videoMetadata,
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