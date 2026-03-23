import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'fs';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read('./DANZ PINK 3D.glb');
const root = doc.getRoot();

console.log('=== DANZ PINK 3D.glb — Full Geometry Map ===\n');

// Scenes
const scenes = root.listScenes();
console.log(`Scenes: ${scenes.length}`);

// Nodes (hierarchy)
const nodes = root.listNodes();
console.log(`Nodes: ${nodes.length}`);

// Meshes
const meshes = root.listMeshes();
console.log(`Meshes: ${meshes.length}`);

// Materials
const materials = root.listMaterials();
console.log(`Materials: ${materials.length}`);

// Textures
const textures = root.listTextures();
console.log(`Textures: ${textures.length}`);

// Animations
const animations = root.listAnimations();
console.log(`Animations: ${animations.length}`);

console.log('\n--- NODE HIERARCHY ---');
function printNode(node, depth = 0) {
    const indent = '  '.repeat(depth);
    const t = node.getTranslation();
    const r = node.getRotation();
    const s = node.getScale();
    const mesh = node.getMesh();

    let info = `${indent}[Node] "${node.getName() || '(unnamed)'}"`;
    info += `\n${indent}  Translation: [${t.map(v => v.toFixed(4)).join(', ')}]`;
    info += `\n${indent}  Rotation:    [${r.map(v => v.toFixed(4)).join(', ')}]`;
    info += `\n${indent}  Scale:       [${s.map(v => v.toFixed(4)).join(', ')}]`;

    if (mesh) {
        info += `\n${indent}  Mesh: "${mesh.getName() || '(unnamed)'}"`;
        const prims = mesh.listPrimitives();
        info += ` (${prims.length} primitive(s))`;

        prims.forEach((prim, pi) => {
            const mat = prim.getMaterial();
            info += `\n${indent}    Prim ${pi}: material="${mat ? mat.getName() : 'none'}"`;

            // Get vertex count and bounding box from position attribute
            const posAccessor = prim.getAttribute('POSITION');
            if (posAccessor) {
                const count = posAccessor.getCount();
                const arr = posAccessor.getArray();

                let minX = Infinity, minY = Infinity, minZ = Infinity;
                let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

                for (let i = 0; i < count; i++) {
                    const x = arr[i * 3], y = arr[i * 3 + 1], z = arr[i * 3 + 2];
                    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
                    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
                }

                info += `\n${indent}    Vertices: ${count}`;
                info += `\n${indent}    Bounds: X[${minX.toFixed(4)} → ${maxX.toFixed(4)}] Y[${minY.toFixed(4)} → ${maxY.toFixed(4)}] Z[${minZ.toFixed(4)} → ${maxZ.toFixed(4)}]`;
                info += `\n${indent}    Size:   ${(maxX-minX).toFixed(4)} x ${(maxY-minY).toFixed(4)} x ${(maxZ-minZ).toFixed(4)}`;
            }

            // List all attributes
            const semantics = prim.listSemantics();
            info += `\n${indent}    Attributes: [${semantics.join(', ')}]`;

            // Index count
            const indices = prim.getIndices();
            if (indices) {
                info += `\n${indent}    Indices: ${indices.getCount()} (${indices.getCount() / 3} triangles)`;
            }
        });
    }

    console.log(info);

    for (const child of node.listChildren()) {
        printNode(child, depth + 1);
    }
}

for (const scene of scenes) {
    console.log(`\nScene: "${scene.getName() || '(unnamed)'}"`);
    for (const child of scene.listChildren()) {
        printNode(child, 1);
    }
}

// Materials detail
console.log('\n--- MATERIALS ---');
materials.forEach((mat, i) => {
    const bc = mat.getBaseColorFactor();
    const mr = mat.getMetallicFactor();
    const ro = mat.getRoughnessFactor();
    const em = mat.getEmissiveFactor();
    const alpha = mat.getAlphaMode();

    console.log(`[${i}] "${mat.getName() || '(unnamed)'}"`);
    console.log(`  Base Color: rgba(${bc.map(v => v.toFixed(3)).join(', ')})`);
    console.log(`  Metallic: ${mr.toFixed(3)}, Roughness: ${ro.toFixed(3)}`);
    console.log(`  Emissive: [${em.map(v => v.toFixed(3)).join(', ')}]`);
    console.log(`  Alpha Mode: ${alpha}`);

    const bcTex = mat.getBaseColorTexture();
    if (bcTex) console.log(`  Base Color Texture: ${bcTex.getURI() || '(embedded)'} ${bcTex.getSize() ? bcTex.getSize().join('x') : ''}`);

    const normalTex = mat.getNormalTexture();
    if (normalTex) console.log(`  Normal Texture: ${normalTex.getURI() || '(embedded)'}`);
});

// Global bounding box
console.log('\n--- GLOBAL BOUNDING BOX ---');
let gMinX = Infinity, gMinY = Infinity, gMinZ = Infinity;
let gMaxX = -Infinity, gMaxY = -Infinity, gMaxZ = -Infinity;
let totalVerts = 0, totalTris = 0;

meshes.forEach(mesh => {
    mesh.listPrimitives().forEach(prim => {
        const posAccessor = prim.getAttribute('POSITION');
        if (posAccessor) {
            const count = posAccessor.getCount();
            const arr = posAccessor.getArray();
            totalVerts += count;

            for (let i = 0; i < count; i++) {
                const x = arr[i * 3], y = arr[i * 3 + 1], z = arr[i * 3 + 2];
                gMinX = Math.min(gMinX, x); gMaxX = Math.max(gMaxX, x);
                gMinY = Math.min(gMinY, y); gMaxY = Math.max(gMaxY, y);
                gMinZ = Math.min(gMinZ, z); gMaxZ = Math.max(gMaxZ, z);
            }
        }
        const indices = prim.getIndices();
        if (indices) totalTris += indices.getCount() / 3;
    });
});

const sizeX = gMaxX - gMinX;
const sizeY = gMaxY - gMinY;
const sizeZ = gMaxZ - gMinZ;

console.log(`Min: [${gMinX.toFixed(4)}, ${gMinY.toFixed(4)}, ${gMinZ.toFixed(4)}]`);
console.log(`Max: [${gMaxX.toFixed(4)}, ${gMaxY.toFixed(4)}, ${gMaxZ.toFixed(4)}]`);
console.log(`Size: ${sizeX.toFixed(4)} x ${sizeY.toFixed(4)} x ${sizeZ.toFixed(4)}`);
console.log(`Center: [${((gMinX+gMaxX)/2).toFixed(4)}, ${((gMinY+gMaxY)/2).toFixed(4)}, ${((gMinZ+gMaxZ)/2).toFixed(4)}]`);
console.log(`Total vertices: ${totalVerts}`);
console.log(`Total triangles: ${totalTris}`);

// File size
const stats = fs.statSync('./DANZ PINK 3D.glb');
console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
