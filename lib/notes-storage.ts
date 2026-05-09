import { Note } from "./notes-types";

const STORAGE_KEY = "class-notes-data";

export function getNotes(): Note[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(STORAGE_KEY);

  if (!data) return [];

  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveNotes(notes: Note[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function createEmptyNote(): Note {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: "Nueva nota",
    createdAt: now,
    updatedAt: now,
    blocks: [
      {
        id: crypto.randomUUID(),
        type: "title",
        content: "Nueva nota",
      },
      {
        id: crypto.randomUUID(),
        type: "paragraph",
        content: "",
      },
    ],
  };
}