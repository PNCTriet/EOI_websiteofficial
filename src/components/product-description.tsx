import type { ReactNode } from "react";
import sanitizeHtml from "sanitize-html";
import { looksLikeProductHtml } from "@/lib/product-description";

const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "a",
    "ul",
    "ol",
    "li",
    "h2",
    "h3",
    "h4",
    "blockquote",
    "span",
    "div",
    "pre",
    "code",
    "iframe",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "class"],
    span: ["class"],
    div: ["class"],
    p: ["class"],
    code: ["class"],
    pre: ["class"],
    li: ["class"],
    iframe: [
      "src",
      "title",
      "width",
      "height",
      "allow",
      "allowfullscreen",
      "frameborder",
      "loading",
      "referrerpolicy",
    ],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  allowedIframeHostnames: [
    "www.youtube.com",
    "youtube.com",
    "www.youtube-nocookie.com",
    "player.vimeo.com",
  ],
};

type Props = {
  content: string | null | undefined;
  fallback?: ReactNode;
  className?: string;
};

/**
 * Plain text: giữ xuống dòng (`whitespace-pre-line`).
 * HTML: sanitize rồi render — class `.product-description` trong globals.css.
 */
export function ProductDescription({
  content,
  fallback,
  className = "",
}: Props) {
  const raw = content?.trim();
  if (!raw) {
    return fallback ? <>{fallback}</> : null;
  }

  if (looksLikeProductHtml(raw)) {
    const clean = sanitizeHtml(raw, SANITIZE_OPTS);
    if (!clean.trim()) {
      return fallback ? <>{fallback}</> : null;
    }
    return (
      <div
        className={`product-description ${className}`}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return (
    <div
      className={`whitespace-pre-line font-dm text-[13px] leading-relaxed text-eoi-ink2 ${className}`}
    >
      {raw}
    </div>
  );
}
