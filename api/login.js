// SPDX-License-Identifier: MIT
// Organizer sign-in. Checks the username and password stored in Vercel environment variables,
// then sets a signed, HttpOnly session cookie. Repeated failures from one address are locked out for 15 minutes.
import { credentialsMatch, sessionCookie, redis, sameOrigin, clientIp, setupStatus, jsonBody, send, sendError } from '../lib/server.js';

const MAX_FAILS = 10;
const LOCK_SECONDS = 15 * 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed.' });
  }
  if (!sameOrigin(req)) return send(res, 403, { error: 'Cross-site request blocked.' });
  const setup = setupStatus();
  if (!setup.login) return send(res, 503, { error: 'Sign-in is not set up yet. Add ADMIN_USERNAME, ADMIN_PASSWORD and SESSION_SECRET in Vercel, then redeploy.' });
  if (!setup.database) return send(res, 503, { error: 'The database is not connected yet.' });
  try {
    const key = `rr:login-fail:${clientIp(req)}`;
    const fails = Number(await redis(['GET', key])) || 0;
    if (fails >= MAX_FAILS) return send(res, 429, { error: 'Too many failed attempts. Wait 15 minutes, then try again.' });
    const body = jsonBody(req);
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!credentialsMatch(username, password)) {
      await redis(['INCR', key]);
      await redis(['EXPIRE', key, String(LOCK_SECONDS)]);
      return send(res, 401, { error: 'Wrong username or password.' });
    }
    await redis(['DEL', key]);
    res.setHeader('Set-Cookie', sessionCookie());
    return send(res, 200, { organizer: true });
  } catch (err) {
    return sendError(res, err);
  }
}
