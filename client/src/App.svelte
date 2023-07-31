<script lang="ts">
    import { Buffer } from "buffer";

    let pc: RTCPeerConnection;
    let sendChannel: RTCDataChannel;
    let receiveChannel: RTCDataChannel;
    let myInviteCode = "";
    let remoteInviteCode = "";
    let answerCode = "";
    let candidates: RTCIceCandidate[] = [];

    $: {
        console.log("remoteInviteCode");
        console.log(remoteInviteCode);
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
        let offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        let json = pc.localDescription.toJSON();
        console.log(json.type, json.sdp);
        myInviteCode = JSON.stringify(json);
        myInviteCode = Buffer.from(myInviteCode).toString("base64");
    }

    async function onConnectClick() {
        let str = remoteInviteCode.trim();
        str = Buffer.from(str, "base64").toString();
        let json = JSON.parse(str);
        await pc.setRemoteDescription(new RTCSessionDescription(json));
        console.log("remote", pc.remoteDescription);
        // candidates.forEach(async (v) => {
        //     console.log("addCandicate", v.address);
        //     await pc.addIceCandidate(v);
        // });
        let answer = await pc.createAnswer();
        console.log("answer", answer);
        await pc.setLocalDescription(answer);
        answerCode = JSON.stringify(pc.localDescription.toJSON());
        answerCode = Buffer.from(answerCode).toString("base64");
    }

    async function onAcceptClick() {
        let str = answerCode.trim();
        str = Buffer.from(str, "base64").toString();
        let json = JSON.parse(str);
        await pc.setRemoteDescription(new RTCSessionDescription(json));
        console.log("pc.remote", pc.remoteDescription);

        // candidates.forEach(async (v) => {
        //     console.log("addCandicate", v.address);
        //     await pc.addIceCandidate(v);
        // });
    }

    async function onAddCandidateClick() {
        // candidates.forEach(async (v) => {
        //     await pc.addIceCandidate(v);
        // });
        let str = prompt("candidate");
        let json = JSON.parse(str);
        console.log("addCandidate", json);
        await pc.addIceCandidate(new RTCIceCandidate(json));
    }

    async function onDumpClick() {
        console.log("pc.localDescription", pc.localDescription);
        console.log("pc.currentLocalDescription", pc.currentLocalDescription);
        console.log("pc.remoteDescription", pc.remoteDescription);
        console.log("pc.currentRemoteDescription", pc.currentRemoteDescription);
        console.log("pc.signalingState", pc.signalingState);
        console.log("pc.connectionState", pc.connectionState);
        console.log("pc.iceGatheringState", pc.iceGatheringState);
        console.log("pc.iceConnectionState", pc.iceConnectionState);
        let stats = await pc.getStats();
        console.log("stats---");
        stats.forEach((v) => {
            console.log(v);
        });
    }

    async function onSendClick() {
        sendChannel.send(`ruok: ${new Date().toLocaleString()}`);
    }

    async function init() {
        pc = new RTCPeerConnection(rtcConfig);
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                console.log("localConn.onicecandidate ", e.candidate, e.candidate.address);
                candidates.push(e.candidate);
                candidates = [...candidates];
            }
        };
        pc.onicecandidateerror = (p) => {
            let e = p as RTCPeerConnectionIceErrorEvent;
            // console.log("localConn.onicecandidateerror", e.url, e.errorText);
        };
        pc.ondatachannel = (e) => {
            console.log("localConn.ondatachannel", e.channel);
            receiveChannel = e.channel;
            receiveChannel.onmessage = (e) => {
                console.log("receiveChannel.onMessage", e.data);
            };
        };
        pc.onconnectionstatechange = (e) => {
            console.log("onconnectionstatechange", e);
        };
        pc.oniceconnectionstatechange = (e) => {
            console.log("oniceconnectionstatechange", e);
        };
        pc.onsignalingstatechange = (e) => {
            console.log("onsignalingstatechange", e);
        };
        pc.onicegatheringstatechange = (e) => {
            console.log("onicegatheringstatechange", e);
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
    }
    init();
</script>

<main>
    <ul />

    <h3>我的邀请码</h3>
    <textarea class="invite-code" disabled>{myInviteCode}</textarea>

    <h3>输入邀请码</h3>
    <textarea bind:value={remoteInviteCode} />

    <h3>我的回应</h3>
    <textarea bind:value={answerCode} />

    <h3>candidates</h3>
    <ul>
        {#each candidates as candidate}
            <li>{JSON.stringify(candidate.toJSON())}</li>
        {/each}
    </ul>
    <div>
        <button on:click={onInviteClick}>生成邀请码</button>
        <button on:click={onConnectClick}>连接远程</button>
        <button on:click={onAcceptClick}>接受连接</button>
        <button on:click={onAddCandidateClick}>添加candidates</button>
        <button on:click={onDumpClick}>dump</button>
        <button on:click={onSendClick}>发消息</button>
    </div>
</main>

<style>
    textarea {
        width: 100%;
        min-width: 600px;
        min-height: 150px;
    }

    ul {
        text-align: start;
    }
</style>
