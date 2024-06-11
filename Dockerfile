FROM node:alpine as build_server
WORKDIR /app
COPY . .
RUN cd client && npm i && npm run build
RUN cd server && npm i && npm run build


FROM node:alpine
EXPOSE 80
WORKDIR /app
COPY --from=build_server /app/client/dist .
COPY --from=build_server /app/server/dist .
ENTRYPOINT ["node", "webrtc.server.mjs"]
