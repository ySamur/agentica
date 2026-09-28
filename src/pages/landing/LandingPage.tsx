import { useState } from 'react';
import { useOutletContext } from 'react-router';
import type { PageContext } from '../../app/App';
import { Brand, Icon } from '../../components/Icon';
import { WorkflowDemo } from '../../features/workflow/WorkflowDemo';

const questions = [
  { title: 'Чем агент отличается от обычного ИИ-чата?', answer: 'Чат в основном отвечает на вопросы. Агент, которому вы дали доступ к инструментам, может изучать проект, редактировать файлы, запускать проверки и последовательно выполнять задачу. Конкретные возможности зависят от выбранного инструмента и разрешений.' },
  { title: 'Нужно ли уметь программировать?', answer: 'Начать можно с разным уровнем подготовки, но знания разработки помогают точно ставить задачи и оценивать результат. Для рабочего продукта всё ещё нужны понимание архитектуры, проверка безопасности и ответственное ревью.' },
  { title: 'А если агент ошибётся?', answer: 'Это возможно. Давайте агенту небольшие задачи, просите объяснять решения и проверять результат. Просматривайте diff, запускайте тесты и оставляйте важные решения за собой. Агент ускоряет работу, но не снимает с разработчика ответственность.' },
  { title: 'С чего начать в существующем проекте?', answer: 'Выберите небольшую изолированную задачу: добавить тест, объяснить незнакомый модуль или исправить воспроизводимую ошибку. Дайте агенту контекст, обозначьте ограничения и сначала согласуйте план. Готовые запросы для первого шага доступны по кнопке «Начать с агентами».' },
];

const processSteps = [
  { number: '01', title: 'Задайте направление', text: 'Опишите результат, поделитесь контекстом и обозначьте границы.', icon: 'target' },
  { number: '02', title: 'Доверьте исполнение', text: 'Агенты исследуют код, предложат план и возьмут задачи в работу.', icon: 'spark' },
  { number: '03', title: 'Примите результат', text: 'Проверьте изменения, дайте обратную связь и двигайтесь дальше.', icon: 'check' },
] as const;

const timelines = {
  agents: [
    { icon: 'target', label: 'Вы задаёте цель и ограничения', who: 'ВЫ' },
    { icon: 'layers', label: 'Агент исследует и предлагает план', who: 'АГЕНТ' },
    { icon: 'code', label: 'Реализация, тесты, проверка', who: 'АГЕНТ' },
    { icon: 'check', label: 'Вы проверяете и принимаете', who: 'ВЫ' },
  ],
  solo: [
    { icon: 'target', label: 'Определить задачу и подход', who: 'ВЫ' },
    { icon: 'layers', label: 'Изучить код и документацию', who: 'ВЫ' },
    { icon: 'code', label: 'Написать код и тесты', who: 'ВЫ' },
    { icon: 'check', label: 'Проверить и подготовить релиз', who: 'ВЫ' },
  ],
} as const;

export function LandingPage() {
  const { openStarter } = useOutletContext<PageContext>();
  const [withAgents, setWithAgents] = useState(true);
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);

  return <>
    <main id="main">
      <section className="hero container" id="home">
        <div className="hero-copy">
          <div className="hero-eyebrow"><span className="eyebrow-dot" /> НОВАЯ ЭРА РАЗРАБОТКИ <span className="eyebrow-version">/ 01</span></div>
          <h1>Вы создаёте.<br />Агенты<br /><span className="hero-accent">ускоряют.<svg viewBox="0 0 410 16" aria-hidden="true"><path d="M3 11C115 2 264 2 403 7" /></svg></span></h1>
          <p className="hero-description">Ваши идеи заслуживают большего, чем очередь<br className="desktop-break" /> в бэклоге. Соберите команду ИИ-агентов<br className="desktop-break" /> и сосредоточьтесь на том, что важно.</p>
          <div className="hero-actions"><button className="button button-dark" onClick={openStarter}>Начать с агентами <Icon name="arrowUp" size={19} /></button><a href="#how" className="text-button"><span className="play-circle"><Icon name="play" size={12} /></span>Как это работает</a></div>
          <div className="hero-footnote"><span className="mini-spark">✳</span><span>Меньше рутины. Больше инженерии.</span></div>
        </div>
        <WorkflowDemo />
      </section>

      <div className="toolbelt container"><span className="toolbelt-caption">НОВЫЙ ПОДХОД.<br /><strong>ЗНАКОМЫЙ СТЕК.</strong></span><div className="stack-items"><span><Icon name="code" />Любой код</span><span><Icon name="terminal" />Ваша IDE</span><span><Icon name="branch" />Ваш Git</span><span><Icon name="layers" />Ваши процессы</span></div><span className="toolbelt-end">Всё на своих местах.<Icon name="arrowUp" size={15} /></span></div>

      <section className="section container" id="why">
        <div className="section-topline"><span className="section-eyebrow"><span className="small-square" /> ПОЧЕМУ ЭТО МЕНЯЕТ ПРАВИЛА</span><span className="section-index">[ 01 — ПРЕИМУЩЕСТВА ]</span></div>
        <div className="section-heading"><h2>Ваш опыт.<br /><span className="muted-heading">Теперь с усилением.</span></h2><p>Хорошая разработка — это решения, а не количество<br className="desktop-break" /> написанных строк. Освободите для них место.</p></div>
        <div className="benefit-grid">
          <article className="benefit-card benefit-focus"><div className="benefit-title"><span className="benefit-icon"><Icon name="target" size={23} /></span><span className="card-number">01 /</span></div><h3>Фокус на главном</h3><p>Архитектура, продукт, сложные решения —<br className="desktop-break" /> ваши. Шаблонный код и повторяющиеся<br className="desktop-break" /> задачи можно делегировать.</p><div className="focus-visual" aria-hidden="true"><span className="focus-chip chip-tests"><Icon name="check" size={12} /> Тесты</span><span className="focus-chip chip-docs"><Icon name="check" size={12} /> Документация</span><div className="focus-core"><Icon name="spark" size={27} /><span>Ваша идея</span></div><span className="focus-chip chip-code"><Icon name="check" size={12} /> Рутинный код</span><div className="focus-orbit" /></div></article>
          <article className="benefit-card"><div className="benefit-title"><span className="benefit-icon"><Icon name="branch" size={23} /></span><span className="card-number">02 /</span></div><h3>От идеи к реализации</h3><p>Пока вы продумываете следующий шаг,<br className="desktop-break" /> агенты помогают исследовать код,<br className="desktop-break" /> собрать прототип и проверить гипотезу.</p><div className="speed-visual" aria-hidden="true"><div className="speed-row"><span>Идея</span><div className="speed-track"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><Icon name="arrow" size={18} /></div><div className="speed-result"><span className="speed-check"><Icon name="check" size={14} /></span><span>Первый рабочий прототип</span><span className="speed-spark">✳</span></div><span className="visual-caption">КОРОЧЕ ПУТЬ ДО ОБРАТНОЙ СВЯЗИ</span></div></article>
          <article className="benefit-card"><div className="benefit-title"><span className="benefit-icon"><Icon name="shield" size={23} /></span><span className="card-number">03 /</span></div><h3>Ещё один взгляд на код</h3><p>Попросите агента найти крайние случаи,<br className="desktop-break" /> добавить тесты и посмотреть на diff.<br className="desktop-break" /> Финальное ревью остаётся за вами.</p><div className="review-visual" aria-hidden="true"><div><Icon name="branch" size={13} /><span>feature / your-next-idea</span><span className="review-tag">REVIEW</span></div><p><span className="review-plus">+</span> expect(result).toBeDefined();</p><p><span className="review-plus">+</span> expect(errors).toHaveLength(0);</p><span className="review-bottom"><Icon name="check" size={12} /> Сначала проверка. Затем релиз.</span></div></article>
        </div>
      </section>

      <section className="comparison-section" aria-labelledby="comparison-title">
        <div className="container comparison-inner">
          <div className="comparison-copy"><span className="section-eyebrow"><span className="small-square" /> ДРУГАЯ ДИНАМИКА РАБОТЫ</span><h2 id="comparison-title">Тот же разработчик.<br /><span>Больше возможностей.</span></h2><p>Делегируйте последовательные шаги агентам,<br className="desktop-break" /> чтобы чаще возвращаться к сути задачи.<br className="desktop-break" /> Вы определяете цель и принимаете результат.</p><div className="comparison-note"><Icon name="command" size={20} /><span>Ваше мышление — главный инструмент.</span></div></div>
          <div className="comparison-demo">
            <div className="comparison-toggle" role="group" aria-label="Сравнение подходов"><button aria-pressed={!withAgents} onClick={() => setWithAgents(false)}>Самостоятельно</button><button aria-pressed={withAgents} onClick={() => setWithAgents(true)}><Icon name="spark" size={14} /> С ИИ-агентами</button></div>
            <div className="comparison-task"><span>ЗАДАЧА</span><strong>Добавить новую функцию</strong><Icon name="arrowUp" size={15} /></div>
            <div className="timeline" aria-live="polite">
              {timelines[withAgents ? 'agents' : 'solo'].map((item, index) => <div className={`timeline-row ${withAgents && item.who === 'ВЫ' ? 'timeline-accent' : ''}`} key={`${withAgents}-${index}`}><span className="timeline-icon"><Icon name={item.icon} size={16} /></span><span>{item.label}</span><span className="timeline-who">{item.who}</span></div>)}
            </div>
            <div className="comparison-result"><span className="live-dot" /><span>{withAgents ? 'Меньше переключений. Больше пространства для решений.' : 'На каждом этапе — ваше время и внимание.'}</span></div>
          </div>
        </div>
      </section>

      <section className="section how-section container" id="how">
        <div className="section-topline"><span className="section-eyebrow"><span className="small-square" /> ПРОЩЕ, ЧЕМ КАЖЕТСЯ</span><span className="section-index">[ 02 — ПРОЦЕСС ]</span></div>
        <div className="section-heading"><h2>От вас — направление.<br /><span className="muted-heading">От агентов — движение.</span></h2><a className="text-link" href="#workflow-demo">Посмотреть демо <Icon name="arrowUp" size={17} /></a></div>
        <div className="process-grid">{processSteps.map(step => <article className="process-step" key={step.number}><div className="process-step-top"><span className="process-number">{step.number}</span><div className="process-line" /><Icon name={step.icon} size={23} /></div><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
      </section>

      <section className="faq-section container" id="questions">
        <div className="faq-heading"><span className="section-eyebrow"><span className="small-square" /> БЕЗ МАГИИ</span><h2>Хорошие вопросы.<br /><span className="muted-heading">Честные ответы.</span></h2><p>Новый подход, понятные принципы.</p></div>
        <div className="faq-list">{questions.map((question, index) => <article className={`faq-item ${openQuestion === index ? 'faq-open' : ''}`} key={question.title}><h3><button aria-expanded={openQuestion === index} aria-controls={`answer-${index}`} id={`question-${index}`} onClick={() => setOpenQuestion(openQuestion === index ? null : index)}>{question.title}<Icon name="plus" size={19} /></button></h3><div id={`answer-${index}`} role="region" aria-labelledby={`question-${index}`} hidden={openQuestion !== index}><p>{question.answer}</p></div></article>)}</div>
      </section>

      <section className="closing-section container"><div className="closing-grid" aria-hidden="true" /><div className="closing-copy"><span className="section-eyebrow"><span className="small-square" /> СЛЕДУЮЩИЙ КОММИТ МОЖЕТ БЫТЬ ДРУГИМ</span><h2>Большие идеи.<br />Теперь — с командой.</h2><p>Начните с одной задачи. Почувствуйте разницу.</p><button className="button button-dark" onClick={openStarter}>Начать с агентами <Icon name="arrowUp" size={19} /></button></div><div className="closing-art" aria-hidden="true"><span /><span /><span /><span /><div><Icon name="spark" size={60} /></div></div><span className="closing-coordinate">ИНИЦИАТИВА: ВАША. ВОЗМОЖНОСТИ: ШИРЕ.</span></section>
    </main>

    <footer className="site-footer container"><div className="footer-top"><Brand /><span>Создавайте то, что имеет значение.</span><a href="#home" className="footer-up">Наверх <Icon name="arrowUp" size={15} /></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} agentica</span><span>Сделано людьми. Вместе с агентами. <span className="footer-spark">✳</span></span></div></footer>
  </>;
}
