import redisClient from "../utils/redisClient";
import { RedisKey } from "../constants/redisKey";

export async function blacklistToken(
  token: string,
  ttl: number
): Promise<void> {
  await redisClient.set(token, RedisKey.BLACKLISTED_TOKEN, { EX: ttl });
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const isBlacklisted = await redisClient.exists(token);
  return isBlacklisted === 1;
}

export async function removeTokenFromBlacklist(token: string): Promise<void> {
  await redisClient.del(token);
}
