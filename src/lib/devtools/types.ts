/** A request this server made to the payments API. */
export type OutgoingEvent = {
  direction: "outgoing";
  label: string;
  method: string;
  path: string;
  submerchantId?: string;
  requestBody?: unknown;
  /** Missing when the request never got a response. */
  status?: number;
  responseBody?: unknown;
  durationMs: number;
  error?: string;
};

/** A webhook the payments provider delivered to this server. */
export type IncomingEvent = {
  direction: "incoming";
  label: string;
  eventType: string;
  submerchantId?: string;
  payload: unknown;
  verified: boolean;
};

export type DevtoolsEventInput = (OutgoingEvent | IncomingEvent) & { ts: number };

export type DevtoolsEvent = DevtoolsEventInput & { seq: number };

export type DevtoolsFeed = {
  events: DevtoolsEvent[];
  lastSeq: number;
  /** Events at or below this seq were cleared and should be dropped. */
  clearedSeq: number;
};
