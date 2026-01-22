# syntax=docker/dockerfile:1

###################
# frontend-builder#
###################

FROM node:lts-bookworm-slim AS base

LABEL maintainer="Eylexander <me@eylexander.fr>"

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

###################
# deps-env-front  #
###################

FROM base AS dependencies

COPY ./package.json ./package-lock.json ./
RUN npm ci

###################
# build-env-front #
###################

FROM base AS build

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

RUN npm run build

################
# target image #
################

FROM base AS runtime

ENV NODE_ENV=production
ENV PORT=3000
# API is empty because in prod there is only one endpoint with the proxy
ENV NEXT_PUBLIC_API_URL=

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN mkdir .next
RUN chown -R nextjs:nodejs .next

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000/tcp

ENTRYPOINT ["node" , "server.js"]