# The course site and its live-session relay, in one container.
# Build from the top of the repository:  docker compose -f relay/compose.yaml up -d --build
FROM node:22-alpine
WORKDIR /srv/relay
COPY relay/package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY relay/server.mjs ./
COPY . /srv/site
ENV SITE=/srv/site PORT=8080 NODE_ENV=production
USER node
EXPOSE 8080
HEALTHCHECK --interval=1m --timeout=5s CMD wget -qO- http://localhost:8080/healthz || exit 1
CMD ["node", "server.mjs"]
