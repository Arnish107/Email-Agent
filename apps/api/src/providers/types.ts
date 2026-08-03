export type EmailAttachmentMeta = {
  filename: string;
  mimeType: string;
};

export type NormalizedEmail = {
  provider: "gmail" | "microsoft" | "fixture";
  messageId: string;
  threadId?: string;
  subject: string;
  from: string;
  to: string[];
  cc: string[];
  sentAt: string;
  bodyText: string;
  links: string[];
  attachments: EmailAttachmentMeta[];
};

export type ScanWindow = {
  days: number;
  query?: string;
};

export interface EmailProvider {
  readonly name: "gmail" | "microsoft" | "fixture";
  listMessageIds(
    accessToken: string,
    window: ScanWindow,
  ): Promise<string[]>;
  fetchMessage(
    accessToken: string,
    messageId: string,
  ): Promise<NormalizedEmail>;
}
