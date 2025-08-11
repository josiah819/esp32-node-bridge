# Railway-compatible Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* /app/
RUN npm install --only=production
COPY . /app
EXPOSE 4000
CMD ["npm", "start"]
