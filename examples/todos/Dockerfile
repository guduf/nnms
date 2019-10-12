ARG NNMS_VERSION=0.10.0

FROM nnms:${NNMS_VERSION} as runner
COPY . ./
RUN npm install --production

FROM runner as builder
ENV NODE_ENV development
RUN npm install
RUN npm run compile

FROM runner
COPY --from=builder /opt/app/dist ./
CMD prod
