# Daybook

A small, private-feeling workspace for tasks and notes. Built with Next.js, Prisma, and PostgreSQL; ready for Vercel and Docker.

## Run locally

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to your database connection string.
3. Start the app and local PostgreSQL database:

   ```sh
   docker compose up --build
   ```

4. Open [http://localhost:3000](http://localhost:3000) and create an account. Each account has its own private tasks and notes, or continue without an account to save tasks and notes in that browser's local storage.

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
2. In the Vercel project settings, add `DATABASE_URL` using your hosted database's connection string.
3. Before the first production deployment, set the rotated hosted `DATABASE_URL` locally and run `npm run db:push` once. This creates the tables and account schema.
4. Deploy. Prisma Client is generated automatically on install. People can then create individual accounts and sign in.

The application does not require a Docker image or `vercel.json` on Vercel. Passwords are stored as scrypt hashes; sessions use random, HTTP-only cookies. Every task and note API endpoint filters by the signed-in account. Email addresses are used for sign-in; the app does not send email.

Guest workspaces are separate from accounts and never use the database. Their data stays in the current browser's local storage, does not sync between devices, and remains there if the user exits guest mode.

On a database that already contains shared tasks or notes, the first account created claims those existing ownerless records. Later accounts start with their own separate workspace.

## Environment variables

| Variable       | Purpose                                                                               |
| -------------- | ------------------------------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma. Use the hosted provider's URL on Vercel. |

The Docker Compose file supplies an isolated, local-only database connection to the app container. It never uses that local database when running on Vercel.
