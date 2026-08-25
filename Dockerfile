# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS development-dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM development-dependencies AS build

COPY . .
RUN npm run lint

FROM node:22-bookworm-slim AS production-dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/client ./client

RUN mkdir -p /app/uploads && chown node:node /app/uploads

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
