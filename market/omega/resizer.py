import os
from PIL import Image

# Carpeta actual donde se ejecuta el script
FOLDER = os.path.dirname(os.path.abspath(__file__))
MAX_WIDTH = 512
VALID_EXTENSIONS = {".jpg", ".jpeg", ".png"}

# Iterar sobre los archivos en la misma carpeta
for filename in os.listdir(FOLDER):
    file_path = os.path.join(FOLDER, filename)
    base, ext = os.path.splitext(filename.lower())

    if ext not in VALID_EXTENSIONS:
        print(f"❌ Saltando {filename}")
        continue

    try:
        with Image.open(file_path) as img:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            if img.size[0] > MAX_WIDTH:
                width_percent = MAX_WIDTH / float(img.size[0])
                new_height = int(float(img.size[1]) * width_percent)
                img = img.resize((MAX_WIDTH, new_height), Image.LANCZOS)

            img.save(file_path, quality=85)
            print(f"✅ Redimensionada: {filename}")

    except Exception as e:
        print(f"❌ Error procesando {filename}: {e}")

print("\n🎉 Todas las imágenes en la carpeta actual han sido redimensionadas.")