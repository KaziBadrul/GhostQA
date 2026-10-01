import pg from 'pg';

export function createDatabase(connectionString: string) {
  return new pg.Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 3000,
    statement_timeout: 5000,
    idle_in_transaction_session_timeout: 5000,
  });
}
