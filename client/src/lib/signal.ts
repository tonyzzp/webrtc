import { Buffer } from "buffer"

let ws: WebSocket
let listeners: signal.Listener[] = []
let myInfo: signal.Info

export namespace signal {

    export interface Info {
        name?: string
        candidates?: string[]
    }

    export interface Listener {
        onMessage(message: { event: string, data: any }): void
        onStatusChanged(state: number): void
    }

    export function init(info: Info) {
        if (ws) {
            return
        }
        myInfo = info
        let protocol = location.protocol == "https:" ? "wss" : "ws"
        let url = `${protocol}://${location.hostname}:${location.port || ""}/ws`
        console.log("signalServer", url)
        ws = new WebSocket(url)
        ws.onclose = () => {
            ws = null
            listeners.forEach(l => {
                l.onStatusChanged(ws.readyState)
            })
        }
        ws.onopen = () => {
            listeners.forEach(l => {
                l.onStatusChanged(ws.readyState)
            })
            updateMyInfo(myInfo)
            fetchClients()
        }
        ws.onmessage = (e) => {
            let content: string = Buffer.from(e.data).toString()
            let json = JSON.parse(content)
            listeners.forEach(l => {
                l.onMessage(json)
            })
        }
    }

    export function addListener(listener: Listener) {
        if (listeners.indexOf(listener) == -1) {
            listeners.push(listener)
        }
    }

    export function removeListener(listener: Listener) {
        let index = listeners.indexOf(listener)
        if (index > -1) {
            listeners.splice(index, 1)
        }
    }

    export function updateMyInfo(info: Info) {
        if (ws && ws.readyState == WebSocket.OPEN) {
            ws.send(JSON.stringify({
                event: "update-myinfo",
                data: info
            }))
        }
    }

    export function fetchClients() {
        if (ws && ws.readyState == WebSocket.OPEN) {
            ws.send(JSON.stringify({
                event: "request-clients"
            }))
        }
    }

    export function sendMessage(to: string, content: any) {
        if (ws && ws.readyState == WebSocket.OPEN) {
            ws.send(JSON.stringify({
                event: "send-message",
                data: {
                    to: to,
                    content: content
                }
            }))
        }
    }
}