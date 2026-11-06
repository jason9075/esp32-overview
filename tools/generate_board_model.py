#!/usr/bin/env python3
"""
Generate the complete 3D hardware model for ESP32 NodeMCU-32S 38-Pin Type-C.
Builds accurate geometry for PCB, ESP-WROOM-32 module, RF shield, MIFA antenna,
USB Type-C receptacle, CP2102 QFN-28, AMS1117-3.3 SOT-223, EN/BOOT buttons, LEDs,
passives, and dual 19-pin 2.54mm pin headers.

Exports:
  1. `public/assets/esp32_nodemcu_32s_typec.glb`
  2. `src/data/boards/nodemcu_32s_typec/modelPlacements.json`
"""

import json
import math
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parent.parent
GLB_OUT = ROOT / "public" / "assets" / "esp32_nodemcu_32s_typec.glb"
META_OUT = ROOT / "src" / "data" / "boards" / "nodemcu_32s_typec" / "modelPlacements.json"

GLB_OUT.parent.mkdir(parents=True, exist_ok=True)
META_OUT.parent.mkdir(parents=True, exist_ok=True)


def clean_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)
    col = bpy.data.collections.new("ESP32_Scene")
    bpy.context.scene.collection.children.link(col)


def deselect_all():
    bpy.ops.object.select_all(action="DESELECT")


def create_pbr_material(name: str, color: tuple, metallic: float = 0.0, roughness: float = 0.5, emission=None):
    mat = bpy.data.materials.new(name=name)
    nodes = mat.node_tree.nodes
    bsdf = next(n for n in nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*emission[:3], 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission[3] if len(emission) > 3 else 2.5
    return mat


def build_materials():
    mats = {}
    mats["pcb"] = create_pbr_material("Mat_PCB", (0.07, 0.08, 0.09, 1.0), metallic=0.08, roughness=0.42)
    mats["sub_pcb"] = create_pbr_material("Mat_SubPCB", (0.05, 0.06, 0.07, 1.0), metallic=0.08, roughness=0.45)
    mats["rf_shield"] = create_pbr_material("Mat_RFShield", (0.86, 0.88, 0.90, 1.0), metallic=0.96, roughness=0.22)
    mats["usb_metal"] = create_pbr_material("Mat_USBMetal", (0.88, 0.90, 0.92, 1.0), metallic=0.95, roughness=0.20)
    mats["usb_tongue"] = create_pbr_material("Mat_USBTongue", (0.04, 0.04, 0.05, 1.0), metallic=0.05, roughness=0.6)
    mats["gold_pins"] = create_pbr_material("Mat_GoldPins", (0.95, 0.78, 0.28, 1.0), metallic=0.92, roughness=0.22)
    mats["black_ic"] = create_pbr_material("Mat_BlackIC", (0.08, 0.08, 0.09, 1.0), metallic=0.12, roughness=0.48)
    mats["sot_tab"] = create_pbr_material("Mat_SOTTab", (0.82, 0.84, 0.86, 1.0), metallic=0.94, roughness=0.25)
    mats["btn_metal"] = create_pbr_material("Mat_BtnMetal", (0.85, 0.87, 0.89, 1.0), metallic=0.92, roughness=0.28)
    mats["btn_stem"] = create_pbr_material("Mat_BtnStem", (0.05, 0.05, 0.05, 1.0), metallic=0.05, roughness=0.6)
    mats["led_red"] = create_pbr_material("Mat_LedRed", (0.9, 0.15, 0.15, 1.0), metallic=0.1, roughness=0.2, emission=(1.0, 0.1, 0.1, 3.5))
    mats["led_blue"] = create_pbr_material("Mat_LedBlue", (0.2, 0.4, 0.95, 1.0), metallic=0.1, roughness=0.2, emission=(0.15, 0.5, 1.0, 3.5))
    mats["antenna"] = create_pbr_material("Mat_AntennaCopper", (0.88, 0.52, 0.22, 1.0), metallic=0.88, roughness=0.28)
    mats["passive_cap"] = create_pbr_material("Mat_PassiveCap", (0.55, 0.45, 0.35, 1.0), metallic=0.2, roughness=0.55)
    mats["passive_res"] = create_pbr_material("Mat_PassiveRes", (0.10, 0.10, 0.11, 1.0), metallic=0.2, roughness=0.5)
    mats["pin_plastic"] = create_pbr_material("Mat_PinPlastic", (0.06, 0.06, 0.07, 1.0), metallic=0.08, roughness=0.55)
    return mats


def create_box_mesh(name: str, size: tuple, loc: tuple, material):
    deselect_all()
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)

    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bm.to_mesh(mesh)
    bm.free()

    obj.scale = size
    obj.location = loc
    obj.data.materials.append(material)

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    deselect_all()
    return obj


def join_objects(target_obj, parts_to_join):
    deselect_all()
    for p in parts_to_join:
        p.select_set(True)
    target_obj.select_set(True)
    bpy.context.view_layer.objects.active = target_obj
    bpy.ops.object.join()
    deselect_all()
    return target_obj


def create_pcb(mats):
    """
    ESP32 NodeMCU-32S PCB:
    Dimensions: 51.5 mm (X) x 28.5 mm (Z) x 1.6 mm (Y).
    4 corner mounting holes (drill diameter 3.0 mm) at (±22.5 mm, ±11.0 mm).
    """
    deselect_all()
    mesh = bpy.data.meshes.new("pcb")
    obj = bpy.data.objects.new("pcb", mesh)
    bpy.context.scene.collection.objects.link(obj)

    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bm.to_mesh(mesh)
    bm.free()

    obj.scale = (51.5, 1.6, 28.5)
    obj.location = (0.0, 0.0, 0.0)
    obj.data.materials.append(mats["pcb"])

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # Bevel corners slightly for realism
    bev = obj.modifiers.new("CornerBevel", "BEVEL")
    bev.width = 1.0
    bev.segments = 3
    bev.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier="CornerBevel")

    # Cut 4 corner mounting holes
    hole_radius = 1.5
    hole_depth = 2.4
    hole_positions = [
        (-22.5, 0.0, -11.0),
        (-22.5, 0.0, 11.0),
        (22.5, 0.0, -11.0),
        (22.5, 0.0, 11.0),
    ]

    for i, hpos in enumerate(hole_positions):
        cyl_mesh = bpy.data.meshes.new(f"temp_hole_{i}")
        cyl_obj = bpy.data.objects.new(f"temp_hole_{i}", cyl_mesh)
        bpy.context.scene.collection.objects.link(cyl_obj)

        bm_cyl = bmesh.new()
        bmesh.ops.create_cone(bm_cyl, cap_ends=True, cap_tris=False, segments=16, radius1=hole_radius, radius2=hole_radius, depth=hole_depth)
        bm_cyl.to_mesh(cyl_mesh)
        bm_cyl.free()

        cyl_obj.location = hpos
        cyl_obj.rotation_euler = (math.radians(90), 0, 0)
        bpy.context.view_layer.objects.active = cyl_obj
        cyl_obj.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

        bool_mod = obj.modifiers.new(f"Hole_{i}", "BOOLEAN")
        bool_mod.operation = "DIFFERENCE"
        bool_mod.object = cyl_obj
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=f"Hole_{i}")

        bpy.data.objects.remove(cyl_obj)
        bpy.data.meshes.remove(cyl_mesh)

    deselect_all()
    return obj


def build_scene(mats):
    # 1. Main PCB Substrate
    create_pcb(mats)

    # 2. ESP-WROOM-32 Module
    sub_pcb = create_box_mesh("esp_wroom_32_pcb", (25.5, 0.8, 18.0), (12.5, 1.2, 0.0), mats["sub_pcb"])
    rf_shield = create_box_mesh("esp_wroom_32", (17.5, 2.2, 16.5), (8.5, 2.7, 0.0), mats["rf_shield"])
    join_objects(rf_shield, [sub_pcb])
    rf_shield.name = "esp_wroom_32"
    rf_shield.data.name = "esp_wroom_32"

    # 3. 2.4 GHz PCB Meander Antenna (MIFA)
    create_box_mesh("antenna_pcb", (6.5, 0.08, 15.0), (21.5, 1.64, 0.0), mats["antenna"])

    # 4. USB Type-C Receptacle
    usb_metal = create_box_mesh("usb_type_c", (8.9, 3.2, 7.3), (-23.0, 2.4, 0.0), mats["usb_metal"])
    usb_tongue = create_box_mesh("usb_tongue", (5.5, 0.6, 6.0), (-24.0, 2.4, 0.0), mats["usb_tongue"])
    join_objects(usb_metal, [usb_tongue])
    usb_metal.name = "usb_type_c"
    usb_metal.data.name = "usb_type_c"

    # 5. Silicon Labs CP2102 USB-to-UART Bridge (QFN-28)
    create_box_mesh("cp2102", (5.0, 0.9, 5.0), (-13.0, 1.25, 0.0), mats["black_ic"])

    # 6. AMS1117-3.3 LDO Voltage Regulator (SOT-223)
    ams_body = create_box_mesh("ams1117", (6.5, 1.6, 3.5), (-6.5, 1.6, -5.2), mats["black_ic"])
    ams_tab = create_box_mesh("ams1117_tab", (3.2, 0.4, 2.0), (-6.5, 1.6, -7.2), mats["sot_tab"])
    join_objects(ams_body, [ams_tab])
    ams_body.name = "ams1117"
    ams_body.data.name = "ams1117"

    # 7. Tactile Push Buttons (EN and BOOT)
    btn_en_base = create_box_mesh("btn_en", (3.8, 1.5, 3.0), (-20.5, 1.55, -7.5), mats["btn_metal"])
    btn_en_stem = create_box_mesh("btn_en_stem", (1.6, 0.8, 1.6), (-20.5, 2.7, -7.5), mats["btn_stem"])
    join_objects(btn_en_base, [btn_en_stem])
    btn_en_base.name = "btn_en"
    btn_en_base.data.name = "btn_en"

    btn_boot_base = create_box_mesh("btn_boot", (3.8, 1.5, 3.0), (-20.5, 1.55, 7.5), mats["btn_metal"])
    btn_boot_stem = create_box_mesh("btn_boot_stem", (1.6, 0.8, 1.6), (-20.5, 2.7, 7.5), mats["btn_stem"])
    join_objects(btn_boot_base, [btn_boot_stem])
    btn_boot_base.name = "btn_boot"
    btn_boot_base.data.name = "btn_boot"

    # 8. Status LEDs
    create_box_mesh("led_pwr", (1.6, 0.5, 0.8), (-16.5, 1.05, -7.0), mats["led_red"])
    create_box_mesh("led_io2", (1.6, 0.5, 0.8), (-16.5, 1.05, 7.0), mats["led_blue"])

    # 9. Auto-Reset Transistor Circuit (2x SOT-23)
    tr1 = create_box_mesh("transistor_auto_boot", (2.8, 1.0, 1.3), (-17.5, 1.3, -2.8), mats["black_ic"])
    tr2 = create_box_mesh("tr2", (2.8, 1.0, 1.3), (-17.5, 1.3, 2.8), mats["black_ic"])
    join_objects(tr1, [tr2])
    tr1.name = "transistor_auto_boot"
    tr1.data.name = "transistor_auto_boot"

    # 10. Passive Component Clusters
    cap_vin = create_box_mesh("passives", (3.2, 1.8, 1.6), (-7.0, 1.7, 4.5), mats["passive_cap"])
    cap_3v3 = create_box_mesh("cap_3v3", (3.2, 1.8, 1.6), (-3.5, 1.7, -5.2), mats["passive_cap"])
    diode = create_box_mesh("diode", (2.5, 1.1, 1.2), (-19.0, 1.35, 0.0), mats["black_ic"])
    r_cc1 = create_box_mesh("r_cc1", (1.0, 0.4, 0.5), (-19.5, 1.0, -1.8), mats["passive_res"])
    r_cc2 = create_box_mesh("r_cc2", (1.0, 0.4, 0.5), (-19.5, 1.0, 1.8), mats["passive_res"])
    join_objects(cap_vin, [cap_3v3, diode, r_cc1, r_cc2])
    cap_vin.name = "passives"
    cap_vin.data.name = "passives"

    # 11. 38-Pin Headers (Left Row: Pins 1..19 at Z = -11.43, Right Row: Pins 20..38 at Z = +11.43)
    def create_pin_header_row(name: str, z_pos: float):
        base = create_box_mesh(f"{name}_base", (48.3, 2.5, 2.54), (0.0, 2.05, z_pos), mats["pin_plastic"])
        pins = []
        for i in range(19):
            x_pin = -22.86 + i * 2.54
            p = create_box_mesh(f"{name}_p_{i}", (0.64, 11.5, 0.64), (x_pin, 2.8, z_pos), mats["gold_pins"])
            pins.append(p)
        join_objects(base, pins)
        base.name = name
        base.data.name = name
        return base

    create_pin_header_row("pin_headers_left", -11.43)
    create_pin_header_row("pin_headers_right", 11.43)


def compute_object_metadata(obj):
    bbox_corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    min_x = min(c.x for c in bbox_corners)
    max_x = max(c.x for c in bbox_corners)
    min_y = min(c.y for c in bbox_corners)
    max_y = max(c.y for c in bbox_corners)
    min_z = min(c.z for c in bbox_corners)
    max_z = max(c.z for c in bbox_corners)

    center = [(min_x + max_x) / 2.0, (min_y + max_y) / 2.0, (min_z + max_z) / 2.0]
    size = [max_x - min_x, max_y - min_y, max_z - min_z]

    vcount = len(obj.data.vertices)
    pcount = len(obj.data.polygons)

    side = "both" if obj.name in ("pcb", "pin_headers_left", "pin_headers_right") else "top"

    return {
        "meshName": obj.name,
        "side": side,
        "vertexCount": vcount,
        "polygonCount": pcount,
        "bbox": {
            "min": [round(min_x, 3), round(min_y, 3), round(min_z, 3)],
            "max": [round(max_x, 3), round(max_y, 3), round(max_z, 3)],
        },
        "center": [round(c, 3) for c in center],
        "size": [round(s, 3) for s in size],
    }


def main():
    print("🚀 Initializing ESP32 3D Model Generation Pipeline...")
    clean_scene()
    mats = build_materials()
    build_scene(mats)

    objects = list(bpy.context.scene.collection.objects)
    print(f"📦 Assembled {len(objects)} scene objects.")

    meta_items = []
    for obj in objects:
        meta = compute_object_metadata(obj)
        meta_items.append(meta)
        print(f"  - {meta['meshName']:22s} | V: {meta['vertexCount']:4d} | P: {meta['polygonCount']:4d} | Size: {meta['size']}")

    # Export to GLB
    print(f"💾 Exporting to GLB: {GLB_OUT}...")
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_OUT),
        export_format="GLB",
        export_apply=True,
    )

    # Save placements metadata
    print(f"💾 Saving metadata to: {META_OUT}...")
    with open(META_OUT, "w", encoding="utf-8") as f:
        json.dump(meta_items, f, indent=2, ensure_ascii=False)

    print("✅ Model generation completed successfully!")


if __name__ == "__main__":
    main()
