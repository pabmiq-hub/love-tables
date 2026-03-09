import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

interface RichTextRendererProps {
  content: string;
  className?: string;
}

export function RichTextRenderer({ content, className }: RichTextRendererProps) {
  if (!content) return null;

  // Check if content contains HTML tags
  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  if (!isHtml) {
    return <span className={cn("whitespace-pre-line", className)}>{content}</span>;
  }

  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "del",
      "h1", "h2", "h3", "ul", "ol", "li", "blockquote", "hr",
      "a", "img", "table", "thead", "tbody", "tr", "th", "td",
      "span", "div",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "style", "class", "target", "rel", "colspan", "rowspan"],
  });

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none",
        "[&_a]:text-primary [&_a]:underline",
        "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded",
        "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic",
        "[&_table]:border-collapse [&_td]:border [&_td]:border-input [&_td]:p-2 [&_th]:border [&_th]:border-input [&_th]:p-2 [&_th]:bg-muted/50 [&_th]:font-semibold",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
