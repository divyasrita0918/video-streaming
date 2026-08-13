import "dotenv/config";
import "./workers/video.worker.js"
import app from "./app.js";
import { prisma } from "./config/prisma.js";
import { initializeStorage } from "./services/storage.service.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await prisma.$connect();
        console.log("Database connected");

        await initializeStorage();
        console.log("Storage initialized");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();