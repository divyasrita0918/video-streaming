import express from "express";
import videoRoutes from "./routes/video.routes.js";


const app = express();

app.use(express.json());

app.use("/videos", videoRoutes);

export default app;