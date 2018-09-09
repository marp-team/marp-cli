FROM node:8.11.4-alpine

RUN apk update && apk upgrade && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
    apk add --no-cache \
      grep \
      chromium@edge \
      freetype@edge \
      harfbuzz@edge \
      nss@edge

RUN addgroup -S marp-cli && adduser -S -g marp-cli marp-cli \
    && mkdir -p /marp \
    && mkdir -p /home/marp-cli/.app \
    && chown -R marp-cli:marp-cli /home/marp-cli \
    && chown -R marp-cli:marp-cli /marp

USER marp-cli
ENV IS_DOCKER true

WORKDIR /home/marp-cli/.app
COPY --chown=marp-cli:marp-cli . /home/marp-cli/.app
RUN yarn install && yarn build \
    && rm -rf ./src ./node_modules && yarn install --production && yarn cache clean

WORKDIR /marp
ENTRYPOINT ["node", "/home/marp-cli/.app/marp-cli.js"]
CMD ["--help"]
