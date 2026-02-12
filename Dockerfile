# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
RUN npm run build

# Runner stage
FROM node:20-alpine
WORKDIR /app
RUN addgroup -g 1001 -S flowb && adduser -S flowb -u 1001
COPY --from=builder /app/dist dist/
COPY --from=builder /app/node_modules node_modules/
COPY package.json ./
COPY migrations/ migrations/
USER flowb
EXPOSE 8080
CMD ["node", "dist/index.js"]
