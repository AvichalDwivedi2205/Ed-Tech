/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_content from "../actions/content.js";
import type * as actions_deepResearch from "../actions/deepResearch.js";
import type * as actions_flashcard from "../actions/flashcard.js";
import type * as actions_miniDrona from "../actions/miniDrona.js";
import type * as actions_notes from "../actions/notes.js";
import type * as actions_quiz from "../actions/quiz.js";
import type * as actions_rag from "../actions/rag.js";
import type * as actions_roadmap from "../actions/roadmap.js";
import type * as mutations_content from "../mutations/content.js";
import type * as mutations_deepResearch from "../mutations/deepResearch.js";
import type * as mutations_deepResearchGenerations from "../mutations/deepResearchGenerations.js";
import type * as mutations_flashcards from "../mutations/flashcards.js";
import type * as mutations_notes from "../mutations/notes.js";
import type * as mutations_quizzes from "../mutations/quizzes.js";
import type * as mutations_roadmapGenerations from "../mutations/roadmapGenerations.js";
import type * as mutations_roadmaps from "../mutations/roadmaps.js";
import type * as mutations_storage from "../mutations/storage.js";
import type * as mutations_workspaces from "../mutations/workspaces.js";
import type * as queries_content from "../queries/content.js";
import type * as queries_deepResearch from "../queries/deepResearch.js";
import type * as queries_deepResearchGenerations from "../queries/deepResearchGenerations.js";
import type * as queries_flashcards from "../queries/flashcards.js";
import type * as queries_notes from "../queries/notes.js";
import type * as queries_quizzes from "../queries/quizzes.js";
import type * as queries_rag from "../queries/rag.js";
import type * as queries_roadmapGenerations from "../queries/roadmapGenerations.js";
import type * as queries_roadmaps from "../queries/roadmaps.js";
import type * as queries_workspaces from "../queries/workspaces.js";
import type * as rag from "../rag.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/content": typeof actions_content;
  "actions/deepResearch": typeof actions_deepResearch;
  "actions/flashcard": typeof actions_flashcard;
  "actions/miniDrona": typeof actions_miniDrona;
  "actions/notes": typeof actions_notes;
  "actions/quiz": typeof actions_quiz;
  "actions/rag": typeof actions_rag;
  "actions/roadmap": typeof actions_roadmap;
  "mutations/content": typeof mutations_content;
  "mutations/deepResearch": typeof mutations_deepResearch;
  "mutations/deepResearchGenerations": typeof mutations_deepResearchGenerations;
  "mutations/flashcards": typeof mutations_flashcards;
  "mutations/notes": typeof mutations_notes;
  "mutations/quizzes": typeof mutations_quizzes;
  "mutations/roadmapGenerations": typeof mutations_roadmapGenerations;
  "mutations/roadmaps": typeof mutations_roadmaps;
  "mutations/storage": typeof mutations_storage;
  "mutations/workspaces": typeof mutations_workspaces;
  "queries/content": typeof queries_content;
  "queries/deepResearch": typeof queries_deepResearch;
  "queries/deepResearchGenerations": typeof queries_deepResearchGenerations;
  "queries/flashcards": typeof queries_flashcards;
  "queries/notes": typeof queries_notes;
  "queries/quizzes": typeof queries_quizzes;
  "queries/rag": typeof queries_rag;
  "queries/roadmapGenerations": typeof queries_roadmapGenerations;
  "queries/roadmaps": typeof queries_roadmaps;
  "queries/workspaces": typeof queries_workspaces;
  rag: typeof rag;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
