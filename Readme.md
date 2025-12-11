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
