"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Menu, PanelLeftClose, PanelLeftOpen, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "class-notes-docs";
const STORAGE_EVENT = "class-notes-docs:change";
const EMPTY_NOTES: Note[] = [];

let cachedRaw: string | null | undefined = undefined;
let cachedNotes: Note[] = EMPTY_NOTES;

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

function readNotesFromStorage(): Note[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    cachedRaw = raw;
    cachedNotes = EMPTY_NOTES;
    return cachedNotes;
  }

  if (raw === cachedRaw) return cachedNotes;

  try {
    const parsed = JSON.parse(raw) as Note[];
    cachedRaw = raw;
    cachedNotes = parsed;
    return cachedNotes;
  } catch {
    cachedRaw = raw;
    cachedNotes = EMPTY_NOTES;
    return cachedNotes;
  }
}

function writeNotesToStorage(notes: Note[]) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(notes);
  cachedRaw = raw;
  cachedNotes = notes;
  localStorage.setItem(STORAGE_KEY, raw);
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function subscribeToNotes(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  const onCustom = () => callback();

  window.addEventListener("storage", onStorage);
  window.addEventListener(STORAGE_EVENT, onCustom);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(STORAGE_EVENT, onCustom);
  };
}

export default function NotesApp() {
  const notes = useSyncExternalStore(
    subscribeToNotes,
    readNotesFromStorage,
    () => EMPTY_NOTES
  );
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [isSidebarDesktopOpen, setIsSidebarDesktopOpen] = useState(true);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedNote =
    notes.find((note) => note.id === selectedId) ?? notes[0];
  const selectedNoteIdRef = useRef<string>("");

  useEffect(() => {
    selectedNoteIdRef.current = selectedNote?.id ?? "";
  }, [selectedNote?.id]);

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
          "ProseMirror w-full rounded-xl bg-white px-4 py-6 text-left text-[18px] leading-8 outline-none sm:px-8 sm:py-10 lg:px-16 lg:py-12 min-h-[calc(100dvh-220px)]",
      },
    },
    onUpdate({ editor }) {
      const activeId = selectedNoteIdRef.current;
      if (!activeId) return;

      const html = editor.getHTML();

      const next = readNotesFromStorage().map((note) =>
        note.id === activeId
          ? {
              ...note,
              content: html,
              updatedAt: new Date().toISOString(),
            }
          : note
      );
      writeNotesToStorage(next);
    },
  });

  useEffect(() => {
    if (!editor || !selectedNote) return;
    editor.commands.setContent(selectedNote.content, { emitUpdate: false });
  }, [editor, selectedNote]);

  function newNote() {
    const note = createNote();
    writeNotesToStorage([note, ...notes]);
    setSelectedId(note.id);
  }

  function updateTitle(value: string) {
    if (!selectedNote) return;

    const next = notes.map((note) =>
      note.id === selectedNote.id
        ? {
            ...note,
            title: value,
            updatedAt: new Date().toISOString(),
          }
        : note
    );
    writeNotesToStorage(next);
  }

  function deleteNote() {
    if (!selectedNote) return;

    const filtered = notes.filter((note) => note.id !== selectedNote.id);

    writeNotesToStorage(filtered);
    setSelectedId(filtered[0]?.id ?? "");
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

        writeNotesToStorage([note, ...notes]);
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

  function selectNote(id: string) {
    setSelectedId(id);
    setIsSidebarMobileOpen(false);
  }

  return (
    <main className="min-h-[100dvh] bg-gradient-to-br from-[#f7f7f5] via-[#f7f7f5] to-[#eef2ff] p-3 sm:p-4">
      {/* Sidebar móvil (overlay) */}
      {isSidebarMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsSidebarMobileOpen(false)}
          />

          <div className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] p-3 sm:p-4">
            <Card className="h-[calc(100dvh-24px)] overflow-hidden border-white/70 bg-white/80 p-5 shadow-xl backdrop-blur sm:h-[calc(100dvh-32px)]">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">ClassNotes</h1>
                  <p className="text-xs opacity-70">Tus notas de clase</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      newNote();
                      setIsSidebarMobileOpen(false);
                    }}
                  >
                    Nueva
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Cerrar"
                    onClick={() => setIsSidebarMobileOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Input
                placeholder="Buscar nota..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <Separator className="my-4" />

              <ScrollArea className="h-[calc(100dvh-230px)] pr-2">
                <div className="space-y-2">
                  {filteredNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => selectNote(note.id)}
                      className={cn(
                        "w-full rounded-xl border bg-white/70 p-3 text-left shadow-sm transition-all hover:bg-white hover:shadow",
                        selectedId === note.id &&
                          "border-black/10 bg-white shadow ring-1 ring-black/10"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold">{note.title}</p>
                        <span className="shrink-0 text-[11px] opacity-60">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs opacity-70">
                        {new Date(note.updatedAt).toLocaleTimeString()}
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </div>
      )}

      <div
        className={cn(
          "grid grid-cols-1 gap-3 sm:gap-4 md:gap-4",
          isSidebarDesktopOpen ? "md:grid-cols-[290px_1fr]" : "md:grid-cols-1"
        )}
      >
        {/* Sidebar escritorio */}
        <Card
          className={cn(
            "hidden h-[calc(100dvh-24px)] overflow-hidden border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur md:block md:h-[calc(100dvh-32px)]",
            !isSidebarDesktopOpen && "md:hidden"
          )}
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ClassNotes</h1>
              <p className="text-xs opacity-70">Tus notas de clase</p>
            </div>
            <Button onClick={newNote}>
              <Plus className="mr-1 h-4 w-4" />
              Nueva
            </Button>
          </div>

          <Input
            placeholder="Buscar nota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Separator className="my-4" />

          <ScrollArea className="h-[calc(100dvh-260px)] pr-2">
            <div className="space-y-2">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setSelectedId(note.id)}
                  className={cn(
                    "w-full rounded-xl border bg-white/70 p-3 text-left shadow-sm transition-all hover:bg-white hover:shadow hover:-translate-y-px",
                    selectedId === note.id &&
                      "border-black/10 bg-white shadow ring-1 ring-black/10"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{note.title}</p>
                    <span className="shrink-0 text-[11px] opacity-60">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs opacity-70">
                    {new Date(note.updatedAt).toLocaleTimeString()}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="h-[calc(100dvh-24px)] overflow-auto border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6 md:h-[calc(100dvh-32px)]">
          {selectedNote ? (
            <>
              <div className="sticky top-0 z-10 mb-4 rounded-xl border bg-white/80 p-3 shadow-sm backdrop-blur">
                <div className="mb-3 flex items-center justify-between gap-2 md:hidden">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Abrir menú"
                    onClick={() => setIsSidebarMobileOpen(true)}
                  >
                    <Menu className="h-4 w-4" />
                  </Button>

                  <div className="flex-1 truncate px-2 font-semibold">
                    {selectedNote.title || "Nota"}
                  </div>
                </div>

                <div className="mb-3 hidden items-center justify-between gap-2 md:flex">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={isSidebarDesktopOpen ? "Ocultar panel" : "Mostrar panel"}
                    onClick={() => setIsSidebarDesktopOpen((v) => !v)}
                  >
                    {isSidebarDesktopOpen ? (
                      <PanelLeftClose className="h-4 w-4" />
                    ) : (
                      <PanelLeftOpen className="h-4 w-4" />
                    )}
                  </Button>

                  <div className="flex-1 truncate px-2 font-semibold">
                    {selectedNote.title || "Nota"}
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  <Input
                    value={selectedNote.title}
                    onChange={(e) => updateTitle(e.target.value)}
                    className="w-full font-bold sm:max-w-md"
                  />

                  <Button size="sm" onClick={exportNote}>
                    Exportar .txt
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Importar .txt
                  </Button>

                  <Button size="sm" variant="destructive" onClick={deleteNote}>
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
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().toggleBold().run()
                    }
                  >
                    B
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().toggleItalic().run()
                    }
                  >
                    I
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().toggleUnderline().run()
                    }
                  >
                    U
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().toggleHeading({ level: 1 }).run()
                    }
                  >
                    Título
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                  >
                    Subtítulo
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().setParagraph().run()
                    }
                  >
                    Texto
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().toggleBulletList().run()
                    }
                  >
                    Lista
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().toggleOrderedList().run()
                    }
                  >
                    Numerada
                  </Button>

                  <Button size="sm" variant="outline" onClick={addImage}>
                    Imagen
                  </Button>
                </div>
              </div>

              <div onPaste={handlePaste} className="w-full">
                <EditorContent editor={editor} />
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border bg-white/80 p-8 text-center">
              <p className="text-lg font-semibold">No tienes notas aún</p>
              <p className="text-sm opacity-70">
                Crea una nota nueva para empezar.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={newNote}>Nueva nota</Button>
                <Button
                  type="button"
                  variant="outline"
                  className="md:hidden"
                  onClick={() => setIsSidebarMobileOpen(true)}
                >
                  Abrir menú
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
