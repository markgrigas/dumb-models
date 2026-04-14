import shapes from '../data/shapes-dataset.json' assert { type: 'json' };

const STOP_WORDS = new Set(['a','an','the','is','of','and','or','in','with','to','for','it','that','this']);

function tokenize(text) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

function buildIndex(docs) {
  const N = docs.length;
  const df = new Map();
  for (const doc of docs) {
    for (const term of new Set(doc.tokens)) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }
  const idf = new Map();
  for (const [term, count] of df) {
    idf.set(term, Math.log((N + 1) / (count + 1)) + 1);
  }
  const docVectors = new Map();
  for (const doc of docs) {
    const tf = new Map();
    for (const t of doc.tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const vec = new Map();
    for (const [t, count] of tf) {
      vec.set(t, (count / doc.tokens.length) * (idf.get(t) || 1));
    }
    docVectors.set(doc.id, vec);
  }
  return { idf, docVectors };
}

function cosineSim(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (const [t, w] of vecA) {
    dot += w * (vecB.get(t) || 0);
    normA += w * w;
  }
  for (const [, w] of vecB) normB += w * w;
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

const docs = shapes.map(s => ({
  id: s.id,
  // Repeat name 2× and tags 3× so TF-IDF weights them above prose description
  tokens: tokenize([s.name, s.name, ...s.tags, ...s.tags, ...s.tags, s.description].join(' ')),
}));

const { idf, docVectors } = buildIndex(docs);

function shuffleSample(arr, n) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export function search(query, topN = 5) {
  if (!query || !query.trim()) return shuffleSample(shapes, topN);
  const qTokens = tokenize(query);
  if (!qTokens.length) return shapes.slice(0, topN);
  const qTf = new Map();
  for (const t of qTokens) qTf.set(t, (qTf.get(t) || 0) + 1);
  const qVec = new Map();
  for (const [t, count] of qTf) {
    qVec.set(t, (count / qTokens.length) * (idf.get(t) || 1));
  }
  const scored = shapes.map(s => ({
    shape: s,
    score: cosineSim(qVec, docVectors.get(s.id) || new Map()),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map(s => s.shape);
}
