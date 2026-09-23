# Toolchain image: Node + project dependencies. The source is bind-mounted at runtime.
FROM node:22-bookworm-slim

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    WRANGLER_SEND_METRICS=false
WORKDIR /app

# workerd needs CA certificates for remote bindings (Workers AI).
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /app/node_modules /home/node/.config/.wrangler \
 && chown -R node:node /app /home/node/.config

USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci && sha1sum package-lock.json > node_modules/.lock-hash

COPY --chown=node:node docker/entrypoint.sh /usr/local/bin/entrypoint.sh
ENTRYPOINT ["entrypoint.sh"]
CMD ["npm", "run", "dev"]
