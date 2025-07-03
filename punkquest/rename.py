#!/usr/bin/env python3
import os
import re
import sys

def main(dry_run=True):
    # Expresión regular que busca un número antes de .jpg tras '_' o '#'
    pattern = re.compile(r'.*[_#]([0-9]+)\.jpg$', re.IGNORECASE)

    for fname in os.listdir('.'):
        if not fname.lower().endswith('.jpg'):
            continue

        m = pattern.match(fname)
        if not m:
            continue

        new_name = f"{m.group(1)}.jpg"
        if fname == new_name:
            # Ya tiene el nombre deseado
            continue

        if os.path.exists(new_name):
            print(f"⚠️  Salta '{fname}': '{new_name}' ya existe.")
            continue

        if dry_run:
            print(f"DRY RUN: renombraría '{fname}' → '{new_name}'")
        else:
            os.rename(fname, new_name)
            print(f"✔️  Renombrado '{fname}' → '{new_name}'")

if __name__ == "__main__":
    # Por defecto hace una pasada en seco; pasar "go" como argumento para aplicar cambios
    dry = True
    if len(sys.argv) > 1 and sys.argv[1].lower() == "go":
        dry = False

    print("=== MODO DE PRUEBA ===" if dry else "=== APLICANDO CAMBIOS ===")
    main(dry_run=dry)