import { prisma } from "../config/prisma.js";

export async function createVideo({ title, originalObjectKey }) {
  const video = await prisma.video.create({
    data: {
      title,
      originalObjectKey,
      status: "UPLOADED",
    },
  });

  return video;
}