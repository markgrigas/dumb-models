/**
 * Dataset expansion script.
 * Usage: ANTHROPIC_API_KEY=sk-... node scripts/expand-dataset.mjs
 *
 * Generates ~210 new dataset entries across 10 categories and appends them
 * to src/data/shapes-dataset.json, deduplicating against existing IDs.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir     = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dir, '../src/data/shapes-dataset.json');

const VALID_GEOMETRY_TYPES = new Set([
  'box','sphere','cylinder','cone','torus','torusknot','ring','capsule',
  'circle','tetrahedron','octahedron','dodecahedron','icosahedron','plane',
  'terrain','lathe',
]);

const SCHEMA_HINT = `
Valid geometry types: box, sphere, cylinder, cone, torus, torusknot, ring, capsule,
circle, tetrahedron, octahedron, dodecahedron, icosahedron, plane, terrain, lathe

Single-shape entry schema:
{
  "id": "snake_case_unique_id",
  "name": "Human Readable Name",
  "tags": ["tag1","tag2","tag3","tag4"],
  "description": "One sentence describing what this object is and what it looks like.",
  "geometry": { "type": "<valid_type>", "params": { ...type-specific params... } }
}

Multi-part composite entry schema (use for complex objects with multiple parts):
{
  "id": "snake_case_unique_id",
  "name": "Human Readable Name",
  "tags": ["tag1","tag2","tag3","tag4"],
  "description": "One sentence describing the composite object.",
  "shapes": [
    { "id"?: "part_name", "parent"?: "other_part_id",
      "geometry": { "type": "...", "params": {...} },
      "material": { "type": "standard"|"physical"|"toon", "color": "#hex", "roughness"?: n, "metalness"?: n, "texture"?: "wood"|"brick"|"marble"|"metal"|"checker" },
      "position"?: [x,y,z], "rotation"?: [x,y,z], "scale"?: [x,y,z],
      "animation"?: { "type": "rotate"|"float"|"swing"|"orbit"|"pulse", "axis"?: "x"|"y"|"z", "speed"?: n, "amplitude"?: n }
    }
  ]
}

Geometry params reference:
- box:         { width, height, depth }
- sphere:      { radius, widthSegments:16, heightSegments:16 }
- cylinder:    { radiusTop, radiusBottom, height, radialSegments:16 }
- cone:        { radius, height, radialSegments:16 }
- torus:       { radius, tube, radialSegments:8, tubularSegments:32 }
- torusknot:   { radius, tube, p:2, q:3 }
- ring:        { innerRadius, outerRadius, thetaSegments:16 }
- capsule:     { radius, length, capSegments:8, radialSegments:16 }
- lathe:       { points:[[x,y],...], segments:16 }
- terrain:     { width, depth, widthSegments:32, heightSegments:32, amplitude, frequency }
- plane, circle, tetrahedron, octahedron, dodecahedron, icosahedron: { radius or width/height }
`.trim();

const CATEGORIES = [
  {
    name: 'Household & Furniture',
    singles: 12,
    composites: 6,
    guidance: 'Everyday home objects: sofas, beds, bookshelves, doors, windows, chairs, tables, rugs, mirrors, bathtubs, kitchen items. Use realistic dimensions (1 unit = 1 metre). Composites should use id/parent for legs on tables, shelves on bookcases, etc.',
  },
  {
    name: 'Sports & Recreation',
    singles: 14,
    composites: 4,
    guidance: 'Sports equipment and recreational objects: balls (basketball, soccer, tennis, golf), rackets, bats, goals, nets, skateboards, surfboards, helmets, gloves. Composites: bicycle, soccer goal with posts, basketball hoop with backboard.',
  },
  {
    name: 'Industrial & Tools',
    singles: 14,
    composites: 4,
    guidance: 'Tools and industrial objects: gears, wrenches, bolts, valves, springs, pistons, pipes, hammers, drills, levers, pulleys, axles. Use metalness:0.8+ for metal parts. Composites: pipe+valve assembly, gear+shaft, engine piston.',
  },
  {
    name: 'Food & Kitchen',
    singles: 14,
    composites: 4,
    guidance: 'Food items and kitchen objects: fruits (apple=sphere, banana=capsule), bread, bottles, mugs, bowls, pans, pots, cutting boards, rolling pins, wine glass (lathe). Composites: teapot (lathe body + spout cylinder + handle), bowl with fruit inside.',
  },
  {
    name: 'Nature (Expanded)',
    singles: 14,
    composites: 4,
    guidance: 'Natural organic objects beyond what is already in the dataset: pine cone (torus stacked), seashell (lathe spiral), coral, acorn, pebble, iceberg, wave crest, geyser, snowflake (ring/circle combos), lily pad, mangrove root, volcanic rock. Composites: flower (stem+petals), cactus (capsule+cylinders), tree stump with mushrooms.',
  },
  {
    name: 'Technology & Sci-Fi',
    singles: 14,
    composites: 4,
    guidance: 'Technology devices and sci-fi objects: circuit boards (flat plane), microchips, server racks, cooling fans (torus), solar panels (plane), radar dishes (sphere+cylinder), drone bodies, energy cores, holographic emitters, antenna arrays, power conduits. Composites: satellite (body+panels+dish), drone (body+4 rotors), radar station.',
  },
  {
    name: 'Musical Instruments',
    singles: 14,
    composites: 4,
    guidance: 'Musical instruments: drum (cylinder), trumpet bell (cone/lathe), cymbal (disc/ring), xylophone bar (box), maracas (sphere+cylinder), tambourine (ring), harp frame (torus segment), flute (thin cylinder), French horn (torusknot), speaker cone (cone). Composites: drum kit (kick+snare+cymbal), harp (frame+strings as cylinders).',
  },
  {
    name: 'Vehicles',
    singles: 12,
    composites: 6,
    guidance: 'Vehicle parts and complete vehicles: car wheel (torus+cylinder hub), airplane wing (box angled), boat hull (box), rocket nozzle (cone), submarine periscope (cylinder), hot air balloon envelope (sphere), helicopter rotor (capsule), propeller (box rotated), anchor (combination). Composites: simple rocket (body+fins+nose), hot air balloon (sphere+basket cylinder), biplane wing assembly.',
  },
  {
    name: 'Ancient & Historical',
    singles: 14,
    composites: 4,
    guidance: 'Ancient and historical artifacts: Greek amphora (lathe), Roman column (cylinder with capital), Viking shield (circle/disc), medieval sword (box), castle battlement (box), catapult arm (cylinder+box), moai head (capsule+box), Stonehenge trilithon (box+box+box), samurai helmet (sphere+cone), jousting lance (cylinder). Composites: column with pedestal and capital, amphora on plinth.',
  },
  {
    name: 'Complex Composites',
    singles: 0,
    composites: 20,
    guidance: 'Complex multi-part objects using id/parent hierarchy. Include: house (box walls + pitched roof panels), windmill (tower cylinder + rotating arm boxes), campfire (log cylinders + cone flames), robot figure (box torso + sphere head + cylinder limbs), snowman (3 spheres stacked + accessories), water well (cylinder + box roof + torus rim), lighthouse (cylinder tower + cone top + light sphere), park bench (boxes + cylinders for legs), archway (2 box pillars + box arch top), birdhouse (box + pyramid roof + circle entrance).',
  },
];

function validateEntry(entry, existingIds) {
  if (!entry.id || !entry.name || !entry.tags || !entry.description) return false;
  if (typeof entry.id !== 'string' || !/^[a-z0-9_]+$/.test(entry.id)) return false;
  if (existingIds.has(entry.id)) return false;

  if (entry.geometry) {
    if (!VALID_GEOMETRY_TYPES.has(entry.geometry?.type)) return false;
  } else if (entry.shapes) {
    if (!Array.isArray(entry.shapes) || entry.shapes.length === 0) return false;
    for (const part of entry.shapes) {
      if (part.geometry && !VALID_GEOMETRY_TYPES.has(part.geometry?.type)) return false;
    }
  } else {
    return false;
  }

  return true;
}

function buildPrompt(category) {
  const total = category.singles + category.composites;
  const compositeNote = category.composites > 0
    ? `Include at least ${category.composites} composite entries (using the "shapes" array with id/parent for attachment). The rest should be single-geometry entries.`
    : 'All entries should be single-geometry.';

  return `Generate exactly ${total} RAG dataset entries for the "${category.name}" category.

Category guidance: ${category.guidance}

${compositeNote}

Schema:
${SCHEMA_HINT}

Rules:
- All IDs must be unique snake_case strings
- Tags array should have 4-6 relevant keywords
- Description is one clear sentence
- Use realistic 1-unit=1-metre proportions
- Composite entries MUST use "shapes" array (not "geometry")
- For parent-child: child "position" is in parent's LOCAL space
- No trailing zeros in numbers (use 0.5 not 0.500)
- Do not repeat geometry types — vary them across entries

Return ONLY a valid JSON array of ${total} entries. No markdown, no explanation.`;
}

async function generateCategory(client, category, existingIds) {
  console.log(`\n→ Generating: ${category.name} (${category.singles + category.composites} entries)`);

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8000,
    messages: [{ role: 'user', content: buildPrompt(category) }],
  });

  const text = response.content.find(b => b.type === 'text')?.text ?? '';

  // Extract JSON array from response
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) {
    console.warn(`  ✗ No JSON array found in response`);
    return [];
  }

  let entries;
  try {
    entries = JSON.parse(match[0]);
  } catch {
    console.warn(`  ✗ Failed to parse JSON`);
    return [];
  }

  const valid = [];
  for (const entry of entries) {
    if (validateEntry(entry, existingIds)) {
      existingIds.add(entry.id);
      valid.push(entry);
    } else {
      console.warn(`  ⚠ Skipped invalid/duplicate entry: ${entry?.id ?? '(no id)'}`);
    }
  }

  console.log(`  ✓ ${valid.length}/${entries.length} entries valid`);
  return valid;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  // Load existing dataset
  const existing = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  const existingIds = new Set(existing.map(e => e.id));
  console.log(`Loaded ${existing.length} existing entries (${existingIds.size} unique IDs)`);

  const allNew = [];

  for (const category of CATEGORIES) {
    const entries = await generateCategory(client, category, existingIds);
    allNew.push(...entries);

    // Brief pause to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  const combined = [...existing, ...allNew];
  writeFileSync(DATA_PATH, JSON.stringify(combined, null, 2));

  console.log(`\n✅ Done.`);
  console.log(`   Added:  ${allNew.length} new entries`);
  console.log(`   Total:  ${combined.length} entries`);
}

main().catch(err => { console.error(err); process.exit(1); });
