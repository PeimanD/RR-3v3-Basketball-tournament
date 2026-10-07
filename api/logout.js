// SPDX-License-Identifier: MIT
// Organizer sign-out: clears the session cookie on this device.
import { clearedCookie, sameOrigin, send } from '../lib/server.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'Method not allowed.' });
  }
  if (!sameOrigin(req)) return send(res, 403, { error: 'Cross-site request blocked.' });
  res.setHeader('Set-Cookie', clearedCookie());
  return send(res, 200, { organizer: false });
}
