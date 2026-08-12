import { minioClient } from "../config/minio.js";

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