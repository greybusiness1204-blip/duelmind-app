FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate
RUN npx tsc

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

RUN mkdir -p /app/uploads

EXPOSE 4000
ENTRYPOINT ["dumb-init","--"]
CMD sh -c "npx prisma db push && node dist/app.js"