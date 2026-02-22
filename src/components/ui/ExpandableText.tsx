import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal';

interface ExpandableTextProps {
  value?: string | null;
  emptyLabel?: string;
  popupTitle?: string;
  maxLines?: number;
}

function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hasHtmlMarkup(value: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(value);
}

export default function ExpandableText({
  value,
  emptyLabel = '-',
  popupTitle = 'תוכן מלא',
  maxLines = 2
}: ExpandableTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const rawValue = value?.trim() ?? '';
  const plainText = useMemo(() => stripHtml(rawValue), [rawValue]);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;
    const observedElement = element;

    function updateOverflow() {
      setIsOverflowing(observedElement.scrollHeight > observedElement.clientHeight + 1);
    }

    updateOverflow();
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(observedElement);
    return () => observer.disconnect();
  }, [plainText, maxLines]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  if (!plainText) {
    return <span>{emptyLabel}</span>;
  }

  function togglePopup() {
    if (!isOverflowing) return;
    setIsOpen((prev) => !prev);
  }

  return (
    <div className="expandable">
      <button
        type="button"
        className={`expandable-trigger ${isOverflowing ? 'is-overflowing' : ''}`}
        aria-expanded={isOpen}
        onClick={togglePopup}
      >
        <span ref={textRef} className="expandable-clamp" style={{ WebkitLineClamp: maxLines }}>
          {plainText}
        </span>
        {isOverflowing ? <span className="expandable-hint">⋯</span> : null}
      </button>

      <Modal open={isOpen} title={popupTitle} onClose={() => setIsOpen(false)}>
        {hasHtmlMarkup(rawValue) ? (
          <div className="expandable-modal-body rich-view" dangerouslySetInnerHTML={{ __html: rawValue }} />
        ) : (
          <div className="expandable-modal-body">{plainText}</div>
        )}
      </Modal>
    </div>
  );
}
