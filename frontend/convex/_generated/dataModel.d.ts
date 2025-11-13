/* prettier-ignore-start */

/* eslint-disable */
/**
 * Generated data model.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 *
 * @module
 */

import type { DataModelFromSchemaDefinition } from "convex/server";
import type { GenericId } from "convex/values";
import schema from "../schema";

/**
 * The names of all of your Convex tables.
 */
export type TableNames =
  | "chatMessages"
  | "content"
  | "embeddings"
  | "roadmaps"
  | "workspaces";

/**
 * The type of a document stored in Convex.
 */
export type Doc<TableName extends TableNames> =
  DataModelFromSchemaDefinition<typeof schema>[TableName] & {
    _id: GenericId<TableName>;
    _creationTime: number;
  };

/**
 * The type of the data model.
 */
export type DataModel = DataModelFromSchemaDefinition<typeof schema>;

/* prettier-ignore-end */

