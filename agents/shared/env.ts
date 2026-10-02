import "dotenv/config";

const ALIASES: Record<string, string[]> = {
  X_API_KEY: ["TWITTER_API_KEY", "X_CONSUMER_KEY", "TWITTER_CONSUMER_KEY", "API_KEY"],
  X_API_SECRET: ["TWITTER_API_SECRET", "X_CONSUMER_SECRET", "TWITTER_CONSUMER_SECRET", "API_SECRET", "API_KEY_SECRET"],
  X_ACCESS_TOKEN: ["TWITTER_ACCESS_TOKEN"],
  X_ACCESS_TOKEN_SECRET: ["TWITTER_ACCESS_TOKEN_SECRET"],
  THREADS_APP_ID: ["THREAD_APP_ID"],
  THREADS_APP_SECRET: ["THREAD_APP_SECRET"],
  THREADS_REDIRECT_URI: ["THREAD_REDIRECT_URI"],
  THREADS_ACCESS_TOKEN: ["THREAD_ACCESS_TOKEN"],
  THREADS_USER_ID: ["THREAD_USER_ID"]
};

export function getEnv(name: string, aliases: string[] = []): string | undefined {
  const allAliases = [name, ...aliases];
  if (ALIASES[name]) {
    allAliases.push(...ALIASES[name]);
  }

  const envKeys = Object.keys(process.env);
  
  for (const alias of allAliases) {
    const matchingKey = envKeys.find(k => k.toLowerCase() === alias.toLowerCase());
    if (matchingKey && process.env[matchingKey]) return process.env[matchingKey];
    
    // Support aliases where "_TOKEN_SECRET" is just written as "_SECRET" (e.g. twitter_ACCESS_SECRET)
    if (alias.endsWith("_TOKEN_SECRET")) {
      const altAlias = alias.replace("_TOKEN_SECRET", "_SECRET");
      const matchingAlt = envKeys.find(k => k.toLowerCase() === altAlias.toLowerCase());
      if (matchingAlt && process.env[matchingAlt]) return process.env[matchingAlt];
    }
  }
  
  return undefined;
}

export function hasEnv(name: string, aliases: string[] = []): boolean {
  return getEnv(name, aliases) !== undefined;
}
