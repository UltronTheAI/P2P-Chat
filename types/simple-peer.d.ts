declare module "simple-peer" {
  import type { Duplex } from "stream";

  export type Instance = Duplex & {
    signal: (signal: unknown) => void;
    destroy: (error?: Error) => void;
    send: (data: string | Uint8Array) => void;
    connected: boolean;
  };

  export type Options = {
    initiator?: boolean;
    trickle?: boolean;
    stream?: MediaStream;
    config?: RTCConfiguration;
    channelName?: string;
  };

  export default class Peer {
    constructor(opts?: Options);
    on(event: "signal", listener: (data: unknown) => void): this;
    on(event: "connect", listener: () => void): this;
    on(event: "data", listener: (data: Uint8Array) => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "error", listener: (error: Error) => void): this;
    signal(signal: unknown): void;
    destroy(error?: Error): void;
    send(data: string | Uint8Array): void;
    connected: boolean;
  }
}
