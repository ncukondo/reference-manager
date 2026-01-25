#!/usr/bin/env node
/**
 * Demo script for React Ink interactive TUI prototype
 *
 * Run with: npx vite-node src/features/interactive-ink/demo.tsx
 */

import { render } from "ink";
import type { CslItem } from "../../core/csl-json/types.js";
import { App } from "./App.js";

// Sample references for demo
const SAMPLE_REFERENCES: CslItem[] = [
  {
    id: "smith2020ml",
    type: "article-journal",
    title: "Machine learning in medicine: A comprehensive review of applications and challenges",
    author: [
      { family: "Smith", given: "John" },
      { family: "Doe", given: "Alice" },
    ],
    issued: { "date-parts": [[2020]] },
    DOI: "10.1000/example1",
    PMID: "12345678",
  },
  {
    id: "johnson2021ai",
    type: "article-journal",
    title: "Artificial intelligence in healthcare: Current trends and future directions",
    author: [
      { family: "Johnson", given: "Emily" },
      { family: "Williams", given: "Michael" },
      { family: "Brown", given: "Sarah" },
    ],
    issued: { "date-parts": [[2021]] },
    DOI: "10.1000/example2",
  },
  {
    id: "davis2019deep",
    type: "article-journal",
    title: "Deep learning approaches for medical image analysis",
    author: [{ family: "Davis", given: "Robert" }],
    issued: { "date-parts": [[2019]] },
    DOI: "10.1000/example3",
    PMID: "87654321",
  },
  {
    id: "miller2022nlp",
    type: "article-journal",
    title: "Natural language processing for clinical documentation: A systematic review",
    author: [
      { family: "Miller", given: "Lisa" },
      { family: "Wilson", given: "James" },
    ],
    issued: { "date-parts": [[2022]] },
    DOI: "10.1000/example4",
  },
  {
    id: "taylor2020neural",
    type: "article-journal",
    title: "Neural networks for drug discovery: Methods and applications",
    author: [
      { family: "Taylor", given: "Christopher" },
      { family: "Anderson", given: "Jennifer" },
      { family: "Thomas", given: "David" },
      { family: "Jackson", given: "Maria" },
    ],
    issued: { "date-parts": [[2020]] },
    DOI: "10.1000/example5",
  },
  {
    id: "white2023transformer",
    type: "article-journal",
    title: "Transformer models in biomedical text mining",
    author: [{ family: "White", given: "Patricia" }],
    issued: { "date-parts": [[2023]] },
    DOI: "10.1000/example6",
  },
  {
    id: "harris2021covid",
    type: "article-journal",
    title: "COVID-19 prediction models using machine learning: A meta-analysis",
    author: [
      { family: "Harris", given: "Matthew" },
      { family: "Martin", given: "Susan" },
    ],
    issued: { "date-parts": [[2021]] },
    DOI: "10.1000/example7",
    PMID: "11111111",
  },
  {
    id: "garcia2022federated",
    type: "article-journal",
    title: "Federated learning for privacy-preserving healthcare analytics",
    author: [
      { family: "Garcia", given: "Carlos" },
      { family: "Rodriguez", given: "Ana" },
    ],
    issued: { "date-parts": [[2022]] },
    DOI: "10.1000/example8",
  },
  {
    id: "martinez2020xai",
    type: "article-journal",
    title: "Explainable AI in clinical decision support systems",
    author: [{ family: "Martinez", given: "Rosa" }],
    issued: { "date-parts": [[2020]] },
    DOI: "10.1000/example9",
  },
  {
    id: "robinson2023llm",
    type: "article-journal",
    title: "Large language models for medical question answering",
    author: [
      { family: "Robinson", given: "Kevin" },
      { family: "Clark", given: "Nancy" },
      { family: "Lewis", given: "Paul" },
    ],
    issued: { "date-parts": [[2023]] },
    DOI: "10.1000/example10",
  },
];

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
