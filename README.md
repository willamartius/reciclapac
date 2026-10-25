# Reciclapac - Reciclar é Cuidar da Casa Comum

Aplicativo web para acompanhar a arrecadação de materiais recicláveis dos colaboradores da APAC de Imperatriz-MA.

## Acesso e publicação

O app hospedado usa Firebase Authentication com e-mail e senha. O cliente não cria contas: um administrador cria cada conta no Firebase Authentication e atribui um papel no Firestore.

Papéis aceitos em `reciclar-apac-roles/{uid}`:

- `{"role":"admin"}`: configura campanhas, gerencia dados e usuários pelo Console, exclui registros e exporta relatórios/backups.
- `{"role":"operator"}`: consulta os dados e cadastra/edita colaboradores, entregas e transferências. Não pode excluir registros, configurar campanhas ou exportar.

Os dados são legíveis somente por contas com um desses papéis. O operador não pode excluir dados nem alterar campanhas pelas regras do Firestore.

Cada usuário pode salvar o próprio nome de exibição no Firebase Authentication. O papel exibido no app vem do campo `role` do documento `reciclar-apac-roles/{uid}` e não pode ser alterado pelo próprio usuário.

### Testes locais

Os testes usam Node.js 20 ou superior. A suíte de regras também precisa de um JDK 21 ou superior para iniciar o Firestore Emulator. Na raiz do repositório, execute `npm ci` uma vez e depois `npm test`. O script roda os testes unitários e inicia somente o Firestore Emulator com o projeto demonstrativo `demo-reciclapac`; não exige login no Firebase nem usa o projeto de produção. Os arquivos de regras são carregados de `firestore.rules`.

Registros excluídos por um administrador ficam em **Itens apagados** por até 30 dias e podem ser restaurados nesse período. A lixeira é compartilhada entre administradores, sua leitura é restrita ao papel `admin`, e itens vencidos são removidos na próxima inicialização administrativa do app. Publique as regras atualizadas do Firestore junto com esta versão.

### Ranking público

Visitantes sem login veem o ranking por campanha e período, atualizado automaticamente quando um administrador ou operador salva alterações no app. Os seletores de campanha e mês mostram somente períodos com atividade e o mês atual. A página mostra nome, posição, pontuação e um resumo mensal por material com disponibilidade (excedentes destacados em verde), meta e percentual. Somente colaboradores com entregas validadas no período aparecem no ranking. Entregas individuais, transferências, setor e demais dados cadastrais continuam protegidos por login.

O botão público **Solicitar troca** permite propor uma troca entre dois colaboradores em uma campanha ativa. Para preencher os seletores, os resumos públicos passam a incluir nome e ID dos colaboradores ativos e a lista de materiais da campanha; esses dados ficam acessíveis a visitantes. O pedido não altera saldos e não confirma a identidade de quem o enviou: um administrador deve conferir nomes e quantidades no sininho de notificações. Ao aceitar, o app verifica os dois saldos e grava as duas transferências junto com a decisão em uma única transação; se não houver saldo suficiente, nada é alterado. Rejeitar apenas encerra o pedido. Publique as regras atualizadas do Firestore para permitir somente a criação pública de solicitações pendentes e reservar leitura e decisão aos administradores.

Em **Configurações > Página pública**, um administrador pode ativar temporariamente um aviso ilustrado de manutenção, que substitui o ranking para visitantes e é atualizado em tempo real. O login da equipe continua disponível. Publique as regras atualizadas do Firestore para permitir a leitura pública do aviso e limitar sua alteração a administradores.

O botão único **Compartilhar no WhatsApp** abre uma prévia editável, com opção de resumo do Top 3 ou ranking completo. A mensagem inclui um link para a página pública; revise o conteúdo antes de abrir o WhatsApp ou copiar o texto.

As regras dão leitura anônima somente aos resumos de `reciclar-apac-public-ranking` e ao indicador de manutenção em `reciclar-apac-public-settings`; visitantes também podem criar documentos pendentes em `reciclar-apac-transfer-requests`, sem ler a fila ou alterar seu estado. As coleções operacionais continuam exigindo papel autorizado. Usuários autenticados com papel de administrador ou operador atualizam o resumo público ao salvar dados. Para habilitar esses recursos, publique as regras atualizadas do Firestore junto com o app.

### Preparar o Firebase existente

1. Faça um backup local dos dados atuais antes da implantação.
2. No Firebase Console do projeto `apac-reciclar`, habilite **Authentication > Sign-in method > Email/Password**, configure e aplique uma política forte (por exemplo, mínimo de 12 caracteres, com maiúsculas, minúsculas, números e símbolos) e inclua o domínio do site em **Authentication > Settings > Authorized domains**.
3. Em **Authentication > Users**, crie a conta inicial do administrador e copie o UID.
4. No Firestore Console, crie `reciclar-apac-roles/{UID}` com o campo `role` igual a `admin`. Faça isso antes de substituir as regras abertas atuais.
5. Publique o conteúdo de `firestore.rules` em **Firestore Database > Rules**. As coleções operacionais continuam restritas a contas autorizadas; apenas o resumo em `reciclar-apac-public-ranking` tem leitura anônima, e administradores e operadores podem atualizá-lo.
6. Publique esta versão do app. Entre com uma conta autorizada; o primeiro acesso sincroniza os rankings públicos existentes e, dali em diante, os resumos são atualizados após salvar alterações. No primeiro acesso administrativo, o app também copia as coleções antigas para documentos individuais, verifica a cópia e remove a senha local antiga da configuração. Os documentos legados são mantidos como cópia de segurança.
7. Para cada operador, crie uma conta em **Authentication > Users** e um documento `reciclar-apac-roles/{UID}` com `role: "operator"`.

Não deixe as regras antigas (`allow read, write: if true`) publicadas. Antes de finalizar a implantação, teste o login, a leitura operacional com uma conta autorizada, a recusa de leitura anônima nas coleções operacionais e a leitura pública apenas do ranking.

### Criar o primeiro acesso administrativo

O site não tem cadastro público. Se as regras restritivas já estiverem publicadas e ainda não houver administrador, crie a primeira conta pelo Firebase Console:

1. Em **Authentication > Users > Add user**, informe o e-mail e defina uma senha inicial.
2. Copie o UID da conta criada.
3. Em **Firestore Database > Data**, crie a coleção `reciclar-apac-roles`, um documento com o UID como ID e o campo string `role` com valor `admin`.
4. Entre no site com o e-mail e a senha que acabou de definir. A conta administrativa inicializa o app e migra os dados.

As regras do Firestore protegem as requisições do app; operações feitas pelo Console dependem das permissões IAM da sua conta Google no projeto. Se o Console não permitir criar o documento, peça a alguém com acesso administrativo ao projeto para fazê-lo. Depois de entrar, o administrador pode criar usuários adicionais pelo Console e atribuir a eles `admin` ou `operator` da mesma forma.

As credenciais e os papéis não fazem parte dos novos backups JSON. Arquivos de backup exportados por versões antigas podem conter a senha administrativa antiga; proteja-os ou apague-os após confirmar a migração. Senhas são redefinidas por e-mail pelo Firebase Authentication.

Os administradores também podem vincular individualmente uma conta Google para criar e restaurar backups no Drive. Cada conta mantém uma pasta privada `Reciclar APAC Backups` no próprio Google Drive; após cada envio, o app remove arquivos excedentes e conserva os 10 mais recentes. O backup continua manual, e a exportação/importação local permanece disponível. O app não persiste tokens do Google de forma permanente: reutiliza na sessão da aba o token temporário até perto de sua expiração, associado ao UID Firebase e à conta Google vinculada. Ao fechar a aba, trocar a sessão, desvincular a conta ou expirar o token, o Google pode solicitar nova autorização.

#### Integração com Google Drive via Cloudflare Worker

A integração do Google Drive utiliza o Cloudflare Worker `reciclapac-drive-auth` para conduzir o OAuth e manter o token de renovação criptografado no servidor. O frontend chama esse Worker; o fluxo não depende apenas do OAuth executado no navegador. Firebase Authentication e Firestore continuam sendo usados para autenticação e autorização dos administradores.

A implantação do Worker é independente da publicação do frontend. O código e a configuração de implantação estão em [`cloudflare/drive-auth/`](cloudflare/drive-auth/README.md), e o endereço usado pelo frontend é `https://reciclapac-drive-auth.reciclapac.workers.dev`.

**Para operação e manutenção:**

1. No Google Cloud Console, mantenha a **Google Drive API** habilitada e confira a tela de consentimento OAuth, os usuários de teste ou o público interno, conforme o tipo de conta.
2. No cliente OAuth Web usado pelo Worker, mantenha autorizada a URI de redirecionamento `https://reciclapac-drive-auth.reciclapac.workers.dev/oauth/callback`. Não remova as origens autorizadas que ainda forem necessárias ao site.
3. No Cloudflare, confirme que o Worker está publicado, que o namespace KV configurado em `wrangler.toml` está associado e que os segredos `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `TOKEN_ENCRYPTION_KEY` estão definidos. `GOOGLE_REDIRECT_URI` deve corresponder à URI acima; `APP_ORIGIN` deve ser `https://reciclapac.com.br`. Não registre os valores secretos no Git.
4. Para uma verificação básica, abra `https://reciclapac-drive-auth.reciclapac.workers.dev/health`. Uma resposta saudável deve conter `{"ok":true,"service":"reciclapac-drive-auth"}`. Esse teste verifica a disponibilidade básica, não comprova o fluxo OAuth completo.
5. No app, um administrador pode acessar **Configurações > Backup no Google Drive** para vincular a própria conta Google e realizar/restaurar backups. O backup continua manual; a exportação/importação local também permanece disponível.

O Worker valida o token Firebase e o papel administrativo, guarda o token de renovação criptografado no KV e fornece ao frontend apenas tokens de acesso temporários. O escopo do Drive é `drive.file`, limitado aos arquivos e à pasta criados pelo app, junto aos escopos básicos de identidade. Desvincular uma conta remove o vínculo e o token mantido pelo Worker, mas não apaga os arquivos já existentes no Google Drive.

A API do Google Drive está sujeita a cotas e políticas do Google. A tela de consentimento ou a verificação OAuth podem exigir providências adicionais de acordo com o tipo de publicação.


### Área técnica: monitoramento do Firestore

A seção **Configurações > Área técnica** apresenta estimativas de leituras observadas neste navegador e, quando configurada, a métrica agregada oficial do Google Cloud Monitoring. A estimativa local fica no armazenamento local do navegador, não cria documentos no Firestore e não representa a utilização dos outros dispositivos. Ela é aproximada: cache, consultas vazias, transações e listeners podem divergir da contagem faturável. O ambiente com `?emulator=1` é excluído da estimativa.

Para habilitar a métrica oficial no Worker Cloudflare `reciclapac-drive-auth`:

1. No Google Cloud do projeto `apac-reciclar`, habilite a API Cloud Monitoring e crie uma conta de serviço dedicada, concedendo somente a permissão de leitura de séries temporais (por exemplo, papel **Monitoring Viewer**).
2. Gere uma chave JSON para essa conta e, na pasta `cloudflare/drive-auth`, execute `npx wrangler secret put GCP_MONITORING_SERVICE_ACCOUNT_JSON`; cole o conteúdo completo do JSON quando solicitado. Nunca inclua esse segredo no repositório ou no JavaScript do site.
3. A consulta usa `apac-reciclar` por padrão. Se precisar explicitar outro projeto, configure a variável `GCP_MONITORING_PROJECT_ID` no Worker.
4. Publique o Worker e teste **Configurações > Área técnica > Consultar métricas oficiais** com uma conta administradora.

A rota `GET /firestore-usage` valida a assinatura do token Firebase e confere o UID contra a lista restrita `FIRESTORE_USAGE_ADMIN_UIDS`, sem consultar o Firestore a cada requisição. Configure esse secret no Worker com o UID do administrador autorizado (copiado de Firebase Console > Authentication > Users); para mais de um administrador, separe os UIDs por vírgula. Essa lista autoriza somente a consulta de métricas e não altera os papéis do app nem a autorização das rotas do Google Drive. Se o secret estiver ausente ou vazio, a rota falha de forma segura com HTTP 503. Sem a configuração, a interface continua mostrando as estimativas locais e informa que as métricas oficiais estão indisponíveis. As métricas oficiais são agregadas por projeto e podem ter atraso de alguns minutos; não identificam a função JavaScript responsável por cada leitura.
