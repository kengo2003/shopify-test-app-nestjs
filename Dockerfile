# Stage 1: ビルド用イメージ
FROM node:20-alpine AS builder

WORKDIR /app

# Yarnの設定をコピー
COPY .yarnrc.yml package.json yarn.lock ./
COPY .yarn ./.yarn

# Corepackを有効化してYarn 4を使用可能に
RUN corepack enable
RUN corepack prepare yarn@4.1.1 --activate

# 依存関係のインストール
RUN yarn install

# ソースコードとPrismaスキーマをコピー
COPY prisma ./prisma/
COPY . .

# Prisma Clientの生成とビルド
RUN yarn prisma generate
RUN yarn build

# Stage 2: 実行用イメージ
FROM node:20-alpine

WORKDIR /app

# Yarnの設定をコピー
COPY .yarnrc.yml package.json yarn.lock ./
COPY .yarn ./.yarn

# Corepackを有効化してYarn 4を使用可能に
RUN corepack enable
RUN corepack prepare yarn@4.1.1 --activate

# 必要なファイルのコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# 本番環境用の依存関係のみインストール（修正版）
RUN yarn workspaces focus --production

# 実行ポートを明示的にEXPOSE
EXPOSE 3000

# アプリケーションを起動
CMD ["yarn", "start:prod"]
