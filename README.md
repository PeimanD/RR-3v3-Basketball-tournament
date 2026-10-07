# 3v3 Round Robin

A small web app for running a pickup 3v3 basketball tournament. It handles round-robin pool play, live standings and a playoff bracket that fills itself in as scores come in.

Teammates open one link with no account and see read-only results. The organizer signs in with a username and password to enter scores and change settings.

## Features

- **Schedule.** Every team plays every other team once. Games are packed onto your courts, and each round shows who sits out.
- **Now on court.** A banner at the top shows the current round and who is playing on each court. Tapping a court jumps to that game.
- **Live standings.** Teams are ranked by wins. Ties go to head-to-head, then point differential, then points scored, then a coin flip.
- **Playoff bracket.** The bracket is drawn automatically, with game order and resting teams listed.
  - 5 teams use a play-in format with a consolation game.
  - Other sizes (2 to 8 teams) use a standard bracket with byes for the top seeds.
  - An optional 3rd place game is available.
- **Read-only by default.** Only the organizer can make changes. Edits stay private until the organizer taps Publish. Open pages check for updates every 20 seconds.
- **Reusable settings.**
  - Tournament name.
  - 1 to 4 courts.
  - Game length and points to win.
  - 3 to 10 teams, each with a name, badge and players.
  - Playoff size and the 3rd place game.
  - Shuffled matchups.
- **Rules page.** `rules.html` explains game, tiebreaker and playoff rules for players.
- **Phone-first.** Works on small screens, in light and dark mode.

## How it works

| Part | Details |
|---|---|
| Front end | `public/index.html` is the whole app in one file. No framework and no build step. |
| API | Four small Vercel Functions in `api/`, running on Node.js. |
| Data | The tournament is one JSON document in an Upstash Redis database. The free tier is plenty. |
| Sign-in | The username and password live in Vercel environment variables, never in the code. Signing in sets a signed, HttpOnly cookie. Repeated wrong passwords are locked out for 15 minutes. |

`public/index.html` ships with a starting tournament embedded in its `tournament-data` script tag. It shows until the organizer publishes for the first time. After that, the database is the source of truth.

## Project structure

```
public/
  index.html        Tournament page (schedule, standings, bracket, organizer menu)
  rules.html        Game rules for players
api/
  tournament.js     GET: published results (anyone). PUT: save results (organizer only)
  login.js          Organizer sign-in
  logout.js         Organizer sign-out
  session.js        Reports whether this browser is signed in and the server is set up
lib/
  server.js         Database calls, session cookie signing, request checks
vercel.json         Serves public/ and sets security headers
package.json
DEPLOYING.md        Step-by-step hosting guide
LICENSE
```

## Deploy to Vercel

1. Put this repository on GitHub and import it as a new project on vercel.com.
2. In the project's **Storage** tab, add an **Upstash Redis** database on the free plan.
3. Add the environment variables `ADMIN_USERNAME`, `ADMIN_PASSWORD` and `SESSION_SECRET` (32 or more random characters).
4. Redeploy. Then open the site, tap **Menu**, sign in and publish once.

[DEPLOYING.md](DEPLOYING.md) has the full walkthrough, costs and troubleshooting.

## Running a new tournament

1. Sign in and tap **Start editing**.
2. Open **Menu** and change the teams, players and courts.
3. Tap **Clear all scores**, then **Save and publish**.

The rules page is plain HTML written for the default 5-team, 2-court format. Edit `public/rules.html` if your format changes.

## License

Released under the [MIT License](LICENSE). Each source file starts with the header `SPDX-License-Identifier: MIT`.
