import { Pool } from 'pg';

// Create a PostgreSQL connection pool for Supabase
// Using connection pooling for better compatibility
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1, // Limit to 1 connection for transaction pooler compatibility
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000,
});

// Export a query function that matches the expected API
export const db = {
  query: async (text: string, params?: any[]) => {
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


