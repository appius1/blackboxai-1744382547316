import winston from 'winston';
import { env } from '../config/env';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level based on environment
const level = () => {
  const isDevelopment = env.NODE_ENV === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [
  // Write all logs to console
  new winston.transports.Console(),
  
  // Write all errors to error.log
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  
  // Write all logs to combined.log
  new winston.transports.File({ filename: 'logs/combined.log' }),
];

// Create logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

// Export logger instance
export default logger;

// Export convenience methods
export const logError = (message: string, error?: Error) => {
  logger.error(`${message}${error ? `: ${error.message}` : ''}`);
  if (error?.stack) {
    logger.debug(error.stack);
  }
};

export const logWarn = (message: string) => {
  logger.warn(message);
};

export const logInfo = (message: string) => {
  logger.info(message);
};

export const logHttp = (message: string) => {
  logger.http(message);
};

export const logDebug = (message: string) => {
  logger.debug(message);
};

// Stream for Morgan HTTP logger
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
