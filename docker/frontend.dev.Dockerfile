# Development Dockerfile for Next.js frontend
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

EXPOSE 3000

ENV NODE_ENV=development
ENV NEXT_PUBLIC_API_URL=http://localhost:8080

# Run development server with hot reloading
CMD ["npm", "run", "dev"]
