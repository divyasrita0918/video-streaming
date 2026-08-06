import express from "express";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Adaptive Video Streaming Backend"
    });
});

export default app;