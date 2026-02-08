# SupportMind AI - Node.js app
FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install dependencies (production only for smaller image)
RUN npm ci --omit=dev

# Copy application code
COPY . .

# App listens on PORT env or 5100
EXPOSE 5100

ENV NODE_ENV=production
CMD ["node", "index.js"]
