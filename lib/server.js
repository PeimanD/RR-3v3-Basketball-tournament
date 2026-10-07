// SPDX-License-Identifier: MIT
// Shared helpers for the API functions. Secrets live in Vercel environment variables, never in this code.
import crypto from 'node:crypto';

const DATA_KEY = 'rr:tournament';
const COOKIE = 'rr_session';
const SESSION_SECONDS = 30 * 24 * 60 * 60; // stay signed in for 30 days
export const MAX_BYTES = 256 * 1024;

function env(name) {
  const v = process.env[name];
  return typeof v === 'string' ? v : '';
}
// The Vercel Marketplace Upstash integration sets KV_REST_API_*; a database made directly at Upstash uses UPSTASH_REDIS_REST_*.
const redisUrl = () => env('KV_REST_API_URL') || env('UPSTASH_REDIS_REST_URL');
const redisToken = () => env('KV_REST_API_TOKEN') || env('UPSTASH_REDIS_REST_TOKEN');

export function setupStatus() {
  return {
    database: Boolean(redisUrl() && redisToken()),
    login: Boolean(env('ADMIN_USERNAME') && env('ADMIN_PASSWORD') && env('SESSION_SECRET').length >= 16),
  };
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// One Redis command over Upstash's REST API, e.g. ['GET', 'key'].
export async function redis(command) {
  const url = redisUrl(), token = redisToken();
  if (!url || !token) throw new HttpError(503, 'The database is not connected yet.');
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
  } catch (e) {
    throw new HttpError(502, 'Could not reach the database.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new HttpError(502, 'Database error.');
  return body.result;
}

export async function readTournament() {
  const raw = await redis(['GET', DATA_KEY]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

export async function writeTournament(data) {
  await redis(['SET', DATA_KEY, JSON.stringify(data)]);
}

// Constant-time comparison that also hides length differences.
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function credentialsMatch(username, password) {
  const u = safeEqual(username, env('ADMIN_USERNAME'));
  const p = safeEqual(password, env('ADMIN_PASSWORD'));
  return u && p;
}

// Changing the secret, username or password signs every device out.
function sign(payload) {
  const key = [env('SESSION_SECRET'), env('ADMIN_USERNAME'), env('ADMIN_PASSWORD')].join('\u0000');
  return crypto.createHmac('sha256', key).update(payload).digest('base64url');
}

export function sessionCookie() {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `organizer.${exp}`;
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export function clearedCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}

export function isOrganizer(req) {
  if (!setupStatus().login) return false;
  const raw = readCookie(req, COOKIE);
  const i = raw.lastIndexOf('.');
  if (i <= 0) return false;
  const payload = raw.slice(0, i), sig = raw.slice(i + 1);
  if (!safeEqual(sig, sign(payload))) return false;
  const exp = Number(payload.split('.')[1]);
  return Number.isFinite(exp) && exp > Date.now() / 1000;
}

// Writes must come from this site's own pages.
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return new URL(origin).host === host;
  } catch (e) {
    return false;
  }
}

export function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '');
  return fwd.split(',')[0].trim() || String(req.headers['x-real-ip'] || '') || 'unknown';
}

export function jsonBody(req) {
  let body;
  try { body = req.body; } catch (e) { return {}; } // Vercel throws on malformed JSON
  if (body && typeof body === 'object') return body;
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch (e) { return {}; }
  }
  return {};
}

export function send(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}

export function sendError(res, err) {
  const status = err && err.status ? err.status : 500;
  send(res, status, { error: status === 500 ? 'Server error.' : err.message });
}
