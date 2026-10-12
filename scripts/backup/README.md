# Backup automático do Reciclapac

O workflow `.github/workflows/backup-diario.yml` roda diariamente às 03:00 no horário de Brasília e também pode ser executado manualmente em **GitHub > Actions > Backup diário do Firestore para o Google Drive > Run workflow**.

Ele lê o Firestore usando uma conta de serviço somente de leitura, gera o mesmo formato JSON aceito pelo backup manual do app (`reciclar-apac-backup`, versão 1), envia os arquivos para uma pasta separada chamada `Reciclar APAC Backups Automáticos` no Google Drive e mantém os 10 backups automáticos mais recentes. A pasta e a retenção são separadas para não interferir nos backups manuais existentes.

## Configuração obrigatória

### 1. Credencial de leitura do Firebase

No Google Cloud Console do projeto Firebase `apac-reciclar`:

1. Crie uma conta de serviço dedicada ao backup, por exemplo `reciclapac-backup-reader`.
2. Conceda a ela somente a função **Cloud Datastore Viewer** (ou a função mínima equivalente que permita ler os documentos do Firestore).
3. Crie uma chave JSON e guarde o arquivo em local seguro. Não o envie ao repositório.
4. No GitHub, abra **Settings > Secrets and variables > Actions > New repository secret** e crie `FIREBASE_SERVICE_ACCOUNT_JSON`, colando o JSON inteiro da chave.

A credencial Admin SDK não usa as regras de acesso do Firestore; sua segurança depende das permissões IAM. Use uma conta dedicada somente de leitura e não conceda Editor/Owner.

### 2. Credenciais OAuth do Google Drive

O workflow usa OAuth do usuário porque a pasta de backup fica no Google Drive pessoal. Não use uma chave de conta de serviço para gravar no Meu Drive pessoal.

No cliente OAuth Web usado pelo Reciclapac:

1. Abra **Google Cloud Console > Google Auth Platform > Clients** e selecione o cliente usado pelo app.
2. Em **Authorized redirect URIs**, adicione exatamente `http://localhost:53682/oauth2callback`. Não remova as origens JavaScript existentes.
3. Copie o **Client ID** e o **Client secret**. No seu computador, defina as variáveis de ambiente `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` para esses valores.
4. No terminal, entre em `scripts/backup`, instale as dependências com `npm install` e execute `npm run get-drive-refresh-token`.
5. Abra a URL impressa no terminal, entre na conta Google que deve receber os backups e autorize o acesso ao Drive. O terminal exibirá um refresh token. Trate-o como senha.
6. No GitHub, crie estes secrets em **Settings > Secrets and variables > Actions**:
   - `GOOGLE_CLIENT_ID`: Client ID do OAuth Web.
   - `GOOGLE_CLIENT_SECRET`: Client secret do OAuth Web.
   - `GOOGLE_REFRESH_TOKEN`: refresh token emitido pelo Google.

Não coloque client secret, refresh token ou chave JSON no código, em Issues, PRs ou logs.

### 3. Publicação OAuth

O cliente precisa manter a autorização funcionando a longo prazo. Enquanto a tela de consentimento OAuth estiver em **Testing**, tokens de atualização para escopos além dos básicos podem expirar após sete dias. Conclua a configuração de Branding, publique o app em **Production** e cumpra qualquer verificação exigida pelo Google para o escopo `drive.file`. Se o Google limitar a autorização a usuários de teste, o workflow pode parar de funcionar após alguns dias.

### 4. Testar

1. Faça merge do workflow e dos scripts.
2. Abra **Actions > Backup diário do Firestore para o Google Drive**.
3. Clique em **Run workflow** e aguarde o resultado.
4. Confirme que um JSON novo apareceu em `Reciclar APAC Backups Automáticos` e teste a importação de uma cópia em ambiente controlado antes de depender do backup.
5. Verifique o log para os totais de colaboradores, entregas, transferências, trocas, campanhas e metas. Se uma coleção ou a configuração não puder ser lida, o script falha sem enviar um backup parcial.

## Observações

- O processo não altera documentos no Firestore; apenas lê os dados e grava arquivos no Drive.
- O formato é compatível com a importação do backup manual atual. Senhas administrativas e papéis de acesso do Firebase não fazem parte do arquivo.
- O workflow conserva os 10 arquivos mais recentes dentro da pasta de backups automáticos. Backups manuais existentes não são apagados nem movidos.
- Agendamentos do GitHub Actions podem iniciar com atraso. Use **Run workflow** para testar ou gerar um backup fora do horário.
