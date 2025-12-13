import { Pool, Client } from 'pg';

// Create a PostgreSQL connection pool for Supabase
// Using connection pooling for better compatibility
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set!');
}

// Create a simple Pool that works with both direct connections and Supabase transaction pooler
// The transaction pooler (port 6543) works fine with a standard Pool configuration
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase') 
    ? { rejectUnauthorized: false } 
    : undefined,
  // Standard pool settings that work with Supabase transaction pooler
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
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
    // Check environment variable at runtime (not module load time)
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('DATABASE_URL check in db.query:', {
        hasDATABASE_URL: false,
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('STORY')),
        NODE_ENV: process.env.NODE_ENV
      });
      throw new Error('DATABASE_URL environment variable is not set in db.query()');
    }
    
    if (!pool) {
      console.error('Pool is null, DATABASE_URL was:', !!process.env.DATABASE_URL);
      throw new Error('Database connection pool not initialized. DATABASE_URL was missing at module load time.');
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


