# Operação: backup e monitoramento

## Backup

O script [`scripts/backup.sh`](../scripts/backup.sh) gera, a cada execução:

- `db-AAAAMMDD-HHMMSS.sql.gz`: dump consistente do MySQL (`--single-transaction`, não trava as vendas);
- `uploads-AAAAMMDD-HHMMSS.tar.gz`: as fotos da galeria (pasta `UPLOAD_DIR`).

Ele lê `DATABASE_URL` e `UPLOAD_DIR` do `.env`, grava só arquivos legíveis pelo dono, confere se o `.gz` abre antes de aceitar o backup e apaga os antigos.

```bash
npm run backup                                  # grava em ./backups
BACKUP_DIR=/mnt/backup KEEP_DAYS=30 npm run backup
```

| Variável | Padrão | Para quê |
|---|---|---|
| `BACKUP_DIR` | `./backups` | onde os arquivos ficam |
| `KEEP_DAYS` | `14` | apaga backups mais velhos que N dias (`0` = nunca apaga) |
| `BACKUP_RCLONE_REMOTE` | vazio | ex.: `drive:arena-backups`; copia para fora do servidor com o [rclone](https://rclone.org) |

Requer `mysqldump` instalado no servidor (pacote `mysql-client`).

### Agendar (cron, todo dia às 4h)

```cron
0 4 * * * cd /caminho/do/app && BACKUP_DIR=/var/backups/arena BACKUP_RCLONE_REMOTE=drive:arena-backups npm run -s backup >> /var/log/arena-backup.log 2>&1
```

**Backup que fica só no mesmo servidor não protege de perder o servidor.** Use `BACKUP_RCLONE_REMOTE` (Google Drive, S3, Backblaze...) ou copie a pasta para outro lugar.

### Restaurar

```bash
scripts/restore.sh db      backups/db-AAAAMMDD-HHMMSS.sql.gz
scripts/restore.sh uploads backups/uploads-AAAAMMDD-HHMMSS.tar.gz
```

A restauração do banco **sobrescreve** o banco da `DATABASE_URL` e pede para você digitar o nome dele. A das fotos recusa arquivo com caminho suspeito.

**Backup que nunca foi restaurado não é backup.** Uma vez por mês, ensaie: crie um banco vazio de teste, aponte `DATABASE_URL` para ele e rode o `restore.sh db`; confira se as tabelas e os usuários voltaram.

## Monitoramento

`GET /api/health` é público e responde:

- `200 {"status":"ok","db":"ok"}`: o app responde e o banco atende;
- `503` com `DB_UNAVAILABLE`: o app está de pé, mas o banco não responde em 3s. O detalhe do erro vai só para o log.

Configure um monitor externo gratuito (UptimeRobot, Better Stack, Uptime Kuma...):

1. Tipo HTTP(s), URL `https://SEU-DOMINIO/api/health`, intervalo de 5 minutos.
2. Alerta por e-mail ou WhatsApp para quem toma conta do sistema.
3. (Opcional) Palavra-chave `"ok"`, para detectar resposta de página de erro do proxy.

Os logs do app saem em JSON (pino) no stdout; guarde-os com o que o servidor já oferece (journald, `docker logs`, painel da hospedagem).
