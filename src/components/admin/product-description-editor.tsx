"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Video,
  Heading2,
  Redo2,
  Undo2,
} from "lucide-react";

function MenuBar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL liên kết:", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const setVideo = () => {
    const url = window.prompt(
      "URL video (YouTube/Vimeo):",
      "https://www.youtube.com/watch?v="
    );
    if (!url) return;

    // Auto-detect vertical videos (YouTube Shorts) and store portrait frame.
    const isShorts = /youtube\.com\/shorts\//i.test(url);
    const width = isShorts ? 360 : 640;
    const height = isShorts ? 640 : 360;

    editor
      .chain()
      .focus()
      .setYoutubeVideo({
        src: url,
        width,
        height,
      })
      .run();
  };

  return (
    <div className="flex flex-wrap gap-0.5 border-b border-eoi-border bg-eoi-surface/90 px-2 py-1.5">
      <ToolbarBtn
        pressed={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Bold"
      >
        <Bold size={16} strokeWidth={2} />
      </ToolbarBtn>
      <ToolbarBtn
        pressed={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Italic"
      >
        <Italic size={16} strokeWidth={2} />
      </ToolbarBtn>
      <ToolbarBtn
        pressed={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        label="Heading 2"
      >
        <Heading2 size={16} strokeWidth={2} />
      </ToolbarBtn>
      <span className="mx-0.5 w-px self-stretch bg-eoi-border" aria-hidden />
      <ToolbarBtn
        pressed={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        label="Bullet list"
      >
        <List size={16} strokeWidth={2} />
      </ToolbarBtn>
      <ToolbarBtn
        pressed={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        label="Numbered list"
      >
        <ListOrdered size={16} strokeWidth={2} />
      </ToolbarBtn>
      <ToolbarBtn
        pressed={editor.isActive("link")}
        onClick={setLink}
        label="Link"
      >
        <Link2 size={16} strokeWidth={2} />
      </ToolbarBtn>
      <ToolbarBtn
        pressed={editor.isActive("youtube")}
        onClick={setVideo}
        label="Video"
      >
        <Video size={16} strokeWidth={2} />
      </ToolbarBtn>
      <span className="mx-0.5 w-px self-stretch bg-eoi-border" aria-hidden />
      <ToolbarBtn
        onClick={() => editor.chain().focus().undo().run()}
        label="Undo"
        disabled={!editor.can().undo()}
      >
        <Undo2 size={16} strokeWidth={2} />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().redo().run()}
        label="Redo"
        disabled={!editor.can().redo()}
      >
        <Redo2 size={16} strokeWidth={2} />
      </ToolbarBtn>
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
  pressed,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-eoi-ink transition-colors ${
        pressed ? "bg-white shadow-sm ring-1 ring-eoi-border" : "hover:bg-white/80"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

type Props = {
  initialContent: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export function ProductDescriptionEditor({
  initialContent,
  onChange,
  placeholder,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
          class: "text-eoi-blue-dark underline",
        },
      }),
      Youtube.configure({
        controls: true,
        modestBranding: true,
        nocookie: true,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "",
      }),
    ],
    content: initialContent || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "tiptap-prose min-h-[200px] max-w-none px-3 py-3 font-dm text-sm text-eoi-ink outline-none focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  return (
    <div className="overflow-hidden rounded-[10px] border border-eoi-border bg-white focus-within:ring-2 focus-within:ring-eoi-pink/30">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
