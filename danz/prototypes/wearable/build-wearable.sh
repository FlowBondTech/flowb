#!/bin/bash
# ============================================================
# FlowBond Wearable — Full Build Pipeline
# CAD → STL → GLB (with DANZ logo merged)
# ============================================================

set -e
cd "$(dirname "$0")"

echo "=========================================="
echo "  FlowBond Wearable Build Pipeline"
echo "=========================================="
echo ""

# Step 1: OpenSCAD → STL
echo "[1/3] OpenSCAD → STL export..."
if command -v openscad &> /dev/null; then
    openscad -o flowbond-wearable.stl flowbond-wearable.scad
    echo "  ✓ STL exported: flowbond-wearable.stl ($(du -h flowbond-wearable.stl | cut -f1))"
else
    echo "  ✗ OpenSCAD not installed. Run: sudo apt install openscad"
    echo "    Or: sudo snap install openscad"
    exit 1
fi

# Step 2: Blender merge (STL + DANZ GLB → final GLB)
echo ""
echo "[2/3] Blender merge → GLB..."
if command -v blender &> /dev/null; then
    blender --background --python merge-to-glb.py 2>&1 | grep -E "^\[|Done|WARNING|Components"
    if [ -f "flowbond-wearable-final.glb" ]; then
        echo "  ✓ Final GLB: flowbond-wearable-final.glb ($(du -h flowbond-wearable-final.glb | cut -f1))"
    else
        echo "  ✗ GLB export failed"
        exit 1
    fi
else
    echo "  ✗ Blender not installed. Run: sudo snap install blender --classic"
    exit 1
fi

# Step 3: Verify
echo ""
echo "[3/3] Verification..."
echo "  Files:"
ls -lh flowbond-wearable.stl flowbond-wearable-final.glb "DANZ PINK 3D.glb" 2>/dev/null | awk '{print "    " $5 "  " $9}'
echo ""
echo "=========================================="
echo "  Build complete!"
echo "  Open flowbond-wearable-final.glb in:"
echo "    - https://gltf-viewer.donmccurdy.com/"
echo "    - Blender"
echo "    - The product page (index.html)"
echo "=========================================="
