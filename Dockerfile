FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY server.js ./
COPY public ./public

EXPOSE 3008

ENV NODE_ENV=production
ENV PORT=3008

CMD ["node", "server.js"]
