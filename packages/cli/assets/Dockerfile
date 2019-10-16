ARG   BUILDER_IMAGE
FROM  ${BUILDER_IMAGE} as builder
COPY  ./package*.json ./
RUN   npm install
COPY  . ./
RUN   nnms compile

FROM    node:carbon-alpine
WORKDIR /opt/app
ENV     NODE_ENV production
WORKDIR /opt/app
COPY    --from=builder \
  ./package*.json \
  /opt/app/package.json \
  /opt/app/LICENSE* \
  /opt/nnms/node_modules/nnms-cli/assets/nnms-prod \
  ./
