"""
FlowBond Wearable — Blender Merge Script v2
DANZ PINK 3D.glb IS the case. All PRD chips fit inside it.

Usage:
  blender --background --python merge-to-glb.py
"""

import bpy
import mathutils
import os
import math

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
GLB_FILE = os.path.join(SCRIPT_DIR, "DANZ PINK 3D.glb")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "flowbond-wearable-final.glb")

# ── Clean scene ──
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# =============================================
# STEP 1: Import DANZ 3D as the case
# =============================================
print("[1/5] Importing DANZ PINK 3D as wearable case...")
bpy.ops.import_scene.gltf(filepath=GLB_FILE)

case = None
for obj in bpy.context.selected_objects:
    if obj.type == 'MESH':
        case = obj
        break

if not case:
    print("ERROR: No mesh found in GLB")
    exit(1)

case.name = "DANZ_Case"

# Original model axes (from analysis):
#   X: width  = 0.5307
#   Y: depth  = 0.0825  (thin dimension!)
#   Z: height = 1.0019  (tall dimension!)
# Target wearable: ~42mm tall, ~22mm wide, ~10mm deep

target_height = 0.042  # 42mm in meters (Z axis)
target_depth  = 0.010  # 10mm (Y axis — thicken this!)

original_h = 1.0019   # Z
original_w = 0.5307   # X
original_d = 0.0825   # Y

scale_xz = target_height / original_h   # ~0.0419 (uniform for X and Z)
scale_y  = target_depth / original_d    # ~0.1212 (stretch Y for depth)

case.scale = (scale_xz, scale_y, scale_xz)
bpy.context.view_layer.objects.active = case
bpy.ops.object.transform_apply(scale=True)
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
case.location = (0, 0, 0)

print(f"  Case dimensions: {case.dimensions}")
print(f"  W: {case.dimensions.x*1000:.1f}mm  H: {case.dimensions.y*1000:.1f}mm  D: {case.dimensions.z*1000:.1f}mm")

# Get case bounding box for component placement
bbox = [case.matrix_world @ mathutils.Vector(corner) for corner in case.bound_box]
case_min = mathutils.Vector((min(v.x for v in bbox), min(v.y for v in bbox), min(v.z for v in bbox)))
case_max = mathutils.Vector((max(v.x for v in bbox), max(v.y for v in bbox), max(v.z for v in bbox)))
case_center = (case_min + case_max) / 2
case_size = case_max - case_min

print(f"  Bounds min: [{case_min.x*1000:.1f}, {case_min.y*1000:.1f}, {case_min.z*1000:.1f}]mm")
print(f"  Bounds max: [{case_max.x*1000:.1f}, {case_max.y*1000:.1f}, {case_max.z*1000:.1f}]mm")

# Make case semi-transparent so internals are visible
case_mat = bpy.data.materials.new(name="DANZ_Case_Material")
case_mat.use_nodes = True
bsdf = case_mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs['Base Color'].default_value = (0.85, 0.25, 0.55, 1.0)  # DANZ pink
bsdf.inputs['Metallic'].default_value = 0.6
bsdf.inputs['Roughness'].default_value = 0.2
bsdf.inputs['Alpha'].default_value = 0.35  # Semi-transparent
bsdf.inputs['Transmission Weight'].default_value = 0.6
bsdf.inputs['IOR'].default_value = 1.45
case_mat.blend_method = 'BLEND' if hasattr(case_mat, 'blend_method') else None

# Keep original texture as secondary material, add our transparent one
if case.data.materials:
    case.data.materials.append(case_mat)
else:
    case.data.materials.append(case_mat)

# =============================================
# STEP 2: Create materials for components
# =============================================
print("[2/5] Creating component materials...")

def make_mat(name, color, metallic=0.3, roughness=0.4, emission=None, emission_strength=1.5):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    return mat

mats = {
    'soc':      make_mat("nRF5340_SoC",      (0.49, 0.23, 0.93), 0.5, 0.3, (0.35, 0.15, 0.6)),
    'imu':      make_mat("IMU_6Axis",         (0.13, 0.77, 0.37), 0.3, 0.4, (0.08, 0.4, 0.15)),
    'temp':     make_mat("AHT10_Sensor",      (0.96, 0.62, 0.04), 0.2, 0.4, (0.5, 0.3, 0.02)),
    'touch':    make_mat("Capacitive_Touch",   (0.75, 0.75, 0.78), 0.7, 0.2),
    'haptic':   make_mat("Haptic_Motor",      (0.55, 0.36, 0.96), 0.4, 0.5, (0.3, 0.2, 0.5)),
    'led':      make_mat("WS2812B_LED",       (0.93, 0.29, 0.60), 0.2, 0.2, (0.9, 0.25, 0.5), 3.0),
    'ble':      make_mat("BLE_Radio",         (0.02, 0.71, 0.83), 0.3, 0.3, (0.02, 0.45, 0.55)),
    'nfc':      make_mat("NFC_Antenna",       (0.23, 0.51, 0.96), 0.3, 0.3, (0.12, 0.25, 0.5)),
    'usb':      make_mat("USB_Port",          (0.14, 0.72, 0.66), 0.5, 0.3),
    'button':   make_mat("User_Button",       (0.85, 0.65, 0.13), 0.8, 0.15),
    'battery':  make_mat("LiPo_Battery",      (0.94, 0.27, 0.27), 0.1, 0.6),
    'ibc':      make_mat("IBC_Electrode",     (0.83, 0.69, 0.22), 1.0, 0.12, (0.4, 0.35, 0.1)),
    'pcb':      make_mat("PCB_Board",         (0.05, 0.25, 0.12), 0.1, 0.7),
}

# =============================================
# STEP 3: Place components INSIDE the case
# =============================================
print("[3/5] Placing components inside DANZ case...")

s = 0.001  # mm to meters

# Axes: X = width (~22mm), Y = depth (~10mm), Z = height (~42mm)
# Y=0 is center depth, so components go from about -4mm to +4mm in Y
# Z=0 is center height, components span from about -20mm to +20mm in Z
# Leave ~1mm shell on each side

def add_chip(name, loc_mm, size_mm, material, shape="box"):
    """Add a component inside the case. loc_mm = (X, Y, Z) in mm."""
    loc = tuple(v * s for v in loc_mm)
    sz = tuple(v * s for v in size_mm)

    if shape == "box":
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
        obj = bpy.context.active_object
        obj.scale = sz
    elif shape == "cylinder":
        bpy.ops.mesh.primitive_cylinder_add(
            radius=sz[0], depth=sz[1], location=loc
        )
        obj = bpy.context.active_object
    elif shape == "torus":
        bpy.ops.mesh.primitive_torus_add(
            major_radius=sz[0],
            minor_radius=sz[1],
            location=loc
        )
        obj = bpy.context.active_object

    obj.name = name
    bpy.ops.object.transform_apply(scale=True)

    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)

    obj.parent = case
    return obj

# Component layout inside DANZ case:
# X = width (left/right), Y = depth (front/back through case), Z = height (up/down)
# Case bounds: X ~[-11, +11], Y ~[-5, +5], Z ~[-21, +21] in mm

# ── PCB main board — fills most of the interior ──
add_chip("PCB_MainBoard",
    loc_mm=(0, 0, 0),
    size_mm=(9, 0.8, 18),
    material=mats['pcb'])

# ── nRF5340 SoC — center of PCB, front side ──
add_chip("nRF5340_SoC",
    loc_mm=(0, 1.5, 2),
    size_mm=(3.5, 0.5, 3.5),
    material=mats['soc'])

# ── 6-Axis IMU — upper right of SoC ──
add_chip("IMU_ICM42688",
    loc_mm=(3.5, 1.2, 7),
    size_mm=(1.5, 0.4, 1.5),
    material=mats['imu'])

# ── AHT10 Temp/Humidity — upper left ──
add_chip("AHT10_TempHumid",
    loc_mm=(-3.5, 1.2, 7),
    size_mm=(2, 0.8, 2),
    material=mats['temp'])

# ── WS2812B LED — near top, close to front surface ──
add_chip("WS2812B_RGB_LED",
    loc_mm=(0, 3.0, 14),
    size_mm=(2.5, 0.8, 2.5),
    material=mats['led'])

# ── BLE antenna area — upper zone ──
add_chip("BLE_53_Antenna",
    loc_mm=(0, 1.8, 11),
    size_mm=(4, 0.3, 2),
    material=mats['ble'])

# ── NFC antenna loop — ring around center, near front ──
add_chip("NFC_Antenna_Loop",
    loc_mm=(0, 2.5, 2),
    size_mm=(7, 0.8, 0),
    material=mats['nfc'],
    shape="torus")

# ── Haptic motor — lower section ──
add_chip("Haptic_LRA_Motor",
    loc_mm=(0, 0, -10),
    size_mm=(3.5, 1.5, 3.5),
    material=mats['haptic'],
    shape="cylinder")

# ── Battery — bottom half, largest component ──
add_chip("LiPo_200mAh",
    loc_mm=(0, -1.5, -3),
    size_mm=(8, 1.5, 10),
    material=mats['battery'])

# ── User button — right side, protruding slightly ──
add_chip("User_Button",
    loc_mm=(9.5, 0, 5),
    size_mm=(1, 1.2, 1),
    material=mats['button'],
    shape="cylinder")

# ── USB-C port — bottom edge ──
add_chip("USB_C_Port",
    loc_mm=(0, 0, -19),
    size_mm=(4.5, 1.6, 1.5),
    material=mats['usb'])

# ── Capacitive touch pads — skin side (back, Y negative) ──
add_chip("CapTouch_Pad_1",
    loc_mm=(-3, -3.8, 8),
    size_mm=(4, 0.15, 2.5),
    material=mats['touch'])
add_chip("CapTouch_Pad_2",
    loc_mm=(3, -3.8, 8),
    size_mm=(4, 0.15, 2.5),
    material=mats['touch'])

# ── IBC Galvanic Electrodes — skin side (back), 4 differential pads ──
ibc_positions = [
    (-4, "IBC_TX_Plus",  -5),
    (4,  "IBC_TX_Minus", -5),
    (-4, "IBC_RX_Plus",   5),
    (4,  "IBC_RX_Minus",  5),
]
for ex, label, ez in ibc_positions:
    add_chip(label,
        loc_mm=(ex, -4.5, ez),
        size_mm=(3, 0.25, 4),
        material=mats['ibc'])

# =============================================
# STEP 4: Scene setup
# =============================================
print("[4/5] Setting up scene...")

# Camera
bpy.ops.object.camera_add(location=(0.06, -0.07, 0.04))
cam = bpy.context.active_object
cam.name = "Camera"
cam.rotation_euler = (math.radians(65), 0, math.radians(40))
cam.data.lens = 60
bpy.context.scene.camera = cam

# Key light
bpy.ops.object.light_add(type='AREA', location=(0.04, -0.04, 0.06))
light = bpy.context.active_object
light.name = "Key"
light.data.energy = 8
light.data.size = 0.08
light.rotation_euler = (math.radians(50), 0, math.radians(25))

# Fill (purple)
bpy.ops.object.light_add(type='AREA', location=(-0.05, 0.02, 0.03))
fill = bpy.context.active_object
fill.name = "Fill"
fill.data.energy = 3
fill.data.size = 0.06
fill.data.color = (0.8, 0.3, 1.0)

# Rim (cyan)
bpy.ops.object.light_add(type='POINT', location=(0, 0.05, -0.02))
rim = bpy.context.active_object
rim.name = "Rim"
rim.data.energy = 2
rim.data.color = (0.1, 0.85, 0.95)

# =============================================
# STEP 5: Export
# =============================================
print(f"[5/5] Exporting: {OUTPUT_FILE}")

bpy.ops.export_scene.gltf(
    filepath=OUTPUT_FILE,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_cameras=False,
    export_lights=False,
    export_materials='EXPORT',
    export_texcoords=True,
    export_normals=True,
)

# Count
mesh_count = sum(1 for obj in bpy.data.objects if obj.type == 'MESH')
print(f"\nDone! {mesh_count} meshes exported to {OUTPUT_FILE}")
print(f"  DANZ case: semi-transparent pink shell")
print(f"  Inside: PCB + 12 PRD components with color-coded materials")
print(f"  Skin side: IBC electrodes (gold) + capacitive touch (silver)")
