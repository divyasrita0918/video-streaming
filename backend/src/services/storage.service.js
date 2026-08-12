import { minioClient } from "../config/minio.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const bucketName = process.env.MINIO_BUCKET;

export async function initializeStorage() {
  const exists = await minioClient.bucketExists(bucketName);

  if (!exists) {
    await minioClient.makeBucket(bucketName);
    console.log(`Created MinIO bucket: ${bucketName}`);
  } else {
    console.log(`MinIO bucket exists: ${bucketName}`);
  }
}

export async function uploadVideo(filePath, originalName) {
  const extension = path.extname(originalName);

  const objectKey = `original/${crypto.randomUUID()}${extension}`;

  await minioClient.fPutObject(
    bucketName,
    objectKey,
    filePath,
    {
      "Content-Type": "video/mp4",
    }
  );

  return objectKey;
}