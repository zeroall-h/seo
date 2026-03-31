FROM node:20-slim

WORKDIR /app

# @sparticuz/chromium 실행에 필요한 최소 라이브러리
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libasound2 libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY app ./app
COPY components ./components
COPY lib ./lib
COPY src ./src
COPY public ./public
COPY next.config.js tsconfig.json postcss.config.js ./

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
