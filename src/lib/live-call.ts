import type { supabase } from "@/integrations/client";

type RealtimeChannel = ReturnType<typeof supabase.channel>;

/*
  Live audio for a class: one WebRTC connection per pair of people in the room, with signalling
  sent over the class's Supabase Realtime channel. Every connection has a send+receive audio line
  from the start, so turning the mic on/off only swaps the track (no renegotiation).
  Add a TURN server for people behind strict networks: VITE_TURN_URL / VITE_TURN_USER / VITE_TURN_PASS.
*/
const env = import.meta.env as Record<string, string | undefined>;
const ICE: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    ...(env["VITE_TURN_URL"] ? [{ urls: env["VITE_TURN_URL"], username: env["VITE_TURN_USER"] ?? "", credential: env["VITE_TURN_PASS"] ?? "" }] : []),
  ],
};

type Sig = { from: string; to: string; kind: "offer" | "answer" | "ice"; data: any };
type Peer = { pc: RTCPeerConnection; sender: RTCRtpSender; queue: RTCIceCandidateInit[]; audio: HTMLAudioElement };

export class LiveCall {
  private peers = new Map<string, Peer>();
  private levels = new Map<string, AnalyserNode>();
  private track: MediaStreamTrack | null = null;
  private ctx: AudioContext | null = null;
  private ids: string[] = [];
  private last = "";
  private loud = new Map<string, number>();
  private timer: number;

  constructor(private ch: RealtimeChannel, private me: string, private onSpeaking: (ids: string[]) => void) {
    this.timer = window.setInterval(() => this.measure(), 200);
    document.addEventListener("pointerdown", this.unlock);
  }

  /* Browsers only let sound play after a tap; replay any blocked audio on the next one. */
  private unlock = () => {
    void this.ctx?.resume();
    this.peers.forEach((p) => void p.audio.play().catch(() => {}));
  };

  private send(to: string, kind: Sig["kind"], data: unknown) {
    void this.ch.send({ type: "broadcast", event: "rtc", payload: { from: this.me, to, kind, data } });
  }

  private make(id: string): Peer {
    const pc = new RTCPeerConnection(ICE);
    const sender = pc.addTransceiver("audio", { direction: "sendrecv" }).sender;
    if (this.track) void sender.replaceTrack(this.track);
    const audio = new Audio();
    audio.autoplay = true;
    pc.onicecandidate = (e) => { if (e.candidate) this.send(id, "ice", e.candidate.toJSON()); };
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      audio.srcObject = stream;
      void audio.play().catch(() => {});
      this.watch(id, stream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState !== "failed") return;
      this.drop(id);
      window.setTimeout(() => this.sync(this.ids), 1000);
    };
    const peer: Peer = { pc, sender, queue: [], audio };
    this.peers.set(id, peer);
    return peer;
  }

  private drop(id: string) {
    const p = this.peers.get(id);
    if (!p) return;
    p.pc.close();
    p.audio.srcObject = null;
    this.levels.delete(id);
    this.peers.delete(id);
  }

  private async offer(id: string) {
    const p = this.peers.get(id);
    if (!p) return;
    await p.pc.setLocalDescription(await p.pc.createOffer());
    this.send(id, "offer", p.pc.localDescription);
  }

  private async flush(p: Peer) {
    for (const c of p.queue.splice(0)) await p.pc.addIceCandidate(c).catch(() => {});
  }

  /* Call with everyone currently in the room; the person with the smaller id starts each connection. */
  sync(ids: string[]) {
    this.ids = ids;
    for (const id of ids) {
      if (id === this.me || this.peers.has(id)) continue;
      this.make(id);
      if (this.me < id) void this.offer(id);
    }
    for (const id of [...this.peers.keys()]) if (!ids.includes(id)) this.drop(id);
  }

  async handle(m: Sig) {
    if (m.to !== this.me) return;
    if (m.kind === "offer" && this.peers.get(m.from)?.pc.remoteDescription) this.drop(m.from); // they reconnected
    const p = this.peers.get(m.from) ?? this.make(m.from);
    if (m.kind === "offer") {
      await p.pc.setRemoteDescription(m.data);
      await this.flush(p);
      await p.pc.setLocalDescription(await p.pc.createAnswer());
      this.send(m.from, "answer", p.pc.localDescription);
    } else if (m.kind === "answer") {
      if (p.pc.signalingState !== "have-local-offer") return;
      await p.pc.setRemoteDescription(m.data);
      await this.flush(p);
    } else if (p.pc.remoteDescription) {
      await p.pc.addIceCandidate(m.data).catch(() => {});
    } else {
      p.queue.push(m.data);
    }
  }

  setMic(track: MediaStreamTrack | null) {
    this.track = track;
    if (track) this.watch("me", new MediaStream([track]));
    else this.levels.delete("me");
    this.peers.forEach((p) => void p.sender.replaceTrack(track));
  }

  /* Who is actually talking: loudness of each incoming stream. */
  private watch(id: string, stream: MediaStream) {
    this.ctx ??= new AudioContext();
    void this.ctx.resume();
    const an = this.ctx.createAnalyser();
    an.fftSize = 512;
    this.ctx.createMediaStreamSource(stream).connect(an);
    this.levels.set(id, an);
  }

  private measure() {
    const on: string[] = [];
    this.levels.forEach((an, id) => {
      const buf = new Uint8Array(an.fftSize);
      an.getByteTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
      const now = Date.now();
      if (peak > 6) this.loud.set(id, now);
      if (now - (this.loud.get(id) ?? 0) < 450) on.push(id); // short hold so pauses between words do not flicker
    });
    const key = on.sort().join();
    if (key === this.last) return;
    this.last = key;
    this.onSpeaking(on);
  }

  close() {
    window.clearInterval(this.timer);
    document.removeEventListener("pointerdown", this.unlock);
    [...this.peers.keys()].forEach((id) => this.drop(id));
    void this.ctx?.close();
  }
}