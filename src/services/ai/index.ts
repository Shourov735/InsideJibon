/**
 * R8 — AI service layer entry point.
 *
 * Modules are split by responsibility per docs/remaster-phase-8-ai-tutor.md
 * §3.1–§3.6. Consumers (server actions, queue handlers, UI components)
 * import from here rather than reaching into individual files.
 */

export * from "./captions";
export * from "./chunking";
export * from "./embeddings";
export * from "./pipeline";
export * from "./rate-limit";
export * from "./budget-guard";
export * from "./safety";
export * from "./tutor";
export * from "./quiz-generator";
