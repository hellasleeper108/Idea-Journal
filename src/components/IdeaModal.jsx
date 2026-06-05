import { useState, useEffect, useRef } from 'react';
import { X, Trash2, Tag, Terminal, Sparkles, Bot } from 'lucide-react';
import { claudeApi, codexApi } from '../utils/api';
import { STATUS_OPTIONS } from '../utils/storage';
import { formatTimestamp } from '../utils/time';
import styles from './IdeaModal.module.css';

const FIELDS = [
  {
    key: 'hook',
    label: 'THE HOOK',
    hint: 'One or two sentences. What\'s the core insight? Why does this feel exciting right now?',
    rows: 2,
  },
  {
    key: 'seed',
    label: 'TECHNICAL SEED',
    hint: 'The novel architecture, interesting implementation, specific library, or unique combination of tools.',
    rows: 3,
  },
  {
    key: 'footprint',
    label: 'MINIMUM FOOTPRINT',
    hint: 'What does v0.1 actually look like? Force a rough answer — converts fantasy to a starting point.',
    rows: 3,
  },
];

const AGENTS = {
  claude: {
    label: 'CLAUDE',
    prefix: '/claude',
    placeholder: '/claude expand, /claude scaffold, /claude score',
    api: claudeApi,
  },
  codex: {
    label: 'CODEX',
    prefix: '/codex',
    placeholder: '/codex plan, /codex scaffold, /codex expand',
    api: codexApi,
  },
};

export default function IdeaModal({ idea, onClose, onUpdate, onDelete }) {
  const [form, setForm] = useState({ ...idea });
  const [tagInput, setTagInput] = useState('');
  const [agent, setAgent] = useState('codex');
  const [commandInput, setCommandInput] = useState('');
  const [commandOutput, setCommandOutput] = useState('');
  const [commandState, setCommandState] = useState('idle');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const overlayRef = useRef();
  const firstFieldRef = useRef();

  useEffect(() => {
    firstFieldRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const set = (key, val) => {
    const updated = { ...form, [key]: val };
    setForm(updated);
    onUpdate(idea.id, updated);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (t && !form.tags.includes(t)) {
      set('tags', [...form.tags, t]);
    }
    setTagInput('');
  };

  const removeTag = (tag) => set('tags', form.tags.filter(t => t !== tag));

  const handleTagKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
    if (e.key === 'Backspace' && !tagInput && form.tags.length) {
      set('tags', form.tags.slice(0, -1));
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(idea.id);
      onClose();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const runAgentCommand = async () => {
    const command = commandInput.trim();
    if (!command || commandState === 'running') return;

    const activeAgent = AGENTS[agent];
    const normalized = command.startsWith(activeAgent.prefix)
      ? command
      : `${activeAgent.prefix} ${command}`;
    const instructionFor = (verb) => normalized.replace(`${activeAgent.prefix} ${verb}`, '').trim();
    setCommandState('running');
    setCommandOutput('');

    try {
      if (normalized.startsWith(`${activeAgent.prefix} expand`)) {
        const result = await activeAgent.api.expand(idea.id, instructionFor('expand'));
        setForm(result.idea);
        onUpdate(idea.id, result.idea);
        setCommandOutput(result.rationale || result.raw || 'Expanded idea fields.');
      } else if (normalized.startsWith(`${activeAgent.prefix} scaffold`)) {
        const result = await activeAgent.api.scaffold(idea.id, instructionFor('scaffold'));
        setCommandOutput(result.brief);
      } else if (agent === 'codex' && normalized.startsWith('/codex plan')) {
        const result = await codexApi.plan(idea.id, instructionFor('plan'));
        setCommandOutput(result.plan);
      } else {
        await activeAgent.api.command(idea.id, normalized, (_chunk, output) => {
          setCommandOutput(output);
        });
      }
      setCommandInput('');
      setCommandState('done');
    } catch (err) {
      setCommandOutput(err.message);
      setCommandState('error');
    }
  };

  const handleCommandKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runAgentCommand();
    }
  };

  const setAgentMode = (nextAgent) => {
    setAgent(nextAgent);
    setCommandOutput('');
    setCommandState('idle');
  };

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalMeta}>
            <span className={styles.modalId}>{idea.id.slice(0, 16)}</span>
            <span className={styles.modalDate}>
              created {formatTimestamp(idea.createdAt)}
            </span>
          </div>
          <div className={styles.modalActions}>
            <button
              className={`${styles.deleteBtn} ${confirmDelete ? styles.confirmDelete : ''}`}
              onClick={handleDelete}
              title="Delete idea"
            >
              <Trash2 size={12} />
              {confirmDelete ? 'CONFIRM?' : 'DELETE'}
            </button>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Status Selector */}
        <div className={styles.statusRow}>
          {STATUS_OPTIONS.map(s => (
            <button
              key={s.value}
              className={`${styles.statusBtn} ${form.status === s.value ? styles.statusActive : ''}`}
              style={form.status === s.value ? { color: s.color, background: s.bg, borderColor: s.color } : {}}
              onClick={() => set('status', s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className={styles.fields}>
          {FIELDS.map((f, i) => (
            <div key={f.key} className={styles.field}>
              <label className={styles.fieldLabel}>{f.label}</label>
              <p className={styles.fieldHint}>{f.hint}</p>
              <textarea
                ref={i === 0 ? firstFieldRef : null}
                className={styles.textarea}
                value={form[f.key] || ''}
                onChange={e => set(f.key, e.target.value)}
                rows={f.rows}
                placeholder="..."
              />
            </div>
          ))}
        </div>

        <div className={styles.commandPanel}>
          <div className={styles.commandHeader}>
            <label className={styles.fieldLabel}>
              <Terminal size={10} /> AGENT COMMAND
            </label>
            <div className={styles.agentToggle} aria-label="Agent mode">
              {Object.entries(AGENTS).map(([key, config]) => (
                <button
                  key={key}
                  className={`${styles.agentBtn} ${agent === key ? styles.agentActive : ''}`}
                  onClick={() => setAgentMode(key)}
                  type="button"
                >
                  {key === 'codex' ? <Bot size={11} /> : <Sparkles size={11} />}
                  {config.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.commandRow}>
            <input
              className={styles.commandInput}
              value={commandInput}
              onChange={e => setCommandInput(e.target.value)}
              onKeyDown={handleCommandKey}
              placeholder={AGENTS[agent].placeholder}
            />
            <button
              className={styles.commandBtn}
              onClick={runAgentCommand}
              disabled={commandState === 'running'}
              title={`Run ${AGENTS[agent].label} command`}
            >
              <Sparkles size={13} />
            </button>
          </div>
          {commandOutput && (
            <pre className={`${styles.commandOutput} ${commandState === 'error' ? styles.commandError : ''}`}>
              {commandOutput}
            </pre>
          )}
        </div>

        {/* Tags */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            <Tag size={10} /> TAGS
          </label>
          <div className={styles.tagRow}>
            {form.tags.map(tag => (
              <span key={tag} className={styles.tagPill}>
                #{tag}
                <button onClick={() => removeTag(tag)} className={styles.tagRemove}>×</button>
              </span>
            ))}
            <input
              className={styles.tagInput}
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKey}
              placeholder="add tag, press Enter"
            />
          </div>
        </div>

        {/* Score */}
        <div className={styles.field}>
          <label className={styles.fieldLabel}>COOLDOWN SCORE</label>
          <p className={styles.fieldHint}>After two weeks, does this still feel compelling? Rate 1–10.</p>
          <div className={styles.scoreRow}>
            {[...Array(10)].map((_, i) => (
              <button
                key={i + 1}
                className={`${styles.scoreBtn} ${form.score === i + 1 ? styles.scoreActive : ''}`}
                onClick={() => set('score', form.score === i + 1 ? null : i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.saveHint}>// changes save instantly · ESC to close</div>
      </div>
    </div>
  );
}
