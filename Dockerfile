FROM node:22-slim
WORKDIR /app
COPY . .
RUN npm install
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
