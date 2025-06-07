# Arango Integration Service

A modular, scalable Node.js microservice for seamless integration with [ArangoDB](https://www.arangodb.com/). Built with Express, this service provides robust logging, error handling, and follows best industry practices for maintainability and code quality.

## Features

- **Express.js** REST API structure
- **ArangoDB** integration using `arangojs`
- Centralized and structured logging with **Winston**
- Comprehensive error handling (including Joi and ArangoDB errors)
- **Job queueing with [BullMQ](https://docs.bullmq.io/) and [ioredis](https://github.com/luin/ioredis)**
- **Queue monitoring UI with [Arena](https://github.com/bee-queue/arena)**
- Linting and code quality enforced by **ESLint**
- Environment variable management with **dotenv**
- Ready for containerization and production deployment

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [ArangoDB](https://www.arangodb.com/) instance (local or Docker)
- [Redis](https://redis.io/) instance (for BullMQ queues)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yaswanth046/arango-integration-service.git
   cd arango-integration-service
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Set up environment variables:**
   - Copy `.env.example` to `.env` and update values as needed.

4. **Start the service:**
   ```sh
   npm start
   ```
   Or for development with auto-reload:
   ```sh
   npm run dev
   ```

### Linting

- Check code style:
  ```sh
  npm run lint
  ```
- Auto-fix issues:
  ```sh
  npm run lint-fix
  ```

### Testing

- Run tests:
  ```sh
  npm test
  ```

## Project Structure

```
src/
  controllers/      # Route controllers
  middlewares/      # Logger, error handler, etc.
  queues/           # BullMQ queue setup
  jobs/             # BullMQ workers
  ui/               # Arena UI integration
  routes/           # Express route definitions
  utils/            # Utility functions
  server.js         # App entry point
```

## Job Queueing

### ioredis

- Used as the Redis client for BullMQ.
- Connection is configured in `src/queues/bookingQueue.js` using environment variables.
- Example:
  ```js
  const Redis = require('ioredis');
  const connection = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    maxRetriesPerRequest: null,
  });
  ```

### BullMQ

- Provides robust job queueing and background processing.
- Queues are defined in `src/queues/bookingQueue.js`.
- Workers are defined in `src/jobs/bookingWorker.js` and process jobs asynchronously.
- Example:
  ```js
  const { Queue } = require('bullmq');
  const bookingQueue = new Queue('flightBookings', { connection });
  ```

### Arena

- Arena provides a web UI to monitor and manage BullMQ queues.
- Integrated as Express middleware in `src/ui/arena.js`.
- Access the UI at `/arena` (e.g., `http://localhost:8080/arena`).
- Example:
  ```js
  const Arena = require('bull-arena');
  const { Queue } = require('bullmq');
  const arenaConfig = Arena(
    {
      BullMQ: Queue,
      queues: [
        {
          type: 'bullmq',
          name: 'flightBookings',
          hostId: 'Flight Booking Redis',
          redis: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
          },
        },
      ],
    },
    {
      basePath: '/arena',
      disableListen: true,
    }
  );
  ```

## Logging

- Uses [Winston](https://github.com/winstonjs/winston) for structured logging.
- All requests and errors are logged with relevant metadata.

## Error Handling

- Centralized error middleware handles:
  - Generic errors
  - Joi validation errors
  - ArangoDB errors

## Linting & Code Quality

- Enforced by [ESLint](https://eslint.org/) with strict, modern rules.
- See `.eslintrc.json` for configuration.

## License

MIT

---

**Author:** Yaswanth-Rakesh