#!/usr/bin/env python3
import os
import re
import sys

def main(dry_run=True):
    # Buscar número tras _ o #, antes de .jpg o .gif
    pattern = re.compile(r'.*[_#]([0-9]+)\.(jpg|gif)$', re.IGNORECASE)

    for fname in os.listdir('.'):
        if not fname.lower().endswith(('.jpg', '.gif')):
            continue

        m = pattern.match(fname)
        if not m:
            continue

        new_name = f"{m.group(1)}.{m.group(2).lower()}"
        if fname == new_name:
            continue  # ya tiene el nombre deseado

        if os.path.exists(new_name):
            print(f"⚠️  Salta '{fname}': '{new_name}' ya existe.")
            continue

        if dry_run:
            print(f"DRY RUN: renombraría '{fname}' → '{new_name}'")
        else:
            os.rename(fname, new_name)
            print(f"✔️  Renombrado '{fname}' → '{new_name}'")

if __name__ == "__main__":
    dry = True
    if len(sys.argv) > 1 and sys.argv[1].lower() == "go":
        dry = False

    print("=== MODO DE PRUEBA ===" if dry else "=== APLICANDO CAMBIOS ===")
    main(dry_run=dry)