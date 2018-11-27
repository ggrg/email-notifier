FROM mhart/alpine-node:8.9.4
USER root

WORKDIR /opt/email-notifier
COPY src /opt/email-notifier/src
COPY config /opt/email-notifier/config
COPY package.json /opt/email-notifier/
COPY app.js /opt/email-notifier/
COPY templates /opt/email-notifier/templates

RUN apk --no-cache add git
RUN apk add --no-cache -t build-dependencies make gcc g++ python libtool autoconf automake \
    && cd $(npm root -g)/npm \
    && npm config set unsafe-perm true \
    && npm install -g node-gyp

RUN npm install --production && \
  npm uninstall -g npm

RUN apk del build-dependencies

EXPOSE 3081
CMD node app.js
