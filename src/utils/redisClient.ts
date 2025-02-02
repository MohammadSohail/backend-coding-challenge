import { createClient } from "redis";

const redisClient = createClient({
  url: "redis://redis-master:6379",
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

(async () => {
  try {
    await redisClient.connect();
    console.log("Connected to Redis successfully.");
  } catch (err) {
    console.error("Error connecting to Redis:", err);
  }
})();

export default redisClient;
