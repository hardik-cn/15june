"use client";

import React, { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bold,
  Italic,
  Heading,
  Link as LinkIcon,
  List,
  ListOrdered,
  Code,
  Quote,
  Eye,
  HelpCircle,
  Maximize2
} from "lucide-react";
import { Button } from "@/app/components/ui/button";

interface TicketEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function TicketEditor({
  content,
  onChange,
  placeholder = "Describe your issue in detail...",
}: TicketEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreview, setIsPreview] = useState(false);

  const insertText = (before: string, after: string = "", defaultText: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || defaultText;

    const newContent =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end);

    onChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  const handleLink = () => {
    const url = window.prompt("Enter URL:", "https://");
    if (!url) return;
    insertText("[", `](${url})`, "link text");
  };

  return (
    <div className="w-full flex flex-col bg-background rounded-md border overflow-hidden transition-all duration-200">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => insertText("**", "**", "bold text")}
            title="Bold"
            disabled={isPreview}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => insertText("_", "_", "italic text")}
            title="Italic"
            disabled={isPreview}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => insertText("### ", "", "Heading")}
            title="Heading"
            disabled={isPreview}
          >
            <Heading className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleLink}
            title="Link"
            disabled={isPreview}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-5 bg-border mx-1 shrink-0" />

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => insertText("- ", "", "List item")}
            title="Unordered List"
            disabled={isPreview}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => insertText("1. ", "", "List item")}
            title="Ordered List"
            disabled={isPreview}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => insertText("```\n", "\n```", "code block")}
            title="Code Block"
            disabled={isPreview}
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => insertText("> ", "", "Quote")}
            title="Quote"
            disabled={isPreview}
          >
            <Quote className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-5 bg-border mx-1 shrink-0" />

        <Button
          type="button"
          variant={isPreview ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs bg-white text-black"
          onClick={() => setIsPreview(!isPreview)}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          Preview
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Markdown Help"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Area */}
      <div className="relative">
        {isPreview ? (
          <div className="min-h-[250px] p-6 bg-background">
            {content ? (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-blue-600 hover:prose-a:text-blue-500">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <span className="text-muted-foreground italic font-mono text-sm">Nothing to preview</span>
            )}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className="w-full min-h-[250px] p-4 resize-y focus:outline-none bg-transparent font-mono text-sm leading-relaxed"
            placeholder={placeholder}
            value={content}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}
