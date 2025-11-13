/* prettier-ignore-start */

/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 *
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as chat from "../chat";
import type * as content from "../content";
import type * as embeddings from "../embeddings";
import type * as roadmaps from "../roadmaps";
import type * as workspaces from "../workspaces";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * \`\`\`typescript
 * import { api } from "./_generated/api";
 * \`\`\`
 */
export declare const api: FilterApi<
  ApiFromModules<{
    chat: typeof chat;
    content: typeof content;
    embeddings: typeof embeddings;
    roadmaps: typeof roadmaps;
    workspaces: typeof workspaces;
  }>,
  FunctionReference<any, "public">
>;

export type Api = typeof api;

/* prettier-ignore-end */

