FROM node:22-slim

RUN npm install -g pnpm@10

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY lib/ ./lib/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY artifacts/tempmail/ ./artifacts/tempmail/
COPY tsconfig.base.json tsconfig.json ./

RUN pnpm install --no-frozen-lockfile

RUN BASE_PATH=/ PORT=3000 NODE_ENV=production pnpm --filter @workspace/tempmail run build
RUN pnpm --filter @workspace/api-server run build

EXPOSE 3000

CMD ["sh", "-c", "pnpm --filter @workspace/db run init && node artifacts/api-server/dist/index.mjs"]
