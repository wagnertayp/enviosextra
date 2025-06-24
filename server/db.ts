import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for serverless environments
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

// Disable fetch cache to avoid connection issues
neonConfig.fetchConnectionCache = false;

// Add proper connection pooling configuration
neonConfig.poolQueryViaFetch = true;
neonConfig.useSecureWebSocket = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool with better error handling and retry logic
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Reduced from 10 to avoid connection limit issues
  idleTimeoutMillis: 20000, // Reduced timeout
  connectionTimeoutMillis: 15000, // Increased timeout for initial connection
  maxUses: 7500, // Limit connection reuse
  allowExitOnIdle: false
});

// Add connection error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

// Test database connection on startup
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Database connection established successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Export connection test function
export { testConnection };

export const db = drizzle({ client: pool, schema });
