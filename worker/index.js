import { createClient } from 'redis';

const redis = createClient();
const publisherClient = createClient();

publisherClient.on('error', (err) => console.log('[REDIS_PUB_ERR]: ', err.message));
redis.on('error', (err) => console.log('[REDIS_ERR]: ', err.message));
await redis.connect();
await publisherClient.connect();

const randomValue = () => Math.floor(Math.random() * 10000) + 5000;

const publishMessage = async (channel, message) => {
  console.log(`Publish new message to ${channel}`);
  await publisherClient.publish(channel, message);
} 

const main = async () => {
  console.log("Worker has started", process.pid);

  while (true) {
    try {
      const data = await redis.brPop('submissions', 0);
      const parsed = JSON.parse(data.element);

      console.log('Processing Submission...');

      const delay = parsed?.delay || randomValue();
      await new Promise((resolve) => setTimeout(resolve, delay));

      if (parsed?.status == 'failed') {
        await publishMessage("notifications", data.element);
        throw new Error("Submission failed");
      }

      console.log(
        `Submission processed for User: ${parsed?.userId} :: Problem: ${parsed?.problemId} :: Language: ${parsed?.language}\n`
      );
      
      await publishMessage("notifications", data.element);
    } catch (error) {
      console.log(error.message);
      // throw error;
    }
  }
};

main();

const gracefulShutdown = async (signal) => {
  console.log("\nReceived:", signal);

  try {
    console.log('Closing Redis connections...');
    await redis.disconnect();
    console.log('Redis connections closed.');

    console.log('Cleanup completed. Exiting process...');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error.message);
    process.exit(1);
  }
}

// process.on("SIGINT", gracefulShutdown);
// process.on("SIGTERM", gracefulShutdown);