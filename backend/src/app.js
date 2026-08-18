import express from "express";
import videoRoutes from "./routes/video.routes.js";
import streamRoutes from "./routes/stream.routes.js";

const app = express();

app.use(express.json());

app.use("/videos", videoRoutes);
app.use("/stream", streamRoutes);

export default app;