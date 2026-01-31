#!/usr/bin/env node
/**
 * Generate a dummy CSL-JSON library for manual/integration testing.
 *
 * Usage:
 *   node test-fixtures/generate-dummy-library.mjs [output-path] [count]
 *
 * Defaults:
 *   output-path: test-fixtures/dummy-library.json
 *   count: 40
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const firstNames = [
  "John",
  "Jane",
  "Alice",
  "Bob",
  "Carol",
  "David",
  "Eve",
  "Frank",
  "Grace",
  "Hank",
  "Ivy",
  "Jack",
  "Kate",
  "Leo",
  "Mia",
  "Nick",
  "Olivia",
  "Paul",
  "Quinn",
  "Rachel",
  "Steve",
  "Tina",
  "Uma",
  "Victor",
  "Wendy",
  "Xander",
  "Yuki",
  "Zach",
  "Akiko",
  "Raj",
  "Mei",
  "Carlos",
  "Fatima",
  "Hans",
  "Ingrid",
  "Kenji",
  "Lucia",
  "Omar",
  "Priya",
  "Sven",
];
const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
];
const journals = [
  "Nature",
  "Science",
  "Cell",
  "Lancet",
  "BMJ",
  "JAMA",
  "PNAS",
  "PLoS ONE",
  "Neuron",
  "Immunity",
  "J Biol Chem",
  "Nat Med",
  "Nat Genet",
  "J Clin Invest",
  "Blood",
  "Circulation",
  "Gastroenterology",
  "Hepatology",
  "Brain",
  "J Neurosci",
];
const topics = [
  "machine learning",
  "deep learning",
  "neural networks",
  "gene expression",
  "protein folding",
  "drug discovery",
  "clinical trial",
  "meta-analysis",
  "genome-wide",
  "epigenetics",
  "microbiome",
  "immunotherapy",
  "CRISPR",
  "single-cell",
  "biomarker",
  "inflammation",
  "stem cell",
  "metabolomics",
  "cancer genomics",
  "brain imaging",
];
const adjectives = [
  "novel",
  "comprehensive",
  "systematic",
  "integrated",
  "advanced",
  "robust",
  "scalable",
  "comparative",
  "longitudinal",
  "multimodal",
];
const verbs = [
  "analysis",
  "approach",
  "framework",
  "study",
  "review",
  "investigation",
  "assessment",
  "evaluation",
  "characterization",
  "identification",
];
const types = ["article-journal", "article", "paper-conference", "book", "chapter", "report"];
const tagPool = ["review", "important", "todo", "methodology", "primary-source", "replication"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function maybeSet(obj, key, probability, valueFn) {
  if (Math.random() > probability) {
    obj[key] = valueFn();
  }
}

function addOptionalFields(item, id, year, title) {
  maybeSet(
    item,
    "DOI",
    0.3,
    () => `10.${1000 + Math.floor(Math.random() * 9000)}/test.${year}.${item.id.length % 100}`
  );
  maybeSet(item, "URL", 0.5, () => `https://example.com/articles/${id}`);
  maybeSet(item, "PMID", 0.6, () => String(10000000 + Math.floor(Math.random() * 90000000)));
  maybeSet(item, "PMCID", 0.7, () => `PMC${1000000 + Math.floor(Math.random() * 9000000)}`);
  maybeSet(
    item,
    "abstract",
    0.4,
    () =>
      `This study presents ${title.toLowerCase()}. We analyzed data from ${50 + Math.floor(Math.random() * 950)} participants.`
  );
  maybeSet(item, "keyword", 0.5, () => pickN(topics, 2 + Math.floor(Math.random() * 3)));
  if (Math.random() > 0.6) {
    item.custom.tags = pickN(tagPool, 1 + Math.floor(Math.random() * 3));
  }
}

function generateItems(count) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const authorCount = 1 + Math.floor(Math.random() * 4);
    const authors = [];
    for (let a = 0; a < authorCount; a++) {
      authors.push({ family: pick(lastNames), given: pick(firstNames) });
    }
    const year = 2018 + Math.floor(Math.random() * 8);
    const title = `A ${pick(adjectives)} ${pick(verbs)} of ${pick(topics)} in ${pick(topics)}`;
    const id = `${authors[0].family}-${year}${i > 0 ? String.fromCharCode(97 + (i % 26)) : ""}`;

    const item = {
      id,
      type: pick(types),
      title,
      author: authors,
      issued: { "date-parts": [[year]] },
      "container-title": pick(journals),
      volume: String(10 + Math.floor(Math.random() * 90)),
      issue: String(1 + Math.floor(Math.random() * 12)),
      page: `${100 + Math.floor(Math.random() * 900)}-${200 + Math.floor(Math.random() * 900)}`,
      custom: {
        uuid: randomUUID(),
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        timestamp: new Date().toISOString(),
      },
    };

    addOptionalFields(item, id, year, title);
    items.push(item);
  }
  return items;
}

const count = Number.parseInt(process.argv[3] || "40", 10);
const outPath = process.argv[2] || resolve(__dirname, "dummy-library.json");
const items = generateItems(count);
writeFileSync(outPath, JSON.stringify(items, null, 2));
console.log(`Generated ${items.length} dummy items -> ${outPath}`);
