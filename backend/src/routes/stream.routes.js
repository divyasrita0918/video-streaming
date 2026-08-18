import express from "express";

import {
  streamMasterPlaylist,
  streamVariantPlaylist,
  streamSegment,
} from "../controllers/stream.controller.js";

const router = express.Router();

router.get(
  "/:id/master.m3u8",
  streamMasterPlaylist
);

router.get(
  "/:id/:resolution/playlist.m3u8",
  streamVariantPlaylist
);

router.get(
  "/:id/:resolution/:segment",
  streamSegment
);

export default router;