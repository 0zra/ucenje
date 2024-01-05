import {  clerkClient } from "@clerk/nextjs/server";
import type {User} from "@clerk/nextjs/api"
import { z } from "zod";

import { createTRPCRouter, privateProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

const filterUsersForClient = (user: User) => ({id: user.id, username: user.username, profileImageUrl: user.profileImageUrl})

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
      take: 100,
      orderBy: [{'createdAt': 'desc'}]
    });

    const users =( await clerkClient.users.getUserList({
      userId: posts.map((post) => post.authorId),
      limit: 100
    })).map(filterUsersForClient)

    console.log( users)


    return posts.map((post) => {
      const author = users.find((user) => user.id === post.authorId)
      if(!author || !author.username) throw new TRPCError({code: "INTERNAL_SERVER_ERROR", message: "Author not found"})

      return {
        post,
         author: {...author, username: author.username}
      }
    });
  }),

  create: privateProcedure.input(
    z.object({
      content: z.string().emoji("Only emojis are allowed").min(1).max(280),
    })
  ).mutation(async ({ ctx, input }) => {
    const authorId = ctx.userId;
    const post = await ctx.prisma.post.create({
      data: {
        content: input.content,
        authorId
      },
    });

    return post;
  })});
