import mongoose from "mongoose";
import * as dotenv from "dotenv";
import * as dayjs from "dayjs";
import PanoramaImage from "../src/models/PanoramaImage";
import { v4 as uuidv4 } from "uuid";

// Load environment variables
dotenv.config();

const mimeTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
const cameras = [
  "Canon EOS R5",
  "Nikon D850",
  "Sony A7R IV",
  "Fujifilm X-T4",
  null,
];
const locations = [
  "Mountain View",
  "San Francisco",
  "New York",
  "Tokyo",
  "Paris",
  "London",
  "Sydney",
  "Dubai",
  null,
];
const tags = [
  ["nature", "panorama", "landscape"],
  ["urban", "city", "architecture"],
  ["beach", "ocean", "sunset"],
  ["mountain", "hiking", "adventure"],
  ["night", "cityscape", "lights"],
  ["forest", "trees", "wildlife"],
  [],
];

/**
 * Generate a random date within a range using dayjs
 */
function randomDate(start: any, end: any): Date {
  const diffInMs = end.diff(start);
  const randomMs = Math.random() * diffInMs;
  return start.add(randomMs, "millisecond").toDate();
}

/**
 * Generate mock PanoramaImage data
 */
function generateMockImage(index: number): any {
  const now = dayjs();
  const startDate = now.subtract(60, "day"); // 60 days ago

  const uploadedAt = randomDate(startDate, now);
  const mimeType = mimeTypes[Math.floor(Math.random() * mimeTypes.length)];
  const camera = cameras[Math.floor(Math.random() * cameras.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  const tagSet = tags[Math.floor(Math.random() * tags.length)];

  // Make some images more likely to be bookmarked (about 30-40% bookmarked)
  const isBookmarked = Math.random() < 0.35;

  // Generate filename and filePath
  const filename = `panorama-${index}-${uuidv4()}.${mimeType.split("/")[1]}`;
  const filePath = `images/${filename}`;

  // Build metadata object conditionally
  const metadata: any = {};
  if (camera) {
    metadata.camera = camera;
  }
  if (location) {
    metadata.location = location;
  }
  if (tagSet.length > 0) {
    metadata.tags = tagSet;
  }
  if (Math.random() > 0.7) {
    metadata.description = `A beautiful panoramic view captured on ${uploadedAt.toLocaleDateString()}`;
  }

  return {
    name: `Panorama Image ${index + 1}`,
    filename,
    originalFilename: `original-panorama-${index + 1}.${
      mimeType.split("/")[1]
    }`,
    filePath,
    fileSize: Math.floor(Math.random() * 5000000) + 500000, // 500KB to 5MB
    mimeType,
    width: Math.floor(Math.random() * 2000) + 1920, // 1920 to 3920
    height: Math.floor(Math.random() * 1000) + 1080, // 1080 to 2080
    isBookmarked,
    createdAt: uploadedAt,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

/**
 * Seed database with mock data
 */
async function seedDatabase() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/airgo3d";
    await mongoose.connect(mongoUri);

    console.log("Connected to MongoDB");

    // Clear existing data (optional - comment out if you want to keep existing data)
    const deleteResult = await PanoramaImage.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing documents`);

    // Generate mock data
    const numberOfImages = 20; // Generate 20 images
    const mockImages = [];

    console.log(`Generating ${numberOfImages} mock images...`);

    for (let i = 0; i < numberOfImages; i++) {
      mockImages.push(generateMockImage(i));
    }

    // Insert mock data
    const result = await PanoramaImage.insertMany(mockImages);
    console.log(`Successfully inserted ${result.length} images`);

    // Print summary statistics
    const totalCount = await PanoramaImage.countDocuments();
    const bookmarkedCount = await PanoramaImage.countDocuments({
      isBookmarked: true,
    });
    const unbookmarkedCount = await PanoramaImage.countDocuments({
      isBookmarked: false,
    });

    console.log("\n=== Seeding Summary ===");
    console.log(`Total images: ${totalCount}`);
    console.log(
      `Bookmarked: ${bookmarkedCount} (${(
        (bookmarkedCount / totalCount) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `Un-bookmarked: ${unbookmarkedCount} (${(
        (unbookmarkedCount / totalCount) *
        100
      ).toFixed(1)}%)`
    );

    // Get date range
    const oldestImage = await PanoramaImage.findOne().sort({ createdAt: 1 });
    const newestImage = await PanoramaImage.findOne().sort({ createdAt: -1 });

    if (oldestImage && newestImage) {
      console.log(
        `\nDate range: ${oldestImage.createdAt.toISOString()} to ${newestImage.createdAt.toISOString()}`
      );
    }

    console.log("\nSeeding completed successfully!");

    // Close connection
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();
