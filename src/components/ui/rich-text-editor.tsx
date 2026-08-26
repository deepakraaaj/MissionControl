import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { promptDialog } from './native-dialog';
import { useEditor, useEditorState, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  List,
  ListOrdered,
  Minus,
  Link2,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { isHtmlContent } from './rich-text-content';

// Rich-text notepad built on Tiptap/ProseMirror. Stores HTML so it stays
// compatible with previously saved notes. Tiptap handles selection, caret and
// cross-engine quirks (WebKitGTK) that the old execCommand approach couldn't.



function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Turn legacy plain-text notes into safe HTML so they keep rendering.
function toEditableHtml(value: string): string {
  if (!value) return '';
  if (isHtmlContent(value)) return value;
  return escapeHtml(value).replace(/\n/g, '<br>');
}

type ToolbarButtonProps = {
  icon: typeof Bold;
  label: string;
  active?: boolean;
  onRun: () => void;
};

function ToolbarButton({ icon: Icon, label, active, onRun }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      // Keep the editor selection while pressing the button.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onRun}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
        active
          ? 'bg-accent/15 text-accent'
          : 'text-text-secondary hover:bg-text-primary/8 hover:text-text-primary active:bg-text-primary/12',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-render the toolbar's active states as the selection moves.
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      heading: editor.isActive('heading', { level: 3 }),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      link: editor.isActive('link'),
    }),
  });

  const insertImage = useCallback(
    (src: string) => {
      editor.chain().focus().setImage({ src }).run();
    },
    [editor],
  );

  const handleImageFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') insertImage(reader.result);
      };
      reader.readAsDataURL(file);
    },
    [insertImage],
  );

  const addLink = useCallback(() => {
    const previous = editor.getAttributes('link').href as string | undefined;
    void promptDialog('Paste the destination URL.', previous ?? '', { title: 'Add link', confirmLabel: 'Apply link' }).then((url) => {
      if (url === null) return;
      if (url === '') editor.chain().focus().extendMarkRange('link').unsetLink().run();
      else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    });
  }, [editor]);

  const addImageUrl = useCallback(() => {
    void promptDialog('Paste an image URL, or cancel and use the upload button.', '', { title: 'Insert image', confirmLabel: 'Insert' }).then((url) => { if (url) insertImage(url); });
  }, [insertImage]);

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-borderSoft/25 px-1 py-1">
      <ToolbarButton icon={Bold} label="Bold" active={state.bold} onRun={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton icon={Italic} label="Italic" active={state.italic} onRun={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton icon={Underline} label="Underline" active={state.underline} onRun={() => editor.chain().focus().toggleUnderline().run()} />
      <span className="mx-1 h-5 w-px bg-borderSoft/30" />
      <ToolbarButton icon={Heading2} label="Heading" active={state.heading} onRun={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <ToolbarButton icon={List} label="Bulleted list" active={state.bulletList} onRun={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarButton icon={ListOrdered} label="Numbered list" active={state.orderedList} onRun={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolbarButton icon={Minus} label="Divider" onRun={() => editor.chain().focus().setHorizontalRule().run()} />
      <span className="mx-1 h-5 w-px bg-borderSoft/30" />
      <ToolbarButton icon={Link2} label="Add link" active={state.link} onRun={addLink} />
      <ToolbarButton icon={ImageIcon} label="Image from URL" onRun={addImageUrl} />
      <ToolbarButton icon={ImageIcon} label="Upload image" onRun={() => fileInputRef.current?.click()} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3] },
        link: { openOnClick: false, autolink: true },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: toEditableHtml(value),
    editorProps: {
      attributes: {
        class: 'rte-content min-h-full w-full px-4 py-3 text-[14px] leading-relaxed text-text-primary outline-none',
      },
      handlePaste: (view, event) => {
        // Paste images from the clipboard as inline data URLs.
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              const reader = new FileReader();
              reader.onload = () => {
                const target = editorRef.current;
                if (typeof reader.result === 'string' && target && !target.isDestroyed) {
                  target.chain().focus().setImage({ src: reader.result }).run();
                }
              };
              reader.readAsDataURL(file);
              return true;
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Stable handle for callbacks created before `editor` is assigned (paste).
  const editorRef = useRef<Editor | null>(null);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Sync external value changes back into the editor when it isn't being typed
  // in (e.g. programmatic reset). The guard prevents fighting the caret. Also
  // skip destroyed editors — the modal can unmount around the same time this
  // effect's deps change, and Tiptap nulls out the schema on destroy(), so
  // getHTML()/setContent() on a dead instance throws.
  useEffect(() => {
    if (!editor || editor.isDestroyed || editor.isFocused) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(toEditableHtml(value), { emitUpdate: false });
    }
  }, [value, editor]);

  // Focus the fullscreen surface when entering it.
  useEffect(() => {
    if (fullscreen && editor) editor.commands.focus();
  }, [fullscreen, editor]);

  if (!editor) return null;

  const surface = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Toolbar editor={editor} />
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="min-h-full" />
      </div>
    </div>
  );

  return (
    <>
      <div
        className={cn(
          'flex flex-col overflow-hidden rounded-[18px] border border-borderSoft/30 bg-panel2/40',
          fullscreen && 'invisible',
          className,
        )}
      >
        {!fullscreen && surface}
        <div className="flex justify-end border-t border-borderSoft/20 px-2 py-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setFullscreen(true)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-text-muted transition-colors hover:bg-text-primary/8 hover:text-text-primary"
          >
            <Maximize2 className="h-3.5 w-3.5" /> Expand
          </button>
        </div>
      </div>

      {fullscreen
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex flex-col bg-panel pb-[env(safe-area-inset-bottom)]">
              <div className="flex shrink-0 items-center justify-between border-b border-borderSoft/25 px-4 py-3">
                <p className="text-sm font-semibold text-text-primary">Notepad</p>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setFullscreen(false)}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-text-primary/8 hover:text-text-primary"
                >
                  <Minimize2 className="h-4 w-4" /> Done
                </button>
              </div>
              {surface}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

// Renders saved note content (HTML or legacy plain text) for display surfaces.
