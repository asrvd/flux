# Express TypeScript API

A simple Express API built with TypeScript and PNPM.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create a `.env` file in the root directory:
```bash
PORT=3000
```

## Development

Run the development server:
```bash
pnpm dev
```

## Build

Build the application:
```bash
pnpm build
```

## Production

Start the production server:
```bash
pnpm start
```

## Available Endpoints

- `GET /`: Welcome message
- `GET /health`: Health check endpoint

## Technologies Used

- Express.js
- TypeScript
- PNPM
- tsup (for building)
- dotenv
- cors 