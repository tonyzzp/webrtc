FROM node:alpine as build_server
WORKDIR /app
COPY . .
RUN npm i -g pnpm
RUN cd client && pnpm i && pnpm run build
RUN cd server && pnpm i && pnpm run build


FROM node:alpine
EXPOSE 80
WORKDIR /app
COPY --from=build_server /app/client/dist .
COPY --from=build_server /app/server/dist .
CMD [ "node", "main.mjs" ]