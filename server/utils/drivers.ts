import type { Hyperdrive } from '@cloudflare/workers-types'
import Redis from 'ioredis'
import pg from 'pg'
import { Resend } from 'resend'
import { runtimeConfig } from './runtimeConfig'

const getDatabaseUrl = () => {
// @ts-expect-error globalThis.__env__ is not defined
  const hyperdrive = (process.env.HYPERDRIVE || globalThis.__env__?.HYPERDRIVE || globalThis.HYPERDRIVE) as Hyperdrive | undefined
  if (runtimeConfig.preset == 'node-server') {
    return runtimeConfig.databaseUrl
  } else {
    return hyperdrive?.connectionString || runtimeConfig.databaseUrl
  }
}

const createPgPool = () => new pg.Pool({
  connectionString: getDatabaseUrl(),
  max: 90,
  idleTimeoutMillis: 30000
})

let pgPool: pg.Pool

// PG Pool
export const getPgPool = () => {
  if (runtimeConfig.preset == 'node-server') {
    if (!pgPool) {
      pgPool = createPgPool()
    }
    return pgPool
  } else {
    return createPgPool()
  }
}

// Cache Client
let redisClient: Redis | undefined

const getRedisClient = () => {
  // If Redis is explicitly disabled, return undefined
  if (runtimeConfig.redisEnabled === 'false') {
    return undefined
  }

  // If we already have a Redis client, return it
  if (redisClient) {
    return redisClient
  } else {
    // Only try to create a Redis client if we're in node-server mode, Redis is enabled, and Redis URL is provided
    if (runtimeConfig.preset == 'node-server' && runtimeConfig.redisEnabled === 'true' && runtimeConfig.redisUrl) {
      try {
        redisClient = new Redis(runtimeConfig.redisUrl)
        return redisClient
      } catch (error) {
        console.error(`Failed to connect to Redis: ${error}. Falling back to alternative cache.`)
        return undefined
      }
    }
  }
}

// Simple in-memory cache for node-server mode when Redis is not available
const inMemoryCache = new Map<string, { value: string, expiry: number | null }>()

export const cacheClient = {
  get: async (key: string) => {
    const client = getRedisClient()
    if (client) {
      try {
        const value = await client.get(key)
        return value
      } catch (error) {
        console.error(`Redis get operation failed: ${error}. Falling back to alternative cache.`)
      }
    }

    // If Redis is not available and we're in node-server mode, use in-memory cache
    if (runtimeConfig.preset == 'node-server') {
      const cached = inMemoryCache.get(key)
      if (cached) {
        // Check if the cache entry has expired
        if (cached.expiry === null || cached.expiry > Date.now()) {
          return cached.value
        } else {
          // Remove expired entry
          inMemoryCache.delete(key)
        }
      }
      return null
    } else {
      // For non-node-server presets, use hubKV
      const value = await hubKV().get(key)
      if (!value) {
        return null
      }
      return JSON.stringify(value)
    }
  },
  set: async (key: string, value: string, ttl: number | undefined) => {
    const client = getRedisClient()
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    if (client) {
      try {
        if (ttl) {
          await client.set(key, stringValue, 'EX', ttl)
        } else {
          await client.set(key, stringValue)
        }
        return
      } catch (error) {
        console.error(`Redis set operation failed: ${error}. Falling back to alternative cache.`)
      }
    }

    // If Redis is not available and we're in node-server mode, use in-memory cache
    if (runtimeConfig.preset == 'node-server') {
      inMemoryCache.set(key, {
        value: stringValue,
        expiry: ttl ? Date.now() + (ttl * 1000) : null
      })
    } else {
      // For non-node-server presets, use hubKV
      if (ttl) {
        await hubKV().set(key, stringValue, { ttl })
      } else {
        await hubKV().set(key, stringValue)
      }
    }
  },
  delete: async (key: string) => {
    const client = getRedisClient()
    if (client) {
      try {
        await client.del(key)
        return
      } catch (error) {
        console.error(`Redis delete operation failed: ${error}. Falling back to alternative cache.`)
      }
    }

    // If Redis is not available and we're in node-server mode, use in-memory cache
    if (runtimeConfig.preset == 'node-server') {
      inMemoryCache.delete(key)
    } else {
      // For non-node-server presets, use hubKV
      await hubKV().del(key)
    }
  }
}

export const resendInstance = new Resend(runtimeConfig.resendApiKey)
