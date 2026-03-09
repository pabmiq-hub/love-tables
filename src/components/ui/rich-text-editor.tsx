import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useCallback, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Link as LinkIcon, Unlink,
  Image as ImageIcon, Table as TableIcon, Undo, Redo,
  Palette, Type, Smile, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const COLORS = [
  "#000000", "#434343", "#666666", "#999999", "#B7B7B7", "#CCCCCC", "#D9D9D9", "#EFEFEF", "#F3F3F3", "#FFFFFF",
  "#980000", "#FF0000", "#FF9900", "#FFFF00", "#00FF00", "#00FFFF", "#4A86E8", "#0000FF", "#9900FF", "#FF00FF",
  "#E6B8AF", "#F4CCCC", "#FCE5CD", "#FFF2CC", "#D9EAD3", "#D0E0E3", "#C9DAF8", "#CFE2F3", "#D9D2E9", "#EAD1DC",
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];

const EMOJIS = [
  "😀", "😊", "😍", "🤩", "😎", "🥳", "🎉", "🎊", "💪", "👏",
  "🤝", "💼", "📊", "🎯", "🚀", "⭐", "❤️", "🔥", "✅", "📌",
  "📅", "🕐", "📍", "🎭", "🍻", "🥂", "💃", "🕺", "🌟", "💫",
];

function ToolbarButton({ 
  onClick, active, disabled, children, tooltip 
}: { 
  onClick: () => void; active?: boolean; disabled?: boolean; children: React.ReactNode; tooltip: string;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "p-1.5 rounded-md transition-colors hover:bg-muted",
              active && "bg-primary/10 text-primary",
              disabled && "opacity-40 cursor-not-allowed"
            )}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function RichTextEditor({ value, onChange, placeholder, className, minHeight = "150px" }: RichTextEditorProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline cursor-pointer" } }),
      TextStyle,
      Color,
      Image.configure({ inline: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder: placeholder || "Escribe aquí..." }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-3 py-2",
        style: `min-height: ${minHeight}`,
      },
    },
  });

  useEffect(() => {
    if (editor && !isInternalUpdate.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
    isInternalUpdate.current = false;
  }, [value, editor]);

  const addLink = useCallback(() => {
    if (!editor || !linkUrl) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    setLinkUrl("");
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl("");
  }, [editor, imageUrl]);

  const insertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn("border border-input rounded-lg overflow-hidden bg-background", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-input bg-muted/30">
        {/* Undo / Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} tooltip="Deshacer">
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} tooltip="Rehacer">
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} tooltip="Negrita">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} tooltip="Cursiva">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} tooltip="Subrayado">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} tooltip="Tachado">
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Font size */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="p-1.5 rounded-md transition-colors hover:bg-muted flex items-center gap-1">
              <Type className="h-4 w-4" />
              <span className="text-xs">▾</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-32 p-1" align="start">
            {FONT_SIZES.map(size => (
              <button
                key={size}
                type="button"
                className="w-full text-left px-2 py-1 rounded text-sm hover:bg-muted"
                style={{ fontSize: size }}
                onClick={() => editor.chain().focus().setMark("textStyle", { fontSize: size }).run()}
              >
                {size}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Color */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="p-1.5 rounded-md transition-colors hover:bg-muted">
              <Palette className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="grid grid-cols-10 gap-1">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className="w-5 h-5 rounded-sm border border-input hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => editor.chain().focus().setColor(color).run()}
                />
              ))}
            </div>
            <button
              type="button"
              className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => editor.chain().focus().unsetColor().run()}
            >
              Quitar color
            </button>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment */}
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} tooltip="Alinear izquierda">
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} tooltip="Centrar">
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} tooltip="Alinear derecha">
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} tooltip="Justificar">
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} tooltip="Lista">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} tooltip="Lista numerada">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} tooltip="Cita">
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} tooltip="Línea horizontal">
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Link */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={cn("p-1.5 rounded-md transition-colors hover:bg-muted", editor.isActive("link") && "bg-primary/10 text-primary")}>
              <LinkIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-2">
              <Input
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLink()}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addLink} className="flex-1">Insertar enlace</Button>
                {editor.isActive("link") && (
                  <Button size="sm" variant="outline" onClick={() => editor.chain().focus().unsetLink().run()}>
                    <Unlink className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Image */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="p-1.5 rounded-md transition-colors hover:bg-muted">
              <ImageIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-2">
              <Input
                placeholder="URL de la imagen..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addImage()}
              />
              <Button size="sm" onClick={addImage} className="w-full">Insertar imagen</Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Table */}
        <ToolbarButton onClick={insertTable} tooltip="Insertar tabla">
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>

        {/* Emojis */}
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="p-1.5 rounded-md transition-colors hover:bg-muted">
              <Smile className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="grid grid-cols-10 gap-1">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  className="text-lg hover:bg-muted rounded p-0.5 transition-colors"
                  onClick={() => editor.chain().focus().insertContent(emoji).run()}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} className="[&_.tiptap]:min-h-[150px] [&_.tiptap_table]:border-collapse [&_.tiptap_td]:border [&_.tiptap_td]:border-input [&_.tiptap_td]:p-2 [&_.tiptap_th]:border [&_.tiptap_th]:border-input [&_.tiptap_th]:p-2 [&_.tiptap_th]:bg-muted/50 [&_.tiptap_th]:font-semibold [&_.tiptap_img]:max-w-full [&_.tiptap_img]:h-auto [&_.tiptap_img]:rounded [&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-primary/30 [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:italic [&_.tiptap_blockquote]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:h-0" />
    </div>
  );
}
