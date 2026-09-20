/**
 * iKhokha iK Pay API client — SERVER ONLY.
 *
 * Hosted-checkout (paylink) flow, per the iK Pay API Integration Guide
 * (https://developer.ikhokha.com) and the official examples
 * (github.com/ikhokha/ik-pay-api-examples):
 *
 * 1. Our server POSTs to /public-api/v1/api/payment with IK-APPID + IK-SIGN
 *    headers, gets back a paylinkUrl, and redirects the shopper there.
 * 2. iKhokha POSTs the outcome to our callbackUrl (webhook), signed with
 *    ik-appid / ik-sign headers.
 * 3. Success/failure/cancel redirects land back on /shop/order/*, which
 *    re-verify against iKhokha rather than trusting the redirect alone.
 *
 * Request signing: IK-SIGN = HMAC_SHA256_hex(jsEscape(path + rawBody), secret)
 * where path is the URL path WITHOUT query string, and rawBody is the exact
 * JSON string sent on the wire (empty string for GETs). Never import this
 * module from client components — it reads the app secret.
 */
import { createHmac } from 'node:crypto';

export const IKHOKHA_API_BASE = 'https://api.ikhokha.com/public-api/v1/api';

/** Path of our webhook as registered with iKhokha (no query string — the
 *  webhook signature covers the callback path only, so it must stay clean). */
export const IKHOKHA_WEBHOOK_PATH = '/api/shop/ikhokha/webhook';

type IkhokhaConfig = {
  appId: string;
  appSecret: string;
  /** Only "live" is documented by iKhokha; overridable for the day they
   *  document a test mode. */
  mode: string;
};

export function ikhokhaConfig(): IkhokhaConfig {
  const appId = process.env.IKHOKHA_APP_ID;
  const appSecret = process.env.IKHOKHA_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error(
      'iKhokha is not configured: set IKHOKHA_APP_ID and IKHOKHA_APP_SECRET.'
    );
  }
  return { appId, appSecret, mode: process.env.IKHOKHA_MODE ?? 'live' };
}

/** JS-string escaping from the official samples: escape backslashes and
 *  quotes before hashing, or our signature won't match iKhokha's. */
export function ikhokhaEscape(input: string): string {
  return input.replace(/[\\"']/g, '\\$&').replace(/\0/g, '\\0');
}

/** Sign a request. Pass the exact raw JSON string about to be sent as
 *  `rawBody` ('' for GETs) — signing a re-serialized copy instead is the
 *  classic way to get rejected with a signature mismatch. */
export function signIkhokhaRequest(
  path: string,
  rawBody: string,
  secret: string
): string {
  return createHmac('sha256', secret.trim())
    .update(ikhokhaEscape(path + rawBody), 'utf8')
    .digest('hex');
}

export type CreatePaylinkBody = {
  entityID: string;
  amount: number;
  currency: 'ZAR';
  requesterUrl: string;
  mode: string;
  description: string;
  paymentReference: string;
  externalTransactionID: string;
  urls: {
    callbackUrl: string;
    successPageUrl: string;
    failurePageUrl: string;
    cancelUrl: string;
  };
};

export type CreatePaylinkResult = {
  responseCode: string;
  message: string;
  paylinkUrl: string;
  paylinkID: string;
  externalTransactionID: string;
};

export async function createPaylink(
  body: CreatePaylinkBody,
  config: IkhokhaConfig
): Promise<CreatePaylinkResult> {
  const path = '/public-api/v1/api/payment';
  // Single serialization: this exact string is both signed and sent.
  const rawBody = JSON.stringify(body);
  const signature = signIkhokhaRequest(path, rawBody, config.appSecret);

  const res = await fetch(`${IKHOKHA_API_BASE}/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'IK-APPID': config.appId.trim(),
      'IK-SIGN': signature,
    },
    body: rawBody,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`iKhokha rejected the payment request (HTTP ${res.status}): ${text}`);
  }

  const data = (await res.json()) as CreatePaylinkResult;
  // "00" is the documented success code; anything else means no usable
  // paylink came back, even on HTTP 200.
  if (data.responseCode !== '00' || !data.paylinkUrl) {
    throw new Error(
      `iKhokha refused the payment request (code ${data.responseCode ?? 'unknown'}): ${data.message ?? 'no message'}`
    );
  }
  return data;
}

export type PaylinkStatus = {
  paylinkID: string;
  status: string;
  createdAt: string;
  amount: number;
  description?: string;
};

/** Query payment status by OUR order id (their externalTransactionID).
 *  Signs the path only — query strings are appended after signing. */
export async function getPaylinkStatusByReference(
  externalReference: string,
  config: IkhokhaConfig
): Promise<PaylinkStatus> {
  const path = '/public-api/v1/api/getStatus/external';
  const signature = signIkhokhaRequest(path, '', config.appSecret);

  const res = await fetch(
    `${IKHOKHA_API_BASE}/getStatus/external?externalReference=${encodeURIComponent(externalReference)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'IK-APPID': config.appId.trim(),
        'IK-SIGN': signature,
      },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`iKhokha status lookup failed (HTTP ${res.status}): ${text}`);
  }
  return (await res.json()) as PaylinkStatus;
}

export type WebhookPayload = {
  paylinkID: string;
  status: 'SUCCESS' | 'FAILURE' | string;
  externalTransactionID: string;
  responseCode: string;
};

/** Verify the ik-sign header on an incoming webhook. Tries the raw body
 *  first (exact bytes iKhokha sent), then the documented canonical form —
 *  parsed JSON, `text` field dropped, re-stringified — since some setups
 *  normalize whitespace in transit. Either match accepts. */
export function verifyWebhookSignature(args: {
  callbackPath: string;
  rawBody: string;
  signature: string | null;
  secret: string;
}): boolean {
  const { callbackPath, rawBody, signature, secret } = args;
  if (!signature) return false;

  const expectedRaw = signIkhokhaRequest(callbackPath, rawBody, secret);
  if (timingSafeEqual(expectedRaw, signature.trim())) return true;

  try {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    delete parsed.text;
    const canonical = JSON.stringify(parsed);
    const expectedCanonical = signIkhokhaRequest(callbackPath, canonical, secret);
    return timingSafeEqual(expectedCanonical, signature.trim());
  } catch {
    return false;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
