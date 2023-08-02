<script lang="ts">
    import { signal } from "./lib/signal";
    import { tools } from "./lib/tools";

    interface Status {
        signalServer?: boolean;
        signalingState?: RTCSignalingState;
        iceGatheringState?: RTCIceGatheringState;
        iceConnectionState?: RTCIceConnectionState;
        connectionState?: RTCPeerConnectionState;
    }

    interface ChatMessage {
        from: string;
        content: string;
    }

    let pc: RTCPeerConnection;
    let sendChannel: RTCDataChannel;
    let receiveChannel: RTCDataChannel;
    let candidates: RTCIceCandidate[] = [];
    let selectedUser = "";
    let currentUser = "";
    let users: signal.Info[] = [];
    let myName = localStorage.getItem("webrtc-demo-myname");
    let sendContent = "";
    let status: Status = {};
    let chatMessages: ChatMessage[] = [];

    $: {
        myName = myName.trim();
        localStorage.setItem("webrtc-demo-myname", myName);
        signal.updateMyInfo({ name: myName });
    }

    if (!myName) {
        myName = tools.randomString(10);
    }

    let STUNS = [
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun4.l.google.com:19302",
        "stun:23.21.150.121",
        "stun:stun01.sipphone.com",
        "stun:stun.ekiga.net",
        "stun:stun.fwdnet.net",
        "stun:stun.ideasip.com",
        "stun:stun.iptel.org",
        "stun:stun.rixtelecom.se",
        "stun:stun.schlund.de",
        "stun:stunserver.org",
        "stun:stun.softjoys.com",
        "stun:stun.voiparound.com",
        "stun:stun.voipbuster.com",
        "stun:stun.voipstunt.com",
        "stun:stun.voxgratia.org",
        "stun:stun.xten.com",
    ];
    STUNS = [STUNS[0]];

    const iceServers: RTCIceServer[] = STUNS.map((v) => {
        return {
            urls: v,
        };
    });
    const rtcConfig: RTCConfiguration = {
        iceServers: iceServers,
    };

    async function onInviteClick() {
        if (selectedUser == myName) {
            alert("不能选择自己");
            return;
        }
        init();
        let offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        let json = pc.localDescription.toJSON();
        console.log(json.type, json.sdp);
        signal.sendMessage(selectedUser.trim(), {
            offer: json,
        });
    }

    async function onSendClick() {
        if (sendChannel) {
            sendChannel.send(sendContent);
            chatMessages.push({
                from: myName,
                content: sendContent,
            });
            chatMessages = chatMessages;
            sendContent = "";
        }
    }

    async function acceptOffer(who: string, offer: RTCSessionDescriptionInit) {
        init();
        currentUser = who;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        let answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signal.sendMessage(who, {
            answer: pc.localDescription.toJSON(),
        });
    }

    async function acceptAnswer(who: string, answer: RTCSessionDescriptionInit) {
        currentUser = who;
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }

    function init() {
        if (sendChannel) {
            sendChannel.close();
            sendChannel = null;
        }
        if (receiveChannel) {
            receiveChannel.close();
            receiveChannel = null;
        }
        if (pc) {
            pc.close();
            pc = null;
        }
        pc = new RTCPeerConnection(rtcConfig);
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                console.log("localConn.onicecandidate ", e.candidate, e.candidate.address);
                candidates.push(e.candidate);
                candidates = [...candidates];
                if (pc.remoteDescription) {
                    pc.addIceCandidate(e.candidate);
                }
                signal.sendMessage(currentUser, {
                    candidates: candidates.map((v) => v.toJSON()),
                });
            }
        };
        pc.onicecandidateerror = (p) => {
            let e = p as RTCPeerConnectionIceErrorEvent;
            console.log("localConn.onicecandidateerror", e.url, e.errorText);
        };
        pc.ondatachannel = (e) => {
            console.log("localConn.ondatachannel", e.channel);
            receiveChannel = e.channel;
            receiveChannel.onmessage = (e) => {
                console.log("receiveChannel.onMessage", e.data);
                chatMessages.push({
                    from: currentUser,
                    content: e.data,
                });
                chatMessages = chatMessages;
            };
        };
        pc.onconnectionstatechange = (e) => {
            console.log("onconnectionstatechange", e);
            status.connectionState = pc.connectionState;
            if (pc.connectionState == "disconnected") {
                currentUser = "";
            }
        };
        pc.onicegatheringstatechange = (e) => {
            status.iceGatheringState = pc.iceGatheringState;
        };
        pc.oniceconnectionstatechange = (e) => {
            status.iceConnectionState = pc.iceConnectionState;
        };
        pc.onsignalingstatechange = (e) => {
            status.signalingState = pc.signalingState;
        };

        sendChannel = pc.createDataChannel("chat");
        sendChannel.onopen = (e) => {
            console.log("sendChannel.onopen", e);
        };
        sendChannel.onclose = (e) => {
            console.log("sendChannel.onclose", e);
        };
        sendChannel.onmessage = (e) => {
            console.log("sendChannel.onmessage", e.data);
        };

        status.signalingState = pc.signalingState;
        status.iceGatheringState = pc.iceGatheringState;
        status.iceConnectionState = pc.iceConnectionState;
        status.connectionState = pc.connectionState;
    }
    init();

    signal.init({ name: myName });
    signal.addListener({
        onMessage: (message) => {
            console.log("message", message);
            if (message.event == "clients") {
                users = message.data;
            } else if (message.event == "message") {
                let content = message.data.content;
                if (content.offer) {
                    console.log("收到offer");
                    let ok = confirm(`${message.data.from} 要与你连接，是否同意`);
                    console.log(ok);
                    if (!ok) {
                        return;
                    }
                    acceptOffer(message.data.from, content.offer);
                } else if (content.answer) {
                    console.log("收到answer");
                    acceptAnswer(message.data.from, content.answer);
                } else if (content.candidates) {
                    let candidates: RTCIceCandidate[] = content.candidates.map((v: any) => new RTCIceCandidate(v));
                    candidates.forEach((v) => {
                        pc.addIceCandidate(v);
                    });
                }
            }
        },
        onStatusChanged: (state) => {
            console.log("state", state);
            status.signalServer = state == WebSocket.OPEN;
            setTimeout(() => {
                signal.sendMessage(myName, {
                    time: new Date().toLocaleString(),
                    what: "ruok",
                });
            }, 1000);
        },
    });
</script>

<main>
    <h4>状态</h4>
    <pre>
myName: {myName}
currentConnectUser: {currentUser}
signalServer: {status.signalServer}
signalingState: {status.signalingState}
iceGatheringState: {status.iceGatheringState}
iceConnectionState: {status.iceConnectionState}
connectionState: {status.connectionState}
    </pre>
    <h4>我的昵称</h4>
    <input type="text" bind:value={myName} />

    <h4>在线用户列表</h4>
    <ul class="user-list">
        {#each users as user}
            <li class="user-list-item">
                <label><input type="radio" name="user" value={user.name} bind:group={selectedUser} />{user.name}</label>
            </li>
        {/each}
        <p />
    </ul>
    <button on:click={onInviteClick} disabled={selectedUser == ""}>发起连接</button>

    <h4>聊天</h4>
    <ul class="chat-list">
        {#each chatMessages as item}
            <li class="chat-list-item">
                <code class:is-me={item.from == myName}>{item.from}</code>:{item.content}
            </li>
        {/each}
    </ul>
    <textarea disabled={currentUser == ""} bind:value={sendContent} />
    <button disabled={currentUser == ""} on:click={onSendClick}>发送</button>
</main>

<style scoped>
    .user-list {
        text-align: start;
        list-style: none;
        padding: 0;
    }
    pre {
        text-align: start;
    }
    .user-list-item {
        list-style: none;
        width: 400px;
    }
    .user-list-item:hover {
        background-color: gainsboro;
        border-radius: 5px;
    }
    .user-list-item label {
        font-size: x-large;
        display: inline-block;
        width: 100%;
    }
    input[type="radio"] {
        margin: 1em;
        width: 2em;
        height: 2em;
        vertical-align: middle;
    }
    input[type="text"] {
        font-size: x-large;
        padding: 0.3em;
    }

    textarea {
        min-width: 400px;
        min-height: 100px;
        display: block;
        margin: 10px 0;
    }

    .chat-list {
        list-style: none;
        text-align: start;
        padding: 0;
        max-height: 300px;
        overflow: auto;
    }
    .chat-list-item {
        list-style: none;
        line-height: 1.5em;
    }
    .chat-list-item code {
        margin: 1em;
        padding: 0.3em;
        background-color: gainsboro;
        border-radius: 0.3em;
    }

    code.is-me {
        background-color: darkseagreen;
    }
</style>
