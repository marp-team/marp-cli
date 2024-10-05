#################### Build Marp CLI ####################
FROM node:20.17.0-bookworm-slim AS build
WORKDIR /home/node/marp-cli
COPY . .
RUN npm ci && npm run build

#################### Create Marp CLI image ####################
FROM node:20.17.0-bookworm-slim

# Set up user for Marp CLI
RUN groupadd -r marp && useradd -r -g marp marp && mkdir -p /home/marp/app /home/marp/.cli && chown -R marp:marp /home/marp

# Install Chromium
# (Use Chromium from "Playwright" instead of Puppeteer, for getting ARM64 build, which is not provided by Puppeteer)
RUN mkdir -p /tmp/marp-cli-chromium && \
  cd /tmp/marp-cli-chromium && \
  npm i playwright@latest && \
  PLAYWRIGHT_BROWSERS_PATH=/usr/local/bin/pw-browsers npx playwright install --with-deps chromium && \
  ln -s $(find /usr/local/bin/pw-browsers -name "chrome" -executable | head -n 1) /usr/local/bin/chrome && \
  rm -rf /tmp/marp-cli-chromium

# Install dependencies
RUN apt update && \
  apt install -y --no-install-recommends gosu && \
  apt clean && \
  rm -rf /var/lib/apt/lists/* && \
  npm cache clean --force

# Set environments
ENV MARP_USER=marp:marp PATH=$PATH:/home/marp/.cli CHROME_PATH=/usr/local/bin/chrome

# Copy Marp CLI files
USER marp
WORKDIR /home/marp/.cli
COPY --chown=marp:marp package.json package-lock.json marp-cli.js LICENSE docker-entrypoint ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files
COPY --chown=marp:marp --from=build /home/node/marp-cli/lib/ ./lib/

# Set up image
USER root
WORKDIR /home/marp/app
ENTRYPOINT ["docker-entrypoint"]
CMD ["--help"]
LABEL maintainer="Marp team"
