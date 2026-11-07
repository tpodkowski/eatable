export const defaultApiPort = 3000;

export type ResolveApiUrlOptions = {
  /** Explicit API address from `EXPO_PUBLIC_API_URL`; always wins when set. */
  envUrl?: string | null;
  /** Metro dev server address reported by Expo, for example `192.168.1.20:8081`. */
  hostUri?: string | null;
  apiPort?: number;
};

const tunnelHostSuffixes = [".exp.direct", ".ngrok.io", ".ngrok-free.app"];

function hostnameFromHostUri(hostUri: string) {
  try {
    return new URL(`http://${hostUri}`).hostname || null;
  } catch {
    return null;
  }
}

/**
 * Resolves the API base URL. Without an explicit URL, a development build reuses the
 * host that serves the Metro bundle, so a phone on the same network reaches the API
 * running on the developer's computer instead of its own `localhost`.
 */
export function resolveApiUrl({ envUrl, hostUri, apiPort = defaultApiPort }: ResolveApiUrlOptions) {
  const explicitUrl = envUrl?.trim();
  if (explicitUrl) return explicitUrl.replace(/\/$/, "");

  const hostname = hostUri ? hostnameFromHostUri(hostUri) : null;
  const isTunnel = hostname ? tunnelHostSuffixes.some((suffix) => hostname.endsWith(suffix)) : false;
  const apiHost = hostname && !isTunnel ? hostname : "localhost";
  // `URL#hostname` already wraps IPv6 addresses in brackets.
  return `http://${apiHost}:${apiPort}`;
}
