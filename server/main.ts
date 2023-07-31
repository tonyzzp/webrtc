import { IncomingMessage } from "http"
import { Server, WebSocket, WebSocketServer } from "ws"

interface ClientInfo {
    name?: string,
    candidates?: string[]
}

let wss: Server<typeof WebSocket, typeof IncomingMessage>
let clients = new WeakMap<WebSocket, ClientInfo>()

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

const processors: { [event: string]: (ws: WebSocket, json: any) => void } = {
    update: (ws, json) => {
        let info = clients.get(ws)
        if (json.name) {
            info.name = json.name
        }
        if (json.candidates) {
            info.candidates = json.candidates
        }
        broadcastInfos()
    },
    request: (ws, json) => {
        broadcastInfos()
    }
}

function processMessage(ws: WebSocket, json: any) {
    let p = processors[json.event]
    if (p) {
        p(ws, json.data)
    }
}

wss = new WebSocketServer({
    host: "0.0.0.0",
    port: 80,
    path: "/ws"
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
        console.log("ws.message", data, isBinary)
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
        processMessage(ws, json)
    })
    ws.on("close", (code, reason) => {
        console.log("ws.close", code, reason.toString())
        clients.delete(ws)
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
