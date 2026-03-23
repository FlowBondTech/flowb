// ============================================================
// FlowBond Wearable — Platform.IO Hardware Housing
// Based on PRD v1.0 | nRF5340 SoC | 12 Subsystems
// ============================================================
// Units: millimeters
// The DANZ PINK 3D logo (0.53 x 1.00 x 0.08 model units)
// will be scaled and placed as a face plate on the top surface.
// ============================================================

// ── Global Parameters ──
$fn = 80;  // Smoothness for curved surfaces

// Wrist dimensions (adjustable)
wrist_circumference = 170;          // mm, average adult wrist
wrist_radius = wrist_circumference / (2 * PI);

// Band dimensions
band_width        = 22;             // mm, width of the band
band_thickness    = 8;              // mm, total thickness
band_inner_radius = wrist_radius;
band_outer_radius = wrist_radius + band_thickness;

// Main housing (the "watch face" module)
housing_length    = 42;             // mm, along the band
housing_width     = 28;             // mm, perpendicular to band
housing_height    = 10;             // mm, total height
housing_radius    = 4;              // mm, corner rounding

// DANZ logo face plate area (top surface)
logo_width        = 20;             // mm, fits within housing
logo_height       = 38;             // mm, proportional to 0.53:1.00
logo_depth        = 1.5;           // mm, raised from surface
logo_recess       = 0.8;           // mm, inset border around logo

// ── Component Dimensions (from PRD) ──

// nRF5340 SoC — QFN package
soc_width  = 7;   // mm
soc_length = 7;   // mm
soc_height = 1.0; // mm

// 6-Axis IMU (ICM-42688-P form factor)
imu_width  = 3;   // mm
imu_length = 3;   // mm
imu_height = 0.75;// mm

// AHT10 Temperature/Humidity sensor
aht_width  = 4;   // mm
aht_length = 4;   // mm
aht_height = 1.6; // mm

// Capacitive touch sensor pads (skin side)
touch_width  = 8;  // mm
touch_length = 5;  // mm
touch_height = 0.3;// mm (surface trace)

// Haptic motor (LRA type)
haptic_diameter = 8;  // mm
haptic_height   = 3;  // mm

// WS2812B RGB LED
led_width  = 5;   // mm
led_length = 5;   // mm
led_height = 1.6; // mm

// Button
button_diameter = 3.5; // mm
button_height   = 2.5; // mm

// USB-C port opening
usb_width  = 8.9; // mm
usb_height = 3.3; // mm
usb_depth  = 7;   // mm

// NFC antenna loop (PCB trace)
nfc_outer_diameter = 18; // mm
nfc_inner_diameter = 14; // mm
nfc_height         = 0.3;// mm (PCB layer)

// Battery (LiPo pouch cell, 200mAh)
battery_length = 20; // mm
battery_width  = 15; // mm
battery_height = 3;  // mm

// IBC electrodes (galvanic coupling, skin side)
electrode_width    = 6;   // mm
electrode_length   = 8;   // mm
electrode_height   = 0.5; // mm
electrode_spacing  = 14;  // mm center-to-center
electrode_count    = 4;   // TX+, TX-, RX+, RX-

// ── Modules ──

// Rounded box helper
module rounded_box(w, l, h, r) {
    hull() {
        for (x = [-1, 1], y = [-1, 1]) {
            translate([x * (w/2 - r), y * (l/2 - r), 0])
                cylinder(r=r, h=h);
        }
    }
}

// Component cavity (subtracted from housing)
module component_cavity(w, l, h, label="") {
    color("red", 0.3)
    rounded_box(w + 0.4, l + 0.4, h + 0.2, 0.5);
}

// Electrode pad (skin side, raised)
module electrode_pad(w, l, h) {
    color("gold", 0.8)
    rounded_box(w, l, h, 1);
}

// ── Main Housing ──
module main_housing() {
    difference() {
        // Outer shell
        color("SlateGray", 0.9)
        rounded_box(housing_width, housing_length, housing_height, housing_radius);

        // Inner cavity (hollow out, leave 1.5mm walls)
        translate([0, 0, 1.5])
            rounded_box(housing_width - 3, housing_length - 3, housing_height, housing_radius - 1);

        // === COMPONENT CAVITIES (top-down view) ===

        // SoC — center of the board
        translate([0, 0, housing_height - soc_height - 1])
            component_cavity(soc_width, soc_length, soc_height, "nRF5340");

        // IMU — front-right of SoC
        translate([6, 8, housing_height - imu_height - 1])
            component_cavity(imu_width, imu_length, imu_height, "IMU");

        // AHT10 — front-left, near skin vent
        translate([-6, 8, housing_height - aht_height - 1])
            component_cavity(aht_width, aht_length, aht_height, "AHT10");

        // LED — top edge, visible from outside
        translate([0, housing_length/2 - 4, housing_height - led_height])
            component_cavity(led_width, led_length, led_height, "WS2812B");

        // USB-C port — side cutout
        translate([housing_width/2 - 1, -housing_length/2 + 6, housing_height/2])
            rotate([0, 90, 0])
            rounded_box(usb_height, usb_width, usb_depth, 1);

        // Button hole — side, opposite USB
        translate([-housing_width/2 + 1, 5, housing_height/2])
            rotate([0, 90, 0])
            cylinder(d=button_diameter + 0.5, h=3);

        // NFC antenna area — below top surface
        translate([0, 0, housing_height - nfc_height - 0.5])
            difference() {
                cylinder(d=nfc_outer_diameter, h=nfc_height);
                cylinder(d=nfc_inner_diameter, h=nfc_height + 0.1);
            }

        // Temperature vent holes (top surface, above AHT10)
        translate([-6, 8, housing_height - 0.5])
            for (i = [-1, 0, 1])
                translate([i * 1.5, 0, 0])
                    cylinder(d=0.8, h=1);
    }
}

// ── Internal Components (visible in cross-section) ──
module internal_components() {
    // nRF5340 SoC (purple)
    color("#7c3aed", 0.9)
    translate([0, 0, housing_height - soc_height - 1])
        rounded_box(soc_width, soc_length, soc_height, 0.3);

    // 6-Axis IMU (green)
    color("#22c55e", 0.9)
    translate([6, 8, housing_height - imu_height - 1])
        rounded_box(imu_width, imu_length, imu_height, 0.3);

    // AHT10 (amber)
    color("#f59e0b", 0.9)
    translate([-6, 8, housing_height - aht_height - 1])
        rounded_box(aht_width, aht_length, aht_height, 0.3);

    // WS2812B LED (pink, top edge)
    color("#ec4899", 0.9)
    translate([0, housing_length/2 - 4, housing_height - led_height])
        rounded_box(led_width, led_length, led_height, 0.3);

    // Haptic motor (violet, rear)
    color("#8b5cf6", 0.9)
    translate([0, -housing_length/2 + 8, 2])
        cylinder(d=haptic_diameter, h=haptic_height);

    // Battery (red, bottom half)
    color("#ef4444", 0.7)
    translate([0, -2, 1.5])
        rounded_box(battery_width, battery_length, battery_height, 1);

    // Button (gold, side)
    color("#d97706", 0.9)
    translate([-housing_width/2 + 0.5, 5, housing_height/2])
        rotate([0, 90, 0])
        cylinder(d=button_diameter, h=2);

    // NFC antenna trace (cyan, top layer)
    color("#06b6d4", 0.6)
    translate([0, 0, housing_height - nfc_height - 0.5])
        difference() {
            cylinder(d=nfc_outer_diameter, h=nfc_height);
            cylinder(d=nfc_inner_diameter, h=nfc_height + 0.1);
        }
}

// ── Skin-Side Components ──
module skin_side() {
    // IBC Electrodes — 4 pads on skin-facing bottom
    color("Gold", 0.9)
    translate([0, 0, 0]) {
        // TX+ and TX-
        translate([-electrode_spacing/2, -electrode_spacing/3, -electrode_height])
            electrode_pad(electrode_width, electrode_length, electrode_height);
        translate([electrode_spacing/2, -electrode_spacing/3, -electrode_height])
            electrode_pad(electrode_width, electrode_length, electrode_height);
        // RX+ and RX-
        translate([-electrode_spacing/2, electrode_spacing/3, -electrode_height])
            electrode_pad(electrode_width, electrode_length, electrode_height);
        translate([electrode_spacing/2, electrode_spacing/3, -electrode_height])
            electrode_pad(electrode_width, electrode_length, electrode_height);
    }

    // Capacitive touch sensor pads
    color("Silver", 0.8)
    translate([0, housing_length/2 - 6, -touch_height])
        rounded_box(touch_width, touch_length, touch_height, 0.5);
    translate([0, -housing_length/2 + 6, -touch_height])
        rounded_box(touch_width, touch_length, touch_height, 0.5);
}

// ── DANZ Logo Face Plate (top surface) ──
module logo_face_plate() {
    // Raised border/bezel for the logo area
    color("#1e1e2e", 0.95)
    translate([0, 0, housing_height])
        rounded_box(logo_width + 2, logo_height + 2, 0.5, 2);

    // Logo recess area (where the GLB model will sit)
    color("#a855f7", 0.4)
    translate([0, 0, housing_height + 0.5])
        rounded_box(logo_width, logo_height, logo_depth, 1.5);
}

// ── Band Segments ──
module band_segment(length, side="right") {
    sx = (side == "right") ? 1 : -1;

    color("DimGray", 0.8)
    translate([sx * (housing_width/2 + length/2 - 2), 0, housing_height/2])
    rotate([90, 0, 0])
        difference() {
            // Band body
            rounded_box(length, housing_height - 2, band_width - 4, 2);

            // Flex grooves
            for (i = [-3:3])
                translate([i * 3, 0, 0])
                    cube([0.8, housing_height, band_width], center=true);
        }
}

// ── Assembly ──
module wearable_assembly() {
    // Main housing
    main_housing();

    // Internal components (for visualization — set to transparent)
    internal_components();

    // Skin-side elements
    skin_side();

    // Logo face plate
    logo_face_plate();

    // Band segments
    band_segment(30, "right");
    band_segment(30, "left");
}

// ── Render ──
wearable_assembly();

// ── Export Notes ──
// To export STL:
//   openscad -o flowbond-wearable.stl flowbond-wearable.scad
//
// To export specific components, comment out others
// and run separate exports for each color/material group.
//
// Component color key:
//   Purple (#7c3aed)  = nRF5340 SoC
//   Green  (#22c55e)  = IMU
//   Amber  (#f59e0b)  = AHT10
//   Pink   (#ec4899)  = WS2812B LED
//   Violet (#8b5cf6)  = Haptic motor
//   Red    (#ef4444)  = Battery
//   Gold   (#d97706)  = Button / IBC electrodes
//   Cyan   (#06b6d4)  = NFC antenna
//   Silver            = Capacitive touch
//   SlateGray         = Housing shell
//   DimGray           = Band segments
