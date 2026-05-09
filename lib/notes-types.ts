export type BlockType =
  | "title"
  | "subtitle"
  | "heading"
  | "paragraph"
  | "list"
  | "checklist"
  | "code"
  | "image"
  | "separator";

export type NoteBlock = {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
};

export type Note = {
  id: string;
  title: string;
  blocks: NoteBlock[];
  createdAt: string;
  updatedAt: string;
};