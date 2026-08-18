import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { prisma } from "../config/prisma.js";
import { getAvailableVariants } from "../utils/video-variants.js";
import { createTempDirectory } from "../utils/temp.js";
import { extractVideoMetadata } from "../utils/video-metadata.js";

import {
  downloadObject,
  uploadObject,
} from "../services/storage.service.js";

import {
  generateThumbnail,
  probeVideo,
  transcodeVideo,
  generateHLS,
} from "../services/ffmpeg.service.js";

import fs from "fs/promises";
import path from "path";

const worker = new Worker(
  "video-processing",
  async (job) => {
    const { videoId } = job.data;

    console.log(`Processing video: ${videoId}`);

    let tempDirectory = null;

    try {
      const video = await prisma.video.findUnique({
        where: {
          id: videoId,
        },
      });

      if (!video) {
        throw new Error(`Video not found: ${videoId}`);
      }

      if (video.status === "READY") {
        console.log(`Video ${videoId} is already READY`);

        return {
          videoId,
          status: "READY",
        };
      }

      await prisma.video.update({
        where: {
          id: videoId,
        },
        data: {
          status: "PROCESSING",
        },
      });

      tempDirectory = await createTempDirectory(videoId);

      const originalPath = path.join(
        tempDirectory,
        "original.mp4"
      );

      await downloadObject(
        video.originalObjectKey,
        originalPath
      );

      const metadata = await probeVideo(
        originalPath
      );

      const videoMetadata =
        extractVideoMetadata(metadata);

      if (
        !videoMetadata.width ||
        !videoMetadata.height
      ) {
        throw new Error(
          "Unable to determine video dimensions"
        );
      }

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

      await generateThumbnail(
        originalPath,
        thumbnailPath
      );

      const thumbnailObjectKey =
        `thumbnails/${videoId}.jpg`;

      await uploadObject(
        thumbnailPath,
        thumbnailObjectKey,
        "image/jpeg"
      );

      await prisma.video.update({
        where: {
          id: videoId,
        },
        data: {
          thumbnailObjectKey,
        },
      });

      const availableVariants =
        getAvailableVariants(
          videoMetadata.width,
          videoMetadata.height
        );

      if (availableVariants.length === 0) {
        throw new Error(
          `No suitable video variants found for ${videoMetadata.width}x${videoMetadata.height}`
        );
      }

      const generatedVariants = [];

      for (const variant of availableVariants) {
        const outputPath = path.join(
          tempDirectory,
          `${variant.resolution}.mp4`
        );

        await transcodeVideo(
          originalPath,
          outputPath,
          variant.width,
          variant.height
        );

        const hlsDirectory = path.join(
          tempDirectory,
          variant.resolution
        );

        await fs.mkdir(
          hlsDirectory,
          {
            recursive: true,
          }
        );

        await generateHLS(
          outputPath,
          hlsDirectory
        );

        const files = await fs.readdir(
          hlsDirectory
        );

        for (const file of files) {
          const localFilePath =
            path.join(
              hlsDirectory,
              file
            );

          const stats =
            await fs.stat(localFilePath);

          if (!stats.isFile()) {
            continue;
          }

          const objectKey =
            `hls/${videoId}/${variant.resolution}/${file}`;

          let contentType =
            "application/octet-stream";

          if (file.endsWith(".m3u8")) {
            contentType =
              "application/vnd.apple.mpegurl";
          } else if (file.endsWith(".ts")) {
            contentType =
              "video/mp2t";
          } else if (file.endsWith(".m4s")) {
            contentType =
              "video/iso.segment";
          }

          await uploadObject(
            localFilePath,
            objectKey,
            contentType
          );
        }

        const playlistObjectKey =
          `hls/${videoId}/${variant.resolution}/playlist.m3u8`;

        await prisma.videoVariant.upsert({
          where: {
            videoId_resolution: {
              videoId,
              resolution: variant.resolution,
            },
          },
          update: {
            playlistObjectKey,
            bandwidth: variant.bandwidth,
            width: variant.width,
            height: variant.height,
          },
          create: {
            videoId,
            resolution: variant.resolution,
            playlistObjectKey,
            bandwidth: variant.bandwidth,
            width: variant.width,
            height: variant.height,
          },
        });

        generatedVariants.push({
          resolution: variant.resolution,
          bandwidth: variant.bandwidth,
          width: variant.width,
          height: variant.height,
          playlistObjectKey,
        });

        await fs.rm(
          outputPath,
          {
            force: true,
          }
        );
      }

      generatedVariants.sort(
        (a, b) => b.height - a.height
      );

      let masterPlaylist = "#EXTM3U\n";
      masterPlaylist += "#EXT-X-VERSION:3\n\n";

      for (const variant of generatedVariants) {
        masterPlaylist +=
          `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${variant.width}x${variant.height}\n`;

        masterPlaylist +=
          `${variant.resolution}/playlist.m3u8\n`;
      }

      const masterPlaylistPath =
        path.join(
          tempDirectory,
          "master.m3u8"
        );

      await fs.writeFile(
        masterPlaylistPath,
        masterPlaylist,
        "utf8"
      );

      const masterObjectKey =
        `hls/${videoId}/master.m3u8`;

      await uploadObject(
        masterPlaylistPath,
        masterObjectKey,
        "application/vnd.apple.mpegurl"
      );

      await prisma.video.update({
        where: {
          id: videoId,
        },
        data: {
          status: "READY",
        },
      });

      console.log(
        `Video ${videoId} is READY`
      );

      return {
        videoId,
        status: "READY",
        metadata: videoMetadata,
        variants: generatedVariants,
        masterPlaylist: masterObjectKey,
      };
    } catch (error) {
      console.error(
        `Video processing failed: ${videoId}`,
        error
      );

      try {
        await prisma.video.update({
          where: {
            id: videoId,
          },
          data: {
            status: "FAILED",
          },
        });
      } catch (dbError) {
        console.error(
          "Failed to update video status:",
          dbError
        );
      }

      throw error;
    } finally {
      if (tempDirectory) {
        try {
          await fs.rm(
            tempDirectory,
            {
              recursive: true,
              force: true,
            }
          );
        } catch (cleanupError) {
          console.error(
            "Failed to cleanup temporary directory:",
            cleanupError
          );
        }
      }
    }
  },
  {
    connection: redisConnection,
  }
);

worker.on(
  "completed",
  (job) => {
    console.log(
      `Job ${job.id} completed successfully`
    );
  }
);

worker.on(
  "failed",
  (job, error) => {
    console.error(
      `Job ${job?.id} failed:`,
      error.message
    );
  }
);

worker.on(
  "error",
  (error) => {
    console.error(
      "Worker error:",
      error
    );
  }
);

console.log(
  "Video processing worker started"
);