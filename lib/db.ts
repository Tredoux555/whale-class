import { Pool, Client } from 'pg';

// Create a PostgreSQL connection pool for Supabase
// Using connection pooling for better compatibility
// Use lazy initialization to ensure DATABASE_URL is available at runtime
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set at pool initialization');
    }
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('supabase') 
        ? { rejectUnauthorized: false } 
        : undefined,
      // Standard pool settings that work with Supabase transaction pooler
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
    });
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

// Export a query function that matches the expected API
export const db = {
  query: async (text: string, params?: any[]) => {
    // Check environment variable at runtime
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('DATABASE_URL check in db.query:', {
        hasDATABASE_URL: false,
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('STORY')),
        NODE_ENV: process.env.NODE_ENV
      });
      throw new Error('DATABASE_URL environment variable is not set in db.query()');
    }
    
    // Get or create pool at runtime
    const activePool = getPool();
    
    const start = Date.now();
    try {
      // For transaction pooler, we need to ensure queries are executed properly
      // Using pool.query() directly works better than pool.connect() for transaction pooler
      const res = await activePool.query(text, params);
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

export default getPool;


