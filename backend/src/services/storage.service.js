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

export async function deleteObject(objectKey) {
  await minioClient.removeObject(bucketName, objectKey);
}

export async function downloadObject(objectKey, destinationPath) {
  await minioClient.fGetObject(
    bucketName,
    objectKey,
    destinationPath
  );
}

export async function uploadObject(
  filePath,
  objectKey,
  contentType
) {
  await minioClient.fPutObject(
    bucketName,
    objectKey,
    filePath,
    {
      "Content-Type": contentType,
    }
  );

  return objectKey;
}