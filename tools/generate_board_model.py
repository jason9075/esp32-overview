#!/usr/bin/env python3
"""
Generate the 3D hardware model for the ESP32 NodeMCU-32S 38-Pin Type-C board.

Geometry follows the real board (black solder mask, ESP-WROOM-32 module flush
with the +X end, USB Type-C at the -X end flanked by EN/BOOT, pin headers
soldered from the bottom with black plastic spacers underneath and short tips
poking through the top).

Coordinates are authored directly in the app's frame (Y-up, 1 unit = 1 mm) and
exported with `export_yup=False` so Blender does NOT apply its Z-up -> Y-up
conversion.

Exports:
  1. `public/assets/esp32_nodemcu_32s_typec.glb`
  2. `src/data/boards/nodemcu_32s_typec/modelPlacements.json`
"""

import json
import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parent.parent
GLB_OUT = ROOT / "public" / "assets" / "esp32_nodemcu_32s_typec.glb"
SHIELD_TEXTURE = ROOT / "tools" / "textures" / "shield_top.jpg"  # from tools/make_shield_texture.py
META_OUT = ROOT / "src" / "data" / "boards" / "nodemcu_32s_typec" / "modelPlacements.json"

GLB_OUT.parent.mkdir(parents=True, exist_ok=True)
META_OUT.parent.mkdir(parents=True, exist_ok=True)

# Board constants (mm)
PCB_W = 51.5  # X
PCB_D = 28.5  # Z
PCB_T = 1.6  # Y
TOP = PCB_T / 2.0
BOTTOM = -PCB_T / 2.0
PIN_PITCH = 2.54
ROW_Z = 11.43
PIN_X0 = 22.86  # pin index 0 (3V3 / GND) sits at the antenna (+X) end

# Silkscreen labels, index 0 at the antenna end (matches gpioPins.ts order)
LEFT_LABELS = ["3V3", "EN", "SVP", "SVN", "P34", "P35", "P32", "P33", "P25", "P26",
               "P27", "P14", "P12", "GND", "P13", "SD2", "SD3", "CMD", "5V"]
RIGHT_LABELS = ["GND", "P23", "P22", "TX", "RX", "P21", "GND", "P19", "P18", "P5",
                "P17", "P16", "P4", "P0", "P2", "P15", "SD1", "SD0", "CLK"]


# ---------------------------------------------------------------------------
# Scene / material helpers
# ---------------------------------------------------------------------------

def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)


def deselect_all():
    bpy.ops.object.select_all(action="DESELECT")


def create_pbr_material(name, color, metallic=0.0, roughness=0.5, emission=None):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*emission[:3], 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission[3]
    return mat


def build_materials():
    m = {}
    m["mask"] = create_pbr_material("Mat_SolderMaskBlack", (0.016, 0.017, 0.019, 1), 0.0, 0.22)
    m["hole"] = create_pbr_material("Mat_Hole", (0.004, 0.004, 0.005, 1), 0.0, 0.9)
    m["silk_white"] = create_pbr_material("Mat_SilkWhite", (0.80, 0.81, 0.80, 1), 0.0, 0.55)
    m["silk"] = create_pbr_material("Mat_Silkscreen", (0.50, 0.58, 0.66, 1), 0.0, 0.6)
    m["enig"] = create_pbr_material("Mat_ENIGGold", (0.86, 0.66, 0.32, 1), 1.0, 0.28)
    m["tin"] = create_pbr_material("Mat_Tin", (0.78, 0.78, 0.79, 1), 1.0, 0.26)
    m["header_plastic"] = create_pbr_material("Mat_HeaderPlastic", (0.015, 0.015, 0.017, 1), 0.0, 0.55)
    m["shield"] = create_pbr_material("Mat_RFShield", (0.74, 0.75, 0.76, 1), 1.0, 0.36)
    m["module_pcb"] = create_pbr_material("Mat_ModulePCB", (0.022, 0.023, 0.026, 1), 0.0, 0.34)
    m["antenna"] = create_pbr_material("Mat_AntennaUnderMask", (0.075, 0.068, 0.058, 1), 0.2, 0.3)
    m["usb_metal"] = create_pbr_material("Mat_USBShell", (0.83, 0.84, 0.85, 1), 1.0, 0.18)
    m["usb_tongue"] = create_pbr_material("Mat_USBTongue", (0.02, 0.02, 0.022, 1), 0.0, 0.5)
    m["ic"] = create_pbr_material("Mat_ICEpoxy", (0.03, 0.03, 0.032, 1), 0.0, 0.58)
    m["ic_mark"] = create_pbr_material("Mat_ICMarking", (0.55, 0.55, 0.53, 1), 0.0, 0.7)
    m["tantalum"] = create_pbr_material("Mat_Tantalum", (0.80, 0.50, 0.14, 1), 0.0, 0.5)
    m["tantalum_band"] = create_pbr_material("Mat_TantalumBand", (0.30, 0.16, 0.03, 1), 0.0, 0.5)
    m["mlcc"] = create_pbr_material("Mat_MLCC", (0.50, 0.40, 0.28, 1), 0.0, 0.55)
    m["btn_body"] = create_pbr_material("Mat_ButtonBody", (0.80, 0.81, 0.82, 1), 1.0, 0.3)
    m["btn_plunger"] = create_pbr_material("Mat_ButtonPlunger", (0.05, 0.05, 0.055, 1), 0.0, 0.5)
    m["led_body"] = create_pbr_material("Mat_LEDBody", (0.9, 0.9, 0.88, 1), 0.0, 0.35)
    m["led_red"] = create_pbr_material("Mat_LedRed", (0.95, 0.12, 0.10, 1), 0.0, 0.2, emission=(1.0, 0.08, 0.05, 2.0))
    m["led_blue"] = create_pbr_material("Mat_LedBlue", (0.15, 0.35, 0.95, 1), 0.0, 0.2, emission=(0.12, 0.4, 1.0, 2.0))
    m["shield_photo"] = create_texture_material("Mat_ShieldPhoto", SHIELD_TEXTURE, metallic=0.55, roughness=0.42)
    return m


def create_texture_material(name, image_path, metallic=0.0, roughness=0.5):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(str(image_path))
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def uv_quad(name, x0, x1, z0, z1, y, material):
    """Upward-facing quad with UVs: u along +Z, v along +X (image top = +X / antenna end)."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new("UVMap")
    corners = [(x0, z0, 0, 0), (x0, z1, 1, 0), (x1, z1, 1, 1), (x1, z0, 0, 1)]
    verts = [bm.verts.new((x, y, z)) for x, z, _, _ in corners]
    face = bm.faces.new(verts)
    for loop, (_, _, u, v) in zip(face.loops, corners):
        loop[uv].uv = (u, v)
    face.normal_update()
    if face.normal.y < 0:
        face.normal_flip()
    return _obj_from_bm(name, bm, material)


# ---------------------------------------------------------------------------
# Geometry primitives (all return a new mesh object)
# ---------------------------------------------------------------------------

def _obj_from_bm(name, bm, material):
    mesh = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def box(name, size, center, material, bevel=0.0, segments=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=segments,
                        profile=0.5, affect="EDGES", clamp_overlap=True)
    bmesh.ops.translate(bm, vec=Vector(center), verts=bm.verts)
    return _obj_from_bm(name, bm, material)


def cylinder_y(name, radius, height, center, material, segments=24, radius_top=None, rot_y=0.0):
    """Cylinder / frustum whose axis is the Y axis (board normal)."""
    bm = bmesh.new()
    mat = Matrix.Translation(Vector(center)) @ Matrix.Rotation(rot_y, 4, "Y") @ Matrix.Rotation(-math.pi / 2, 4, "X")
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments,
                          radius1=radius, radius2=radius if radius_top is None else radius_top,
                          depth=height, matrix=mat)
    return _obj_from_bm(name, bm, material)


def rounded_rect_profile(w, h, r, seg=6):
    """CCW profile points (u, v) of a w x h rounded rectangle centered at 0."""
    r = min(r, w / 2.0, h / 2.0)
    pts = []
    corners = [
        (w / 2 - r, h / 2 - r, 0.0),
        (-w / 2 + r, h / 2 - r, math.pi / 2),
        (-w / 2 + r, -h / 2 + r, math.pi),
        (w / 2 - r, -h / 2 + r, 1.5 * math.pi),
    ]
    for cx, cy, a0 in corners:
        for i in range(seg + 1):
            a = a0 + (math.pi / 2) * i / seg
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def prism(name, profile, to3d, w0, w1, material):
    """Extrude a closed 2D profile; to3d(u, v, w) maps to world coordinates."""
    bm = bmesh.new()
    a = [bm.verts.new(to3d(u, v, w0)) for u, v in profile]
    b = [bm.verts.new(to3d(u, v, w1)) for u, v in profile]
    n = len(profile)
    bm.faces.new(a)
    bm.faces.new(list(reversed(b)))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([a[i], a[j], b[j], b[i]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj_from_bm(name, bm, material)


def hollow_prism(name, outer, inner, to3d, w_open, w_back, cavity_depth, material):
    """Shell: outer profile extruded w_open..w_back with an inner cavity open at w_open."""
    assert len(outer) == len(inner)
    bm = bmesh.new()
    sgn = 1.0 if w_back > w_open else -1.0
    w_cav = w_open + sgn * cavity_depth
    o0 = [bm.verts.new(to3d(u, v, w_open)) for u, v in outer]
    o1 = [bm.verts.new(to3d(u, v, w_back)) for u, v in outer]
    i0 = [bm.verts.new(to3d(u, v, w_open)) for u, v in inner]
    i1 = [bm.verts.new(to3d(u, v, w_cav)) for u, v in inner]
    n = len(outer)
    bm.faces.new(o1)
    bm.faces.new(i1)
    for k in range(n):
        j = (k + 1) % n
        bm.faces.new([o0[k], o0[j], o1[j], o1[k]])  # outer wall
        bm.faces.new([i0[k], i1[k], i1[j], i0[j]])  # cavity wall
        bm.faces.new([o0[k], i0[k], i0[j], o0[j]])  # front rim
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj_from_bm(name, bm, material)


def flat_text(name, body, size, center, right, up, material):
    """Flat text mesh lying in the plane spanned by `right` and `up` (normal = right x up)."""
    cu = bpy.data.curves.new(name + "_curve", "FONT")
    cu.body = body
    cu.size = size
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    cu.space_line = 0.85
    tmp = bpy.data.objects.new(name + "_tmp", cu)
    bpy.context.scene.collection.objects.link(tmp)
    deps = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(tmp.evaluated_get(deps))
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)

    r = Vector(right).normalized()
    u = Vector(up).normalized()
    n = r.cross(u)
    basis = Matrix((
        (r.x, u.x, n.x, center[0]),
        (r.y, u.y, n.y, center[1]),
        (r.z, u.z, n.z, center[2]),
        (0, 0, 0, 1),
    ))
    mesh.transform(basis)
    mesh.name = name
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.clear()
    obj.data.materials.append(material)
    return obj


def silk_rect(prefix, xmin, xmax, zmin, zmax, mats, y=TOP + 0.012, w=0.15):
    t = 0.02
    return [
        box(f"{prefix}_n", (xmax - xmin + w, t, w), ((xmin + xmax) / 2, y, zmin), mats["silk"]),
        box(f"{prefix}_s", (xmax - xmin + w, t, w), ((xmin + xmax) / 2, y, zmax), mats["silk"]),
        box(f"{prefix}_w", (w, t, zmax - zmin), (xmin, y, (zmin + zmax) / 2), mats["silk"]),
        box(f"{prefix}_e", (w, t, zmax - zmin), (xmax, y, (zmin + zmax) / 2), mats["silk"]),
    ]


def join_as(name, objs):
    deselect_all()
    target = objs[0]
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = target
    if len(objs) > 1:
        bpy.ops.object.join()
    deselect_all()
    target.name = name
    target.data.name = name
    return target


# Text bases matching the real board photos (antenna end pointing "up"):
#   top side:    reading direction +Z, glyph up +X
#   bottom side: reading direction -Z, glyph up +X (board flipped over)
TOP_RIGHT, TOP_UP = (0, 0, 1), (1, 0, 0)
BOT_RIGHT, BOT_UP = (0, 0, -1), (1, 0, 0)
# Rotated labels: CP2102 marking reads toward the USB end
CHIP_RIGHT, CHIP_UP = (-1, 0, 0), (0, 0, 1)
# Bottom pin labels read along the rows toward the USB end, glyph tops toward -Z
PINLBL_RIGHT, PINLBL_UP = (-1, 0, 0), (0, 0, -1)


def plate(name, w, d, r, center, y0, y1, material, seg=6):
    """Thin rounded-rect plate lying on the board (w along X, d along Z)."""
    prof = rounded_rect_profile(w, d, r, seg)
    cx, cz = center
    return prism(name, prof, lambda u, v, y: (cx + u, y, cz + v), y0, y1, material)


def disc(name, radius, center, y0, y1, material, segments=24):
    cx, cz = center
    return cylinder_y(name, radius, abs(y1 - y0), (cx, (y0 + y1) / 2, cz), material, segments=segments)


# ---------------------------------------------------------------------------
# Components
# ---------------------------------------------------------------------------

def build_pcb(m):
    profile = rounded_rect_profile(PCB_W, PCB_D, 1.0, seg=6)
    parts = [prism("pcb", profile, lambda u, v, w: (u, w, v), BOTTOM, TOP, m["mask"])]

    # ---- Top silkscreen (light blue-gray, as on the photographed board) ----
    yt = TOP + 0.012
    parts.append(flat_text("silk_en", "EN", 1.15, (-18.6, yt, -7.6), TOP_RIGHT, TOP_UP, m["silk"]))
    parts.append(flat_text("silk_io0", "IO0", 1.15, (-18.6, yt, 7.8), TOP_RIGHT, TOP_UP, m["silk"]))
    parts += silk_rect("silk_led1", -11.9, -9.3, -7.6, -6.2, m)
    parts += silk_rect("silk_led2", -11.9, -9.3, -5.3, -3.9, m)
    parts += silk_rect("silk_tant", -6.2, -1.8, -3.8, -0.2, m)
    parts += silk_rect("silk_cp", -15.9, -10.1, -2.7, 3.1, m)
    parts += silk_rect("silk_q1", -11.6, -9.6, 5.0, 7.6, m)
    parts += silk_rect("silk_q2", -15.4, -13.4, 5.0, 7.6, m)
    parts.append(box("silk_mod_end", (0.15, 0.02, 18.8), (-0.35, yt, 0), m["silk"]))
    for s in (-1, 1):
        parts.append(box(f"silk_mod_side_{s}", (2.0, 0.02, 0.15), (0.6, yt, s * 9.35), m["silk"]))
    for k in range(5):  # diagonal hatch near the LDO tab (decorative traces seen in the photo)
        parts.append(box(f"silk_hatch_{k}", (0.12, 0.02, 2.2), (-1.4 - k * 0.45, yt, 8.4), m["silk"]))
    parts.append(flat_text("silk_plus1", "+", 0.9, (-8.7, yt, -6.9), TOP_RIGHT, TOP_UP, m["silk"]))
    parts.append(flat_text("silk_plus2", "+", 0.9, (-8.7, yt, -4.6), TOP_RIGHT, TOP_UP, m["silk"]))

    # ---- Bottom: white silkscreen field with NodeMCU artwork ----
    yb = BOTTOM
    parts.append(plate("bot_white", 50.6, 17.2, 0.4, (0.0, 0.0), yb - 0.02, yb, m["silk_white"]))
    parts.append(plate("bot_logo", 16.4, 14.0, 1.6, (11.2, 0.0), yb - 0.03, yb - 0.02, m["mask"]))
    # Cloud
    parts.append(plate("bot_cloud_base", 7.4, 12.4, 2.6, (8.0, 0.0), yb - 0.04, yb - 0.03, m["silk_white"]))
    parts.append(disc("bot_cloud_top", 4.1, (12.4, 0.0), yb - 0.04, yb - 0.03, m["silk_white"], 40))
    for s in (-1, 1):
        parts.append(disc(f"bot_cloud_lobe_{s}", 2.9, (10.9, s * 3.4), yb - 0.04, yb - 0.03, m["silk_white"], 32))
    # Chip with "N" and pin dashes
    parts.append(plate("bot_chip", 3.8, 3.8, 0.4, (10.6, 0.0), yb - 0.05, yb - 0.04, m["mask"]))
    parts.append(flat_text("bot_chip_n", "N", 2.6, (10.6, yb - 0.051, 0.0), BOT_RIGHT, BOT_UP, m["silk_white"]))
    for k in (-1, 0, 1):
        parts.append(plate(f"bot_dash_t{k}", 1.1, 0.42, 0.2, (14.0, k * 1.1), yb - 0.05, yb - 0.04, m["mask"]))
        parts.append(plate(f"bot_dash_b{k}", 1.1, 0.42, 0.2, (7.2, k * 1.1), yb - 0.05, yb - 0.04, m["mask"]))
        for s in (-1, 1):
            parts.append(plate(f"bot_dash_s{k}_{s}", 0.42, 1.1, 0.2, (10.6 + k * 1.1, s * 3.3), yb - 0.05, yb - 0.04, m["mask"]))
    # Text block
    parts.append(flat_text("bot_nodemcu", "NODEMCU", 2.7, (-0.6, yb - 0.03, 0.2), BOT_RIGHT, BOT_UP, m["mask"]))
    parts.append(flat_text("bot_esp32s", "ESP-32S", 2.3, (-5.4, yb - 0.03, -2.3), BOT_RIGHT, BOT_UP, m["mask"]))
    parts.append(box("bot_underline", (0.14, 0.01, 9.0), (-6.7, yb - 0.025, -1.6), m["mask"]))
    parts.append(flat_text("bot_ver", "V1.1", 1.2, (-9.3, yb - 0.03, 2.4), BOT_RIGHT, BOT_UP, m["mask"]))
    parts.append(flat_text("bot_code", "101010", 1.2, (-9.3, yb - 0.03, -4.6), BOT_RIGHT, BOT_UP, m["mask"]))
    parts.append(box("bot_l_v", (1.4, 0.01, 0.14), (-9.7, yb - 0.025, 4.4), m["mask"]))
    parts.append(box("bot_l_h", (0.14, 0.01, 10.9), (-10.4, yb - 0.025, -1.05), m["mask"]))
    # USB-C through-hole slots and holes near the -X end
    for x in (-18.9, -22.8):
        for s in (-1, 1):
            parts.append(plate(f"bot_slot_{x}_{s}", 2.3, 1.5, 0.7, (x, s * 4.7), yb - 0.04, yb - 0.02, m["tin"]))
            parts.append(plate(f"bot_slot_hole_{x}_{s}", 1.3, 0.6, 0.28, (x, s * 4.7), yb - 0.05, yb - 0.04, m["hole"]))
    for s in (-1, 1):
        parts.append(disc(f"bot_hole_{s}", 0.75, (-19.9, s * 2.7), yb - 0.04, yb - 0.02, m["hole"], 20))
        parts.append(disc(f"bot_blob_{s}", 1.25, (-22.4, s * 2.9), yb - 0.04, yb - 0.02, m["mask"], 24))
    # Pin labels on the black strips beside each header row
    for i, (lt, rt) in enumerate(zip(LEFT_LABELS, RIGHT_LABELS)):
        x = PIN_X0 - i * PIN_PITCH
        parts.append(flat_text(f"silk_l{i}", lt, 1.15, (x, yb - 0.012, -9.45), PINLBL_RIGHT, PINLBL_UP, m["silk_white"]))
        parts.append(flat_text(f"silk_r{i}", rt, 1.15, (x, yb - 0.012, 9.45), PINLBL_RIGHT, PINLBL_UP, m["silk_white"]))

    return join_as("pcb", parts)


def build_module(m):
    """ESP-32 module: module PCB under the shield + shield artwork + castellated pads."""
    mod_x0 = 1.45
    mod_x1 = mod_x0 + 25.5  # overhangs the +X board edge slightly, as on the real board
    split_x = mod_x0 + 18.35  # where the antenna section starts
    mod_y0, mod_y1 = TOP, TOP + 0.8
    mod_half_z = 9.0
    parts = [box("wroom_pcb", (split_x - mod_x0, 0.8, 18.0),
                 ((mod_x0 + split_x) / 2, (mod_y0 + mod_y1) / 2, 0.0), m["module_pcb"])]

    sh_x0, sh_x1 = mod_x0 + 0.6, mod_x0 + 17.7
    sh_hz = 7.9
    sh_h = 2.3
    parts.append(box("wroom_shield", (sh_x1 - sh_x0, sh_h, 2 * sh_hz),
                     ((sh_x0 + sh_x1) / 2, mod_y1 + sh_h / 2, 0.0), m["shield"], bevel=0.3, segments=3))
    ys = mod_y1 + sh_h + 0.006

    # Real shield markings, perspective-corrected from a photo of the board
    inset = 0.18
    parts.append(uv_quad("wroom_shield_art", sh_x0 + inset, sh_x1 - inset, -sh_hz + inset, sh_hz - inset, ys, m["shield_photo"]))

    # Castellated pads: 14 per long side, 10 on the short (-X) end
    for i in range(14):
        x = mod_x0 + 1.3 + i * 1.27
        for s in (-1, 1):
            parts.append(box(f"wroom_pad_{s}_{i}", (0.9, 0.82, 0.5), (x, (mod_y0 + mod_y1) / 2, s * (mod_half_z - 0.2)), m["enig"]))
            parts.append(box(f"wroom_land_{s}_{i}", (0.9, 0.04, 1.0), (x, TOP + 0.02, s * (mod_half_z + 0.25)), m["tin"]))
    for i in range(10):
        z = -5.715 + i * 1.27
        parts.append(box(f"wroom_endpad_{i}", (0.5, 0.82, 0.9), (mod_x0 + 0.2, (mod_y0 + mod_y1) / 2, z), m["enig"]))
        parts.append(box(f"wroom_endland_{i}", (1.1, 0.04, 0.9), (mod_x0 - 0.3, TOP + 0.02, z), m["tin"]))

    module = join_as("esp_wroom_32", parts)

    # Antenna section of the module PCB; the meander is only faintly visible under the mask
    ant = [box("ant_pcb", (mod_x1 - split_x, 0.8, 18.0), ((split_x + mod_x1) / 2, (mod_y0 + mod_y1) / 2, 0.0), m["module_pcb"])]
    y_tr = mod_y1 + 0.01
    tw = 0.45
    ant.append(box("ant_feed", (2.2, 0.02, tw), (split_x + 1.3, y_tr, -7.6), m["antenna"]))
    ant.append(box("ant_gnd", (tw, 0.02, 3.0), (split_x + 1.0, y_tr, -7.6), m["antenna"]))
    zs = [-7.6 + k * 1.52 for k in range(11)]
    x_lo, x_hi = split_x + 2.4, mod_x1 - 0.8
    for k, z in enumerate(zs):
        ant.append(box(f"ant_leg_{k}", (x_hi - x_lo, 0.02, tw), ((x_lo + x_hi) / 2, y_tr, z), m["antenna"]))
        if k < len(zs) - 1:
            xe = x_hi if k % 2 == 0 else x_lo
            ant.append(box(f"ant_turn_{k}", (tw, 0.02, 1.52 + tw), (xe, y_tr, z + 0.76), m["antenna"]))
    antenna = join_as("antenna_pcb", ant)
    return module, antenna


def build_usb_c(m):
    length = 7.35
    x_open = -PCB_W / 2 - 1.8  # slight overhang past the board edge
    x_back = x_open + length
    h, w = 3.26, 8.94
    yc = TOP + h / 2
    outer = rounded_rect_profile(w, h, h / 2 - 0.01, seg=8)
    inner = rounded_rect_profile(w - 0.6, h - 0.6, (h - 0.6) / 2 - 0.01, seg=8)
    to3d = lambda u, v, x: (x, yc + v, u)
    parts = [hollow_prism("usb_shell", outer, inner, to3d, x_open, x_back, length - 0.6, m["usb_metal"])]
    parts.append(box("usb_tongue", (5.4, 0.7, 6.7), (x_open + 0.6 + 2.7, yc, 0.0), m["usb_tongue"], bevel=0.12))
    for k in range(12):
        z = -2.75 + k * 0.5
        for s in (-1, 1):
            parts.append(box(f"usb_contact_{s}_{k}", (3.2, 0.03, 0.25), (x_open + 1.2 + 1.6, yc + s * 0.36, z), m["enig"]))
    for x in (x_open + 1.6, x_back - 1.4):
        for s in (-1, 1):
            parts.append(box(f"usb_leg_{x:.1f}_{s}", (1.0, 1.4, 0.5), (x, TOP + 0.45, s * (w / 2 + 0.1)), m["usb_metal"]))
    parts.append(box("usb_smd_row", (0.6, 0.15, 5.6), (x_back + 0.45, TOP + 0.08, 0.0), m["tin"]))
    return join_as("usb_type_c", parts)


def build_qfn_cp2102(m):
    cx, cz = -13.0, 0.2
    s = 5.0
    parts = [box("cp_body", (s, 0.9, s), (cx, TOP + 0.45, cz), m["ic"], bevel=0.08)]
    for i in range(7):
        off = -1.5 + i * 0.5
        for (dx, dz, sx, sz) in ((off, -s / 2, 0.25, 0.5), (off, s / 2, 0.25, 0.5),
                                 (-s / 2, off, 0.5, 0.25), (s / 2, off, 0.5, 0.25)):
            parts.append(box(f"cp_pad_{dx:.2f}_{dz:.2f}", (sx, 0.18, sz), (cx + dx, TOP + 0.09, cz + dz), m["tin"]))
    y = TOP + 0.906
    parts.append(flat_text("cp_txt", "SILABS\nCP2102\nFPC03X\n2433+", 0.78, (cx + 0.1, y, cz - 0.1), CHIP_RIGHT, CHIP_UP, m["ic_mark"]))
    parts.append(cylinder_y("cp_pin1", 0.3, 0.01, (cx - 1.8, y, cz - 1.8), m["ic_mark"], segments=12))
    return join_as("cp2102", parts)


def build_ams1117(m):
    """SOT-223 with its long axis along the board, tab toward the +Z header row."""
    cx, cz = -4.9, 3.4
    body_x, body_z = 6.5, 3.5
    parts = [box("ams_body", (body_x, 1.6, body_z), (cx, TOP + 0.1 + 0.8, cz), m["ic"], bevel=0.1)]
    tab_z0 = cz + body_z / 2
    parts.append(box("ams_tab_up", (3.0, 0.25, 0.9), (cx, TOP + 0.9, tab_z0 + 0.35), m["tin"]))
    parts.append(box("ams_tab_down", (3.0, 0.9, 0.25), (cx, TOP + 0.5, tab_z0 + 0.8), m["tin"]))
    parts.append(box("ams_tab_foot", (3.0, 0.25, 1.1), (cx, TOP + 0.12, tab_z0 + 1.3), m["tin"]))
    parts.append(box("ams_tab_land", (3.6, 0.04, 2.0), (cx, TOP + 0.02, tab_z0 + 1.2), m["tin"]))
    lead_z0 = cz - body_z / 2
    for dx in (-2.3, 0.0, 2.3):
        parts.append(box(f"ams_lead_up_{dx}", (0.7, 0.25, 0.6), (cx + dx, TOP + 0.9, lead_z0 - 0.25), m["tin"]))
        parts.append(box(f"ams_lead_dn_{dx}", (0.7, 0.9, 0.25), (cx + dx, TOP + 0.5, lead_z0 - 0.55), m["tin"]))
        parts.append(box(f"ams_lead_ft_{dx}", (0.7, 0.25, 0.9), (cx + dx, TOP + 0.12, lead_z0 - 0.95), m["tin"]))
        parts.append(box(f"ams_lead_land_{dx}", (1.3, 0.04, 1.6), (cx + dx, TOP + 0.02, lead_z0 - 1.0), m["tin"]))
    parts.append(flat_text("ams_txt", "AMS1117\n3.3", 0.75, (cx, TOP + 1.706, cz), CHIP_RIGHT, CHIP_UP, m["ic_mark"]))
    return join_as("ams1117", parts)


def build_button(name, cx, cz, m):
    """4 x 3 mm SMD tact switch: metal top, black round plunger, legs at the X ends."""
    parts = [box(f"{name}_body", (3.9, 1.0, 2.9), (cx, TOP + 0.5, cz), m["btn_plunger"], bevel=0.1)]
    parts.append(box(f"{name}_cover", (3.9, 0.15, 2.9), (cx, TOP + 1.07, cz), m["btn_body"], bevel=0.05))
    parts.append(cylinder_y(f"{name}_plunger", 0.7, 0.4, (cx, TOP + 1.3, cz), m["btn_plunger"], segments=24))
    for s in (-1, 1):
        parts.append(box(f"{name}_leg_{s}", (0.9, 0.9, 1.2), (cx + s * 2.2, TOP + 0.45, cz), m["btn_body"]))
        parts.append(box(f"{name}_foot_{s}", (0.8, 0.12, 1.3), (cx + s * 2.6, TOP + 0.06, cz), m["tin"]))
    return join_as(name, parts)


def build_led(name, cx, cz, color_mat, m):
    """0603 LED, long axis along X."""
    parts = [box(f"{name}_body", (1.6, 0.35, 0.8), (cx, TOP + 0.175, cz), m["led_body"], bevel=0.03)]
    parts.append(box(f"{name}_lens", (0.9, 0.2, 0.62), (cx, TOP + 0.44, cz), color_mat, bevel=0.05))
    for dx in (-0.7, 0.7):
        parts.append(box(f"{name}_end_{dx}", (0.25, 0.36, 0.82), (cx + dx, TOP + 0.18, cz), m["tin"]))
    return join_as(name, parts)


def sot23(prefix, cx, cz, m):
    """SOT-23 with its long axis along Z (as on the photographed board)."""
    parts = [box(f"{prefix}_body", (1.3, 1.0, 2.9), (cx, TOP + 0.6, cz), m["ic"], bevel=0.06)]
    for dz, s in ((-0.95, -1), (0.95, -1), (0.0, 1)):
        parts.append(box(f"{prefix}_lead_{dz}_{s}", (0.8, 0.15, 0.4), (cx + s * 0.9, TOP + 0.12, cz + dz), m["tin"]))
    return parts


def build_transistors(m):
    parts = sot23("q1", -10.6, 6.3, m) + sot23("q2", -14.4, 6.3, m)
    return join_as("transistor_auto_boot", parts)


def chip_part(prefix, kind, cx, cz, along_x, m):
    """Two-terminal SMD part: 'c0402', 'c0603', 'r0603', 'r0402', 'c0805', 'sod323'."""
    dims = {
        "c0402": (1.0, 0.5, 0.5, "mlcc"),
        "r0402": (1.0, 0.35, 0.5, "ic"),
        "c0603": (1.6, 0.8, 0.8, "mlcc"),
        "r0603": (1.6, 0.45, 0.8, "ic"),
        "c0805": (2.0, 1.0, 1.25, "mlcc"),
        "sod323": (1.8, 0.9, 1.3, "ic"),
    }
    length, height, width, mat_key = dims[kind]
    sx, sz = (length, width) if along_x else (width, length)
    parts = [box(f"{prefix}_body", (sx, height, sz), (cx, TOP + height / 2, cz), m[mat_key], bevel=0.04)]
    end = 0.2 if length <= 1.0 else 0.3
    for s in (-1, 1):
        if kind == "sod323":
            size = (0.5, 0.15, 0.4) if along_x else (0.4, 0.15, 0.5)
            off = length / 2 + 0.15
            pos = (cx + s * off, TOP + 0.08, cz) if along_x else (cx, TOP + 0.08, cz + s * off)
        elif along_x:
            size, pos = (end, height + 0.02, width + 0.02), (cx + s * (length / 2 - end / 2), TOP + height / 2, cz)
        else:
            size, pos = (width + 0.02, height + 0.02, end), (cx, TOP + height / 2, cz + s * (length / 2 - end / 2))
        parts.append(box(f"{prefix}_term_{s}", size, pos, m["tin"]))
        # Exposed tinned land around each terminal
        land = (size[0] + 0.25, 0.03, size[2] + 0.25) if kind != "sod323" else (size[0] + 0.2, 0.03, size[2] + 0.2)
        parts.append(box(f"{prefix}_land_{s}", land, (pos[0], TOP + 0.015, pos[2]), m["tin"]))
    return parts


def build_passives(m):
    parts = []
    # Tantalum 10uF (case B), long axis along X, anode band toward the USB end
    tx, tz = -4.0, -2.0
    parts.append(box("tant_body", (3.5, 1.9, 2.8), (tx, TOP + 0.95, tz), m["tantalum"], bevel=0.12))
    parts.append(box("tant_band", (0.5, 1.92, 2.82), (tx - 1.2, TOP + 0.95, tz), m["tantalum_band"]))
    for s in (-1, 1):
        parts.append(box(f"tant_term_{s}", (0.5, 0.6, 2.2), (tx + s * 1.85, TOP + 0.3, tz), m["tin"]))
        parts.append(box(f"tant_land_{s}", (1.4, 0.03, 2.6), (tx + s * 1.9, TOP + 0.015, tz), m["tin"]))
    parts.append(flat_text("tant_txt", "106\nJTA", 0.8, (tx + 0.3, TOP + 1.91, tz), CHIP_RIGHT, CHIP_UP, m["tantalum_band"]))

    layout = [
        # Row under the module (beside the tantalum)
        ("c0805", -4.6, -6.6, True), ("r0603", -4.6, -4.6, True),
        # Around the LEDs / CP2102
        ("r0603", -13.2, -7.0, True), ("r0603", -13.2, -4.6, True),
        ("c0402", -9.4, -2.4, False), ("c0402", -9.4, -0.9, False),
        ("sod323", -15.6, -6.8, True), ("c0603", -16.0, -4.4, True), ("c0603", -16.0, -2.6, True),
        ("r0402", -9.6, 3.6, True), ("r0402", -11.6, 3.6, True), ("r0402", -13.0, 3.6, True),
        ("r0402", -14.4, 3.6, True), ("r0402", -15.8, 3.6, True),
        ("c0402", -16.6, 6.3, False), ("c0402", -8.6, 6.3, False),
        # USB-C CC pull-downs and button debounce parts
        ("r0402", -17.6, -1.6, True), ("r0402", -17.6, 1.8, True),
        ("r0603", -21.2, -5.25, True), ("r0603", -21.2, 5.25, True),
    ]
    for k, (kind, x, z, ax) in enumerate(layout):
        parts += chip_part(f"pas{k}", kind, x, z, ax, m)
    return join_as("passives", parts)


def build_header_row(name, z, m):
    """19-pin male header soldered from below: plastic spacer under the board."""
    spacer_h = 2.5
    spacer_y = BOTTOM - spacer_h / 2
    pin_top = TOP + 1.8
    pin_bot = BOTTOM - spacer_h - 6.0
    tip = 0.45
    parts = []
    for i in range(19):
        x = PIN_X0 - i * PIN_PITCH
        parts.append(box(f"{name}_blk_{i}", (2.44, spacer_h, 2.44), (x, spacer_y, z), m["header_plastic"], bevel=0.14, segments=2))
        body_top, body_bot = pin_top - tip, pin_bot + tip
        parts.append(box(f"{name}_pin_{i}", (0.64, body_top - body_bot, 0.64), (x, (body_top + body_bot) / 2, z), m["tin"]))
        parts.append(cylinder_y(f"{name}_tipu_{i}", 0.453, tip, (x, body_top + tip / 2, z), m["tin"], segments=4, radius_top=0.12, rot_y=math.pi / 4))
        parts.append(cylinder_y(f"{name}_tipd_{i}", 0.12, tip, (x, body_bot - tip / 2, z), m["tin"], segments=4, radius_top=0.453, rot_y=math.pi / 4))
        # Annular ring + solder fillet on top
        if i == 0:
            parts.append(box(f"{name}_pad_{i}", (1.7, 0.04, 1.7), (x, TOP + 0.02, z), m["enig"]))
        else:
            parts.append(cylinder_y(f"{name}_pad_{i}", 0.95, 0.04, (x, TOP + 0.02, z), m["enig"], segments=20))
        parts.append(cylinder_y(f"{name}_fillet_{i}", 0.85, 0.35, (x, TOP + 0.215, z), m["tin"], segments=20, radius_top=0.62))
        parts.append(cylinder_y(f"{name}_fillet2_{i}", 0.62, 0.3, (x, TOP + 0.54, z), m["tin"], segments=20, radius_top=0.34))
    return join_as(name, parts)


def build_scene(m):
    build_pcb(m)
    build_module(m)
    build_usb_c(m)
    build_qfn_cp2102(m)
    build_ams1117(m)
    build_button("btn_en", -21.2, -7.6, m)
    build_button("btn_boot", -21.2, 7.6, m)
    build_led("led_pwr", -10.6, -6.9, m["led_red"], m)
    build_led("led_io2", -10.6, -4.6, m["led_blue"], m)
    build_transistors(m)
    build_passives(m)
    build_header_row("pin_headers_left", -ROW_Z, m)
    build_header_row("pin_headers_right", ROW_Z, m)


# ---------------------------------------------------------------------------
# Metadata + export
# ---------------------------------------------------------------------------

def compute_object_metadata(obj):
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    mn = [min(c[i] for c in corners) for i in range(3)]
    mx = [max(c[i] for c in corners) for i in range(3)]
    side = "both" if obj.name in ("pcb", "pin_headers_left", "pin_headers_right") else "top"
    return {
        "meshName": obj.name,
        "side": side,
        "vertexCount": len(obj.data.vertices),
        "polygonCount": len(obj.data.polygons),
        "bbox": {"min": [round(v, 3) for v in mn], "max": [round(v, 3) for v in mx]},
        "center": [round((a + b) / 2.0, 3) for a, b in zip(mn, mx)],
        "size": [round(b - a, 3) for a, b in zip(mn, mx)],
    }


def main():
    print("Generating ESP32 NodeMCU-32S Type-C model...")
    clean_scene()
    mats = build_materials()
    build_scene(mats)

    objects = list(bpy.context.scene.collection.objects)
    meta_items = []
    for obj in objects:
        meta = compute_object_metadata(obj)
        meta_items.append(meta)
        print(f"  - {meta['meshName']:22s} | V: {meta['vertexCount']:5d} | P: {meta['polygonCount']:5d} | Size: {meta['size']}")

    bpy.ops.export_scene.gltf(
        filepath=str(GLB_OUT),
        export_format="GLB",
        export_apply=True,
        export_yup=False,  # geometry is already authored Y-up
        export_image_format="JPEG",
    )
    with open(META_OUT, "w", encoding="utf-8") as f:
        json.dump(meta_items, f, indent=2, ensure_ascii=False)
    print(f"Wrote {GLB_OUT} and {META_OUT}")


if __name__ == "__main__":
    main()
