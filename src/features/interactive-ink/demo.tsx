#!/usr/bin/env node
/**
 * Demo script for React Ink interactive TUI prototype
 *
 * Run with: npx vite-node src/features/interactive-ink/demo.tsx
 */

import { render } from "ink";
import type { CslItem } from "../../core/csl-json/types.js";
import { App } from "./App.js";

// Data for generating sample references
const FIRST_NAMES = [
  "John",
  "Alice",
  "Emily",
  "Michael",
  "Sarah",
  "Robert",
  "Lisa",
  "James",
  "Christopher",
  "Jennifer",
  "David",
  "Maria",
  "Patricia",
  "Matthew",
  "Susan",
  "Carlos",
  "Ana",
  "Rosa",
  "Kevin",
  "Nancy",
  "Paul",
  "Laura",
  "Daniel",
  "Michelle",
  "Thomas",
  "Karen",
  "Richard",
  "Linda",
  "Mark",
  "Elizabeth",
];

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Davis",
  "Miller",
  "Wilson",
  "Taylor",
  "Anderson",
  "Thomas",
  "Jackson",
  "White",
  "Harris",
  "Martin",
  "Garcia",
  "Rodriguez",
  "Martinez",
  "Robinson",
  "Clark",
  "Lewis",
  "Lee",
  "Walker",
  "Hall",
  "Allen",
  "Young",
  "King",
  "Wright",
  "Scott",
  "Green",
  "Baker",
];

const TOPICS = [
  "machine learning",
  "deep learning",
  "artificial intelligence",
  "neural networks",
  "natural language processing",
  "computer vision",
  "reinforcement learning",
  "federated learning",
  "transfer learning",
  "graph neural networks",
  "transformer models",
  "attention mechanisms",
  "generative models",
  "adversarial networks",
  "convolutional networks",
  "recurrent networks",
  "language models",
  "knowledge graphs",
  "semantic analysis",
  "sentiment analysis",
];

const DOMAINS = [
  "healthcare",
  "medicine",
  "clinical practice",
  "drug discovery",
  "genomics",
  "radiology",
  "pathology",
  "oncology",
  "cardiology",
  "neurology",
  "psychiatry",
  "dermatology",
  "ophthalmology",
  "surgery",
  "emergency medicine",
  "pediatrics",
  "geriatrics",
  "infectious diseases",
  "immunology",
  "epidemiology",
];

const ARTICLE_TYPES = [
  "A comprehensive review",
  "A systematic review",
  "A meta-analysis",
  "Current trends and future directions",
  "Methods and applications",
  "Challenges and opportunities",
  "A practical guide",
  "State of the art",
  "Benchmarking study",
  "Comparative analysis",
];

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array
 */
function randomPick<T>(arr: T[]): T {
  const item = arr[randomInt(0, arr.length - 1)];
  if (item === undefined) throw new Error("Array is empty");
  return item;
}

/**
 * Generate a random author
 */
function generateAuthor(): { family: string; given: string } {
  return {
    family: randomPick(LAST_NAMES),
    given: randomPick(FIRST_NAMES),
  };
}

/**
 * Generate sample references
 */
function generateSampleReferences(count: number): CslItem[] {
  const references: CslItem[] = [];

  for (let i = 1; i <= count; i++) {
    const topic = randomPick(TOPICS);
    const domain = randomPick(DOMAINS);
    const articleType = randomPick(ARTICLE_TYPES);
    const year = randomInt(2018, 2025);
    const authorCount = randomInt(1, 4);

    // Generate unique authors
    const authors: { family: string; given: string }[] = [];
    for (let j = 0; j < authorCount; j++) {
      authors.push(generateAuthor());
    }

    // Create title with capitalized first letter
    const titleBase = `${topic} in ${domain}`;
    const title = `${titleBase.charAt(0).toUpperCase()}${titleBase.slice(1)}: ${articleType}`;

    // Generate ID from first author and year
    const firstAuthor = authors[0];
    const idBase = firstAuthor
      ? `${firstAuthor.family.toLowerCase()}${year}${topic.split(" ")[0]}`
      : `ref${year}${i}`;

    // Generate random dates for created_at and timestamp
    const createdDaysAgo = randomInt(30, 730); // Created 30-730 days ago
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - createdDaysAgo);

    const updatedDaysAgo = randomInt(0, createdDaysAgo); // Updated between now and created date
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() - updatedDaysAgo);

    const ref: CslItem = {
      id: `${idBase}${i}`,
      type: "article-journal",
      title,
      author: authors,
      issued: { "date-parts": [[year]] },
      DOI: `10.1000/example${i}`,
      custom: {
        timestamp: timestamp.toISOString(),
        created_at: createdAt.toISOString(),
      },
    };

    // Add PMID to some references
    if (Math.random() > 0.5) {
      ref.PMID = String(10000000 + i);
    }

    references.push(ref);
  }

  return references;
}

// Generate 100 sample references
const SAMPLE_REFERENCES = generateSampleReferences(100);

// Simple search function for demo
function searchReferences(query: string): CslItem[] {
  const lowerQuery = query.toLowerCase();
  return SAMPLE_REFERENCES.filter((ref) => {
    const titleMatch = ref.title?.toLowerCase().includes(lowerQuery);
    const authorMatch = ref.author?.some(
      (a) =>
        a.family?.toLowerCase().includes(lowerQuery) || a.given?.toLowerCase().includes(lowerQuery)
    );
    const idMatch = ref.id.toLowerCase().includes(lowerQuery);
    return titleMatch || authorMatch || idMatch;
  });
}

// Main
console.clear();
console.log("React Ink TUI Prototype Demo");
console.log(`Total references: ${SAMPLE_REFERENCES.length}`);
console.log("============================\n");

const { waitUntilExit } = render(
  <App
    references={SAMPLE_REFERENCES}
    searchFn={searchReferences}
    onComplete={(result) => {
      if (result) {
        console.log("\n--- Result ---");
        console.log(`Action: ${result.action}`);
        console.log(`Selected: ${result.items.length} items`);
      } else {
        console.log("\nCancelled");
      }
    }}
  />
);

await waitUntilExit();
