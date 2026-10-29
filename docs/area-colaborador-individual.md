# Área do colaborador — plano de implementação

## Objetivo

Adicionar uma área individual para que cada colaborador consulte seus próprios dados e solicite trocas, sem expor informações individuais na página pública.

## Experiência pública

- Manter a página pública exibindo o ranking principal.
- Preservar o critério atual de classificação: percentual da meta atingida, em ordem decrescente.
- Exibir o percentual real, inclusive valores acima de 100% (por exemplo, 185% da meta); não limitar a 100%.
- Não exibir quantidade total de materiais como indicador do ranking.
- Abaixo do ranking, incluir a seção **Área do colaborador**, com os botões **Entrar na minha conta** e **Primeiro acesso**.

## Primeiro acesso e aprovação

- O colaborador solicita acesso informando e-mail e dados necessários para localizar seu cadastro existente.
- A solicitação fica pendente até análise administrativa.
- A confirmação do e-mail comprova controle da caixa postal, não a identidade civil nem a titularidade do cadastro.
- Um administrador confere a solicitação e vincula a conta ao registro correto do colaborador/campanha.
- O próprio solicitante não pode escolher ou alterar seu identificador de colaborador, nem aprovar o próprio acesso.
- Nenhum dado individual é liberado antes da confirmação de e-mail e da aprovação administrativa.

## Autenticação e dados

- Avaliar Firebase Authentication com e-mail e senha, verificação de e-mail e recuperação de senha.
- Separar as contas individuais dos papéis administrativos e operacionais existentes.
- Após autenticação e aprovação, permitir consulta somente aos próprios detalhes de entregas, histórico e saldos, além de solicitação de troca.
- Reutilizar as validações existentes de saldo, duplicidade, campanha, permissões e gravação transacional; a interface não é uma fronteira de segurança.

## Controle administrativo

- Adicionar uma configuração para habilitar/desabilitar a área individual.
- Quando desabilitada, bloquear também no Firestore/backend as leituras privadas e novas solicitações feitas pelo portal, inclusive para sessões já autenticadas.
- Manter o ranking público funcionando normalmente.
- Preservar contas e vínculos quando o recurso estiver desabilitado.

## Auditoria técnica e segurança — antes de implementar

- Mapear o modelo atual de colaboradores, identificadores, campanhas, entregas, transferências, saldos e solicitações de troca.
- Verificar a configuração atual do Firebase Authentication e a separação de papéis em `reciclar-apac-roles/{uid}`.
- Revisar `firestore.rules` e todos os caminhos de leitura/gravação relevantes.
- Definir um vínculo confiável e não editável pelo usuário entre UID autenticado e cadastro existente.
- Garantir isolamento entre colaboradores e campanhas e impedir leitura cruzada, autoassociação e acesso de solicitações pendentes.
- Garantir que a chave de habilitação seja aplicada nas regras/backend, não apenas esconda elementos da interface.
- Confirmar compatibilidade com o plano Firebase Spark, sem depender de SMS, Cloud Functions pagas ou serviços que exijam Blaze.
- Avaliar leituras/escritas adicionais e evitar consultas amplas ou listeners desnecessários.

## Testes e critérios de aceite

- Usar Firestore Emulator e Auth Emulator quando viável; não realizar testes destrutivos nem gerar carga desnecessária no projeto de produção.
- Testar solicitação pendente, e-mail não verificado, e-mail verificado sem aprovação e aprovação administrativa.
- Testar bloqueio de leitura antes da aprovação, isolamento entre dois colaboradores e rejeição de tentativa de alterar o vínculo.
- Testar o recurso habilitado/desabilitado, inclusive com sessão já autenticada e acesso direto às regras/API.
- Testar recuperação de senha e verificação de e-mail.
- Regressão: ranking público, Registro Express, entregas, transferências, saldos e fluxo atual de trocas.
- Manter a PR em Draft até revisão funcional e de segurança. Não fazer merge automaticamente.

## Decisões de produto já alinhadas

- Ranking público continua baseado no percentual atual da meta, inclusive acima de 100%.
- O ranking não passa a usar soma de porcentagens individuais nem quantidade total de materiais como critério novo.
- A seção **Área do colaborador** e seus dois botões ficam abaixo do ranking.
