# Redis Pub/Sub with Queue Demo

This projects implement redis queue with pub/sub as a platform like leetcode.

- **Redis Queue (problem submission and processing)**
- **Redis Pub/Sub (notify primary backend about submission result)**
- **SSE (notify user there submission result)**

## How to Run

**Start a redis instance locally or use bellow docker command**

```bash
docker run --name redis-server -d -p 6379:6379 redis
```

```bash
cd backend
npm i
node .
```

```bash
cd worker
npm i
node .
```

### Visit /submit with below query parameters
- userId :: number
- problemId :: number
- language :: string
- delay :: number (optional)
- status :: success | failed (optional) (default success)