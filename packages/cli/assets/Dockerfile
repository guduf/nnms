ARG NNMS_TAG=stable

FROM guduf/nnms:${NNMS_TAG} as runner
COPY ./package*.json ./
RUN npm install
COPY . ./
ENV NODE_ENV production
RUN npm run compile

FROM node:carbon-alpine
WORKDIR /opt/app
ENV NODE_ENV production
COPY --from=runner \
  /opt/app/package.json \
  /opt/app/LICENSE* \
  /usr/local/lib/node_modules/nnms-cli/assets/nnms-prod \
  ./
