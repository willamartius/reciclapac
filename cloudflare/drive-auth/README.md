# Cloudflare Worker OAuth do Google Drive

Este diretório contém o Worker `reciclapac-drive-auth`, integrado ao frontend do Reciclapac. O site usa Firebase Authentication/Firestore para autenticação e autorização; o Worker conduz o fluxo OAuth do Google Drive e guarda o token de renovação criptografado em Cloudflare Workers KV. Os backups automáticos do GitHub Actions não são alterados.

## Ambiente configurado

A configuração versionada em `wrangler.toml` identifica:

- Worker: `reciclapac-drive-auth`
- URL: `https://reciclapac-drive-auth.reciclapac.workers.dev`
- Origem do app: `https://reciclapac.com.br`
- Callback OAuth: `https://reciclapac-drive-auth.reciclapac.workers.dev/oauth/callback`
- Binding KV: `DRIVE_TOKENS`

Os valores reais dos segredos ficam no painel da Cloudflare e não devem ser armazenados no repositório. A configuração do arquivo não comprova, por si só, o estado atual da implantação ou dos segredos na conta Cloudflare.

## Verificação rápida

Abra:

`https://reciclapac-drive-auth.reciclapac.workers.dev/health`

A resposta esperada é:

```json
{"ok":true,"service":"reciclapac-drive-auth"}
```

Isso confirma apenas que o endpoint de saúde responde. Para validar a integração completa, entre no Reciclapac com uma conta administradora e teste o vínculo Google, a listagem de backups, a criação de um backup e a restauração de um backup de teste, sem substituir dados importantes.

## Configuração necessária no Cloudflare

O Worker depende dos seguintes bindings/segredos:

- `DRIVE_TOKENS`: namespace KV usado para estados OAuth e tokens de renovação criptografados.
- `TOKEN_ENCRYPTION_KEY`: chave Base64 que decodifica para exatamente 32 bytes, usada em AES-256-GCM.
- `GOOGLE_CLIENT_ID`: client ID OAuth Web.
- `GOOGLE_CLIENT_SECRET`: segredo OAuth; nunca o exponha no frontend ou no Git.
- `GOOGLE_REDIRECT_URI`: `https://reciclapac-drive-auth.reciclapac.workers.dev/oauth/callback`.
- `APP_ORIGIN`: `https://reciclapac.com.br`.

No Google Cloud Console, a Google Drive API deve estar habilitada, e o cliente OAuth Web deve autorizar a URI de callback exata. A tela de consentimento deve incluir os administradores de teste enquanto o app estiver no modo de teste, ou usar o público interno quando apropriado para a organização. Não remova origens autorizadas ainda usadas pelo site.

Se precisar alterar segredos, faça isso pelo painel Cloudflare ou por Wrangler autenticado, sem copiar os valores para issues, logs, commits ou mensagens. Depois de uma mudança de configuração ou código, publique o Worker e repita os testes de saúde e do fluxo de backup.

## Fluxo e segurança

- `GET /health`: verificação básica de disponibilidade.
- `POST /oauth/start`: inicia o OAuth para usuário com token Firebase válido e papel `admin`.
- `GET /oauth/callback`: processa o retorno do Google e persiste o vínculo.
- `POST /token`: fornece token de acesso temporário ao administrador autorizado.
- `DELETE /link`: remove o vínculo e o token de renovação mantido no KV.

O Worker valida assinatura, emissor, audiência e expiração do token Firebase e consulta o papel no Firestore. O estado OAuth é aleatório, criptografado e expira em 10 minutos. O navegador não recebe o token de renovação; ele recebe somente tokens de acesso temporários. O escopo do Drive é `drive.file`, junto aos escopos básicos de identidade necessários para associar a conta Google ao administrador.

Desvincular a conta remove o vínculo e o token de renovação guardado pelo Worker, mas não exclui arquivos existentes no Drive. O backup continua sendo uma ação manual; os backups automáticos do GitHub Actions e a exportação/importação local são fluxos separados.

## Testes e desenvolvimento

Na pasta `cloudflare/drive-auth`:

```powershell
npm ci
npm test
```

Para executar localmente com Wrangler:

```powershell
npm run dev
```

Antes de implantar, confirme o ambiente de destino e os segredos. O workflow de CI valida o código e executa um dry-run; um dry-run bem-sucedido não equivale a uma publicação em produção.
