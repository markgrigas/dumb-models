import { useState, useEffect } from 'react';
import { search } from '../rag/retrieval.js';
import GeneratePanel from './GeneratePanel';
import ModelDropzone from './ModelDropzone';
import LibraryDrawer from './LibraryDrawer';
import styles from './SidePanel.module.css';

export default function SidePanel({ onSelect, onSave, savedShapes, settings }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    setResults(search(query, 20));
  }, [query]);

  return (
    <aside className={styles.panel}>
      <GeneratePanel onGenerate={onSelect} settings={settings} />
      <ModelDropzone onLoad={onSelect} onSave={onSave} />
      <input
        className={styles.search}
        type="text"
        placeholder="Search shapes..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <ul className={styles.results}>
        {results.map(shape => (
          <li key={shape.id} className={styles.item}>
            <button className={styles.selectBtn} onClick={() => onSelect(shape)}>
              <span className={styles.name}>{shape.name}</span>
              <span className={styles.tags}>{shape.tags.join(', ')}</span>
            </button>
            <button className={styles.saveBtn} onClick={() => onSave(shape)}>+</button>
          </li>
        ))}
      </ul>
      <LibraryDrawer savedShapes={savedShapes} onSelect={onSelect} />
    </aside>
  );
}
