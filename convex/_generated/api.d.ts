/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as mutations_content from "../mutations/content.js";
import type * as mutations_flashcards from "../mutations/flashcards.js";
import type * as mutations_quizzes from "../mutations/quizzes.js";
import type * as mutations_roadmaps from "../mutations/roadmaps.js";
import type * as mutations_storage from "../mutations/storage.js";
import type * as mutations_workspaces from "../mutations/workspaces.js";
import type * as queries_workspaces from "../queries/workspaces.js";
import type * as rag from "../rag.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "mutations/content": typeof mutations_content;
  "mutations/flashcards": typeof mutations_flashcards;
  "mutations/quizzes": typeof mutations_quizzes;
  "mutations/roadmaps": typeof mutations_roadmaps;
  "mutations/storage": typeof mutations_storage;
  "mutations/workspaces": typeof mutations_workspaces;
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
