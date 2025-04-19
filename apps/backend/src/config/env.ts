import { z } from 'zod';

// Environment variable schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  CORS_ORIGIN: z.string().default('*'),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('1d'),

  // Stripe
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string(),

  // TaxJar
  TAXJAR_API_KEY: z.string(),

  // CloudFlare
  CLOUDFLARE_API_TOKEN: z.string(),
  CLOUDFLARE_ZONE_ID: z.string(),

  // Let's Encrypt
  LETSENCRYPT_EMAIL: z.string().email(),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((err) => err.path.join('.'))
        .join(', ');
      throw new Error(
        `❌ Missing or invalid environment variables: ${missingVars}`
      );
    }
    throw error;
  }
};

// Export validated environment variables
export const env = parseEnv();

// Type definition for environment variables
export type Env = z.infer<typeof envSchema>;

// Export individual environment variables with proper typing
export const {
  NODE_ENV,
  PORT,
  CORS_ORIGIN,
  DATABASE_URL,
  REDIS_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  TAXJAR_API_KEY,
  CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ZONE_ID,
  LETSENCRYPT_EMAIL,
} = env;
