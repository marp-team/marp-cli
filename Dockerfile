FROM node:16.15.0-alpine
LABEL maintainer "Marp team"

RUN apk update && apk upgrade && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories && \
    apk add --no-cache \
      grep \
      chromium@edge \
      freetype@edge \
      libstdc++@edge \
      harfbuzz@edge \
      ttf-liberation@edge \
      font-noto-cjk@edge \
      font-noto-devanagari@edge \
      font-noto-arabic@edge \
      font-noto-bengali@edge \
      nss@edge \
      wayland-dev@edge \
      su-exec

RUN addgroup -S marp && adduser -S -g marp marp \
    && mkdir -p /home/marp/app /home/marp/.cli \
    && chown -R marp:marp /home/marp

# Install node dependencies, and create v8 cache by running Marp CLI once
USER marp
ENV CHROME_PATH /usr/bin/chromium-browser

WORKDIR /home/marp/.cli
COPY --chown=marp:marp . .
RUN yarn install --production --frozen-lockfile && yarn cache clean && node marp-cli.js --version

# Setup workspace for user
USER root
ENV MARP_USER marp:marp
ENV PATH $PATH:/home/marp/.cli

WORKDIR /home/marp/app
ENTRYPOINT ["docker-entrypoint"]
CMD ["--help"]
