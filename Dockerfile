FROM mcr.microsoft.com/playwright:v1.50.0-noble

WORKDIR /app

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
