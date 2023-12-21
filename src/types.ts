export type CreatePostInput = {
    title: string;
    content: string;
    authorId: string;
  };
  
  export type UpdatePostInput = {
    id: string;
    title?: string;
    content?: string;
  };
  