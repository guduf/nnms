FROM    node:carbon-alpine
WORKDIR /opt/nnms
COPY    ./package*.json ./
RUN     npm install
COPY    ./.* ./*.*  ./
COPY    ./scripts ./scripts
COPY    ./packages/core ./packages/core
RUN     npm run build -- core --install=save
COPY    ./packages/process ./packages/process
RUN     npm run build -- process --install=save
COPY    ./packages/common ./packages/common
RUN     npm run build -- common --install=save
COPY    ./packages/cli ./packages/cli
RUN     npm run build -- cli --install=save
WORKDIR /opt/app
ENV     PATH="/opt/nnms/node_modules/nnms-cli/bin:${PATH}"
ENTRYPOINT [ "nnms" ]
