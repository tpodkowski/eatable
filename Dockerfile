FROM node:22-bookworm-slim

WORKDIR /app

RUN npm install --global pnpm@10.20.0

COPY package.json pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY apps/mobile/package.json apps/mobile/package.json

RUN pnpm install --filter @eatable/api... --no-frozen-lockfile

COPY . .

ENV NODE_ENV=production
RUN pnpm --filter @eatable/api build

EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @eatable/api db:migrate && node apps/api/dist/index.js"]
