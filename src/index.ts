const { ApolloServer, gql } = require("apollo-server");
const { buildFederatedSchema } = require("@apollo/federation");
import { CreatePostInput, UpdatePostInput } from "./types";

// Initialize an empty array to store posts
let posts: any[] = [];

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
    getPost: (_: any, { id }: { id: string }) =>
      posts.find((post) => post.id === parseInt(id)),
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
const server = new ApolloServer({
  schema: buildFederatedSchema([{ typeDefs, resolvers }]),
});

// Start server
server.listen({ port: 7006 }).then(({ url }: { url: string }) => {
  console.log(`Post service running at ${url}`);
});
