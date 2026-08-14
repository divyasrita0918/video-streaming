export function extractVideoMetadata(metadata) {
  const videoStream = metadata.streams?.find(
    (stream) => stream.codec_type === "video"
  );

  if (!videoStream) {
    throw new Error("No video stream found");
  }

  const duration = Number.parseFloat(
    metadata.format?.duration
  );

  if (!Number.isFinite(duration)) {
    throw new Error("Unable to determine video duration");
  }

  return {
    duration: Math.round(duration),
    width: videoStream.width ?? null,
    height: videoStream.height ?? null,
    codec: videoStream.codec_name ?? null,
  };
}