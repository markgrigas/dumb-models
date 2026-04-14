import { useRef, useState } from 'react';
import styles from './ModelDropzone.module.css';

export default function ModelDropzone({ onLoad, onSave }) {
  const inputRef = useRef(null);
  const [loaded, setLoaded] = useState(null); // { name, url }

  function handleFile(file) {
    if (!file) return;
    if (loaded?.url) URL.revokeObjectURL(loaded.url);

    const url  = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^.]+$/, '');
    const config = {
      id:          `gltf_${Date.now()}`,
      name,
      tags:        ['gltf', '3d-model'],
      description: `Imported 3D model: ${file.name}`,
      shapes: [{ geometry: { type: 'gltf', params: { src: url } } }],
    };

    setLoaded({ name: file.name, url });
    onLoad(config);
    onSave(config);
  }

  function handleClear() {
    if (loaded?.url) URL.revokeObjectURL(loaded.url);
    setLoaded(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className={styles.dropzone}>
      {loaded ? (
        <div className={styles.loaded}>
          <span className={styles.filename} title={loaded.name}>{loaded.name}</span>
          <button className={styles.clear} onClick={handleClear}>✕</button>
        </div>
      ) : (
        <button className={styles.pick} onClick={() => inputRef.current?.click()}>
          Import glTF / glb
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".gltf,.glb"
        className={styles.hidden}
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
