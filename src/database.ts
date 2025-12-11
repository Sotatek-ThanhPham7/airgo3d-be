import mongoose from "mongoose";
import logger from "./logger";

// Import models so they register with mongoose
import "./models"; // assumes models/index.ts exports & registers models

const connectDB = async (): Promise<void> => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/airgo3d";

    const options = {
      // Remove deprecated options for mongoose 8.x
    };

    await mongoose.connect(mongoUri, options);

    logger.info(`MongoDB connected successfully to ${mongoUri}`);

    mongoose.connection.on("error", (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });

    // Handle app termination
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed due to app termination");
      process.exit(0);
    });
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error}`);
    process.exit(1);
  }
};

export default connectDB;
