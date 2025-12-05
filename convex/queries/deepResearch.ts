import { v } from "convex/values";
import { query } from "../_generated/server";

export const listReports = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const reports = await ctx.db
      .query("deepResearchReports")
      .withIndex("by_created")
      .order("desc")
      .take(limit);
    return reports;
  },
});

export const getReport = query({
  args: {
    reportId: v.id("deepResearchReports"),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    return report;
  },
});

export const getReportsByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("deepResearchReports")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();
    return reports;
  },
});

