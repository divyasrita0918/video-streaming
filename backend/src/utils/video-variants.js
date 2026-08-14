import { VIDEO_VARIANTS } from "../config/video-variants.js";

export function getAvailableVariants(
  sourceWidth,
  sourceHeight
) {
  return VIDEO_VARIANTS.filter(
    (variant) =>
      variant.width <= sourceWidth &&
      variant.height <= sourceHeight
  );
}