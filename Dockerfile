# Stage 1: ビルド用イメージ
FROM node:20-alpine AS builder

WORKDIR /app

# 依存関係のファイルをコピー
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ソースコードとPrismaスキーマをコピー
COPY prisma ./prisma/
COPY . .

# Prisma Clientの生成とビルド
RUN yarn prisma generate
RUN yarn build

# Stage 2: 実行用イメージ
FROM node:20-alpine

WORKDIR /app

# 必要なファイルのコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json yarn.lock ./

# 本番環境用の依存関係のみインストール
RUN yarn install --frozen-lockfile --production

# 実行ポートを明示的にEXPOSE
EXPOSE 3000

# アプリケーションを起動
CMD ["yarn", "start:prod"]
