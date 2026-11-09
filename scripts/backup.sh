#!/usr/bin/env bash
# Backup do banco (mysqldump consistente) e das fotos (UPLOAD_DIR).
#   npm run backup                       -> grava em ./backups
#   BACKUP_DIR=/mnt/backup KEEP_DAYS=30 npm run backup
# Variáveis opcionais:
#   BACKUP_DIR   destino (padrão: ./backups)
#   KEEP_DAYS    apaga backups mais velhos que N dias (padrão: 14; 0 = nunca apaga)
#   BACKUP_RCLONE_REMOTE  ex.: "drive:arena-backups" — copia para fora do servidor (precisa do rclone configurado)
# Rode todo dia por cron (veja docs/operacao.md). Backup que mora só no mesmo servidor não protege de perder o servidor.
set -euo pipefail
umask 077
source "$(dirname "${BASH_SOURCE[0]}")/lib-db.sh"

BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
case "$KEEP_DAYS" in ''|*[!0-9]*) echo "KEEP_DAYS precisa ser um número" >&2; exit 1 ;; esac
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

DB_FILE="$BACKUP_DIR/db-$STAMP.sql.gz"
echo "Banco '$DB_NAME' -> $DB_FILE"
# --single-transaction: cópia consistente sem travar as vendas. Escreve em .part e só renomeia se tudo deu certo.
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
  --single-transaction --routines --triggers --no-tablespaces --default-character-set=utf8mb4 \
  "$DB_NAME" | gzip -9 > "$DB_FILE.part"
gzip -t "$DB_FILE.part"
[ -s "$DB_FILE.part" ] || { rm -f "$DB_FILE.part"; echo "dump vazio" >&2; exit 1; }
mv "$DB_FILE.part" "$DB_FILE"

FILES=("$DB_FILE")
if [ -d "$UPLOAD_DIR" ] && [ -n "$(ls -A "$UPLOAD_DIR" 2>/dev/null)" ]; then
  UP_FILE="$BACKUP_DIR/uploads-$STAMP.tar.gz"
  echo "Fotos '$UPLOAD_DIR' -> $UP_FILE"
  tar -czf "$UP_FILE.part" -C "$UPLOAD_DIR" .
  mv "$UP_FILE.part" "$UP_FILE"
  FILES+=("$UP_FILE")
else
  echo "Sem fotos em '$UPLOAD_DIR': nada a copiar."
fi

if [ -n "${BACKUP_RCLONE_REMOTE:-}" ]; then
  command -v rclone >/dev/null || { echo "BACKUP_RCLONE_REMOTE definido, mas rclone não está instalado" >&2; exit 1; }
  for f in "${FILES[@]}"; do rclone copy "$f" "$BACKUP_RCLONE_REMOTE"; done
  echo "Copiado para $BACKUP_RCLONE_REMOTE"
fi

if [ "$KEEP_DAYS" -gt 0 ]; then
  # só mexe nos arquivos que este script cria
  find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db-*.sql.gz' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP_DAYS" -print -delete | sed 's/^/Apagado (antigo): /'
fi
echo "Backup concluído."
