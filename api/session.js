// SPDX-License-Identifier: MIT
// Tells the page whether this browser is signed in as the organizer, and whether the server is set up.
import { isOrganizer, setupStatus, send } from '../lib/server.js';

export default function handler(req, res) {
  const setup = setupStatus();
  const body = { organizer: isOrganizer(req), database: setup.database, login: setup.login };
  if (!setup.database) body.databaseHint = setup.databaseHint;
  return send(res, 200, body);
}
