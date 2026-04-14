import { useState, useRef } from 'react';
import Toolbar from './components/Toolbar';
import SidePanel from './components/SidePanel';
import SceneViewer from './components/SceneViewer';
import styles from './App.module.css';
import './App.css';

function loadSettings() {
  try {
    const stored = localStorage.getItem('model_settings');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  // Back-compat: migrate legacy anthropic_api_key
  const legacyKey = localStorage.getItem('anthropic_api_key') || '';
  return { provider: 'anthropic', anthropicApiKey: legacyKey };
}

export default function App() {
  const [selectedShape, setSelectedShape] = useState(null);
  const [savedShapes, setSavedShapes]     = useState([]);
  const [settings, setSettings]           = useState(loadSettings);
  const exportFnRef = useRef(null);

  function handleSettingsChange(next) {
    setSettings(next);
    localStorage.setItem('model_settings', JSON.stringify(next));
    // Keep legacy key in sync for any code still reading it directly
    if (next.anthropicApiKey) {
      localStorage.setItem('anthropic_api_key', next.anthropicApiKey);
    }
  }

  function handleSave(shape) {
    setSavedShapes(prev =>
      prev.some(s => s.id === shape.id) ? prev : [...prev, shape]
    );
  }

  async function handleExport() {
    if (!exportFnRef.current) return;
    const blob = await exportFnRef.current();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${selectedShape?.name ?? 'scene'}.glb`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.app}>
      <Toolbar
        settings={settings}
        onSettingsChange={handleSettingsChange}
        canExport={!!selectedShape}
        onExport={handleExport}
      />
      <div className={styles.body}>
        <SidePanel
          onSelect={setSelectedShape}
          onSave={handleSave}
          savedShapes={savedShapes}
          settings={settings}
        />
        <SceneViewer
          shapeConfig={selectedShape}
          onExportReady={fn => { exportFnRef.current = fn; }}
        />
      </div>
    </div>
  );
}
