# Check-ins de parceiros (Wellhub e TotalPass)

Tela: **Check-ins de parceiros** (só administrador). A contagem é separada da presença dos alunos e só conta check-in **confirmado**.

## Como funciona hoje
| | Lançamento manual | Automático |
|---|---|---|
| TotalPass | pronto | pronto, depende das chaves abaixo |
| Wellhub | pronto | aguardando a documentação do Access Control |

Quem não tem integração ligada continua lançando à mão em **+ Registrar check-in**.

## TotalPass: configurar

A TotalPass envia (webhook) um aviso a cada check-in. O sistema grava como *Aguardando confirmação*, confirma na TotalPass com o token do aviso e só então passa a *Confirmado*. Se a TotalPass estiver fora do ar, o check-in fica pendente e há o botão **Confirmar agora** (enquanto não expirar).

### 1. Pedir à TotalPass
- `partner_api_key` (suporte TotalPass Gym) e `place_api_key` (cadastro da arena).
- O endereço de **produção** para confirmar check-ins. A documentação pública só mostra o de testes (`https://admin.staging.totalpass.com/api/v1/webhook_confirmations`). Perguntar também se o aviso é assinado e se há reenvio em caso de falha.

### 2. Preencher o `.env` do servidor
```env
SITE_URL=https://SEU-DOMINIO            # precisa ser público e https
TOTALPASS_PARTNER_API_KEY=...
TOTALPASS_PLACE_API_KEY=...
TOTALPASS_VALIDATE_URL=...              # base da confirmação, sem barra no fim
TOTALPASS_WEBHOOK_SECRET=...            # openssl rand -base64 36 | tr '+/' '-_'
```
Reinicie o app.

### 3. Registrar o webhook
Em **Check-ins de parceiros → Conexão com as plataformas**, clique em **Registrar este sistema na TotalPass**. O sistema informa à TotalPass a URL `SITE_URL/api/partners/totalpass/webhook/<segredo>`. O segredo nunca aparece na tela.

### 4. Testar
Faça um check-in com uma conta de teste (a TotalPass fornece a unidade de testes) e veja a linha aparecer em até 30 segundos.

## Segurança (resumo)
- A rota do webhook é pública porque a TotalPass não assina as chamadas. Por isso: segredo na URL (comparação em tempo constante, errado = 404), limite de chamadas, e **o check-in só conta depois de confirmado na TotalPass** (aviso forjado não tem token válido).
- A URL de confirmação é montada com `TOTALPASS_VALIDATE_URL`; a que vem no aviso nunca é acessada.
- O aviso traz CPF, e-mail e telefone: **não são gravados**.
- Trocar o segredo: gere outro, atualize o `.env`, reinicie e clique em **Registrar este sistema** de novo.

## Wellhub
A documentação do Access Control da Wellhub (webhook de check-in e validação) não estava acessível publicamente. Quando houver acesso, a integração entra no mesmo módulo (`server/modules/partners/`), reaproveitando a tabela, a tela e as regras de confirmação. Pedir à Wellhub: credenciais, formato do aviso, como autenticá-lo e o prazo para validar.
