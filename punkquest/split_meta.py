import os
import re

# Patrón para emparejar los nombres actuales
pattern = re.compile(r'^HalfxAdrian_(\d+)\.json$')

# Directorio de trabajo actual
directory = '.'

# Recorrer todos los archivos del directorio
for filename in os.listdir(directory):
    match = pattern.match(filename)
    if match:
        number = match.group(1)
        new_name = f"{number}.json"
        src = os.path.join(directory, filename)
        dst = os.path.join(directory, new_name)
        # Verificar que no sobrescribamos un archivo existente
        if os.path.exists(dst):
            print(f"Aviso: '{dst}' ya existe, se omite '{src}'")
        else:
            os.rename(src, dst)
            print(f"Renombrado: '{src}' -> '{dst}'")

print("Renombrado completado.")