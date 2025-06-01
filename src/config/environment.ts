interface Environment {
  APP_NAME: string;
  APP_VERSION: string;
  ENABLE_ANALYTICS: boolean;
  ENABLE_DEBUG_MODE: boolean;
  API_URL: string;
  API_VERSION: string;
  GA_TRACKING_ID?: string;
  ENABLE_CRASH_REPORTING: boolean;
}

function getEnvironmentVariable(key: keyof Environment): string {
  const value = import.meta.env[`VITE_${key}`];
  if (value === undefined) {
    console.warn(`Environment variable VITE_${key} is not defined`);
    return '';
  }
  return value;
}

function getBooleanEnv(key: keyof Environment): boolean {
  const value = getEnvironmentVariable(key);
  return value.toLowerCase() === 'true';
}

export const environment: Environment = {
  APP_NAME: getEnvironmentVariable('APP_NAME'),
  APP_VERSION: getEnvironmentVariable('APP_VERSION'),
  ENABLE_ANALYTICS: getBooleanEnv('ENABLE_ANALYTICS'),
  ENABLE_DEBUG_MODE: getBooleanEnv('ENABLE_DEBUG_MODE'),
  API_URL: getEnvironmentVariable('API_URL'),
  API_VERSION: getEnvironmentVariable('API_VERSION'),
  GA_TRACKING_ID: getEnvironmentVariable('GA_TRACKING_ID'),
  ENABLE_CRASH_REPORTING: getBooleanEnv('ENABLE_CRASH_REPORTING'),
};

// Development-only validation
if (import.meta.env.DEV) {
  console.log('Environment Configuration:', environment);
} 