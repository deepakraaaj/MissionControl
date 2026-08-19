import { cn } from '../../lib/cn';

/**
 * Read-only rendering for note/mission bodies. Deliberately free of any tiptap
 * import: every screen that only *displays* rich text can use this without
 * pulling the ~200kB editor into its bundle.
 */

export function isHtmlContent(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function RichTextContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  if (isHtmlContent(content)) {
    return <div className={cn('rte-content', className)} dangerouslySetInnerHTML={{ __html: content }} />;
  }
  return <p className={cn('whitespace-pre-wrap', className)}>{content}</p>;
}
