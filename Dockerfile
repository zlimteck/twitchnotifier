FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY . .

ENV PORT=3786

EXPOSE 3786

CMD ["node", "backend/server.js"]