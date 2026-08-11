FROM node:20-bookworm

# Install Python
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# ML dependencies
COPY ml-service/requirements.txt ./ml-service/
RUN pip3 install --break-system-packages -r ml-service/requirements.txt

# Copy backend + ML service
COPY backend ./backend
COPY ml-service ./ml-service

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "server.js"]