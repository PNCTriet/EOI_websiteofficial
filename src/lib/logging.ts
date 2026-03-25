export function logEvent(event: string, data?: Record<string, unknown>) {
  const payload = data ? { event, ...data } : { event };
  // Keep logs structured: JSON in stdout for easier debugging.
  // Next will forward server logs to Vercel/terminal.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

