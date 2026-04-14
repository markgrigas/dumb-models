import { useState } from 'react';
import { generateShape, continueScene } from '../ai/claudeClient.js';
import styles from './GeneratePanel.module.css';

export default function GeneratePanel({ onGenerate, settings }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [sceneName, setSceneName] = useState(null);
  const [confirmNew, setConfirmNew] = useState(false);

  const isRefining = history.length > 0;

  async function handleGenerate() {
    if (!prompt.trim() || !settings || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = isRefining
        ? await continueScene(prompt.trim(), history, settings)
        : await generateShape(prompt.trim(), settings);

      setHistory(result.history);
      setSceneName(result.shape.name);
      onGenerate(result.shape);
      setPrompt('');
    } catch (err) {
      setError(err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  function handleNewScene() {
    if (!confirmNew) {
      setConfirmNew(true);
      return;
    }
    setHistory([]);
    setSceneName(null);
    setPrompt('');
    setError(null);
    setConfirmNew(false);
  }

  function handleCancelNew() {
    setConfirmNew(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleGenerate();
    }
  }

  const hasCredentials = settings?.provider === 'anthropic'
    ? !!settings?.anthropicApiKey
    : settings?.provider === 'openai-compat'
      ? !!settings?.openaiCompatUrl
      : settings?.provider === 'mcp'
        ? !!settings?.mcpServerUrl
        : false;
  const disabled = !hasCredentials || !prompt.trim() || loading;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.label}>✦ Generate</span>
        {isRefining && !confirmNew && (
          <button className={styles.newBtn} onClick={handleNewScene}>New scene</button>
        )}
        {confirmNew && (
          <span className={styles.confirmRow}>
            <button className={styles.confirmBtn} onClick={handleNewScene}>Yes, clear</button>
            <button className={styles.newBtn} onClick={handleCancelNew}>Cancel</button>
          </span>
        )}
      </div>

      {isRefining && (
        <p className={styles.activeScene}>{sceneName}</p>
      )}

      <textarea
        className={styles.textarea}
        placeholder={isRefining
          ? 'What would you like to add or change?'
          : 'Describe a scene… (e.g. a christmas tree)'}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        disabled={loading}
      />

      {!hasCredentials && (
        <p className={styles.hint}>Configure a model provider in the toolbar to generate shapes.</p>
      )}

      <button className={styles.btn} onClick={handleGenerate} disabled={disabled}>
        {loading ? 'Generating…' : isRefining ? 'Refine' : 'Generate'}
      </button>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
