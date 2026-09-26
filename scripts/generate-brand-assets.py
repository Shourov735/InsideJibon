#!/usr/bin/env python3
"""
InsideJibon Brand Asset Generator
Generates all application branding assets, favicons, PWA icons, full logos,
marks (both light and dark modes), and the OpenGraph social card from the
official master logo image.
"""

import os
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

SRC_PATH = "/home/shourov/.gemini/antigravity/brain/f8cb4859-84a3-475c-b79e-049b8017bdb1/.user_uploaded/media_1790431064777.png"
PUBLIC_DIR = "/home/shourov/Projects/insidejibon/public"
IMAGES_DIR = os.path.join(PUBLIC_DIR, "images")
SRC_APP_DIR = "/home/shourov/Projects/insidejibon/src/app"

os.makedirs(PUBLIC_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

# 1. Load source master image
print("Loading master logo from:", SRC_PATH)
src = Image.open(SRC_PATH).convert("RGBA")
arr = np.array(src)

# Bounding box of content: y:[374, 610], x:[103, 940]
# Symbol mark: y:[374, 610], x:[103, 318]
# Full logo: y:[374, 610], x:[103, 940]
mark_crop = src.crop((103, 374, 318, 611))
full_crop = src.crop((103, 374, 941, 611))

print(f"Mark cropped size: {mark_crop.size}")
print(f"Full logo cropped size: {full_crop.size}")

# 2. Generate Dark-Mode Variants
# Navy pixels (B < 140) -> pure crisp white #ffffff while preserving anti-aliasing alpha
def create_dark_variant(rgba_img):
    img_arr = np.array(rgba_img, dtype=np.float32)
    h, w, _ = img_arr.shape
    for y in range(h):
        for x in range(w):
            a = img_arr[y, x, 3]
            if a < 5:
                continue
            r, g, b = img_arr[y, x, :3]
            if b < 140:
                # Deep navy -> convert to white
                img_arr[y, x, 0] = 255
                img_arr[y, x, 1] = 255
                img_arr[y, x, 2] = 255
            elif b >= 140 and r < 50:
                # Royal blue -> preserve and slightly illuminate
                img_arr[y, x, 0] = r
                img_arr[y, x, 1] = min(255, g * 1.1)
                img_arr[y, x, 2] = min(255, b * 1.1)
    return Image.fromarray(img_arr.astype(np.uint8))

mark_dark = create_dark_variant(mark_crop)
full_dark = create_dark_variant(full_crop)

# 3. Helper to create a padded square mark
def make_square_mark(mark_img, size=512, padding_ratio=0.08, bg_color=None):
    canvas = Image.new("RGBA", (size, size), bg_color or (0, 0, 0, 0))
    avail = int(size * (1 - 2 * padding_ratio))
    target_h = avail
    target_w = int(mark_img.width * (target_h / mark_img.height))
    if target_w > avail:
        target_w = avail
        target_h = int(mark_img.height * (target_w / mark_img.width))
    resized = mark_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    x = (size - target_w) // 2
    y = (size - target_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas

# 4. Save Main Logo Assets
print("Saving full logo assets...")
full_crop.save(os.path.join(IMAGES_DIR, "logo.png"), optimize=True)
full_dark.save(os.path.join(IMAGES_DIR, "logo-dark.png"), optimize=True)

# Full logo JPEG on white background (for legacy)
full_jpg_canvas = Image.new("RGBA", full_crop.size, (255, 255, 255, 255))
full_jpg_canvas.paste(full_crop, (0, 0), full_crop)
full_jpg_canvas.convert("RGB").save(os.path.join(IMAGES_DIR, "logo.jpg"), quality=95)

# 5. Save Symbol Mark Assets
print("Saving symbol mark assets...")
mark_sq_512 = make_square_mark(mark_crop, 512, padding_ratio=0.08)
mark_sq_512.save(os.path.join(IMAGES_DIR, "logo-icon.png"), optimize=True)

mark_sq_dark_512 = make_square_mark(mark_dark, 512, padding_ratio=0.08)
mark_sq_dark_512.save(os.path.join(IMAGES_DIR, "logo-icon-dark.png"), optimize=True)

# Legacy logo-icon.jpg (square on white)
mark_jpg_canvas = make_square_mark(mark_crop, 512, padding_ratio=0.08, bg_color=(255, 255, 255, 255))
mark_jpg_canvas.convert("RGB").save(os.path.join(IMAGES_DIR, "logo-icon.jpg"), quality=95)

# 6. Generate Favicons (16x16, 32x32, 48x48) & multi-resolution ICO
print("Generating favicons...")
def make_favicon(size, pad=1):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    avail = size - 2 * pad
    w = int(mark_crop.width * (avail / mark_crop.height))
    h = avail
    if w > avail:
        h = int(mark_crop.height * (avail / mark_crop.width))
        w = avail
    resized = mark_crop.resize((w, h), Image.Resampling.LANCZOS)
    if size <= 32:
        # Boost contrast & sharpness slightly for browser tabs
        resized = ImageEnhance.Sharpness(resized).enhance(1.3)
        resized = ImageEnhance.Contrast(resized).enhance(1.1)
    x = (size - w) // 2
    y = (size - h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas

fav16 = make_favicon(16, pad=0)
fav32 = make_favicon(32, pad=1)
fav48 = make_favicon(48, pad=2)

fav16.save(os.path.join(PUBLIC_DIR, "favicon-16x16.png"), optimize=True)
fav32.save(os.path.join(PUBLIC_DIR, "favicon-32x32.png"), optimize=True)
fav48.save(os.path.join(PUBLIC_DIR, "favicon-48x48.png"), optimize=True)

# icon.png is standard 32x32
fav32.save(os.path.join(PUBLIC_DIR, "icon.png"), optimize=True)
fav32.save(os.path.join(SRC_APP_DIR, "icon.png"), optimize=True)

# Multi-resolution favicon.ico containing 16x16, 32x32, and 48x48
fav48.save(
    os.path.join(PUBLIC_DIR, "favicon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)]
)
fav48.save(
    os.path.join(SRC_APP_DIR, "favicon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)]
)

# 7. Generate Apple Touch Icon (180x180 RGB with 15% safe padding on white)
print("Generating apple-touch-icon.png...")
ati = make_square_mark(mark_crop, size=180, padding_ratio=0.15, bg_color=(255, 255, 255, 255))
ati.convert("RGB").save(os.path.join(PUBLIC_DIR, "apple-touch-icon.png"), optimize=True)
ati.convert("RGB").save(os.path.join(SRC_APP_DIR, "apple-icon.png"), optimize=True)

# 8. Generate PWA / Android Icons (192x192 & 512x512)
print("Generating PWA icons...")
icon192 = make_square_mark(mark_crop, size=192, padding_ratio=0.08)
icon192.save(os.path.join(PUBLIC_DIR, "icon-192.png"), optimize=True)
icon192.save(os.path.join(PUBLIC_DIR, "android-chrome-192x192.png"), optimize=True)

icon512 = make_square_mark(mark_crop, size=512, padding_ratio=0.08)
icon512.save(os.path.join(PUBLIC_DIR, "icon-512.png"), optimize=True)
icon512.save(os.path.join(PUBLIC_DIR, "android-chrome-512x512.png"), optimize=True)

# 9. Generate High-Resolution OpenGraph & Twitter Card Image (1200x630)
print("Generating og-image.jpg (1200x630)...")
W, H = 1200, 630
og = Image.new("RGB", (W, H), (0, 33, 71)) # Academic Oxford Navy

# Background gradient
draw = ImageDraw.Draw(og)
for y in range(H):
    ratio = y / H
    r = int(0 * (1 - ratio) + 0 * ratio)
    g = int(35 * (1 - ratio) + 16 * ratio)
    b = int(75 * (1 - ratio) + 42 * ratio)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# Ambient radial light
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow)
center_x, center_y = W // 2, H // 2 - 45
for radius in range(360, 0, -6):
    alpha = int(24 * (1 - radius / 360))
    glow_draw.ellipse(
        [center_x - radius, center_y - int(radius * 0.7), center_x + radius, center_y + int(radius * 0.7)],
        fill=(0, 112, 224, alpha)
    )

og_rgba = og.convert("RGBA")
og_rgba = Image.alpha_composite(og_rgba, glow)

# Prominently place high-res dark-variant logo (white + royal blue)
target_logo_w = 660
target_logo_h = int(full_dark.height * (target_logo_w / full_dark.width))
scaled_logo = full_dark.resize((target_logo_w, target_logo_h), Image.Resampling.LANCZOS)

logo_x = (W - target_logo_w) // 2
logo_y = 145
og_rgba.paste(scaled_logo, (logo_x, logo_y), scaled_logo)

# Typography below logo
draw_rgba = ImageDraw.Draw(og_rgba)
try:
    font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
    font_sub_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 19)
except Exception:
    font_sub = ImageFont.load_default()
    font_sub_sm = ImageFont.load_default()

t1 = "Academic Learning Platform  |  HSC & Admission Preparation"
b1 = draw_rgba.textbbox((0, 0), t1, font=font_sub)
tw1 = b1[2] - b1[0]
draw_rgba.text(((W - tw1) // 2, logo_y + target_logo_h + 50), t1, fill=(226, 232, 240), font=font_sub)

t2 = "Physics  ·  Chemistry  ·  Biology  ·  ICT  ·  Higher Mathematics"
b2 = draw_rgba.textbbox((0, 0), t2, font=font_sub_sm)
tw2 = b2[2] - b2[0]
draw_rgba.text(((W - tw2) // 2, logo_y + target_logo_h + 95), t2, fill=(148, 163, 184), font=font_sub_sm)

final_og = og_rgba.convert("RGB")
final_og.save(os.path.join(IMAGES_DIR, "og-image.jpg"), quality=95, optimize=True)

# 10. Clean up obsolete icon.jpg if present
old_icon_jpg = os.path.join(PUBLIC_DIR, "icon.jpg")
if os.path.exists(old_icon_jpg):
    print("Removing obsolete public/icon.jpg...")
    os.remove(old_icon_jpg)

print("Brand assets generated successfully!")
