export namespace env {
    export const signalServer = process.env.NODE_ENV == "production" ? "" : "ws://localhost:80/ws"
}