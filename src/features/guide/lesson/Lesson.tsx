import type { ComponentType } from 'react';
import { Icon } from '../../../components/Icon';
import { nbsp } from '../../../lib/typography';
import { CodeFile } from './CodeFile';
import { CopyCommand } from './CopyCommand';
import { DiffView } from './DiffView';
import { Checkpoints } from './diagrams/Checkpoints';
import { DelegationGrid } from './diagrams/DelegationGrid';
import { HookEvents } from './diagrams/HookEvents';
import { ContextWindow } from './diagrams/ContextWindow';
import { MemoryLayers } from './diagrams/MemoryLayers';
import { PermissionModes } from './diagrams/PermissionModes';
import { PlanLoop } from './diagrams/PlanLoop';
import { StepLadder } from './diagrams/StepLadder';
import { Subagents } from './diagrams/Subagents';
import { Rich } from './Rich';
import { SessionReplay } from './SessionReplay';
import { SpotTrainer } from './SpotTrainer';
import type { Block, DiagramName, Lesson } from './types';

const diagrams: Record<DiagramName, ComponentType> = { 'plan-loop': PlanLoop, checkpoints: Checkpoints, 'permission-modes': PermissionModes, 'context-window': ContextWindow, 'memory-layers': MemoryLayers, 'step-ladder': StepLadder, 'delegation-grid': DelegationGrid, 'hook-events': HookEvents, subagents: Subagents };

function LessonBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'text': return <p><Rich text={block.text} /></p>;
    case 'heading': return <h2>{nbsp(block.text)}</h2>;
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul';
      return <List className="lesson-list">{block.items.map(item => <li key={item}><Rich text={item} /></li>)}</List>;
    }
    case 'callout': return <div className="lesson-callout" data-tone={block.tone} role="note">
      <Icon name={block.tone === 'trap' ? 'shield' : 'spark'} size={18} />
      <div><strong>{nbsp(block.title)}</strong><p><Rich text={block.text} /></p></div>
    </div>;
    case 'command': return <CopyCommand code={block.code} caption={block.caption} />;
    case 'code': return <CodeFile file={block.file} code={block.code} caption={block.caption} />;
    case 'diff': return <DiffView file={block.file} lines={block.lines} caption={block.caption} />;
    case 'session': return <SessionReplay title={block.title} summary={block.summary} lines={block.lines} />;
    case 'compare': return <div className="lesson-compare">
      {([['before', block.before], ['after', block.after]] as const).map(([side, { label, text, note, file }]) => <div className="compare-side" data-side={side} key={side}>
        <span className="compare-label">{nbsp(label)}</span>
        <p className="compare-prompt">{!file && <><span aria-hidden="true">&gt;</span> </>}{text}</p>
        <p className="compare-note"><Rich text={note} /></p>
      </div>)}
    </div>;
    case 'diagram': {
      const Diagram = diagrams[block.name];
      return Diagram ? <figure className="lesson-diagram"><Diagram /><figcaption><Rich text={block.caption} /></figcaption></figure> : null;
    }
    case 'scene': return <p className="lesson-scene"><Rich text={block.text} /></p>;
    case 'bridge':
    case 'why': return <div className="lesson-aside" data-kind={block.type} role="note">
      <Icon name={block.type === 'bridge' ? 'branch' : 'layers'} size={18} />
      <div><strong>{block.type === 'bridge' ? 'Вы это уже умеете' : 'Почему так'}</strong><p><Rich text={block.text} /></p></div>
    </div>;
    case 'spot': return <SpotTrainer block={block} />;
    case 'sources': return <nav className="lesson-sources" aria-label="Источники">
      <span className="story-eyebrow"><i /> Источники</span>
      <ul>{block.links.map(link => <li key={link.url}>
        <a href={link.url} target="_blank" rel="noopener noreferrer">{nbsp(link.title)}<span className="visually-hidden"> (откроется в новой вкладке)</span> <Icon name="arrow" size={14} /></a>
      </li>)}</ul>
    </nav>;
    // A block from newer content than this page knows: skip it rather than fail.
    default: return null;
  }
}

// The lesson's teaching part, then the practice for the member's own project.
export function LessonBody({ lesson }: { lesson: Lesson }) {
  return <>
    <article className="lesson" aria-labelledby="step-title">
      {/* Blocks are a fixed list from the server, never reordered, so their place is their key. */}
      {lesson.blocks.map((block, index) => <LessonBlock block={block} key={index} />)}
    </article>
    <section className="lesson-practice" aria-labelledby="practice-title">
      <span className="story-eyebrow"><i /> Ваш проект</span>
      <h2 id="practice-title">Практика у себя</h2>
      <p><Rich text={lesson.practice.task} /></p>
      <p className="practice-done">Готово, если:</p>
      <ul className="lesson-list">{lesson.practice.done.map(item => <li key={item}><Rich text={item} /></li>)}</ul>
    </section>
  </>;
}
