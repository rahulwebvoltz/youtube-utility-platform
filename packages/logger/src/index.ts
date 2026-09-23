import pino from 'pino';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface CreateLoggerOptions {
  name: string;
  level?: LogLevel;
  pretty?: boolean;
}

export function createLogger(options: CreateLoggerOptions) {
  const { name, level = 'info', pretty = process.env['NODE_ENV'] !== 'production' } = options;

  return pino({
    name,
    level,
    ...(pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          },
        }
      : {}),
  });
}

export type Logger = ReturnType<typeof createLogger>;
