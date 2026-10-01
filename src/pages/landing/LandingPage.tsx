import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useOutletContext } from 'react-router';
import type { PageContext } from '../../app/App';
import { Brand, Icon, type IconName } from '../../components/Icon';
import { PathScene } from '../../features/landing/PathScene';
import { RoleShift } from '../../features/landing/RoleShift';
import { SignupLink } from '../../features/landing/SignupLink';
import { TypingFilm } from '../../features/landing/TypingFilm';
import { motionAllowed } from '../../lib/motion';
import { spotlight } from '../../lib/spotlight';
import { nbsp } from '../../lib/typography';

// GSAP, its plugins and smooth scrolling ship as their own chunk, so the main one (members' too) stays light.
const LandingMotion = lazy(() => import('../../features/landing/motion/LandingMotion'));

const ticker = ['Постановка задачи', 'Контекст проекта', 'План до кода', 'Ревью diff', 'Тесты в каждой задаче', 'Хуки и проверки', 'Параллельные агенты', 'Ответственность за результат'];

const skills: { title: string; text: string; icon: IconName; wide?: boolean; visual: ReactNode }[] = [
  {
    title: 'Постановка задачи', icon: 'target', wide: true,
    text: nbsp('Результат, ограничения, критерий готовности. Точная формулировка экономит часы итераций и делает работу агента предсказуемой.'),
    visual: <div className="visual-prompt"><div className="prompt-chips"><span>Цель: оплата картой</span><span>Не трогать API заказов</span><span>Готово, когда тесты зелёные</span></div><div className="prompt-foot"><span>Claude Code · сначала план</span><b><Icon name="arrowUp" size={15} /></b></div></div>,
  },
  {
    title: 'Контекст проекта', icon: 'layers',
    text: nbsp('Архитектура, соглашения и команды проверки в CLAUDE.md: агент работает по правилам вашей команды.'),
    visual: <div className="visual-file"><span><Icon name="code" size={13} /> CLAUDE.md</span><p><b>## Архитектура</b></p><p>src/cart — корзина и промокоды</p><p><b>## Проверки</b></p><p>npm run lint · npm test</p></div>,
  },
  {
    title: nbsp('План до кода'), icon: 'check',
    text: nbsp('Сначала согласуйте подход и компромиссы, потом разрешайте правки.'),
    visual: <ol className="visual-plan"><li>Изучить модуль</li><li>Согласовать подход</li><li>Внести правки</li></ol>,
  },
  {
    title: nbsp('Ревью как у тимлида'), icon: 'shield', wide: true,
    text: nbsp('Читайте diff, задавайте вопросы, требуйте тесты. Агент ускоряет работу, но ответственность за код остаётся за вами.'),
    visual: <div className="visual-diff"><p className="diff-del">− const total = price * qty;</p><p className="diff-add">+ const total = applyPromo(price * qty, code);</p><p className="diff-add">+ expect(total).toBe(900);</p><span>Вы: «Добавь случай с просроченным кодом»</span><p className="diff-add diff-reply">+ it('отклоняет просроченный код', …)</p></div>,
  },
  {
    title: 'Автоматические проверки', icon: 'command', wide: true,
    text: nbsp('Хуки, линтер и тесты проверяют каждую правку агента раньше, чем вы откроете diff.'),
    visual: <div className="visual-pipeline"><span>lint</span><i /><span>build</span><i /><span>test</span><i /><b><Icon name="check" size={14} /></b></div>,
  },
  {
    title: 'Параллельные агенты', icon: 'branch',
    text: nbsp('Несколько задач одновременно — в отдельных сессиях и ветках.'),
    // Three branches leave main and merge back, each with a commit on the way.
    visual: <svg className="visual-branches" viewBox="0 0 300 128" role="presentation">
      <path className="branch-main" d="M8 112H292" />
      <path className="branch-a" d="M28 112C54 112 54 22 80 22H212C238 22 238 112 264 112" />
      <path className="branch-b" d="M48 112C71 112 71 54 94 54H182C203 54 203 112 224 112" />
      <path className="branch-c" d="M68 112C86 112 86 84 104 84H150C167 84 167 112 184 112" />
      <circle className="branch-a" cx="146" cy="22" r="3.5" /><circle className="branch-b" cx="140" cy="54" r="3.5" /><circle className="branch-c" cx="127" cy="84" r="3.5" />
      <circle className="branch-merge branch-c" cx="184" cy="112" r="4.5" /><circle className="branch-merge branch-b" cx="224" cy="112" r="4.5" /><circle className="branch-merge branch-a" cx="264" cy="112" r="4.5" />
      <text x="86" y="14">feature/promo</text><text x="100" y="46">fix/checkout</text><text x="110" y="76">test/cart</text>
    </svg>,
  },
];

const chapters = ['Первый день с Claude Code', 'CLAUDE.md, который работает', 'Как ставить задачи агенту', 'Ревью кода, написанного агентом', 'Хуки, тесты и автоматические проверки', 'Команда агентов'].map(nbsp);

const questions = [
  { title: 'Заменит ли ИИ разработчиков?', answer: 'Он меняет содержание работы. Набор кода всё больше делегируется агентам, а ценность смещается к постановке задач, архитектуре, ревью и ответственности за результат. Именно этим навыкам посвящён путеводитель.' },
  { title: 'Что такое Claude Code?', answer: 'Инструмент Anthropic для агентной разработки. Он работает в терминале, IDE, десктопном приложении и браузере: читает проект, редактирует файлы и выполняет команды — с вашего разрешения.' },
  { title: 'Нужен ли опыт программирования?', answer: 'Да, и он становится преимуществом. Оркестратор должен понимать, о чём просит, и уметь оценить результат. Чем глубже ваш опыт, тем точнее задачи и строже ревью.' },
  { title: 'Что будет в путеводителе и когда?', answer: 'Маршрут перехода по шагам, шаблоны запросов, настройка CLAUDE.md и автоматических проверок, разборы типичных ошибок. Он появится в разделе для участников — зарегистрированные пользователи получат доступ сразу после выхода.' },
  { title: 'Регистрация платная?', answer: 'Нет. Войдите через Google или по email и паролю: мы храним только имя, email и ваш прогресс.' },
].map(question => ({ title: nbsp(question.title), answer: nbsp(question.answer) }));

const trackSpotlight = spotlight('.skill-card');

export function LandingPage() {
  const { openStarter } = useOutletContext<PageContext>();
  const main = useRef<HTMLElement>(null);
  // Reduced motion, data saver and very short screens keep the static page and never download the motion layer.
  const [motion] = useState(motionAllowed);

  useEffect(() => {
    if (!motion) return;
    // A motion layer that never arrives (offline, blocked chunk) must not leave the hero hidden:
    // after a while the static page takes over for good.
    const timer = window.setTimeout(() => {
      if (main.current?.dataset.motion === 'pending') main.current.dataset.motion = 'off';
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [motion]);

  // `data-reveal="head"` groups and `.reveal` blocks are animated by the motion layer; without it they stay in place.
  return <>
    {/* `data-header`: clear over the film, then glass or hidden (motion/chrome.ts); without motion the header stays solid. */}
    <main id="main" className="landing-page" ref={main} data-motion={motion ? 'pending' : 'off'} data-header={motion ? 'clear' : undefined}>
      <div className="aurora" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="scroll-meter" aria-hidden="true" />

      <TypingFilm>
        <span className="intro-badge"><i /> Новая роль разработчика</span>
        <h1 className="intro-title" id="intro-title">Код пишет Claude.{' '}<br />Решения{' '}— <em className="accent glow-text">ваши.</em></h1>
        <p className="intro-lead">{nbsp('Время, когда ценность разработчика измерялась набранными строками, уходит. Вы ставите задачу — Claude Code изучает проект, правит файлы и запускает тесты. За вами архитектура, ревью и последнее слово.')}</p>
        <div className="intro-actions">
          <SignupLink morph="hero">Получить доступ <Icon name="arrowUp" size={18} /></SignupLink>
          <Link className="ghost-button" to="#why">Как меняется роль <Icon name="arrow" size={17} /></Link>
        </div>
        <p className="intro-note"><Icon name="shield" size={15} /> {nbsp('Вход через Google или по email. Путеводитель по переходу готовится для участников.')}</p>
      </TypingFilm>

      <div className="ticker" aria-hidden="true"><div className="ticker-track">{[...ticker, ...ticker].map((item, index) => <span key={`${item}-${index}`}>{item}<i>✦</i></span>)}</div></div>

      <section className="shift container" id="why" aria-labelledby="shift-title">
        <div className="story-head" data-reveal="head">
          <span className="story-eyebrow"><i /> Сдвиг роли</span>
          <h2 id="shift-title">Было: печатать код.{' '}<br />Стало: управлять <em className="accent">результатом.</em></h2>
          <p>{nbsp('Один и тот же разработчик — до и после Claude Code. Граница сама показывает, как новое вытесняет старое.')}</p>
        </div>
        <RoleShift />
      </section>

      <section className="skills container" aria-labelledby="skills-title">
        <div className="story-head" data-reveal="head">
          <span className="story-eyebrow"><i /> Навыки оркестратора</span>
          <h2 id="skills-title">Агент печатает.{' '}<br />Вы{' '}— <em className="accent">думаете.</em></h2>
          <p>{nbsp('Набор кода больше не узкое место. Узкое место — ясность мысли. Вот что теперь отличает сильного разработчика.')}</p>
        </div>
        <div className="skill-grid" onPointerMove={trackSpotlight}>
          {/* `--i` offsets each card's sticky top in the phone stack. */}
          {skills.map((skill, index) => <article className={`skill-card reveal ${skill.wide ? 'skill-wide' : ''}`} key={skill.title} style={{ '--i': index } as CSSProperties}>
            <span className="skill-icon"><Icon name={skill.icon} size={22} /></span>
            <h3>{skill.title}</h3>
            <p>{skill.text}</p>
            <div className="skill-visual" aria-hidden="true">{skill.visual}</div>
          </article>)}
        </div>
      </section>

      <section className="path container" id="how" aria-labelledby="path-title">
        <div className="story-head" data-reveal="head">
          <span className="story-eyebrow"><i /> Путь перехода</span>
          <h2 id="path-title">Шесть шагов{' '}<br />от клавиатуры <em className="accent">к{' '}оркестровке.</em></h2>
          <p>{nbsp('Переход не случается за один день. Это последовательность привычек — каждая снимает с вас часть рутины.')}</p>
        </div>
        <PathScene />
      </section>

      <section className="guide container" id="guide" aria-labelledby="guide-title">
        <div className="guide-copy" data-reveal="head">
          <span className="story-eyebrow"><i /> Только для участников</span>
          <h2 id="guide-title">Путеводитель по{' '}переходу{' '}<br />уже готовится <em className="accent">внутри.</em></h2>
          <p>{nbsp('Маршрут от первого запуска Claude Code до работы с командой агентов: практики, шаблоны запросов, разборы ошибок. Зарегистрируйтесь сейчас — путеводитель появится в вашем аккаунте сразу после выхода.')}</p>
          <ul className="guide-perks">
            <li><Icon name="check" size={17} /> {nbsp('Вход через Google за пару кликов')}</li>
            <li><Icon name="check" size={17} /> {nbsp('Или по email и паролю')}</li>
            <li><Icon name="check" size={17} /> {nbsp('Только профиль и email')}</li>
          </ul>
          <SignupLink morph="guide">Зарегистрироваться <Icon name="arrowUp" size={18} /></SignupLink>
        </div>
        <div className="guide-visual reveal">
          <div className="guide-volume">
            <div className="guide-book">
              <div className="guide-book-top"><span><Icon name="layers" size={15} /> Путеводитель</span><span className="guide-soon">Скоро</span></div>
              <h3>Планируемые главы</h3>
              <ol className="guide-chapters">{chapters.map((chapter, index) => <li key={chapter}><span>Глава {index + 1}</span><strong>{chapter}</strong><Icon name="lock" size={16} /></li>)}</ol>
              <p className="guide-book-note">{nbsp('Состав глав может измениться до выхода.')}</p>
            </div>
            {/* With motion the cover opens as the section scrolls in (motion/book.ts). */}
            <div className="guide-cover" aria-hidden="true">
              <span className="guide-soon">Скоро</span>
              <strong>Путеводитель <em className="accent">по{' '}переходу</em></strong>
              <span className="guide-cover-foot"><b>agentica<i>.</i></b> для участников</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ask container" id="questions" aria-labelledby="ask-title">
        <div className="story-head" data-reveal="head">
          <span className="story-eyebrow"><i /> Вопросы</span>
          <h2 id="ask-title">Честно{' '}<br /><em className="accent">о{' '}главном.</em></h2>
          <p>{nbsp('Коротко о том, что меняется и что остаётся за вами.')}</p>
        </div>
        <div className="ask-list">{questions.map((question, index) => <details className="ask-item reveal" name="questions" open={index === 0} key={question.title}>
          <summary>{question.title}<Icon name="plus" size={19} /></summary>
          <p>{question.answer}</p>
        </details>)}</div>
      </section>

      <section className="outro container" aria-labelledby="outro-title">
        <div className="outro-card" data-reveal="head">
          <span className="story-eyebrow"><i /> Следующий шаг</span>
          <h2 id="outro-title">Перестаньте печатать.{' '}<br />Начните <em className="accent glow-text">управлять.</em></h2>
          <p>{nbsp('Присоединяйтесь сейчас — и получите путеводитель по переходу, как только он выйдет.')}</p>
          <div className="outro-actions">
            <SignupLink morph="outro">Получить доступ <Icon name="arrowUp" size={18} /></SignupLink>
            <button type="button" className="ghost-button" onClick={openStarter}>Готовые запросы для старта <Icon name="terminal" size={17} /></button>
          </div>
        </div>
      </section>
    </main>

    <footer className="site-footer container"><div className="footer-top"><Brand /><span>{nbsp('Разработчик, который управляет агентами.')}</span><Link to="#home" className="footer-up">Наверх <Icon name="arrowUp" size={15} /></Link></div><div className="footer-bottom"><span>© {new Date().getFullYear()} agentica</span><span>Сделано людьми. Вместе с агентами. <span className="footer-spark">✳</span></span></div><div className="footer-mark" aria-hidden="true">agentica</div></footer>
    {motion && <Suspense fallback={null}><LandingMotion main={main} /></Suspense>}
  </>;
}
