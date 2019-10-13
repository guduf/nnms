FROM    node:carbon-alpine
WORKDIR /opt/nnms
COPY    ./package*.json ./
RUN     npm install
COPY    . ./
RUN     npm run build
RUN     rm -r node_modules
RUN     \
  NNMS_VERSION=$(node -e "console.log(require('./package.json').version)");\
  npm install --global ./dist/nnms-$NNMS_VERSION.tgz && \
  npm install --global  ./dist/nnms-cli-$NNMS_VERSION.tgz && \
  npm cache add ./dist/nnms-http-$NNMS_VERSION.tgz && \
  npm cache add ./dist/nnms-mongodb-$NNMS_VERSION.tgz && \
  npm cache add ./dist/nnms-nats-$NNMS_VERSION.tgz
WORKDIR /opt/app
ENV PATH="/opt/app/node_modules/.bin:${PATH}"
ENTRYPOINT [ "nnms" ]
CMD [ "prod" ]
