import { prisma } from "../config/prisma.js";
import { minioClient } from "../config/minio.js";

const bucketName = process.env.MINIO_BUCKET;

export async function getMasterPlaylist(videoId) {
  const video = await prisma.video.findUnique({
    where: {
      id: videoId,
    },
  });

  if (!video) {
    throw new Error("VIDEO_NOT_FOUND");
  }

  if (video.status !== "READY") {
    throw new Error("VIDEO_NOT_READY");
  }

  const objectKey = `hls/${videoId}/master.m3u8`;

  const stream = await minioClient.getObject(
    bucketName,
    objectKey
  );

  return stream;
}

export async function getVariantPlaylist(
  videoId,
  resolution
) {
  const video = await prisma.video.findUnique({
    where: {
      id: videoId,
    },
  });

  if (!video) {
    throw new Error("VIDEO_NOT_FOUND");
  }

  if (video.status !== "READY") {
    throw new Error("VIDEO_NOT_READY");
  }

  const variant = await prisma.videoVariant.findUnique({
    where: {
      videoId_resolution: {
        videoId,
        resolution,
      },
    },
  });

  if (!variant) {
    throw new Error("VARIANT_NOT_FOUND");
  }

  const stream = await minioClient.getObject(
    bucketName,
    variant.playlistObjectKey
  );

  return stream;
}

export async function getSegment(
  videoId,
  resolution,
  segment
) {
  const video = await prisma.video.findUnique({
    where: {
      id: videoId,
    },
  });

  if (!video) {
    throw new Error("VIDEO_NOT_FOUND");
  }

  if (video.status !== "READY") {
    throw new Error("VIDEO_NOT_READY");
  }

  const variant = await prisma.videoVariant.findUnique({
    where: {
      videoId_resolution: {
        videoId,
        resolution,
      },
    },
  });

  if (!variant) {
    throw new Error("VARIANT_NOT_FOUND");
  }

  const allowedSegment =
    /^[a-zA-Z0-9._-]+$/;

  if (!allowedSegment.test(segment)) {
    throw new Error("INVALID_SEGMENT");
  }

  const objectKey =
    `hls/${videoId}/${resolution}/${segment}`;

  const stream = await minioClient.getObject(
    bucketName,
    objectKey
  );

  return stream;
}