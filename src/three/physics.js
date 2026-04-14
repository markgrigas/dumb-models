import RAPIER from '@dimforge/rapier3d-compat';

let rapierReady = null;

async function ensureRapier() {
  if (!rapierReady) rapierReady = RAPIER.init().then(() => RAPIER);
  return rapierReady;
}

// Map Three.js geometry type + params → Rapier ColliderDesc
function colliderFor(R, geometryType, params) {
  switch (geometryType) {
    case 'sphere':
      return R.ColliderDesc.ball(params?.radius ?? 1);
    case 'box':
      return R.ColliderDesc.cuboid(
        (params?.width  ?? 1) / 2,
        (params?.height ?? 1) / 2,
        (params?.depth  ?? 1) / 2,
      );
    case 'cylinder':
      return R.ColliderDesc.cylinder(
        (params?.height ?? 1) / 2,
        Math.max(params?.radiusTop ?? 0.5, params?.radiusBottom ?? 0.5),
      );
    case 'cone':
      return R.ColliderDesc.cone(
        (params?.height ?? 1) / 2,
        params?.radius ?? 0.5,
      );
    case 'capsule':
      return R.ColliderDesc.capsule(
        (params?.length ?? 1) / 2,
        params?.radius ?? 0.5,
      );
    case 'plane':
      // Flat static floor — use a thin cuboid
      return R.ColliderDesc.cuboid((params?.width ?? 2) / 2, 0.01, (params?.height ?? 2) / 2);
    default:
      // Fallback: bounding sphere
      return R.ColliderDesc.ball(params?.radius ?? 1);
  }
}

/**
 * Initialize a Rapier world for the given meshes.
 * Each mesh must have userData.physicsDef = { type: 'dynamic'|'static'|'kinematic' }
 * and userData.geometryDef = { type, params } for collider shape selection.
 *
 * Returns a state object for stepPhysics / disposePhysics.
 */
export async function initPhysics(meshes) {
  const R = await ensureRapier();
  const world = new R.World({ x: 0, y: -9.81, z: 0 });
  const bodies = []; // { mesh, body }

  for (const mesh of meshes) {
    const { physicsDef, geometryDef } = mesh.userData;
    if (!physicsDef) continue;

    const pos = mesh.position;
    const quat = mesh.quaternion;

    let bodyDesc;
    switch (physicsDef.type) {
      case 'static':
        bodyDesc = R.RigidBodyDesc.fixed();
        break;
      case 'kinematic':
        bodyDesc = R.RigidBodyDesc.kinematicPositionBased();
        break;
      default: // dynamic
        bodyDesc = R.RigidBodyDesc.dynamic();
    }

    bodyDesc.setTranslation(pos.x, pos.y, pos.z);
    bodyDesc.setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w });

    const body     = world.createRigidBody(bodyDesc);
    const collDesc = colliderFor(R, geometryDef?.type, geometryDef?.params);
    world.createCollider(collDesc, body);

    bodies.push({ mesh, body });
  }

  return { world, bodies };
}

/**
 * Step the physics world and sync Three.js mesh transforms.
 */
export function stepPhysics(state, delta) {
  if (!state) return;
  const { world, bodies } = state;

  // Clamp delta to avoid spiral of death on tab-hide/resume
  world.timestep = Math.min(delta, 1 / 30);
  world.step();

  for (const { mesh, body } of bodies) {
    if (body.isFixed()) continue;
    const t = body.translation();
    const r = body.rotation();
    mesh.position.set(t.x, t.y, t.z);
    mesh.quaternion.set(r.x, r.y, r.z, r.w);
  }
}

export function disposePhysics(state) {
  if (!state) return;
  state.world.free();
}
