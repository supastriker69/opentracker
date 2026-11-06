# Open Tracker web app: one image for web servers (ROLE=web) and notification senders (ROLE=push).
# Node.js 24 LTS (supported until April 2028), pinned to an exact release so every build is the same
FROM node:24.22.2-alpine3.24
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.js ./
COPY lib ./lib
COPY public ./public
RUN node lib/precompress.js public   # Brotli and gzip copies, made from exactly the files in the image
USER node
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/readyz >/dev/null || exit 1
CMD ["node", "server.js"]
