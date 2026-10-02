import { nbsp } from '../../../lib/typography';
import type { Inline } from './types';

// The two marks lessons use, `code` and **strong**; everything else is plain text, never HTML.
const marks = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/;

export function Rich({ text }: { text: Inline }) {
  // With a capturing group, split puts the marks at the odd places.
  return <>{text.split(marks).map((part, index) => index % 2 === 0
    ? nbsp(part)
    : part.startsWith('`')
      ? <code key={index}>{part.slice(1, -1)}</code>
      : <strong key={index}>{nbsp(part.slice(2, -2))}</strong>)}</>;
}
