// Centralized error handler. Normalizes Supabase / PostgREST errors into clean
// HTTP responses.
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';

  // PostgREST / Postgres error codes surfaced by supabase-js.
  switch (err.code) {
    case '23505': // unique_violation
      status = 409;
      message = 'That record already exists.';
      break;
    case '23514': // check_violation
      status = 400;
      message = 'A value failed a validation check (e.g. amount must be > 0).';
      break;
    case '23503': // foreign_key_violation
      status = 400;
      message = 'Referenced record does not exist.';
      break;
    case '42501': // insufficient_privilege (RLS)
    case 'PGRST301':
      status = 403;
      message = 'Not allowed.';
      break;
    case '22P02': // invalid_text_representation (bad uuid, etc.)
      status = 400;
      message = 'Invalid identifier.';
      break;
    default:
      break;
  }

  if (process.env.NODE_ENV !== 'production' && status === 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({ error: message });
}

export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}
