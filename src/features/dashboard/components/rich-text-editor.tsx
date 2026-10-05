"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  BoldIcon,
  IndentDecreaseIcon,
  IndentIncreaseIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  RemoveFormattingIcon,
  UnderlineIcon,
  UnlinkIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cleanEvidenceHtml, isBlankHtml } from "../evidence";

const BLOCKS = [
  { value: "p", label: "Normal" },
  { value: "h2", label: "Heading" },
  { value: "h3", label: "Subheading" },
] as const;

type Block = (typeof BLOCKS)[number]["value"];
type Mark = "bold" | "italic" | "underline" | "insertOrderedList" | "insertUnorderedList";

const MARKS: Mark[] = ["bold", "italic", "underline", "insertOrderedList", "insertUnorderedList"];

/** Typography for the editable area, since Tailwind's preflight strips it. */
const CONTENT =
  "[&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-6";

const TOOL =
  "inline-flex size-8 items-center justify-center rounded-md text-foreground/75 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none disabled:opacity-40";

function ToolButton({
  icon: Icon,
  label,
  active,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      // Keeps the editor's selection, which a focus change would collapse.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPress}
      className={cn(TOOL, active && "bg-muted text-foreground")}
    >
      <Icon className="size-4" />
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1.5 h-5 w-px bg-foreground/10" />;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * A small rich-text editor for dispute responses. Uncontrolled: `initialHtml` seeds it
 * once and every edit is reported as cleaned HTML through `onChange`.
 */
export function RichTextEditor({
  initialHtml,
  onChange,
  placeholder,
  disabled,
  className,
}: {
  initialHtml?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<Range | null>(null);
  const [empty, setEmpty] = useState(() => isBlankHtml(initialHtml ?? ""));
  const [block, setBlock] = useState<Block>("p");
  const [marks, setMarks] = useState<Partial<Record<Mark, boolean>>>({});
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const report = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    setEmpty(isBlankHtml(html));
    onChange(cleanEvidenceHtml(html));
  }, [onChange]);

  // Seeds the editor once; after that the DOM is the source of truth.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.innerHTML = initialHtml ? cleanEvidenceHtml(initialHtml) : "";
    document.execCommand("defaultParagraphSeparator", false, "p");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remembers where the caret was, so toolbar controls that take focus can act on it,
  // and reflects the formatting under the caret in the toolbar.
  useEffect(() => {
    const onSelection = () => {
      const editor = editorRef.current;
      const selection = document.getSelection();
      if (!editor || !selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) return;
      rangeRef.current = range.cloneRange();
      setMarks(Object.fromEntries(MARKS.map((mark) => [mark, document.queryCommandState(mark)])));
      const value = String(document.queryCommandValue("formatBlock")).toLowerCase();
      setBlock(BLOCKS.some((option) => option.value === value) ? (value as Block) : "p");
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, []);

  const restoreSelection = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = document.getSelection();
    if (rangeRef.current && selection) {
      selection.removeAllRanges();
      selection.addRange(rangeRef.current);
    }
  };

  // execCommand is deprecated but still the only built-in way to edit a contentEditable.
  const exec = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    report();
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    setLinkOpen(false);
    setLinkUrl("");
    if (!url) return;
    const href = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`;
    restoreSelection();
    const selection = document.getSelection();
    if (selection && !selection.isCollapsed) document.execCommand("createLink", false, href);
    else document.execCommand("insertHTML", false, `<a href="${escapeHtml(href)}">${escapeHtml(url)}</a>`);
    report();
  };

  const tools: ReactNode = (
    <>
      <ToolButton icon={BoldIcon} label="Bold" active={marks.bold} onPress={() => exec("bold")} />
      <ToolButton icon={ItalicIcon} label="Italic" active={marks.italic} onPress={() => exec("italic")} />
      <ToolButton icon={UnderlineIcon} label="Underline" active={marks.underline} onPress={() => exec("underline")} />
      <Divider />
      <Popover.Root open={linkOpen} onOpenChange={setLinkOpen}>
        <Popover.Trigger
          aria-label="Add link"
          title="Add link"
          onMouseDown={(event) => event.preventDefault()}
          className={TOOL}
        >
          <LinkIcon className="size-4" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={6} align="start" className="z-50">
            <Popover.Popup className="flex w-72 flex-col gap-2 rounded-lg bg-popover p-3 text-sm shadow-md ring-1 ring-foreground/10 outline-none">
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  applyLink();
                }}
              >
                <Input
                  autoFocus
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  placeholder="https://"
                  aria-label="Link URL"
                />
                <Button type="submit" size="lg">
                  Add
                </Button>
              </form>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <ToolButton icon={UnlinkIcon} label="Remove link" onPress={() => exec("unlink")} />
      <Divider />
      <ToolButton
        icon={ListOrderedIcon}
        label="Numbered list"
        active={marks.insertOrderedList}
        onPress={() => exec("insertOrderedList")}
      />
      <ToolButton
        icon={ListIcon}
        label="Bulleted list"
        active={marks.insertUnorderedList}
        onPress={() => exec("insertUnorderedList")}
      />
      <Divider />
      <ToolButton icon={IndentDecreaseIcon} label="Outdent" onPress={() => exec("outdent")} />
      <ToolButton icon={IndentIncreaseIcon} label="Indent" onPress={() => exec("indent")} />
      <ToolButton
        icon={RemoveFormattingIcon}
        label="Clear formatting"
        onPress={() => {
          exec("removeFormat");
          exec("formatBlock", "<p>");
        }}
      />
    </>
  );

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl bg-background ring-1 ring-foreground/10 focus-within:ring-shop-accent/60",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-foreground/10 px-2 py-1.5">
        <select
          aria-label="Text style"
          value={block}
          onChange={(event) => {
            const next = event.target.value as Block;
            setBlock(next);
            exec("formatBlock", `<${next}>`);
          }}
          className="mr-1 h-8 rounded-md bg-transparent px-2 text-sm text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-shop-accent focus-visible:outline-none"
        >
          {BLOCKS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Divider />
        {tools}
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {empty && placeholder && (
          <p aria-hidden className="pointer-events-none absolute top-4 left-4 text-muted-foreground italic">
            {placeholder}
          </p>
        )}
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline
          aria-label="Dispute response"
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={report}
          onPaste={(event) => {
            // Pasted rich text arrives with the source page's styles; keep only allowed markup.
            const html = event.clipboardData.getData("text/html");
            if (!html) return;
            event.preventDefault();
            document.execCommand("insertHTML", false, cleanEvidenceHtml(html));
            report();
          }}
          className={cn("min-h-full px-4 py-3 text-sm leading-relaxed outline-none", CONTENT)}
        />
      </div>
    </div>
  );
}
