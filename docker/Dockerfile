ARG     NNMS_VERSION

FROM    node:alpine
WORKDIR /opt/app
ENV     NODE_ENV production
ENV     NNMS_VERSION ${NNMS_VERSION}
RUN     npm install --global \
  "nnms@$NNMS_VERSION " \
  "nnms-cli@$NNMS_VERSION " \
  "nnms-http@$NNMS_VERSION " \
  "nnms-mongodb@$NNMS_VERSION " \
  "nnms-nats@$NNMS_VERSION "
ENTRYPOINT ["npx", "nnms" ]
