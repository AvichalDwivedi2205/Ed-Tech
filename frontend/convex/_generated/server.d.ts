/* prettier-ignore-start */

/* eslint-disable */
/**
 * Generated server utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 *
 * @module
 */

import type {
  ActionBuilder,
  HttpActionBuilder,
  MutationBuilder,
  QueryBuilder,
} from "convex/server";
import type { DataModel } from "./dataModel";

/**
 * A set of types for the \`ctx\` argument to Convex server functions.
 *
 * These types are parameterized by \`DataModel\` - the type of your database.
 */
export type {
  ActionCtx,
  HttpActionCtx,
  MutationCtx,
  QueryCtx,
} from "convex/server";

/**
 * A set of types for the \`ctx\` argument to Convex server functions.
 *
 * These types are parameterized by \`DataModel\` - the type of your database.
 */
export type GenericQueryCtx<DataModel> = {
  db: QueryBuilder<DataModel>;
  auth: {
    getSessionId: () => Promise<string | null>;
    getUserIdentity: () => Promise<{
      tokenIdentifier: string;
      subject: string;
      issuer: string;
      name?: string;
      email?: string;
      emailVerified?: boolean;
      picture?: string;
      givenName?: string;
      familyName?: string;
      nickname?: string;
    } | null>;
  };
  scheduler: {
    runAfter: (
      delayMs: number,
      functionReference: FunctionReference<"mutation" | "action", "public">,
      ...args: any[]
    ) => Promise<void>;
    runAt: (
      timestamp: number,
      functionReference: FunctionReference<"mutation" | "action", "public">,
      ...args: any[]
    ) => Promise<void>;
  };
  storage: {
    generateUploadUrl: () => Promise<string>;
    getUrl: (storageId: string) => Promise<string>;
  };
  vectorSearch: (
    tableName: string,
    indexName: string,
    searchVector: number[],
    options?: {
      limit?: number;
      filter?: (q: any) => any;
    }
  ) => Promise<Array<{ _id: any; _score: number }>>;
};

export type GenericMutationCtx<DataModel> = {
  db: MutationBuilder<DataModel>;
  auth: {
    getSessionId: () => Promise<string | null>;
    getUserIdentity: () => Promise<{
      tokenIdentifier: string;
      subject: string;
      issuer: string;
      name?: string;
      email?: string;
      emailVerified?: boolean;
      picture?: string;
      givenName?: string;
      familyName?: string;
      nickname?: string;
    } | null>;
  };
  scheduler: {
    runAfter: (
      delayMs: number,
      functionReference: FunctionReference<"mutation" | "action", "public">,
      ...args: any[]
    ) => Promise<void>;
    runAt: (
      timestamp: number,
      functionReference: FunctionReference<"mutation" | "action", "public">,
      ...args: any[]
    ) => Promise<void>;
  };
  storage: {
    generateUploadUrl: () => Promise<string>;
    getUrl: (storageId: string) => Promise<string>;
  };
};

export type GenericActionCtx<DataModel> = {
  db: ActionBuilder<DataModel>;
  auth: {
    getSessionId: () => Promise<string | null>;
    getUserIdentity: () => Promise<{
      tokenIdentifier: string;
      subject: string;
      issuer: string;
      name?: string;
      email?: string;
      emailVerified?: boolean;
      picture?: string;
      givenName?: string;
      familyName?: string;
      nickname?: string;
    } | null>;
  };
  scheduler: {
    runAfter: (
      delayMs: number,
      functionReference: FunctionReference<"mutation" | "action", "public">,
      ...args: any[]
    ) => Promise<void>;
    runAt: (
      timestamp: number,
      functionReference: FunctionReference<"mutation" | "action", "public">,
      ...args: any[]
    ) => Promise<void>;
  };
  storage: {
    generateUploadUrl: () => Promise<string>;
    getUrl: (storageId: string) => Promise<string>;
  };
  runQuery: <Args extends any[], Output>(
    functionReference: FunctionReference<"query", "public">,
    ...args: Args
  ) => Promise<Output>;
  runMutation: <Args extends any[], Output>(
    functionReference: FunctionReference<"mutation", "public">,
    ...args: Args
  ) => Promise<Output>;
  runAction: <Args extends any[], Output>(
    functionReference: FunctionReference<"action", "public">,
    ...args: Args
  ) => Promise<Output>;
};

export type GenericHttpActionCtx<DataModel> = {
  db: HttpActionBuilder<DataModel>;
  auth: {
    getSessionId: () => Promise<string | null>;
    getUserIdentity: () => Promise<{
      tokenIdentifier: string;
      subject: string;
      issuer: string;
      name?: string;
      email?: string;
      emailVerified?: boolean;
      picture?: string;
      givenName?: string;
      familyName?: string;
      nickname?: string;
    } | null>;
  };
  scheduler: {
    runAfter: (
      delayMs: number,
      functionReference: FunctionReference<"mutation" | "action", "public">,
      ...args: any[]
    ) => Promise<void>;
    runAt: (
      timestamp: number,
      functionReference: FunctionReference<"mutation" | "action", "public">,
      ...args: any[]
    ) => Promise<void>;
  };
  storage: {
    generateUploadUrl: () => Promise<string>;
    getUrl: (storageId: string) => Promise<string>;
  };
  runQuery: <Args extends any[], Output>(
    functionReference: FunctionReference<"query", "public">,
    ...args: Args
  ) => Promise<Output>;
  runMutation: <Args extends any[], Output>(
    functionReference: FunctionReference<"mutation", "public">,
    ...args: Args
  ) => Promise<Output>;
  runAction: <Args extends any[], Output>(
    functionReference: FunctionReference<"action", "public">,
    ...args: Args
  ) => Promise<Output>;
};

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
export type ActionCtx = GenericActionCtx<DataModel>;
export type HttpActionCtx = GenericHttpActionCtx<DataModel>;

/* prettier-ignore-end */

