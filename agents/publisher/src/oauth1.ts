import crypto from "node:crypto";

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function buildOAuth1Header(
  method: string,
  url: string,
  queryParams: Record<string, string>,
  creds: { consumerKey: string; consumerSecret: string; token?: string; tokenSecret?: string }
): string {
  const oauthNonce = crypto.randomBytes(16).toString("hex");
  const oauthTimestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: oauthNonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: oauthTimestamp,
    oauth_version: "1.0",
  };

  if (creds.token) {
    oauthParams.oauth_token = creds.token;
  }

  const allParams = { ...oauthParams, ...queryParams };
  
  const encodedParams = Object.keys(allParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join("&");

  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(encodedParams)}`;

  const signingKey = `${percentEncode(creds.consumerSecret)}&${creds.tokenSecret ? percentEncode(creds.tokenSecret) : ""}`;

  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
  
  oauthParams.oauth_signature = signature;

  const headerString = "OAuth " + Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(", ");

  return headerString;
}
