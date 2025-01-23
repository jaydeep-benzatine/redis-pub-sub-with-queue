import express from 'express';
import { createClient } from 'redis';

const app = express();
const redis = createClient();
const subscriberClient = createClient();

/** @type {{id: string, res: import('express').Response}[]} */
const clients = [];

subscriberClient.on('error', (err) => console.log('[REDIS_PUB_ERR]: ', err.message));
redis.on('error', (err) => console.log('[REDIS_ERR]: ', err.message));
await redis.connect();
await subscriberClient.connect();

app.use(express.json());

/**
 * Sent Message using SEE
 * @param {string} message
 * @param {import('express').Response} res
 * @param {Boolean} end
 */
const sendMessage = (message, userId, end = false) => {
  const client = clients.find((it) => it.id === userId);

  client?.res.write(`data: ${JSON.stringify(message)}\n\n`);
  if (end)
    client?.res.end();
};

await subscriberClient.subscribe('notifications', (payload) => {
  try {
    const data = JSON.parse(payload);
    const { userId, problemId, language, status = 'success' } = data;

    const message = `Your submission for Problem ID: ${problemId} using ${language} programming language is ${status}`;
    sendMessage(message, userId, true);
  } catch (error) {
    console.log(error.message);
  }
});

app.get('/', (req, res) => {
  return res.status(200).send('OK');
});

app.get('/submit', async (req, res) => {
  try {
    const { userId, problemId, language, delay, status } = req.query;

    if (!userId || !problemId || !language) throw new Error('Missing data');

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const data = JSON.stringify({
      userId,
      problemId,
      language,
      delay,
      status
    });
    console.log(data);
    await redis.lPush('submissions', data);

    clients.push({ id: userId, res });

    sendMessage("Submission recorded successfully", userId);

    req.on('close', () => {
      clients.splice(
        clients.findIndex((client) => client.id === userId),
        1
      );
      console.log(
        `Client disconnected: ${userId}. Total clients: ${clients.length}`
      );
    });

    // return res.status(200).send('Submission success');
  } catch (error) {
    console.log(error.message);
    // return res.status(400).send(`Submission failed: ${error.message}`);
    sendMessage(`Submission failed: ${error.message}`, req.query.userId, true);
  }
});

const server = app.listen(8000, () => console.log('Backend is started...'));

const gracefulShutdown = async (signal) => {
  console.log('\nReceived:', signal);

  try {
    console.log('Closing Server...');
    server.close();
    console.log('Server closed.');

    console.log('Closing Redis connections...');
    await redis.disconnect();
    console.log('Redis connections closed.');

    console.log('Cleanup completed. Exiting process...');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error.message);
    process.exit(1);
  }
};

// process.on("SIGINT", gracefulShutdown);
// process.on("SIGTERM", gracefulShutdown);
