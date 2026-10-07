# Deploying to Vercel

About 15 minutes on a computer. Both services have free tiers that cover this app.

## 1. Put the code on GitHub

**From a computer with git:**

```
git init
git add .
git commit -m "3v3 Round Robin"
```

Then create an empty repository on GitHub and push to it.

**In the browser only:**
1. Create a new repository on github.com.
2. Choose **uploading an existing file**.
3. Drag in everything from this folder.
4. Commit.

Hidden files such as `.gitignore` sometimes don't upload by drag-and-drop. That's fine for a browser upload, because there are no secret files to keep out.

## 2. Create the Vercel project

1. Sign up at vercel.com with your GitHub account. The free Hobby plan is for personal, non-commercial projects.
2. Choose **Add New → Project** and import the repository.
3. Leave the defaults (Framework Preset: Other) and click **Deploy**.

The page loads now, but sign-in won't work until the next steps are done.

## 3. Add the database

1. Open the project's **Storage** tab and create a database.
2. Choose **Upstash** (Redis) on the free plan.
3. Connect it to the project for all environments.

Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically. A database created directly at upstash.com also works: set its `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as environment variables instead.

## 4. Set the organizer login

Open **Settings → Environment Variables** and add:

| Name | Value |
|---|---|
| `ADMIN_USERNAME` | The username you'll sign in with |
| `ADMIN_PASSWORD` | A strong password that you don't use anywhere else |
| `SESSION_SECRET` | 32 or more random characters. Use a password manager's generator, or run `openssl rand -base64 32` |

Never put these values in the code or commit them to GitHub.

## 5. Redeploy

Environment variables only apply to new deployments. Go to **Deployments**, open the latest deployment's menu, and choose **Redeploy**.

## 6. First sign-in

1. Open `https://<your-project>.vercel.app` and tap **Menu**.
2. Sign in, then tap **Start editing**.
3. Enter a score or change the tournament name, then tap **Publish**.

That first publish saves the tournament to the database. Then share the link with your team.

## Command-line alternative

```
npm i -g vercel
vercel          # creates and links the project
# then add the database and environment variables (steps 3 and 4)
vercel --prod
```

## Security notes

- **Sign-in duration:** signing in keeps that device signed in for 30 days.
- **Signing out everyone:** changing `ADMIN_USERNAME`, `ADMIN_PASSWORD` or `SESSION_SECRET` signs out every device.
- **Lockout:** after 10 wrong passwords from one address, sign-in is locked for 15 minutes.
- **Who can save:** writes need the organizer's cookie, and requests from other websites are rejected.

## Costs

- **Vercel Hobby:** free for personal, non-commercial projects.
- **Upstash:** the free tier includes 500,000 commands a month. Each page check uses one. For scale, 20 people watching for 3 hours make roughly 11,000 checks.

## Troubleshooting

- **"Server setup isn't finished" in the menu.** A database or login variable is missing, or the project hasn't been redeployed since you added it. The menu shows which database variable names the server can see (never their values). You can also open `/api/session` on your site to see the same check. Database variables with a custom prefix, such as `STORAGE_REST_API_URL`, are found automatically.
- **"Can't reach the server".** You opened the HTML file directly. Use the vercel.app address instead.
- **"A newer version was saved from another device".** Two phones published. Publish again to keep your version, or tap Discard to load the other one.
