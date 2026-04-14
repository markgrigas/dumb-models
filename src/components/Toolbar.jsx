import { useState } from 'react';
import styles from './Toolbar.module.css';

const PROVIDERS = [
  { value: 'anthropic',    label: 'Anthropic (Claude)' },
  { value: 'openai-compat', label: 'OpenAI-compatible' },
  { value: 'mcp',          label: 'MCP Server' },
];

export default function Toolbar({ settings, onSettingsChange, canExport, onExport }) {
  const [open, setOpen] = useState(false);

  function update(patch) {
    const next = { ...settings, ...patch };
    onSettingsChange(next);
  }

  const provider = settings.provider ?? 'anthropic';

  return (
    <header className={styles.toolbar}>
      <span className={styles.title}>dumb-models</span>
      <div className={styles.right}>
        <div className={styles.settingsWrap}>
          <button className={styles.settingsBtn} onClick={() => setOpen(o => !o)}>
            ⚙ Model
          </button>
          {open && (
            <div className={styles.settingsPanel}>
              <label className={styles.row}>
                <span>Provider</span>
                <select
                  className={styles.select}
                  value={provider}
                  onChange={e => update({ provider: e.target.value })}
                >
                  {PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </label>

              {provider === 'anthropic' && (
                <label className={styles.row}>
                  <span>API Key</span>
                  <input
                    type="password"
                    className={styles.input}
                    placeholder="sk-ant-..."
                    value={settings.anthropicApiKey ?? ''}
                    onChange={e => update({ anthropicApiKey: e.target.value })}
                    autoComplete="off"
                  />
                </label>
              )}

              {provider === 'openai-compat' && (<>
                <label className={styles.row}>
                  <span>Base URL</span>
                  <input
                    className={styles.input}
                    placeholder="http://localhost:11434/v1"
                    value={settings.openaiCompatUrl ?? ''}
                    onChange={e => update({ openaiCompatUrl: e.target.value })}
                  />
                </label>
                <label className={styles.row}>
                  <span>Model</span>
                  <input
                    className={styles.input}
                    placeholder="llama3"
                    value={settings.openaiCompatModel ?? ''}
                    onChange={e => update({ openaiCompatModel: e.target.value })}
                  />
                </label>
                <label className={styles.row}>
                  <span>API Key</span>
                  <input
                    type="password"
                    className={styles.input}
                    placeholder="(optional)"
                    value={settings.openaiCompatKey ?? ''}
                    onChange={e => update({ openaiCompatKey: e.target.value })}
                    autoComplete="off"
                  />
                </label>
              </>)}

              {provider === 'mcp' && (
                <label className={styles.row}>
                  <span>Server URL</span>
                  <input
                    className={styles.input}
                    placeholder="http://localhost:3100"
                    value={settings.mcpServerUrl ?? ''}
                    onChange={e => update({ mcpServerUrl: e.target.value })}
                  />
                </label>
              )}
            </div>
          )}
        </div>

        <button className={styles.exportBtn} disabled={!canExport} onClick={onExport}>
          Export
        </button>
      </div>
    </header>
  );
}
