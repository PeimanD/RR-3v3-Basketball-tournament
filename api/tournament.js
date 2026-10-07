// SPDX-License-Identifier: MIT
// GET: anyone can read the published tournament. PUT: organizer only, and only on top of the latest version.
import { readTournament, writeTournament, isOrganizer, sameOrigin, jsonBody, send, sendError, MAX_BYTES } from '../lib/server.js';

function looksValid(d) {
  return Boolean(d && typeof d === 'object' && d.v === 2 &&
    d.settings && typeof d.settings === 'object' &&
    Array.isArray(d.teams) && d.teams.length >= 2 && d.teams.length <= 10 &&
    Array.isArray(d.schedule) && d.scores && typeof d.scores === 'object');
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return send(res, 200, { data: await readTournament() });
    }
    if (req.method === 'PUT') {
      if (!sameOrigin(req)) return send(res, 403, { error: 'Cross-site request blocked.' });
      if (!isOrganizer(req)) return send(res, 401, { error: 'Sign in as the organizer to publish.' });
      const body = jsonBody(req);
      const data = body.data;
      const baseRev = Number.isInteger(body.baseRev) ? body.baseRev : null;
      if (!looksValid(data) || baseRev === null) return send(res, 400, { error: 'That does not look like tournament data.' });
      if (Buffer.byteLength(JSON.stringify(data)) > MAX_BYTES) return send(res, 413, { error: 'Too much data to save.' });
      const current = await readTournament();
      const currentRev = current && Number.isInteger(current.rev) ? current.rev : null;
      if (currentRev !== null && currentRev !== baseRev) return send(res, 409, { error: 'conflict', data: current });
      const next = { ...data, rev: (currentRev ?? baseRev) + 1, updated: new Date().toISOString() };
      await writeTournament(next);
      return send(res, 200, { data: next });
    }
    res.setHeader('Allow', 'GET, PUT');
    return send(res, 405, { error: 'Method not allowed.' });
  } catch (err) {
    return sendError(res, err);
  }
}
