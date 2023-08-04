import * as expressns from "express"
import { Server as HttpServer, IncomingMessage, ServerResponse, createServer } from "http"
import * as wsns from "ws"
import path from "path"

interface ClientInfo {
    name?: string,
    candidates?: string[]
}

let wss: wsns.WebSocketServer
let clients = new Map<wsns.WebSocket, ClientInfo>()
let express: expressns.Express
let httpServer: HttpServer<typeof IncomingMessage, typeof ServerResponse>

function findClient(name: string) {
    let it = clients.entries()
    while (true) {
        let v = it.next()
        if (v.done) {
            return
        }
        let values: [WebSocket, ClientInfo] = v.value
        let ws = values[0]
        let info = values[1]
        if (info.name == name) {
            return ws
        }
    }
}

function broadcastInfos() {
    let infos = []
    wss.clients.forEach(ws => {
        let info = clients.get(ws)
        if (info) {
            infos.push(info)
        }
    })
    let event = {
        event: "clients",
        data: infos,
    }
    let content = JSON.stringify(event)
    wss.clients.forEach(ws => {
        ws.send(content)
    })
}

const processors: { [event: string]: (ws: wsns.WebSocket, json: any) => void } = {
    "update-myinfo": (ws, json) => {
        let info = clients.get(ws)
        if (json.name) {
            info.name = json.name
        }
        if (json.candidates) {
            info.candidates = json.candidates
        }
        broadcastInfos()
    },
    "request-clients": (ws, json) => {
        broadcastInfos()
    },
    "send-message": (ws, json) => {
        let sender = clients.get(ws)
        let receiver = findClient(json.to)
        if (receiver) {
            receiver.send(JSON.stringify({
                event: "message",
                data: {
                    from: sender.name,
                    to: json.to,
                    content: json.content
                }
            }))
        } else {
            console.warn("can not find receiver", json.to)
        }
    }
}

function processMessage(ws: wsns.WebSocket, json: any) {
    let p = processors[json.event]
    if (p) {
        p(ws, json.data)
    } else {
        console.warn("没有处理器", json.event)
    }
}

function initExpress() {
    console.log("import.meta.url", import.meta.url)
    let dir = path.dirname(import.meta.url)
    if (dir.startsWith("file://")) {
        dir = dir.substring(7)
    }
    console.log(dir)
    express = expressns.default()
    express.use(expressns.static(dir, { index: "index.html" }))
}

function initHttpServer() {
    httpServer = createServer(express)
}

function initWss() {
    wss = new wsns.WebSocketServer({
        server: httpServer
    })

    wss.on("connection", (ws, req) => {
        console.log("connection",
            "local", [req.socket.localFamily, req.socket.localAddress, req.socket.localPort],
            "remote", [req.socket.remoteFamily, req.socket.remoteAddress, req.socket.remotePort]
        )
        clients.set(ws, {})
        ws.on("open", () => {
            console.log("ws.open")
        })
        ws.on("upgrade", req => {
            console.log("upgrade", req.url)
        })
        ws.on("error", e => {
            console.log("ws.error", e)
        })
        ws.on("message", (data, isBinary) => {
            let content: string
            if (data instanceof ArrayBuffer) {
                content = Buffer.from(data).toString()
            } else if (data instanceof Buffer) {
                content = data.toString()
            } else {
                content = data.map(buffer => buffer.toString()).join("")
            }
            let json: any = null
            try {
                json = JSON.parse(content)
            } catch (e) {
                console.warn(e)
                console.log(content)
                console.log(data)
                return
            }
            console.log("message", json)
            processMessage(ws, json)
        })
        ws.on("close", (code, reason) => {
            console.log("ws.close", code, reason.toString())
            clients.delete(ws)
            broadcastInfos()
        })
    })
    wss.on("listening", () => {
        console.log("listening")
    })
    wss.on("error", (e) => {
        console.log("error", e)
    })
    wss.on("close", () => {
        console.log("close")
    })
}

function startHttpServer() {
    httpServer.listen(port, "0.0.0.0", 10, () => {
        console.log("http server start listen", httpServer.address())
    })
}

// --------------------- begin

const port = parseInt(process.env.HTTP_PORT) || 80

initExpress()
initHttpServer()
initWss()
startHttpServer()
