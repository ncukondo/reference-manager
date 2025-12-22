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

// CSL-JSON Fulltext Metadata
const CslFulltextSchema = z.object({
  pdf: z.string().optional(),
  markdown: z.string().optional(),
});

// CSL-JSON Custom Metadata
const CslCustomSchema = z
  .object({
    uuid: z.string(),
    created_at: z.string(),
    timestamp: z.string(),
    additional_urls: z.array(z.string()).optional(),
    fulltext: CslFulltextSchema.optional(),
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
