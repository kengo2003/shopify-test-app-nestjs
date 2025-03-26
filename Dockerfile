# Stage 1: ビルド用イメージ
FROM node:18-alpine AS builder

WORKDIR /app

# package.json と yarn.lock を先にコピーして依存関係をインストール
COPY package.json yarn.lock ./
RUN yarn install

# ソースコードをコピー
COPY . .

# Prisma Clientの生成とNestJSのビルド
RUN yarn prisma generate
RUN yarn build

# Stage 2: 実行用イメージ
FROM node:18-alpine

WORKDIR /app

# ビルド成果物とnode_modulesをコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json yarn.lock ./

# 実行ポートを明示的にEXPOSE
EXPOSE 3000

# アプリケーションを起動
CMD ["yarn", "start:prod"]
