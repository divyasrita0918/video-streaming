import fs from "fs/promises";
import path from "path";

export async function createTempDirectory(videoId) {
  const directory = path.join(
    process.cwd(),
    "tmp",
    "videos",
    videoId
  );

  await fs.mkdir(directory, {
    recursive: true,
  });

  return directory;
}