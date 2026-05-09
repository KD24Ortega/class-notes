"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "class-notes-docs";

function createNote(): Note {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: "Nueva nota",
    content: "<h1>Nueva nota</h1><p>Empieza a escribir aquí...</p>",
    createdAt: now,
    updatedAt: now,
  };
}

export default function NotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedNote = notes.find((note) => note.id === selectedId);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Underline,
      TextStyle,
      Color,
    ],
    content: selectedNote?.content || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "ProseMirror min-h-[650px] w-full rounded-xl bg-white px-16 py-12 text-left text-[18px] leading-8 outline-none",
      },
    },
    onUpdate({ editor }) {
      if (!selectedNote) return;

      const html = editor.getHTML();

      setNotes((prev) =>
        prev.map((note) =>
          note.id === selectedNote.id
            ? {
                ...note,
                content: html,
                updatedAt: new Date().toISOString(),
              }
            : note
        )
      );
    },
    handlePaste: (view, event) => {
    const items = event.clipboardData?.items;

    if (!items) return false;

    for (const item of items) {
      if (item.type.startsWith("image")) {
        event.preventDefault();

        const file = item.getAsFile();
        if (!file) return false;

        const reader = new FileReader();

        reader.onload = () => {
          view.dispatch(
            view.state.tr.insertText("") // hack para refrescar
          );

          editor
            ?.chain()
            .focus()
            .setImage({ src: String(reader.result) })
            .run();
        };

        reader.readAsDataURL(file);

        return true;
      }
    }

    return false;
  },
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved) as Note[];
      setNotes(parsed);
      setSelectedId(parsed[0]?.id || "");
    } else {
      const first = createNote();
      setNotes([first]);
      setSelectedId(first.id);
    }
  }, []);

  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }
  }, [notes]);

  useEffect(() => {
    if (editor && selectedNote) {
      editor.commands.setContent(selectedNote.content);
    }
  }, [selectedId]);

  function newNote() {
    const note = createNote();
    setNotes((prev) => [note, ...prev]);
    setSelectedId(note.id);
  }

  function updateTitle(value: string) {
    if (!selectedNote) return;

    setNotes((prev) =>
      prev.map((note) =>
        note.id === selectedNote.id
          ? {
              ...note,
              title: value,
              updatedAt: new Date().toISOString(),
            }
          : note
      )
    );
  }

  function deleteNote() {
    if (!selectedNote) return;

    const filtered = notes.filter((note) => note.id !== selectedNote.id);

    if (filtered.length === 0) {
      const note = createNote();
      setNotes([note]);
      setSelectedId(note.id);
    } else {
      setNotes(filtered);
      setSelectedId(filtered[0].id);
    }
  }

  function exportNote() {
    if (!selectedNote) return;

    const data = JSON.stringify(selectedNote, null, 2);
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedNote.title || "nota"}.txt`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function importNote(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result)) as Note;

        const note: Note = {
          ...imported,
          id: crypto.randomUUID(),
          updatedAt: new Date().toISOString(),
        };

        setNotes((prev) => [note, ...prev]);
        setSelectedId(note.id);
      } catch {
        alert("Archivo inválido.");
      }
    };

    reader.readAsText(file);
  }

  function addImage() {
    const url = prompt("Pega la URL de la imagen:");

    if (url) {
      editor?.chain().focus().setImage({ src: url }).run();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const items = event.clipboardData?.items;

    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image")) {
        event.preventDefault(); // 🔥 IMPORTANTE

        const file = item.getAsFile();
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
          editor
            ?.chain()
            .focus()
            .setImage({ src: String(reader.result) })
            .run();
        };

        reader.readAsDataURL(file);
      }
    }
  }

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#f7f7f5] p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[290px_1fr]">
        <Card className="h-[calc(100vh-32px)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">ClassNotes</h1>
            <Button onClick={newNote}>Nueva</Button>
          </div>

          <Input
            placeholder="Buscar nota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Separator className="my-4" />

          <div className="space-y-2">
            {filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className={`w-full rounded-xl p-3 text-left ${
                  selectedId === note.id
                    ? "bg-black text-white"
                    : "bg-white hover:bg-slate-100"
                }`}
              >
                <p className="font-semibold">{note.title}</p>
                <p className="text-xs opacity-70">
                  {new Date(note.updatedAt).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="h-[calc(100vh-32px)] overflow-auto p-6">
          {selectedNote && (
            <>
              <div className="sticky top-0 z-10 mb-4 rounded-xl border bg-white/90 p-3 backdrop-blur">
                <div className="mb-3 flex flex-wrap gap-2">
                  <Input
                    value={selectedNote.title}
                    onChange={(e) => updateTitle(e.target.value)}
                    className="max-w-md font-bold"
                  />

                  <Button onClick={exportNote}>Exportar .txt</Button>

                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Importar .txt
                  </Button>

                  <Button variant="destructive" onClick={deleteNote}>
                    Eliminar
                  </Button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt"
                    hidden
                    onChange={importNote}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      editor?.chain().focus().toggleBold().run()
                    }
                  >
                    B
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      editor?.chain().focus().toggleItalic().run()
                    }
                  >
                    I
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      editor?.chain().focus().toggleUnderline().run()
                    }
                  >
                    U
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      editor?.chain().focus().toggleHeading({ level: 1 }).run()
                    }
                  >
                    Título
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      editor?.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                  >
                    Subtítulo
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      editor?.chain().focus().setParagraph().run()
                    }
                  >
                    Texto
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      editor?.chain().focus().toggleBulletList().run()
                    }
                  >
                    Lista
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      editor?.chain().focus().toggleOrderedList().run()
                    }
                  >
                    Numerada
                  </Button>

                  <Button variant="outline" onClick={addImage}>
                    Imagen
                  </Button>
                </div>
              </div>

              <div onPaste={handlePaste} className="w-full">
                <EditorContent editor={editor} />
              </div>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}