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