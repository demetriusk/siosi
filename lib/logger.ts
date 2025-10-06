// Minimal runtime-aware logger. In production this minimizes noisy client logs.
const isProduction = process.env.NODE_ENV === 'production';
const isBrowser = typeof window !== 'undefined';

function safeCall(fn: (...args: any[]) => void, ...args: any[]) {
  try {
    fn(...args);
  } catch {
    // swallow
  }
}

export const logger = {
  debug: (...args: any[]) => {
    if (!isProduction) {
      // eslint-disable-next-line no-console
      safeCall(console.debug, ...args);
    }
  },
  info: (...args: any[]) => {
    if (!isProduction) {
      // eslint-disable-next-line no-console
      safeCall(console.info, ...args);
    }
  },
  warn: (...args: any[]) => {
    // Keep warnings visible in non-prod; in prod, still log on server
    if (!isProduction || !isBrowser) {
      // eslint-disable-next-line no-console
      safeCall(console.warn, ...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors on server; on client only in non-prod
    if (!isBrowser || !isProduction) {
      // eslint-disable-next-line no-console
      safeCall(console.error, ...args);
    }
  },
};

export default logger;
