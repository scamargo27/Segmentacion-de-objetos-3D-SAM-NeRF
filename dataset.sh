#!/usr/bin/env bash
# download_official_mipnerf360.sh
# -------------------------------------------------------------
# Baja el dataset original de Google Research (refraw360).
#
# Uso:
#   ./download_official_mipnerf360.sh bicycle garden
#   ./download_official_mipnerf360.sh all             # las 9 escenas
#   ./download_official_mipnerf360.sh full            # 360_v2 + escenas extra
# -------------------------------------------------------------
set -euo pipefail

BASE_DIR="/data/machine/data/mipnerf360"
URL_MAIN="https://storage.googleapis.com/gresearch/refraw360/360_v2.zip"
URL_EXTRA="https://storage.googleapis.com/gresearch/refraw360/360_extra_scenes.zip"

scenes_360=(bicycle bonsai counter flowers garden kitchen room stump treehill)
scenes_extra=(backyard office hallway)

# ---------- 1. Parse argumentos ----------
if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <escena … | all | full>" && exit 1
fi

case "$1" in
  all)   SCENES=("${scenes_360[@]}") ;;
  full)  SCENES=("${scenes_360[@]}" "${scenes_extra[@]}") ; FULL_ZIPS=("$URL_MAIN" "$URL_EXTRA") ;;
  *)     SCENES=("$@") ; FULL_ZIPS=("$URL_MAIN") ;;
esac

mkdir -p "$BASE_DIR"
cd "$BASE_DIR"

# ---------- 2. Descarga (solo la primera vez) ----------
for ZIP in "${FULL_ZIPS[@]}"; do
  FILE="${ZIP##*/}"
  if [[ ! -f $FILE ]]; then
    echo "▼ Descargando $FILE ..."
    wget -c "$ZIP"
  else
    echo "✓ $FILE ya descargado."
  fi
done

# ---------- 3. Extraer solo las escenas solicitadas ----------
for SCENE in "${SCENES[@]}"; do
  if [[ -d $SCENE ]]; then
    echo "✓ $SCENE ya está preparado."
    continue
  fi

  ZIP_SRC=$(ls 360*.zip | grep -E "360_v2|360_extra" | head -n1)
  if ! unzip -l "$ZIP_SRC" | grep -q "/$SCENE/"; then
    echo "✗ Escena $SCENE no existe en $ZIP_SRC" && exit 1
  fi

  echo "► Extrayendo $SCENE ..."
  unzip -q "$ZIP_SRC" "${SCENE}/*"

  # mover si quedó anidado 360_v2/<scene>
  [[ -d 360_v2/$SCENE ]] && mv 360_v2/$SCENE . && rmdir 360_v2 || true
  [[ -d 360_extra_scenes/$SCENE ]] && mv 360_extra_scenes/$SCENE . && rmdir 360_extra_scenes || true

  # ---------- 4. Generar images_4 ----------
  if [[ ! -d $SCENE/images_4 ]]; then
    echo "  • Creando images_4 ..."
    python - "${SCENE}/images" "${SCENE}/images_4" <<'PY'
import sys, os
from PIL import Image
src, dst = sys.argv[1:]
os.makedirs(dst, exist_ok=True)
for fn in sorted(os.listdir(src)):
    if fn.lower().endswith(('.png','.jpg','.jpeg')):
        im = Image.open(os.path.join(src, fn))
        im = im.resize((im.width//4, im.height//4), Image.LANCZOS)
        im.save(os.path.join(dst, fn))
PY
  fi
  echo "✓ $SCENE listo."
done

echo -e "\n✔ Dataset oficial preparado en $BASE_DIR"

