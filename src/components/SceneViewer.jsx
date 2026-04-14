import { useRef, useEffect } from 'react';
import { buildScene } from '../three/sceneBuilder.js';
import styles from './SceneViewer.module.css';

export default function SceneViewer({ shapeConfig, onExportReady }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    if (!shapeConfig) return;
    let mounted = true;

    async function load() {
      if (sceneRef.current) {
        await sceneRef.current.updateShape(shapeConfig);
      } else {
        sceneRef.current = buildScene(canvasRef.current, shapeConfig);
      }
      if (mounted) onExportReady?.(() => sceneRef.current?.exportGLB());
    }

    load();
    return () => { mounted = false; };
  }, [shapeConfig]);

  useEffect(() => {
    return () => {
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
    };
  }, []);

  return (
    <div className={styles.viewer}>
      {!shapeConfig && (
        <p className={styles.placeholder}>Select a shape to render</p>
      )}
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
