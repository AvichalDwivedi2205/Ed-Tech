import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const createReport = mutation({
  args: {
    query: v.string(),
    title: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const reportId = await ctx.db.insert("deepResearchReports", {
      query: args.query,
      title: args.title,
      markdown: "",
      summary: "",
      citations: [],
      sections: [],
      researchDepth: "normal",
      sourcesCount: 0,
      status: args.status,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return reportId;
  },
});

export const updateReport = mutation({
  args: {
    reportId: v.id("deepResearchReports"),
    title: v.optional(v.string()),
    markdown: v.optional(v.string()),
    summary: v.optional(v.string()),
    citations: v.optional(v.array(v.object({
      id: v.string(),
      url: v.string(),
      title: v.string(),
      snippet: v.optional(v.string()),
      accessedAt: v.string(),
    }))),
    sections: v.optional(v.array(v.string())),
    researchDepth: v.optional(v.union(v.literal("normal"), v.literal("comprehensive"))),
    sourcesCount: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed")
    )),
  },
  handler: async (ctx, args) => {
    const { reportId, ...updates } = args;
    await ctx.db.patch(reportId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deleteReport = mutation({
  args: { reportId: v.id("deepResearchReports") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.reportId);
  },
});

