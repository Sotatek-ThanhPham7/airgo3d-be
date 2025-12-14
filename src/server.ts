import "reflect-metadata";
import * as dotenv from "dotenv"
const envConfig = dotenv.config()
for (const k in envConfig.parsed) {
  process.env[k] = envConfig.parsed[k]
}
import app from "./app"
import logger from "./logger"
import connectDB from "./database"
import * as http from "http"

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB()
    
    // Start HTTP server
    const httpServer = http.createServer(app)
    httpServer.on("error", (error: NodeJS.ErrnoException) => {
      if (error.syscall !== "listen") {
        throw error
      } else {
        throw error
      }
    })

    httpServer.on("listening", () => {
      logger.info(`HTTP server listening at ${process.env.port}`)
    })

    httpServer.listen(process.env.port)
  } catch (error) {
    logger.error(`Failed to start server: ${error}`)
    process.exit(1)
  }
}

startServer()
