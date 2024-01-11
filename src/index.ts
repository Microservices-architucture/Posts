import express from "express";
import { ApolloServer, gql } from "apollo-server";
import { buildSubgraphSchema } from "@apollo/federation";
import { CreatePostInput, UpdatePostInput } from "./types";
import jwt from "jsonwebtoken";
import { ExpressContext } from "apollo-server-express";
import cors from "cors";

// Initialize an empty array to store posts
let posts: any[] = [];

// Define the function to extract user information from the token
const extractUserFromToken = (token: string) => {
  try {
    const decodedToken: any = jwt.verify(
      token,
      process.env.SECRET_KEY || "8000",
      { ignoreExpiration: false }
    );
    return {
      userId: decodedToken.userId,
    };
  } catch (error: any) {
    console.error("Error verifying token:", error.message);
    return null;
  }
};

// GraphQL schema
const typeDefs = gql`
  type Post @key(fields: "id") {
    id: ID!
    title: String!
    content: String!
    author: User!
  }

  extend type User @key(fields: "id") {
    id: ID! @external
    posts: [Post]
  }

  input CreatePostInput {
    title: String!
    content: String!
    authorId: ID!
  }

  input UpdatePostInput {
    id: ID!
    title: String
    content: String
  }

  type Mutation {
    createPost(post: CreatePostInput!): Post
    updatePost(post: UpdatePostInput!): Post
    deletePost(id: ID!): Post
  }

  type Query {
    getPost(id: ID!): Post
    allPosts: [Post]
  }
`;

// Resolvers
const resolvers = {
  Query: {
    getPost: async (
      _: any,
      { id }: { id: string },
      context: { user?: { userId: number } | null; token?: string }
    ) => {
      // Check if context.user is not null before accessing userId
      const userId = context.user ? context.user.userId : null;
      console.log("context", context);
      console.log("context.user", context.user);

      if (!userId) {
        throw new Error("Authentication failed");
      }

      // Log the token and user information
      console.log("Token value:", context.token);
      console.log("User ID:", userId);

      const post = posts.find((post) => post.id === parseInt(id));
      return post;
    },
    allPosts: () => posts,
  },

  Mutation: {
    createPost: async (
      _: any,
      { post }: { post: CreatePostInput },
      context: { user: { userId: number } }
    ) => {
      // Check if the user is authenticated
      console.log("Context in createPost (posts service):", context);
      if (!context.user || !context.user.userId) {
        throw new Error("You must be logged in to create a post");
      }

      const newPost = {
        id: posts.length + 1,
        ...post,
        authorId: context.user.userId,
      };
      posts.push(newPost);
      return newPost;
    },
    updatePost: (_: any, { post }: { post: UpdatePostInput }) => {
      const index = posts.findIndex((p) => p.id === parseInt(post.id));
      if (index !== -1) {
        posts[index] = { ...posts[index], ...post };
        return posts[index];
      }
      return null;
    },
    deletePost: (_: any, { id }: { id: string }) => {
      const index = posts.findIndex((post) => post.id === parseInt(id));
      if (index !== -1) {
        const deletedPost = posts[index];
        posts = posts.filter((post) => post.id !== parseInt(id));
        return deletedPost;
      }
      return null;
    },
  },
  Post: {
    author(post: { authorId: number }) {
      return { __typename: "User", id: post.authorId };
    },
  },
  User: {
    posts(user: { id: number }) {
      return posts.filter(
        (post) => post.authorId === parseInt(String(user.id))
      );
    },
  },
};

// Apollo server setup

const app = express();
app.use(cors());
const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  context: ({ req }: ExpressContext) => {
    console.log("HEADERS RECEIVED IN POSTS SERVICE", req.headers);

    const token = req.headers.authorization || "";
    console.log("CONTEXT POSTS SERVICE TOKEN VALUE", token);

    return { token };
  },
});
// Start server
server.listen({ port: 7006 }).then(({ url }: { url: string }) => {
  console.log(`Post service running at ${url}`);
});
