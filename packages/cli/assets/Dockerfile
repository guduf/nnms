ARG   BUILDER_IMAGE
FROM  ${BUILDER_IMAGE} as builder
COPY  ./package*.json ./
RUN   npm install
COPY  . ./
RUN   nnms pack

FROM    node:carbon-alpine
WORKDIR /opt/app
ENV     NODE_ENV production
COPY    --from=builder \
  /opt/app/package.json \
  /opt/app/LICENSE* \
  /opt/nnms/node_modules/nnms-cli/assets/nnms-prod \
  ./
COPY    --from=builder /opt/nnms/dist /opt/nnms/dist
COPY    --from=builder /opt/app/dist /opt/app/dist
RUN     npm install nnms typedi
RUN     chmod +x nnms-prod
CMD     nnms-prod