import { useState } from 'react';
import styles from './LibraryDrawer.module.css';

export default function LibraryDrawer({ savedShapes, onSelect }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.drawer}>
      <button className={styles.toggle} onClick={() => setOpen(o => !o)}>
        Library {open ? '▲' : '▼'}
      </button>
      {open && (
        <ul className={styles.list}>
          {savedShapes.length === 0 ? (
            <li className={styles.empty}>No saved shapes yet.</li>
          ) : (
            savedShapes.map(s => (
              <li key={s.id} className={styles.entry}>
                <button className={styles.entryBtn} onClick={() => onSelect?.(s)}>{s.name}</button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
