#!/usr/bin/env python3
"""
DANZ PINK 3D — Perfect Print Prep for Adventurer 5M Pro

Profile analysis:
- Head: 77mm wide, only 2mm thick → needs 10x+ Z inflation
- Body: 20-28mm wide, 10-12mm thick → needs 3x Z
- Neck: drops from 7mm to 3mm Z → needs reinforcement
- Feet: 2mm x 1.5mm → unprintable, need solid base merge
- Arms/hands: off-center, need connection

Strategy:
1. Regional Z-inflation (more at head/feet, less at body)
2. Minimum thickness enforcement (2.5mm min wall)
3. Heavy subdivision + smoothing
4. Structural reinforcements blended in
5. Ring loop for necklace
6. Integrated base (not separate)
"""

import trimesh
import numpy as np

# === Config ===
TARGET_HEIGHT = 150.0  # mm
MIN_THICKNESS = 2.5    # mm minimum wall anywhere
SMOOTH_PASSES = 30
SMOOTH_LAMBDA = 0.5
RING_MAJOR_R = 5.0     # mm
RING_MINOR_R = 1.2     # mm
NECK_REINFORCE_R = 5.0 # mm
BASE_HEIGHT = 4.0      # mm integrated pedestal
BASE_CHAMFER = 1.5     # mm edge chamfer

SRC = '/home/koh/Documents/flowb/danz-print/DANZ PINK 3D.stl'
OUT = '/home/koh/Documents/flowb/danz-print/DANZ-print-ready.stl'
OUT_BASE = '/home/koh/Documents/flowb/danz-print/DANZ-base-plate.stl'

print("=" * 60)
print("DANZ PINK 3D — Perfect Print Prep")
print("=" * 60)

# === Load & scale ===
mesh = trimesh.load(SRC)
scale = TARGET_HEIGHT / mesh.bounding_box.extents[1]
mesh.apply_scale(scale)

# Center on origin, Y=0 at bottom
mesh.vertices[:, 1] -= mesh.vertices[:, 1].min()
cx = (mesh.vertices[:, 0].max() + mesh.vertices[:, 0].min()) / 2
cz = (mesh.vertices[:, 2].max() + mesh.vertices[:, 2].min()) / 2
mesh.vertices[:, 0] -= cx
mesh.vertices[:, 2] -= cz

height = mesh.vertices[:, 1].max()
print(f"\n[Scaled] height={height:.1f}mm")
print(f"  Dims: {mesh.bounding_box.extents[0]:.1f} x {height:.1f} x {mesh.bounding_box.extents[2]:.1f}")

# === Regional Z-inflation ===
# Different regions need different amounts of fattening
# Feet (0-10%): 8x — too thin to print otherwise
# Legs (10-30%): 4x
# Waist/Body (30-60%): 3.5x
# Neck (60-75%): 5x — needs extra to support head
# Head (75-100%): 12x — extremely flat, needs most inflation
print(f"\n[Regional Z-inflation]")

def z_scale_factor(y_pct):
    """Returns Z scale multiplier based on Y position percentage."""
    if y_pct < 0.10:     # Feet
        return 8.0
    elif y_pct < 0.30:   # Legs
        return 4.0 + (0.30 - y_pct) / 0.20 * 4.0  # taper from 8→4
    elif y_pct < 0.60:   # Body
        return 3.5
    elif y_pct < 0.75:   # Neck
        return 5.0
    else:                # Head
        # Ramp up dramatically for the flat head
        head_pct = (y_pct - 0.75) / 0.25  # 0→1 within head
        return 8.0 + head_pct * 8.0  # 8→16x

verts = mesh.vertices.copy()
for i in range(len(verts)):
    y_pct = verts[i, 1] / height
    z_mult = z_scale_factor(y_pct)
    verts[i, 2] *= z_mult

mesh.vertices = verts

ext = mesh.bounding_box.extents
print(f"  After inflation: {ext[0]:.1f} x {ext[1]:.1f} x {ext[2]:.1f} mm")

# Profile check
for label, pct in [("Feet", 0.05), ("Legs", 0.20), ("Body", 0.45),
                    ("Neck", 0.70), ("Head-low", 0.80), ("Head-mid", 0.90), ("Head-top", 0.97)]:
    y = height * pct
    near = verts[np.abs(verts[:, 1] - y) < 2.0]
    if len(near) > 0:
        zs = near[:, 2].max() - near[:, 2].min()
        xs = near[:, 0].max() - near[:, 0].min()
        print(f"  {label:>10} (Y={y:.0f}mm): X={xs:.1f}mm, Z={zs:.1f}mm")

# === Enforce minimum thickness ===
print(f"\n[Min thickness] enforcing {MIN_THICKNESS}mm everywhere")
# For each vertex, ensure Z distance from center is at least MIN_THICKNESS/2
z_center_per_y = {}
for i in range(len(mesh.vertices)):
    y_key = round(mesh.vertices[i, 1], 1)
    if y_key not in z_center_per_y:
        same_y = mesh.vertices[np.abs(mesh.vertices[:, 1] - mesh.vertices[i, 1]) < 0.5]
        z_center_per_y[y_key] = (same_y[:, 2].max() + same_y[:, 2].min()) / 2

verts = mesh.vertices.copy()
thickened_count = 0
for i in range(len(verts)):
    y_key = round(verts[i, 1], 1)
    zc = z_center_per_y.get(y_key, 0)
    dist_from_center = abs(verts[i, 2] - zc)
    if dist_from_center < MIN_THICKNESS / 2:
        sign = 1 if verts[i, 2] >= zc else -1
        verts[i, 2] = zc + sign * MIN_THICKNESS / 2
        thickened_count += 1

mesh.vertices = verts
print(f"  Adjusted {thickened_count} vertices")

# === Subdivide twice for smooth surface ===
print(f"\n[Subdivide] 2 rounds for smooth printing surface")
mesh = mesh.subdivide()
print(f"  Pass 1: {len(mesh.vertices)} verts, {len(mesh.faces)} faces")
mesh = mesh.subdivide()
print(f"  Pass 2: {len(mesh.vertices)} verts, {len(mesh.faces)} faces")

# === Taubin smoothing (volume-preserving) ===
print(f"\n[Smoothing] Taubin, {SMOOTH_PASSES} passes")
mu = -(SMOOTH_LAMBDA + 0.01)

angles_before = np.degrees(mesh.face_adjacency_angles)
print(f"  Before: sharp(>60°)={int((angles_before > 60).sum())}, "
      f"very-sharp(>90°)={int((angles_before > 90).sum())}, "
      f"max={angles_before.max():.1f}°")

for it in range(SMOOTH_PASSES):
    # Forward
    adj = mesh.vertex_neighbors
    new_v = mesh.vertices.copy()
    for vi in range(len(mesh.vertices)):
        nb = adj[vi]
        if not nb:
            continue
        avg = mesh.vertices[nb].mean(axis=0)
        new_v[vi] += SMOOTH_LAMBDA * (avg - mesh.vertices[vi])
    mesh.vertices = new_v

    # Backward
    adj = mesh.vertex_neighbors
    new_v = mesh.vertices.copy()
    for vi in range(len(mesh.vertices)):
        nb = adj[vi]
        if not nb:
            continue
        avg = mesh.vertices[nb].mean(axis=0)
        new_v[vi] += mu * (avg - mesh.vertices[vi])
    mesh.vertices = new_v

    if (it + 1) % 10 == 0:
        a = np.degrees(mesh.face_adjacency_angles)
        print(f"    Pass {it+1}: sharp(>60°)={int((a > 60).sum())}, "
              f"very-sharp(>90°)={int((a > 90).sum())}, max={a.max():.1f}°")

angles_after = np.degrees(mesh.face_adjacency_angles)
print(f"  Final:  sharp(>60°)={int((angles_after > 60).sum())}, "
      f"very-sharp(>90°)={int((angles_after > 90).sum())}, "
      f"max={angles_after.max():.1f}°")

# === Re-position after smoothing ===
mesh.vertices[:, 1] -= mesh.vertices[:, 1].min()
height = mesh.vertices[:, 1].max()

# === Neck reinforcement (blended cylinder) ===
print(f"\n[Neck] reinforcement cylinder r={NECK_REINFORCE_R}mm")
neck_y = height * 0.72
neck_height = height * 0.15

neck = trimesh.creation.cylinder(
    radius=NECK_REINFORCE_R,
    height=neck_height,
    sections=32
)
rot = trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0])
neck.apply_transform(rot)

# Find neck center X
neck_verts = mesh.vertices[np.abs(mesh.vertices[:, 1] - neck_y) < 5.0]
if len(neck_verts) > 0:
    neck_cx = neck_verts[:, 0].mean()
    neck_cz = neck_verts[:, 2].mean()
else:
    neck_cx, neck_cz = 0, 0

neck.apply_translation([neck_cx, neck_y, neck_cz])

# === Arm reinforcement bar ===
chest_y = height * 0.55
chest_verts = mesh.vertices[np.abs(mesh.vertices[:, 1] - chest_y) < 4.0]
if len(chest_verts) > 2:
    arm_width = chest_verts[:, 0].max() - chest_verts[:, 0].min()
    arm_cx = chest_verts[:, 0].mean()
    arm_cz = chest_verts[:, 2].mean()
else:
    arm_width = 30
    arm_cx, arm_cz = 0, 0

print(f"[Arms] bar width={arm_width:.1f}mm at Y={chest_y:.0f}mm")
arm_bar = trimesh.creation.cylinder(radius=3.0, height=arm_width + 4, sections=24)
rot_arm = trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0])
arm_bar.apply_transform(rot_arm)
arm_bar.apply_translation([arm_cx, chest_y, arm_cz])

# === Hand blobs (reinforced tips) ===
hand_y = height * 0.48
hand_verts = mesh.vertices[np.abs(mesh.vertices[:, 1] - hand_y) < 6.0]
hand_parts = []
if len(hand_verts) > 4:
    lx = hand_verts[:, 0].min()
    rx = hand_verts[:, 0].max()
    for hx in [lx, rx]:
        # Ellipsoid (stretched sphere) for natural hand shape
        hand = trimesh.creation.icosphere(subdivisions=2, radius=4.0)
        # Flatten slightly in X
        hv = hand.vertices.copy()
        hv[:, 0] *= 0.7
        hand.vertices = hv
        local_z = hand_verts[np.abs(hand_verts[:, 0] - hx) < 3.0]
        hz = local_z[:, 2].mean() if len(local_z) > 0 else 0
        hand.apply_translation([hx, hand_y, hz])
        hand_parts.append(hand)
    print(f"[Hands] ellipsoids at X={lx:.1f} and X={rx:.1f}")

# === Ring loop at top of head ===
head_top_y = mesh.vertices[:, 1].max()
head_top_verts = mesh.vertices[mesh.vertices[:, 1] > height * 0.93]
head_cx = head_top_verts[:, 0].mean() if len(head_top_verts) > 0 else 0
head_cz = head_top_verts[:, 2].mean() if len(head_top_verts) > 0 else 0

print(f"\n[Ring Loop] at top of head (Y={head_top_y:.1f}mm)")

# Build torus
n_maj, n_min = 36, 16
ring_v, ring_f = [], []
for i in range(n_maj):
    theta = 2 * np.pi * i / n_maj
    for j in range(n_min):
        phi = 2 * np.pi * j / n_min
        x = (RING_MAJOR_R + RING_MINOR_R * np.cos(phi)) * np.cos(theta)
        y = RING_MINOR_R * np.sin(phi)
        z = (RING_MAJOR_R + RING_MINOR_R * np.cos(phi)) * np.sin(theta)
        ring_v.append([x, y, z])

for i in range(n_maj):
    for j in range(n_min):
        i2 = (i + 1) % n_maj
        j2 = (j + 1) % n_min
        v0 = i * n_min + j
        v1 = i2 * n_min + j
        v2 = i2 * n_min + j2
        v3 = i * n_min + j2
        ring_f.append([v0, v1, v2])
        ring_f.append([v0, v2, v3])

ring = trimesh.Trimesh(vertices=ring_v, faces=ring_f)
# Rotate to hang vertically (XY plane)
rot_ring = trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0])
ring.apply_transform(rot_ring)
# Position above head with small connector
ring_y_pos = head_top_y + RING_MAJOR_R * 0.5
ring.apply_translation([head_cx, ring_y_pos, head_cz])

# Connector post (head → ring)
post_height = RING_MAJOR_R * 0.8
post = trimesh.creation.cylinder(radius=RING_MINOR_R * 1.5, height=post_height, sections=16)
rot_p = trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0])
post.apply_transform(rot_p)
post.apply_translation([head_cx, head_top_y + post_height / 2 - 1.0, head_cz])

print(f"  Ring pos: ({head_cx:.1f}, {ring_y_pos:.1f}, {head_cz:.1f})")
print(f"  Post connects head to ring")

# === Integrated base pedestal ===
print(f"\n[Base Pedestal] {BASE_HEIGHT}mm integrated")
foot_verts = mesh.vertices[mesh.vertices[:, 1] < 8.0]
if len(foot_verts) > 0:
    foot_x_range = foot_verts[:, 0].max() - foot_verts[:, 0].min()
    foot_z_range = foot_verts[:, 2].max() - foot_verts[:, 2].min()
    foot_cx = foot_verts[:, 0].mean()
    foot_cz = foot_verts[:, 2].mean()
else:
    foot_x_range, foot_z_range = 20, 20
    foot_cx, foot_cz = 0, 0

# Oval pedestal — wider than feet for stability
base_rx = max(foot_x_range * 1.5, 25)  # at least 25mm wide
base_rz = max(foot_z_range * 1.5, 20)  # at least 20mm deep

# Create oval cylinder base
n_base = 48
base_verts_list = []
base_faces_list = []
# Top and bottom rings
for ring_idx, y in enumerate([0, -BASE_HEIGHT]):
    for i in range(n_base):
        angle = 2 * np.pi * i / n_base
        x = foot_cx + (base_rx / 2) * np.cos(angle)
        z = foot_cz + (base_rz / 2) * np.sin(angle)
        # Add chamfer on bottom edge
        if y == -BASE_HEIGHT and BASE_CHAMFER > 0:
            shrink = 1.0 - BASE_CHAMFER / max(base_rx, base_rz)
            x = foot_cx + (base_rx / 2) * shrink * np.cos(angle)
            z = foot_cz + (base_rz / 2) * shrink * np.sin(angle)
        base_verts_list.append([x, y, z])

# Center points for top and bottom caps
top_center = len(base_verts_list)
base_verts_list.append([foot_cx, 0, foot_cz])
bot_center = len(base_verts_list)
base_verts_list.append([foot_cx, -BASE_HEIGHT, foot_cz])

# Side faces
for i in range(n_base):
    i2 = (i + 1) % n_base
    t0, t1 = i, i2
    b0, b1 = n_base + i, n_base + i2
    base_faces_list.append([t0, b0, b1])
    base_faces_list.append([t0, b1, t1])

# Top cap
for i in range(n_base):
    i2 = (i + 1) % n_base
    base_faces_list.append([top_center, i2, i])

# Bottom cap
for i in range(n_base):
    i2 = (i + 1) % n_base
    base_faces_list.append([bot_center, n_base + i, n_base + i2])

base_mesh = trimesh.Trimesh(vertices=base_verts_list, faces=base_faces_list)
base_mesh.fix_normals()
print(f"  Oval base: {base_rx:.0f} x {base_rz:.0f} mm, chamfered bottom")

# === Combine everything ===
print(f"\n[Combining] all parts...")
parts = [mesh, neck, arm_bar, ring, post, base_mesh] + hand_parts
combined = trimesh.util.concatenate(parts)
combined.fix_normals()

# Shift everything up so base bottom is at Y=0
combined.vertices[:, 1] -= combined.vertices[:, 1].min()

print(f"  Total: {len(combined.vertices)} verts, {len(combined.faces)} faces")

# === Try boolean union for watertight mesh ===
print(f"\n[Boolean Union] merging into single solid...")
try:
    solid = mesh.copy()
    solid.vertices[:, 1] -= solid.vertices[:, 1].min() - BASE_HEIGHT

    union_parts = [neck, arm_bar, post, base_mesh] + hand_parts
    for idx, part in enumerate(union_parts):
        try:
            part_copy = part.copy()
            part_copy.vertices[:, 1] -= (mesh.vertices[:, 1].min() - BASE_HEIGHT)
            solid = solid.union(part_copy)
            print(f"  Merged part {idx+1}/{len(union_parts)}")
        except Exception as e:
            print(f"  Part {idx+1} union failed: {e}, concatenating")
            part_copy = part.copy()
            part_copy.vertices[:, 1] -= (mesh.vertices[:, 1].min() - BASE_HEIGHT)
            solid = trimesh.util.concatenate([solid, part_copy])

    # Add ring (separate geometry, don't boolean)
    ring_copy = ring.copy()
    ring_copy.vertices[:, 1] -= (mesh.vertices[:, 1].min() - BASE_HEIGHT)
    solid = trimesh.util.concatenate([solid, ring_copy])
    solid.fix_normals()

    final = solid
    print(f"  Result: {len(final.vertices)} verts, {len(final.faces)} faces")
except Exception as e:
    print(f"  Boolean failed: {e}")
    print(f"  Using concatenated mesh")
    final = combined

# === Final quality check ===
final_angles = np.degrees(final.face_adjacency_angles)
final_ext = final.bounding_box.extents
print(f"\n[Quality Check]")
print(f"  Dimensions: {final_ext[0]:.1f} x {final_ext[1]:.1f} x {final_ext[2]:.1f} mm")
print(f"  Vertices: {len(final.vertices)}")
print(f"  Faces: {len(final.faces)}")
print(f"  Watertight: {final.is_watertight}")
print(f"  Sharp edges (>60°): {int((final_angles > 60).sum())}")
print(f"  Very sharp (>90°): {int((final_angles > 90).sum())}")
print(f"  Max angle: {final_angles.max():.1f}°")

# Cross-section check
fv = final.vertices
fh = fv[:, 1].max()
print(f"\n  Cross-section profile:")
for label, pct in [("Base", 0.02), ("Feet", 0.08), ("Legs", 0.25), ("Body", 0.45),
                    ("Chest", 0.58), ("Neck", 0.70), ("Head", 0.85), ("Crown", 0.95)]:
    y = fh * pct
    near = fv[np.abs(fv[:, 1] - y) < 2.5]
    if len(near) > 0:
        xs = near[:, 0].max() - near[:, 0].min()
        zs = near[:, 2].max() - near[:, 2].min()
        print(f"    {label:>8}: X={xs:>6.1f}mm  Z={zs:>6.1f}mm  {'OK' if zs >= MIN_THICKNESS else 'THIN!'}")

# === Export ===
final.export(OUT)
print(f"\n[Saved] {OUT} ({len(final.faces)} faces)")

# Also export just the base separately for 2-piece option
base_mesh_export = base_mesh.copy()
base_mesh_export.vertices[:, 1] -= base_mesh_export.vertices[:, 1].min()
base_mesh_export.export(OUT_BASE)
print(f"[Saved] {OUT_BASE} (optional separate base)")

# === Print recommendations ===
print(f"\n{'=' * 60}")
print(f"ADVENTURER 5M PRO — OPTIMAL SETTINGS")
print(f"{'=' * 60}")
print(f"  Model: {final_ext[0]:.0f} x {final_ext[1]:.0f} x {final_ext[2]:.0f} mm")
print(f"  Orientation: upright (Y-up), base on bed")
print(f"")
print(f"  Layer height:  0.12mm (best quality) or 0.16mm (balanced)")
print(f"  Nozzle:        0.4mm")
print(f"  Infill:        20% gyroid")
print(f"  Walls:         3 perimeters (1.2mm wall)")
print(f"  Top/Bottom:    5 layers")
print(f"  Support:       tree supports (touching buildplate only)")
print(f"  Bed adhesion:  brim 8mm (head is top-heavy)")
print(f"  Speed:         120mm/s outer wall, 200mm/s infill")
print(f"  Temp:          210°C nozzle / 60°C bed (PLA)")
print(f"  Cooling:       100% fan after layer 3")
print(f"  Material:      PLA+ recommended (stronger)")
print(f"")
print(f"  Ring loop:     top of head for chain/necklace")
print(f"  Base:          integrated oval pedestal (chamfered)")
print(f"{'=' * 60}")
