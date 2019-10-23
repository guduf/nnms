ARG   BUILDER_IMAGE=guduf/nnms:stable
ARG   RUNNER_IMAGE=node:stable

FROM  ${BUILDER_IMAGE} as builder
COPY  ./package*.json ./
RUN   npm install
COPY  . ./
RUN   nnms pack

FROM    ${RUNNER_IMAGE}
ARG     NODE_EXTERNALS
WORKDIR /opt/app
ENV     NODE_ENV production
COPY    --from=builder \
  /opt/app/package.json \
  /opt/app/LICENSE* \
  /opt/nnms/node_modules/nnms-cli/assets/nnms-prod \
  ./
COPY    --from=builder /opt/nnms/dist /opt/nnms/dist
COPY    --from=builder /opt/app/dist /opt/app/dist
RUN     npm install $NODE_EXTERNALS
RUN     chmod +x nnms-prod
CMD     ./nnms-prod
