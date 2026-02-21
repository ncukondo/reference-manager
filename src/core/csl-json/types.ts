import { z } from "zod";

// CSL-JSON Name (Person)
const CslNameSchema = z.object({
  family: z.string().optional(),
  given: z.string().optional(),
  literal: z.string().optional(),
  "dropping-particle": z.string().optional(),
  "non-dropping-particle": z.string().optional(),
  suffix: z.string().optional(),
});

// CSL-JSON Date
const CslDateSchema = z.object({
  "date-parts": z.array(z.array(z.number())).optional(),
  raw: z.string().optional(),
  season: z.string().optional(),
  circa: z.boolean().optional(),
  literal: z.string().optional(),
});

// Attachment file metadata
export const AttachmentFileSchema = z.object({
  filename: z.string(),
  role: z.string(),
  label: z.string().optional(),
});

// Attachments container
export const AttachmentsSchema = z.object({
  directory: z.string(),
  files: z.array(AttachmentFileSchema),
});

// Check finding
const CheckFindingSchema = z.object({
  type: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

// Check result data
const CheckDataSchema = z.object({
  checked_at: z.string(),
  status: z.string(),
  findings: z.array(CheckFindingSchema),
});

// CSL-JSON Custom Metadata
// uuid, created_at, timestamp are optional in schema because:
// 1. Other software (e.g., Zotero) may set custom fields without these
// 2. Missing fields are auto-populated by ensureCustomMetadata() after parsing
const CslCustomSchema = z
  .object({
    uuid: z.string().optional(),
    created_at: z.string().optional(),
    timestamp: z.string().optional(),
    additional_urls: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    arxiv_id: z.string().optional(),
    attachments: AttachmentsSchema.optional(),
    check: CheckDataSchema.optional(),
  })
  .passthrough();

// CSL-JSON Item
export const CslItemSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    title: z.string().optional(),
    author: z.array(CslNameSchema).optional(),
    editor: z.array(CslNameSchema).optional(),
    issued: CslDateSchema.optional(),
    accessed: CslDateSchema.optional(),
    "container-title": z.string().optional(),
    "container-title-short": z.string().optional(),
    volume: z.string().optional(),
    issue: z.string().optional(),
    page: z.string().optional(),
    DOI: z.string().optional(),
    PMID: z.string().optional(),
    PMCID: z.string().optional(),
    ISBN: z.string().optional(),
    ISSN: z.string().optional(),
    URL: z.string().optional(),
    abstract: z.string().optional(),
    publisher: z.string().optional(),
    "publisher-place": z.string().optional(),
    note: z.string().optional(),
    keyword: z.array(z.string()).optional(),
    custom: CslCustomSchema.optional(),
    // Allow additional fields
  })
  .passthrough();

// CSL-JSON Library (array of items)
export const CslLibrarySchema = z.array(CslItemSchema);

export type CslCustom = z.infer<typeof CslCustomSchema>;
export type CslItem = z.infer<typeof CslItemSchema>;
export type CslLibrary = z.infer<typeof CslLibrarySchema>;
