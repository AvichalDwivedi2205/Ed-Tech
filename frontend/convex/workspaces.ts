import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new workspace
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const workspaceId = await ctx.db.insert("workspaces", {
      name: args.name,
      description: args.description,
      ownerId: args.ownerId,
      members: [
        {
          userId: args.ownerId,
          role: "owner" as const,
          addedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
    return workspaceId;
  },
});

// Get workspace by ID
export const get = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.workspaceId);
  },
});

// List workspaces for a user
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const workspaces = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();
    
    // Also get workspaces where user is a member
    const allWorkspaces = await ctx.db.query("workspaces").collect();
    const memberWorkspaces = allWorkspaces.filter((ws) =>
      ws.members.some((m) => m.userId === args.userId)
    );
    
    // Combine and deduplicate
    const workspaceMap = new Map();
    [...workspaces, ...memberWorkspaces].forEach((ws) => {
      workspaceMap.set(ws._id, ws);
    });
    
    return Array.from(workspaceMap.values());
  },
});

// Update workspace
export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    
    await ctx.db.patch(args.workspaceId, updates);
    return await ctx.db.get(args.workspaceId);
  },
});

// Delete workspace
export const remove = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.workspaceId);
  },
});

// Add member to workspace
export const addMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.string(),
    role: v.union(v.literal("member"), v.literal("viewer")),
  },
  handler: async (ctx, args) => {
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");
    
    // Check if user is already a member
    if (workspace.members.some((m) => m.userId === args.userId)) {
      throw new Error("User is already a member");
    }
    
    workspace.members.push({
      userId: args.userId,
      role: args.role,
      addedAt: Date.now(),
    });
    
    await ctx.db.patch(args.workspaceId, {
      members: workspace.members,
      updatedAt: Date.now(),
    });
  },
});

