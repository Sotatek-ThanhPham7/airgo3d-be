# NodeJS BoilerPlate

## Tech stack

- Process manager: PM2
- Web framework: Express
- Language: Typescript
- Database: MongoDB
- Container env: Docker
- Package manager: Yarn
- Coding style and Linting: ESlint, editorconfig

## Lib

- General Logger: winston
- HTTP Logger: morgan
- Env: dotenv
- Database: mongoose
- AWS S3: @aws-sdk/client-s3, @aws-sdk/s3-request-presigner

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required Variables

- `AWS_ACCESS_KEY_ID` - AWS access key ID for S3 authentication
- `AWS_SECRET_ACCESS_KEY` - AWS secret access key for S3 authentication
- `AWS_REGION` - AWS region where your S3 bucket is located (e.g., `us-east-1`)
- `S3_BUCKET_NAME` - Name of your S3 bucket

### Optional Variables

- `S3_PRESIGNED_URL_EXPIRY_SECONDS` - Expiration time for presigned URLs in seconds (default: `300` = 5 minutes)
- `port` - Server port (default: `3000`)
- `logLevel` - Logging level (e.g., `info`, `error`, `debug`)
- `logPath` - Path to log file (optional)
- `MONGODB_URI` - MongoDB connection string (default: `mongodb://localhost:27017/airgo3d`)

## API Documentation

Complete API documentation is available in OpenAPI 3.0 format:

- **JSON Specification**: [`api-docs.json`](api-docs.json)

You can view and interact with the API documentation using tools like:

- [Swagger Editor](https://editor.swagger.io/) - Import `api-docs.json` to view interactive documentation
- [Swagger UI](https://swagger.io/tools/swagger-ui/) - Host the JSON file with Swagger UI for a web interface
- [Postman](https://www.postman.com/) - Import the OpenAPI specification to generate a Postman collection

## API Endpoints

### Health Check

**GET** `/`

Returns a simple health check message.

**Response:**

```
Hello
```

### S3 Presigned URL

**POST** `/api/s3/presigned-url`

Generate a presigned URL for uploading files directly to S3 from the client. The S3 object key is automatically generated as a UUID v4.

**Request Body:**

```json
{
  "contentType": "image/jpeg",
  "expiresIn": 300,
  "prefix": "uploads/images"
}
```

- `contentType` (optional): MIME type of the file (e.g., `image/jpeg`, `application/pdf`)
- `expiresIn` (optional): Expiration time in seconds (default: 5 minutes)
- `prefix` (optional): Optional prefix/path for the S3 key. The UUID will be appended to this prefix (e.g., `"uploads/images"` will result in `"uploads/images/{uuid}"`)

**Response:**

```json
{
  "url": "https://s3.amazonaws.com/bucket/uploads/images/550e8400-e29b-41d4-a716-446655440000?...",
  "key": "uploads/images/550e8400-e29b-41d4-a716-446655440000",
  "expiresIn": 300
}
```

**Example Usage:**

```bash
# With prefix and content type
curl -X POST http://localhost:3000/api/s3/presigned-url \
  -H "Content-Type: application/json" \
  -d '{"contentType": "image/jpeg", "prefix": "uploads/images"}'

# Minimal request (all fields optional)
curl -X POST http://localhost:3000/api/s3/presigned-url \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Create PanoramaImage

**POST** `/api/panorama`

Create a new PanoramaImage record in the database after successfully uploading an image to S3.

**Request Body:**

```json
{
  "key": "images/photo-123-550e8400-e29b-41d4-a716-446655440000",
  "name": "Beautiful Panorama",
  "fileSize": 2048576,
  "mimeType": "image/jpeg",
  "description": "A beautiful panoramic view",
  "tags": ["nature", "panorama"]
}
```

**Required Fields:**

- `key` - S3 object key/path from the upload
- `name` - Display name for the image
- `fileSize` - File size in bytes (must be >= 0)
- `mimeType` - MIME type (must be one of: `image/jpeg`, `image/png`, `image/jpg`, `image/webp`)

**Optional Fields:**

- `description` - Optional description for the image
- `tags` - Optional array of tag names (will be created if they don't exist)

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Beautiful Panorama",
  "filename": "photo-123-550e8400-e29b-41d4-a716-446655440000",
  "filePath": "images/photo-123-550e8400-e29b-41d4-a716-446655440000",
  "fileSize": 2048576,
  "mimeType": "image/jpeg",
  "isBookmarked": false,
  "description": "A beautiful panoramic view",
  "tags": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "nature"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "panorama"
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Example Usage:**

```bash
# Create PanoramaImage with description and tags
curl -X POST http://localhost:3000/api/panorama \
  -H "Content-Type: application/json" \
  -d '{
    "key": "images/photo-123-550e8400-e29b-41d4-a716-446655440000",
    "name": "My Panorama",
    "fileSize": 2048576,
    "mimeType": "image/jpeg",
    "description": "A beautiful panoramic view",
    "tags": ["nature", "panorama"]
```

**Note:** The `filename` field is automatically extracted from the S3 `key` (the last segment after the final `/`).

### Update PanoramaImage Bookmark Status

**PATCH** `/api/panorama/:id/bookmark`

Update the bookmark status of a PanoramaImage.

**URL Parameters:**

- `id` (required) - MongoDB document ID of the PanoramaImage

**Request Body:**

```json
{
  "isBookmarked": true
}
```

- `isBookmarked` (required): Boolean - `true` to bookmark, `false` to unbookmark

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Beautiful Panorama",
  "filename": "photo-123-550e8400-e29b-41d4-a716-446655440000",
  "filePath": "images/photo-123-550e8400-e29b-41d4-a716-446655440000",
  "fileSize": 2048576,
  "mimeType": "image/jpeg",
  "isBookmarked": true,
  "description": "A beautiful panoramic view",
  "tags": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "nature"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "panorama"
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:35:00.000Z"
}
```

**Example Usage:**

```bash
# Bookmark a PanoramaImage
curl -X PATCH http://localhost:3000/api/panorama/507f1f77bcf86cd799439011/bookmark \
  -H "Content-Type: application/json" \
  -d '{"isBookmarked": true}'

# Unbookmark a PanoramaImage
curl -X PATCH http://localhost:3000/api/panorama/507f1f77bcf86cd799439011/bookmark \
  -H "Content-Type: application/json" \
  -d '{"isBookmarked": false}'
```

## How to start

### Development (with hot reload)

1. Start MongoDB in Docker:

```bash
docker compose up -d mongodb
```

2. Install dependencies and run dev server:

```bash
yarn install && yarn dev
```

The server will start on `http://localhost:3000` with hot reload enabled.

### Production-like (with PM2)

1. Start MongoDB in Docker:

```bash
docker compose up -d mongodb
```

2. Build and start with PM2:

```bash
yarn install && yarn build && yarn start
```

### Docker Compose (full stack)

Run both app and MongoDB with Docker:

```bash
yarn up
```
