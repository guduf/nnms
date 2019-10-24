FROM    node:carbon-alpine
WORKDIR /opt/nnms
COPY    ./package*.json ./
RUN     npm install
COPY    ./.* ./*.*  ./
COPY    ./scripts ./scripts
COPY    ./packages/core ./packages/core
RUN     npm run build -- core --install=save
COPY    ./packages/http ./packages/http
RUN     npm run build -- http --install=save
COPY    ./packages/mongodb ./packages/mongodb
RUN     npm run build -- mongodb --install=save
COPY    ./packages/nats ./packages/nats
RUN     npm run build -- nats --install=save
COPY    ./packages/process ./packages/process
RUN     npm run build -- process --install=save
COPY    ./packages/cli ./packages/cli
RUN     npm run build -- cli --install=save
WORKDIR /opt/app
ENV     PATH="/opt/nnms/node_modules/nnms-cli/bin:${PATH}"
ENTRYPOINT [ "nnms" ]
