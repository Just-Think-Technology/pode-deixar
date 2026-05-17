import createLogger, { LoggerWithEvent } from '@pode-deixar/logger';

export default function getLogger(featureName?: string): LoggerWithEvent {
  return createLogger('auth-service', featureName);
}
export { createLogger };