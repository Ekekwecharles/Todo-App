FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma
ENV DATABASE_URL=postgresql://daybook:daybook@database:5432/daybook?schema=public
RUN npm ci

FROM base AS migrator
COPY --from=dependencies /app/node_modules ./node_modules
COPY prisma ./prisma
ENV DATABASE_URL=postgresql://daybook:daybook@database:5432/daybook?schema=public
RUN npx prisma generate
ENTRYPOINT ["./node_modules/.bin/prisma", "db", "push"]

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL=postgresql://daybook:daybook@localhost:5432/daybook?schema=public
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]