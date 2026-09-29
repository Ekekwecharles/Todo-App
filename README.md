# Daybook

A small, private-feeling workspace for tasks and notes. Built with Next.js, Prisma, and PostgreSQL; ready for Vercel and Docker.

## Run locally

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Copy `.env.example` to `.env`. Change `APP_PASSWORD` before sharing the app.
3. Start the app and local PostgreSQL database:

   ```sh
   docker compose up --build
   ```

4. Open [http://localhost:3000](http://localhost:3000) and sign in with your `APP_PASSWORD`.

The first run also creates the task and note tables. PostgreSQL stores its data in the `daybook_data` Docker volume; `docker compose down` keeps it, while `docker compose down -v` removes it.

For running Next.js outside Docker, install Node.js 20.9 or newer and PostgreSQL, set `DATABASE_URL` in `.env`, and run:

```sh
npm install
npm run db:push
npm run dev
```

## Deploy to Vercel

Vercel runs the Next.js app; it does not run the PostgreSQL Docker container. Create a hosted PostgreSQL database with [Neon](https://neon.tech/) or [Supabase](https://supabase.com/), then:

1. Push this project to a GitHub repository and import that repository in Vercel.
2. In the Vercel project settings, add `DATABASE_URL` using your hosted database's connection string. Add `APP_PASSWORD` with a strong, private password.
3. Before the first production deployment, set the same hosted `DATABASE_URL` locally and run `npm run db:push` once. This creates the database tables. Keep `APP_PASSWORD` out of the database setup command.
4. Deploy. Prisma Client is generated automatically on install.

The application does not require a Docker image or `vercel.json` on Vercel. Every task and note API endpoint checks the optional password-protected session. If `APP_PASSWORD` is unset, the workspace is open; set it for any internet-accessible deployment.

## Environment variables

| Variable       | Purpose                                                                               |
| -------------- | ------------------------------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma. Use the hosted provider's URL on Vercel. |
| `APP_PASSWORD` | Optional shared password. Set this before publishing the app publicly.                |

The Docker Compose file supplies an isolated, local-only database connection to the app container. It never uses that local database when running on Vercel.
