# Compartilhado por backup.sh e restore.sh (use com `source`). Lê o .env e separa a DATABASE_URL.
# A senha vai por MYSQL_PWD (não aparece na lista de processos, ao contrário de -p<senha>).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -z "${DATABASE_URL:-}" ] && [ -f "$ROOT/.env" ]; then
  set -a; . "$ROOT/.env"; set +a
fi
: "${DATABASE_URL:?defina DATABASE_URL (ou use o .env na raiz)}"

# node já existe no servidor (é o que roda o app) e decodifica %xx da senha direito.
IFS=$'\n' read -r -d '' DB_HOST DB_PORT DB_USER DB_PASS DB_NAME < <(
  node -e '
    const u = new URL(process.env.DATABASE_URL);
    for (const v of [u.hostname, u.port || "3306", decodeURIComponent(u.username), decodeURIComponent(u.password), u.pathname.slice(1)]) console.log(v);
  ' && printf '\0'
) || true
[ -n "$DB_NAME" ] || { echo "DATABASE_URL inválida" >&2; exit 1; }
export MYSQL_PWD="$DB_PASS"
UPLOAD_DIR="${UPLOAD_DIR:-uploads}"
case "$UPLOAD_DIR" in /*) ;; *) UPLOAD_DIR="$ROOT/$UPLOAD_DIR" ;; esac
