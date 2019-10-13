ARG NNMS_VERSION=0.15.5

FROM guduf/nnms:${NNMS_VERSION} as runner
COPY ./package*.json ./
RUN npm install
COPY . ./
ENV NODE_ENV production
RUN npm run compile
CMD ["prod"]
