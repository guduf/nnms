ARG   BUILDER_IMAGE
FROM  ${BUILDER_IMAGE} as builder
COPY  ./package*.json ./
RUN   npm install
COPY  . ./
RUN   nnms pack

# FROM    node:carbon-alpine
# WORKDIR /opt/app
# ENV     NODE_ENV production
# WORKDIR /opt/app
# RUN     npm install nnms typedi
# COPY    --from=builder \
#   /opt/app/package.json \
#   /opt/app/LICENSE* \
#   /opt/app/dist/bundle.js \
#   /opt/app/dist/nnms.pack.json \
#   /opt/nnms/node_modules/nnms-cli/assets/nnms-prod \
#   ./
