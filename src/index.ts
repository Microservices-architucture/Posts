import { ApolloServer, gql } from "apollo-server";
import { buildSubgraphSchema } from "@apollo/federation";
import { CreatePostInput, UpdatePostInput } from "./types";
import jwt from "jsonwebtoken";
import { ExpressContext } from "apollo-server-express";

// Initialize an empty array to store posts
let posts: any[] = [];

// Define the function to extract user information from the token
const extractUserFromToken = (token: string) => {
  try {
    console.log("Token value:", token); // Log the token

    const decodedToken: any = jwt.verify(
      token,
      process.env.SECRET_KEY || "8000",
      { ignoreExpiration: false } // Ensure token is not expired
    );
    console.log("Decoded token:", decodedToken);
    return {
      userId: decodedToken.userId,
    };
  } catch (error) {
    console.error(
      "Error verifying token:",
      (error as { message: string }).message
    );
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
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  context: ({ req }: ExpressContext) => {
    const forwardedAuthorization = req.headers.originalauthorization || "";

    if (Array.isArray(forwardedAuthorization)) {
      const authorizationString = forwardedAuthorization[0];
      const [bearer, forwardedToken] = authorizationString.split(" ");

      if (bearer && bearer.toLowerCase() === "bearer" && forwardedToken) {
        const user = extractUserFromToken(forwardedToken);
        console.log("Context in posts service:", { user });
        return { user };
      } else {
        console.error("Invalid authorization header format in posts service");
        return { user: null };
      }
    } else if (typeof forwardedAuthorization === "string") {
      const [bearer, forwardedToken] = forwardedAuthorization.split(" ");

      if (bearer && bearer.toLowerCase() === "bearer" && forwardedToken) {
        const user = extractUserFromToken(forwardedToken);
        console.log("Context in posts service:", { user });
        return { user };
      } else {
        console.error("Invalid authorization header format in posts service");
        return { user: null };
      }
    } else {
      console.error("Invalid authorization header format in posts service");
      return { user: null };
    }
  },
});
// Start server
server.listen({ port: 7006 }).then(({ url }: { url: string }) => {
  console.log(`Post service running at ${url}`);
});
