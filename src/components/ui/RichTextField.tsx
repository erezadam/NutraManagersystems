import { useEffect, useMemo, useRef, useState } from 'react';

interface RichTextFieldProps {
  value: string;
  placeholder?: string;
  minHeight?: number;
  onChange: (next: string) => void;
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toEditorHtml(value: string): string {
  if (!value) return '';
  if (looksLikeHtml(value)) return value;
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function normalizeHtml(html: string): string {
  const cleaned = html
    .replace(/<div><br><\/div>/gi, '<br>')
    .replace(/<p><br><\/p>/gi, '<br>')
    .replace(/\u200B/g, '')
    .trim();
  const asText = cleaned
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
  return asText ? cleaned : '';
}

export default function RichTextField({ value, placeholder = '', minHeight = 108, onChange }: RichTextFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const [selectedColor, setSelectedColor] = useState('#1f2a3d');
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const editorHtml = useMemo(() => toEditorHtml(value), [value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.innerHTML !== editorHtml) {
      editor.innerHTML = editorHtml;
    }
    resizeEditor(minHeight);
  }, [editorHtml, minHeight]);

  function resizeEditor(height: number) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.style.height = 'auto';
    editor.style.height = `${Math.max(height, editor.scrollHeight)}px`;
  }

  function emitChange() {
    const editor = editorRef.current;
    if (!editor) return;
    const next = normalizeHtml(editor.innerHTML);
    onChange(next);
    resizeEditor(minHeight);
  }

  function saveSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    if (!editor.contains(selection.anchorNode)) return;
    selectionRef.current = selection.getRangeAt(0).cloneRange();
  }

  function restoreSelection() {
    const selection = window.getSelection();
    if (!selection || !selectionRef.current) return;
    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  }

  function runCommand(command: string, commandValue?: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    emitChange();
    saveSelection();
  }

function normalizeUrl(rawValue: string): string {
    const next = rawValue.trim();
    if (!next) return '';
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(next)) return next;
  return `https://${next}`;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

  function applyLink() {
    const url = normalizeUrl(linkUrl);
    if (!url) return;
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    restoreSelection();
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      document.execCommand('createLink', false, url);
    } else {
      const safeUrl = escapeAttribute(url);
      document.execCommand('insertHTML', false, `<a href="${safeUrl}">${safeUrl}</a>`);
    }

    emitChange();
    setLinkOpen(false);
    setLinkUrl('');
    saveSelection();
  }

  return (
    <div className="rich-field">
      <div className="rich-toolbar">
        <button type="button" className="btn ghost rich-btn" onClick={() => runCommand('bold')}>
          B
        </button>
        <button type="button" className="btn ghost rich-btn rich-btn-italic" onClick={() => runCommand('italic')}>
          I
        </button>
        <button type="button" className="btn ghost rich-btn rich-btn-underline" onClick={() => runCommand('underline')}>
          U
        </button>
        <button type="button" className="btn ghost rich-btn" onClick={() => runCommand('insertUnorderedList')}>
          • רשימה
        </button>
        <button type="button" className="btn ghost rich-btn" onClick={() => runCommand('insertOrderedList')}>
          1. מספור
        </button>
        <button type="button" className="btn ghost rich-btn" onClick={() => runCommand('justifyRight')}>
          ימין
        </button>
        <button type="button" className="btn ghost rich-btn" onClick={() => runCommand('justifyLeft')}>
          שמאל
        </button>
        <button
          type="button"
          className={`btn ghost rich-btn ${linkOpen ? 'rich-btn-active' : ''}`}
          onClick={() => {
            saveSelection();
            setLinkOpen((prev) => !prev);
          }}
        >
          קישור
        </button>
        <button
          type="button"
          className="rich-color-swatch"
          aria-label="בחר צבע טקסט"
          style={{ backgroundColor: selectedColor }}
          onClick={() => colorInputRef.current?.click()}
        />
        <input
          ref={colorInputRef}
          type="color"
          className="rich-color"
          aria-label="בחר צבע טקסט"
          value={selectedColor}
          onChange={(event) => {
            const color = event.target.value;
            setSelectedColor(color);
            runCommand('foreColor', color);
          }}
        />
      </div>

      {linkOpen ? (
        <div className="rich-link-row">
          <input
            className="rich-link-input"
            placeholder="Enter link..."
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyLink();
              }
            }}
          />
          <button type="button" className="btn primary" onClick={applyLink} disabled={!linkUrl.trim()}>
            שמור
          </button>
        </div>
      ) : null}

      <div
        ref={editorRef}
        className="rich-editor"
        role="textbox"
        aria-multiline="true"
        contentEditable
        dir="auto"
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={() => {
          emitChange();
          saveSelection();
        }}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
      />
    </div>
  );
}
