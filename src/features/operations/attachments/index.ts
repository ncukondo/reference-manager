/**
 * Attachment operations - unified exports
 */

export { addAttachment } from "./add.js";
export type { AddAttachmentOptions, AddAttachmentResult } from "./add.js";

export { listAttachments } from "./list.js";
export type { ListAttachmentsOptions, ListAttachmentsResult } from "./list.js";

export { getAttachment } from "./get.js";
export type { GetAttachmentOptions, GetAttachmentResult } from "./get.js";

export { detachAttachment } from "./detach.js";
export type { DetachAttachmentOptions, DetachAttachmentResult } from "./detach.js";

export { syncAttachments } from "./sync.js";
export type { SyncAttachmentOptions, SyncAttachmentResult, InferredFile } from "./sync.js";

export { openAttachment } from "./open.js";
export type { OpenAttachmentOptions, OpenAttachmentResult } from "./open.js";
