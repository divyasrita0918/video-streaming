import { spawn } from "child_process";

export function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "error",

      "-show_entries",
      "format=duration",

      "-show_entries",
      "stream=index,codec_type,codec_name,width,height",

      "-of",
      "json",

      filePath,
    ]);

    let stdout = "";
    let stderr = "";

    ffprobe.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffprobe.on("error", (error) => {
      reject(error);
    });

    ffprobe.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`FFprobe failed: ${stderr}`)
        );
        return;
      }

      try {
        const metadata = JSON.parse(stdout);
        resolve(metadata);
      } catch (error) {
        reject(error);
      }
    });
  });
}

export function generateThumbnail(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      inputPath,

      "-ss",
      "00:00:05",

      "-frames:v",
      "1",

      "-q:v",
      "2",

      "-y",

      outputPath,
    ]);

    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });

    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`Thumbnail generation failed: ${stderr}`)
        );
        return;
      }

      resolve();
    });
  });
}

export function transcodeVideo(
  inputPath,
  outputPath,
  width,
  height
) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      inputPath,

      "-vf",
      `scale=${width}:${height}`,

      "-c:v",
      "libx264",

      "-preset",
      "medium",

      "-crf",
      "23",

      "-c:a",
      "aac",

      "-b:a",
      "128k",

      "-y",
      outputPath,
    ]);

    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });

    ffmpeg.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `FFmpeg transcoding failed: ${stderr}`
          )
        );
        return;
      }

      resolve();
    });
  });
}