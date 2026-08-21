# Local Compose image for `yarn start`. This is not the production image.
# Production builds use packages/backend/Dockerfile after `yarn build:backend`
# and must set NODE_ENV=production.
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    g++ \
    build-essential \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHON=/usr/bin/python3
ENV NODE_OPTIONS="--no-node-snapshot"
ENV NODE_ENV=development

COPY .yarn ./.yarn
COPY .yarnrc.yml package.json yarn.lock backstage.json ./
COPY packages/app/package.json ./packages/app/
COPY packages/backend/package.json ./packages/backend/
COPY plugins/data-products/package.json ./plugins/data-products/
COPY plugins/marketplace/package.json ./plugins/marketplace/

RUN yarn install

COPY . .

EXPOSE 3000 7007

CMD ["yarn", "start", "--config", "app-config.yaml", "--config", "app-config.docker.yaml"]
