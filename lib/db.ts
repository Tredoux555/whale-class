import { Pool } from 'pg';

// Create a PostgreSQL connection pool for Supabase
// Using connection pooling for better compatibility
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set!');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') 
    ? { rejectUnauthorized: false } 
    : undefined,
  max: 1, // Limit to 1 connection for transaction pooler compatibility
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Export a query function that matches the expected API
export const db = {
  query: async (text: string, params?: any[]) => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    const client = await pool.connect();
    const start = Date.now();
    try {
      const res = await client.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
  },
};

export default pool;


