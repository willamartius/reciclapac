# Backend OAuth do Google Drive para o Reciclapac

Este diretório contém um Cloudflare Worker opcional para manter o token de renovação do Google Drive no servidor. O site continua no GitHub Pages, o Firebase Authentication/Firestore continuam sendo usados, e os backups automáticos do GitHub Actions não são alterados.

## Estado atual

O Worker não entra em uso pelo site automaticamente. Ele precisa ser implantado e configurado primeiro; depois, o frontend pode ser integrado em uma alteração separada. Até essa integração, os botões atuais continuam usando o fluxo OAuth do navegador.

## Pré-requisitos

- Conta Cloudflare com Workers e Workers KV habilitados.
- Acesso ao projeto Google Cloud usado pelo Reciclapac.
- Acesso ao Firebase Authentication/Firestore do projeto `apac-reciclar`.
- Node.js e npm para implantar com Wrangler.

## 1. Criar o armazenamento KV

No painel Cloudflare, crie um namespace KV chamado `reciclapac-drive-tokens`. Copie o ID e substitua `SUBSTITUA_PELO_ID_DO_KV` em `wrangler.toml`.

O KV armazena os tokens de renovação e os estados OAuth criptografados com AES-256-GCM. A chave de criptografia deve ser um segredo de 32 bytes em Base64 e nunca deve ser commitada no Git.

## 2. Criar/configurar o cliente OAuth

Use o mesmo projeto Google Cloud e o cliente OAuth Web que já é usado pelo Reciclapac, ou crie um cliente separado se preferir isolar a integração. O cliente precisa autorizar o escopo `drive.file` e os escopos básicos `openid email profile`.

Depois de implantar o Worker, configure no cliente OAuth a URI de redirecionamento exata:

`https://SEU-WORKER.workers.dev/oauth/callback`

Não remova a origem autorizada do GitHub Pages. O fluxo atual deve continuar funcionando até a integração do frontend ser testada.

## 3. Configurar e implantar

No terminal, dentro deste diretório, instale o Wrangler e crie o namespace KV:

```powershell
npm install
npx wrangler kv namespace create DRIVE_TOKENS
```

Copie o ID retornado para `wrangler.toml`. Faça uma primeira implantação para reservar a URL `workers.dev`:

```powershell
npx wrangler deploy
```

Anote a URL gerada. Ela será usada como `GOOGLE_REDIRECT_URI` e deverá ser adicionada ao cliente OAuth como URI de redirecionamento autorizada. Gere uma chave de criptografia local:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Configure os valores de ambiente no Cloudflare. Substitua os exemplos pelos valores reais. Para `GOOGLE_REDIRECT_URI`, use a URL do Worker seguida de `/oauth/callback`:

```powershell
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REDIRECT_URI
npx wrangler secret put APP_ORIGIN
npx wrangler secret put TOKEN_ENCRYPTION_KEY
```

Valores:
- `GOOGLE_CLIENT_ID`: client ID OAuth Web.
- `GOOGLE_CLIENT_SECRET`: segredo OAuth do cliente. Nunca coloque no frontend ou no repositório.
- `GOOGLE_REDIRECT_URI`: URL completa `https://SEU-WORKER.workers.dev/oauth/callback`.
- `APP_ORIGIN`: `https://reciclapac.com.br`.
- `TOKEN_ENCRYPTION_KEY`: saída Base64 gerada acima. Guarde uma cópia segura; perder essa chave invalida os tokens criptografados.

Depois de adicionar a URI de redirecionamento no Google Cloud Console e definir os cinco valores, implante novamente:

```powershell
npx wrangler deploy
```

Teste `https://SEU-WORKER.workers.dev/health`; deve retornar `{"ok":true,"service":"reciclapac-drive-auth"}`.

## 4. Fluxo e segurança

- O Worker verifica assinatura, emissor, audiência e expiração do token Firebase.
- Confere no Firestore se o usuário autenticado tem papel `admin`.
- Confere a conta Google autorizada com a conta já vinculada.
- Mantém o refresh token criptografado no KV; o navegador nunca recebe esse refresh token.
- O endpoint `POST /token` emite somente um access token temporário para o administrador autenticado.
- O estado OAuth é aleatório, criptografado e expira em 10 minutos.
- `DELETE /link` remove o vínculo no Firestore e o token de renovação armazenado no KV.

O endpoint de autorização inicial é `POST /oauth/start` com `Authorization: Bearer FIREBASE_ID_TOKEN` e JSON `{"mode":"connect"}`. Ele retorna uma URL Google para abrir em popup. O callback envia uma mensagem `postMessage` à origem configurada e tenta fechar a janela.

## Importante antes de usar em produção

Este é o backend preparado para a integração, não uma migração concluída. Não use os endpoints até implantar e validar as variáveis, OAuth redirect URI, CORS e KV. A integração frontend será ativada somente depois de conhecer a URL real do Worker e testar o fluxo com a conta vinculada. O backend não modifica os backups automáticos do GitHub Actions.
