FROM node:10.16.0-alpine
LABEL maintainer "Marp team"

RUN apk update && apk upgrade && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories && \
    apk add --no-cache \
      grep \
      chromium@edge \
      freetype@edge \
      harfbuzz@edge \
      wqy-zenhei@edge \
      ttf-liberation@edge \
      font-noto-devanagari@edge \
      font-noto-arabic@edge \
      font-noto-bengali@edge \
      font-ipa@edge \
      nss@edge

RUN addgroup -S marp && adduser -S -g marp marp \
    && mkdir -p /home/marp/app /home/marp/.cli \
    && chown -R marp:marp /home/marp

USER marp
ENV IS_DOCKER true

WORKDIR /home/marp/.cli
COPY --chown=marp:marp . /home/marp/.cli/
RUN yarn install && yarn add puppeteer-core@chrome-$(chromium-browser --version | sed -r 's/^Chromium ([0-9]+).+$/\1/') \
    && yarn build && rm -rf ./src ./node_modules && yarn install --production && yarn cache clean

WORKDIR /home/marp/app
ENTRYPOINT ["node", "/home/marp/.cli/marp-cli.js"]
CMD ["--help"]
