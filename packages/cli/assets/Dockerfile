ARG NNMS_TAG=stable

FROM guduf/nnms:${NNMS_TAG} as builder
COPY    ./package*.json ./
RUN npm install
COPY . ./
RUN nnms compile

FROM    node:carbon-alpine
WORKDIR /opt/app
ENV     NODE_ENV production
RUN     npm install
WORKDIR /opt/app
COPY    --from=builder \
  ./package*.json \
  /opt/app/package.json \
  /opt/app/LICENSE* \
  /usr/local/lib/node_modules/nnms-cli/assets/nnms-prod \
  ./
