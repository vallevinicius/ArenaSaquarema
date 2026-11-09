#!/usr/bin/env bash
# Restaura um backup. DESTRUTIVO: o dump recria as tabelas do banco da DATABASE_URL.
#   scripts/restore.sh db      backups/db-AAAAMMDD-HHMMSS.sql.gz
#   scripts/restore.sh uploads backups/uploads-AAAAMMDD-HHMMSS.tar.gz
# Para ensaiar sem risco, aponte DATABASE_URL para um banco vazio de teste.
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/lib-db.sh"

KIND="${1:-}"; FILE="${2:-}"
[ -n "$KIND" ] && [ -f "$FILE" ] || { echo "uso: $0 db|uploads <arquivo>" >&2; exit 1; }

case "$KIND" in
  db)
    gzip -t "$FILE"
    echo "Vai SOBRESCREVER o banco '$DB_NAME' em $DB_HOST:$DB_PORT com $FILE."
    read -r -p "Digite o nome do banco para confirmar: " ANSWER
    [ "$ANSWER" = "$DB_NAME" ] || { echo "Cancelado."; exit 1; }
    gunzip -c "$FILE" | mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME"
    echo "Banco restaurado."
    ;;
  uploads)
    tar -tzf "$FILE" >/dev/null
    # recusa arquivo com caminho absoluto ou '..' (tar malicioso gravando fora da pasta)
    if tar -tzf "$FILE" | grep -qE '(^/|(^|/)\.\.(/|$))'; then echo "Arquivo suspeito (caminho fora da pasta). Abortado." >&2; exit 1; fi
    echo "Vai extrair as fotos em '$UPLOAD_DIR' (arquivos de mesmo nome serão sobrescritos)."
    read -r -p "Digite 'sim' para confirmar: " ANSWER
    [ "$ANSWER" = "sim" ] || { echo "Cancelado."; exit 1; }
    mkdir -p "$UPLOAD_DIR"
    tar -xzf "$FILE" -C "$UPLOAD_DIR"
    echo "Fotos restauradas."
    ;;
  *) echo "uso: $0 db|uploads <arquivo>" >&2; exit 1 ;;
esac
