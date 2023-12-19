const { ApolloServer, gql } = require("apollo-server");
const { buildFederatedSchema } = require("@apollo/federation");

// Sample data
const posts = [
  {
    id: 1,
    title: "First Post",
    content: "This is the first post.",
    authorId: 1,
  },
  {
    id: 2,
    title: "Second Post",
    content: "This is the second post.",
    authorId: 2,
  },
  {
    id: 3,
    title: "Third Post",
    content: "This is the third post.",
    authorId: 1,
  },
];

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

  type Query {
    getPost(id: ID!): Post
    allPosts: [Post]
  }
`;

// Resolvers
const resolvers = {
  Query: {
    getPost: (_: any, { id }: { id: string }) => posts.find((post) => post.id === parseInt(id)),

    allPosts: () => posts,
  },
  Post: {
    author(post: { authorId: number }) {
      return { __typename: "User", id: post.authorId };
    },
  },
  User: {
    posts(user: { id: number }) {
        return posts.filter((post) => post.authorId === parseInt(String(user.id)));
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
