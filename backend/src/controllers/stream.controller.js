import {
  getMasterPlaylist,
  getVariantPlaylist,
  getSegment,
} from "../services/streaming.service.js";

export async function streamMasterPlaylist(
  req,
  res
) {
  try {
    const { id } = req.params;

    const stream =
      await getMasterPlaylist(id);

    res.setHeader(
      "Content-Type",
      "application/vnd.apple.mpegurl"
    );

    stream.pipe(res);
  } catch (error) {
    if (error.message === "VIDEO_NOT_FOUND") {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    if (error.message === "VIDEO_NOT_READY") {
      return res.status(409).json({
        message: "Video is not ready",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to stream master playlist",
    });
  }
}

export async function streamVariantPlaylist(
  req,
  res
) {
  try {
    const { id, resolution } = req.params;

    const stream =
      await getVariantPlaylist(
        id,
        resolution
      );

    res.setHeader(
      "Content-Type",
      "application/vnd.apple.mpegurl"
    );

    stream.pipe(res);
  } catch (error) {
    if (error.message === "VIDEO_NOT_FOUND") {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    if (error.message === "VIDEO_NOT_READY") {
      return res.status(409).json({
        message: "Video is not ready",
      });
    }

    if (error.message === "VARIANT_NOT_FOUND") {
      return res.status(404).json({
        message: "Variant not found",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to stream variant playlist",
    });
  }
}

export async function streamSegment(
  req,
  res
) {
  try {
    const {
      id,
      resolution,
      segment,
    } = req.params;

    const stream =
      await getSegment(
        id,
        resolution,
        segment
      );

    res.setHeader(
      "Content-Type",
      "video/mp2t"
    );

    stream.pipe(res);
  } catch (error) {
    if (error.message === "VIDEO_NOT_FOUND") {
      return res.status(404).json({
        message: "Video not found",
      });
    }

    if (error.message === "VIDEO_NOT_READY") {
      return res.status(409).json({
        message: "Video is not ready",
      });
    }

    if (error.message === "VARIANT_NOT_FOUND") {
      return res.status(404).json({
        message: "Variant not found",
      });
    }

    if (error.message === "INVALID_SEGMENT") {
      return res.status(400).json({
        message: "Invalid segment name",
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Failed to stream segment",
    });
  }
}