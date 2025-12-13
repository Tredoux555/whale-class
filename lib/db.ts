import { Pool, Client } from 'pg';

// Create a PostgreSQL connection pool for Supabase
// Using connection pooling for better compatibility
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set!');
}

// Check if we're using Supabase transaction pooler (port 6543)
const isUsingTransactionPooler = process.env.DATABASE_URL?.includes('pooler.supabase.com') || 
                                  process.env.DATABASE_URL?.includes(':6543');

// For transaction pooler, we use a Pool with specific settings
// For direct connections, we also use a Pool but with different settings
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') 
    ? { rejectUnauthorized: false } 
    : undefined,
  // For transaction pooler, use these settings:
  max: isUsingTransactionPooler ? 1 : 10, // Transaction pooler works best with max 1
  idleTimeoutMillis: isUsingTransactionPooler ? 0 : 30000,
  connectionTimeoutMillis: 30000,
  // Important: For transaction pooler, we need to avoid prepared statements
  // The pooler handles connection management, so we keep connections simple
}) : null;

// Handle pool errors
if (pool) {
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });
}

// Export a query function that matches the expected API
export const db = {
  query: async (text: string, params?: any[]) => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    if (!pool) {
      throw new Error('Database connection pool not initialized. DATABASE_URL is missing.');
    }
    
    const start = Date.now();
    try {
      // For transaction pooler, we need to ensure queries are executed properly
      // Using pool.query() directly works better than pool.connect() for transaction pooler
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Provide more specific error messages
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        throw new Error(`Database connection failed: ${errorMessage}. Please check DATABASE_URL and network connectivity.`);
      } else if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        throw new Error(`Database table missing: ${errorMessage}. Please run the database migrations.`);
      } else if (errorMessage.includes('password') || errorMessage.includes('authentication')) {
        throw new Error(`Database authentication failed: ${errorMessage}. Please check DATABASE_URL credentials.`);
      }
      throw error;
    }
  },
};

export default pool;


