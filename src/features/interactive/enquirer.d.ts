/**
 * Type augmentation for Enquirer's AutoComplete prompt
 *
 * Enquirer's bundled types don't expose the AutoComplete class directly.
 * This module provides type definitions for our usage.
 */

import type { EventEmitter } from "node:events";

/**
 * Choice object for AutoComplete prompt
 */
export interface AutoCompleteChoice {
  /** Display name/message for the choice */
  name: string;
  /** Optional message to display (defaults to name) */
  message?: string;
  /** Value returned when selected (defaults to name) */
  value?: unknown;
  /** Optional hint displayed next to the choice */
  hint?: string;
  /** Whether this choice is enabled */
  enabled?: boolean;
  /** Whether this choice is disabled (can be boolean or string message) */
  disabled?: boolean | string;
}

/**
 * Options for AutoComplete prompt
 */
export interface AutoCompleteOptions {
  /** Name of the prompt (used as key in answers object) */
  name: string;
  /** Message to display */
  message: string;
  /** Initial input value */
  initial?: string;
  /** Array of choices */
  choices: (string | AutoCompleteChoice)[];
  /** Enable multiple selection mode */
  multiple?: boolean;
  /** Maximum number of visible choices */
  limit?: number;
  /** Suggestion filter function */
  suggest?: (
    input: string,
    choices: AutoCompleteChoice[]
  ) => AutoCompleteChoice[] | Promise<AutoCompleteChoice[]>;
  /** Custom format function for user input */
  format?: (value: string) => string | Promise<string>;
  /** Custom result transformation */
  result?: (value: string) => string | Promise<string>;
  /** Validation function */
  validate?: (value: string) => boolean | string | Promise<boolean | string>;
  /** Standard input stream */
  stdin?: NodeJS.ReadStream;
  /** Standard output stream */
  stdout?: NodeJS.WriteStream;
  /** Custom styles */
  styles?: {
    primary?: (str: string) => string;
    danger?: (str: string) => string;
    success?: (str: string) => string;
    warning?: (str: string) => string;
    muted?: (str: string) => string;
    disabled?: (str: string) => string;
    dark?: (str: string) => string;
    strong?: (str: string) => string;
    info?: (str: string) => string;
    em?: (str: string) => string;
    heading?: (str: string) => string;
    complement?: (str: string) => string;
    highlight?: (str: string) => string;
  };
  /** Header text above choices */
  header?: string;
  /** Footer text below choices */
  footer?: string;
}

/**
 * Options for Select prompt
 */
export interface SelectOptions {
  /** Name of the prompt */
  name: string;
  /** Message to display */
  message: string;
  /** Array of choices */
  choices: (string | AutoCompleteChoice)[];
  /** Initial selection index */
  initial?: number;
  /** Maximum visible choices */
  limit?: number;
  /** Standard input stream */
  stdin?: NodeJS.ReadStream;
  /** Standard output stream */
  stdout?: NodeJS.WriteStream;
}

/**
 * AutoComplete prompt class
 */
export interface AutoCompletePrompt extends EventEmitter {
  /** Run the prompt and return user input */
  run(): Promise<string | string[]>;
  /** Cancel the prompt */
  cancel(): void;
}

/**
 * Select prompt class
 */
export interface SelectPrompt extends EventEmitter {
  /** Run the prompt and return selected value */
  run(): Promise<string>;
  /** Cancel the prompt */
  cancel(): void;
}

/**
 * AutoComplete prompt constructor type
 */
export interface AutoCompleteConstructor {
  new (options: AutoCompleteOptions): AutoCompletePrompt;
}

/**
 * Select prompt constructor type
 */
export interface SelectConstructor {
  new (options: SelectOptions): SelectPrompt;
}

/**
 * Enquirer module exports
 */
declare module "enquirer" {
  export const AutoComplete: AutoCompleteConstructor;
  export const Select: SelectConstructor;
}
