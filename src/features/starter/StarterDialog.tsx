import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { lockScroll, unlockScroll } from '../../lib/smoothScroll';

const prompts = {
  feature: { label: 'Новая функция', text: 'Ты — мой помощник по разработке. Сначала изучи структуру проекта и существующие соглашения. Помоги реализовать [опишите функцию].\n\n1. Задай вопросы, если требований недостаточно.\n2. Предложи короткий план и дождись моего согласования.\n3. Реализуй решение небольшими, понятными изменениями.\n4. Добавь проверки для важных сценариев и запусти их.\n5. Покажи результат, риски и то, что нужно проверить мне.\n\nНе добавляй новые зависимости без необходимости. Не публикуй изменения без моего подтверждения.' },
  bug: { label: 'Поиск ошибки', text: 'Помоги найти и исправить ошибку: [опишите проблему и шаги воспроизведения].\n\n1. Изучи связанный код и воспроизведи проблему.\n2. Найди первопричину, объясни её и предложи минимальное исправление.\n3. После согласования внеси изменения.\n4. Добавь проверку, воспроизводящую ошибку, и убедись, что она проходит после исправления.\n5. Покажи изменения и оставшиеся ограничения.\n\nНе меняй несвязанный код и не публикуй изменения без моего подтверждения.' },
  review: { label: 'Ревью кода', text: 'Проведи ревью текущих изменений. Пока не редактируй файлы.\n\n1. Изучи контекст и назначение изменённого кода.\n2. Проверь корректность, крайние случаи и обработку ошибок.\n3. Обрати внимание на безопасность и отсутствующие важные тесты.\n4. Для каждой найденной проблемы укажи файл, причину и конкретный сценарий сбоя.\n5. Отдели существенные проблемы от необязательных улучшений.\n\nЕсли серьёзных проблем нет, скажи об этом прямо. Не выдумывай замечания.' },
};
type PromptKey = keyof typeof prompts;

export function StarterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<PromptKey>('feature');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const textArea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) { dialog.current?.close(); return; }
    dialog.current?.showModal();
    lockScroll();
    return unlockScroll;
  }, [open]);

  useEffect(() => {
    if (copyStatus === 'idle') return;
    const timer = window.setTimeout(() => setCopyStatus('idle'), 4000);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompts[selected].text);
      setCopyStatus('copied');
    } catch {
      textArea.current?.focus(); textArea.current?.select(); setCopyStatus('error');
    }
  }

  // `data-lenis-prevent`: wheel and touch inside the dialog stay native, so its text area scrolls.
  // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- backdrop click; Escape closes natively.
  return <dialog ref={dialog} className="starter-dialog" aria-labelledby="starter-title" data-lenis-prevent onClose={onClose} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <button className="dialog-close icon-button" onClick={onClose} aria-label="Закрыть"><Icon name="close" /></button>
    <span className="story-eyebrow"><i /> Ваш первый шаг</span>
    <h2 id="starter-title">Начните с одной задачи.</h2>
    <p>Выберите сценарий и скопируйте запрос в своего ИИ-агента. Замените текст в скобках деталями вашего проекта.</p>
    <div className="prompt-tabs" role="tablist" aria-label="Сценарий для старта">{(Object.keys(prompts) as PromptKey[]).map((key, index, keys) => <button role="tab" id={`prompt-tab-${key}`} aria-selected={selected === key} aria-controls="prompt-panel" tabIndex={selected === key ? 0 : -1} key={key} onClick={() => { setSelected(key); setCopyStatus('idle'); }} onKeyDown={event => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? keys[0] : event.key === 'End' ? keys[keys.length - 1] : keys[(index + (event.key === 'ArrowRight' ? 1 : -1) + keys.length) % keys.length]; setSelected(next); setCopyStatus('idle'); document.getElementById(`prompt-tab-${next}`)?.focus(); } }}>{prompts[key].label}</button>)}</div>
    <div id="prompt-panel" role="tabpanel" aria-labelledby={`prompt-tab-${selected}`}><textarea ref={textArea} readOnly value={prompts[selected].text} aria-label="Готовый запрос для ИИ-агента" /></div>
    <button className="glow-button copy-button" onClick={copyPrompt}><Icon name={copyStatus === 'copied' ? 'check' : 'copy'} size={17} />{copyStatus === 'copied' ? 'Запрос скопирован' : 'Скопировать запрос'}<Icon name="arrow" size={17} /></button>
    <span className="copy-feedback" role="status">{copyStatus === 'error' ? 'Текст выделен. Нажмите Ctrl+C (или ⌘C), чтобы скопировать.' : copyStatus === 'copied' ? 'Готово! Теперь вставьте запрос в чат вашего агента.' : 'Маленькая задача — лучший способ познакомиться с новым подходом.'}</span>
  </dialog>;
}
