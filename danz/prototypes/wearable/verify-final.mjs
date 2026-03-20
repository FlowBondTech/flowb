import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('./flowbond-wearable-final.glb');
const root = doc.getRoot();

console.log('=== flowbond-wearable-final.glb ===\n');
console.log(`Meshes: ${root.listMeshes().length}`);
console.log(`Materials: ${root.listMaterials().length}`);
console.log(`Nodes: ${root.listNodes().length}`);

console.log('\n--- Components ---');
root.listNodes().forEach(node => {
    const name = node.getName();
    const mesh = node.getMesh();
    if (mesh) {
        const prims = mesh.listPrimitives();
        let verts = 0;
        prims.forEach(p => {
            const pos = p.getAttribute('POSITION');
            if (pos) verts += pos.getCount();
        });
        const mat = prims[0]?.getMaterial();
        console.log(`  ${name || '(unnamed)'} — ${verts} verts, material: "${mat?.getName() || 'none'}"`);
    }
});

console.log('\n--- Materials ---');
root.listMaterials().forEach(mat => {
    const bc = mat.getBaseColorFactor();
    console.log(`  ${mat.getName()} — rgba(${bc.map(v=>v.toFixed(2)).join(', ')})`);
});
