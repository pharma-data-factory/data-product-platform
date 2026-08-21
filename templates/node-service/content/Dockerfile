FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN npm install --ignore-scripts && npm run build && npm prune --omit=dev

EXPOSE 8080

CMD ["node", "dist/index.js"]
