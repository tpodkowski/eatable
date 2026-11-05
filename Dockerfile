FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY services/product-open-food-facts/package.json services/product-open-food-facts/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY apps/mobile/package.json apps/mobile/package.json

RUN npm ci --workspace=@eatable/api --workspace=@eatable/product-open-food-facts --workspace=@eatable/shared

COPY . .

ENV NODE_ENV=production
RUN npm run build --workspace=@eatable/product-open-food-facts && npm run build --workspace=@eatable/api

EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate --workspace=@eatable/api && node apps/api/dist/index.js"]
