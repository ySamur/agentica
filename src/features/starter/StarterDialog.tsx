import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { lockScroll, unlockScroll } from '../../lib/smoothScroll';
import { useCopy } from '../../lib/useCopy';
import { starterPrompts } from './prompts';

const prompts = starterPrompts;
type PromptKey = keyof typeof prompts;

export function StarterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<PromptKey>('feature');
  const { status: copyStatus, copy, reset: resetCopy } = useCopy();
  const textArea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) { dialog.current?.close(); return; }
    dialog.current?.showModal();
    lockScroll();
    return unlockScroll;
  }, [open]);

  function copyPrompt() {
    void copy(prompts[selected].text, () => { textArea.current?.focus(); textArea.current?.select(); });
  }

  // `data-lenis-prevent`: wheel and touch inside the dialog stay native, so its text area scrolls.
  // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click; Escape closes natively.
  return <dialog ref={dialog} className="starter-dialog" aria-labelledby="starter-title" data-lenis-prevent onClose={onClose} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <button className="dialog-close icon-button" onClick={onClose} aria-label="Закрыть"><Icon name="close" /></button>
    <span className="story-eyebrow"><i /> Ваш первый шаг</span>
    <h2 id="starter-title">Начните с одной задачи.</h2>
    <p>Выберите сценарий и скопируйте запрос в своего ИИ-агента. Замените текст в скобках деталями вашего проекта.</p>
    <div className="prompt-tabs" role="tablist" aria-label="Сценарий для старта">{(Object.keys(prompts) as PromptKey[]).map((key, index, keys) => <button role="tab" id={`prompt-tab-${key}`} aria-selected={selected === key} aria-controls="prompt-panel" tabIndex={selected === key ? 0 : -1} key={key} onClick={() => { setSelected(key); resetCopy(); }} onKeyDown={event => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? keys[0] : event.key === 'End' ? keys[keys.length - 1] : keys[(index + (event.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length]; setSelected(next); resetCopy(); document.getElementById(`prompt-tab-${next}`)?.focus(); } }}>{prompts[key].label}</button>)}</div>
    <div id="prompt-panel" role="tabpanel" aria-labelledby={`prompt-tab-${selected}`}><textarea ref={textArea} readOnly value={prompts[selected].text} aria-label="Готовый запрос для ИИ-агента" /></div>
    <button className="glow-button copy-button" onClick={copyPrompt}><Icon name={copyStatus === 'copied' ? 'check' : 'copy'} size={17} />{copyStatus === 'copied' ? 'Запрос скопирован' : 'Скопировать запрос'}<Icon name="arrow" size={17} /></button>
    <span className="copy-feedback" role="status">{copyStatus === 'error' ? 'Текст выделен. Нажмите Ctrl+C (или ⌘C), чтобы скопировать.' : copyStatus === 'copied' ? 'Готово! Теперь вставьте запрос в чат вашего агента.' : 'Маленькая задача — лучший способ познакомиться с новым подходом.'}</span>
  </dialog>;
}
