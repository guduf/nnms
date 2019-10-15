FROM    node:carbon-alpine
WORKDIR /opt/nnms
COPY    ./package*.json ./
RUN     npm install
COPY    . ./
RUN     npm run build -- --install=save
WORKDIR /opt/app
ENV     PATH="/opt/app/node_modules/.bin:/opt/nnms/node_modules/nnms-cli/bin:${PATH}"
ENTRYPOINT [ "nnms" ]
