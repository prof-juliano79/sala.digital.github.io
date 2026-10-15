# Minha Sala Digital 1.2

Atualização incremental da versão 1.0 para o repositório `saladigital`.

## Novidades
- Aba **Professores** no painel do professor, com relação das contas criadas por ele e atalho para novo cadastro.
- Aba **Criar contas** mantém a seleção entre **Aluno** e **Professor**; contas docentes possuem turmas independentes.
- Identificação discreta da versão 1.2 no cabeçalho.

## Funcionalidades mantidas
Login individual por e-mail/senha (Firebase Authentication), gerenciamento de turmas, matrículas, conteúdos, atividades, prazo de entrega, avisos e comentários, além de links opcionais de anexos. Não requer Firebase Storage.

## Instalação
1. Faça backup do repositório atual e das regras do Firestore.
2. Envie os arquivos deste ZIP para a **raiz** de `saladigital` no GitHub, substituindo os arquivos existentes.
3. Confira que as regras atuais do Firestore continuam publicadas. O arquivo `firestore.rules` acompanha a versão para consulta, mas não é aplicado automaticamente pelo GitHub.
4. Abra `https://prof-juliano79.github.io/saladigital/` e force atualização com Ctrl+Shift+R.
5. Teste com contas fictícias: crie professor, entre com a conta criada e verifique se administra apenas suas próprias turmas.

## Login gov.br: ainda não disponível
O botão **Entrar com gov.br** NÃO foi ativado. Não seria correto criar um botão de aparência funcional sem credenciais oficiais. Para integrar, o responsável por um serviço público elegível deve solicitar adesão ao ecossistema de Identidade Digital GOV.BR. A produção exige domínio oficial de governo e integração segura com um backend ou serviço de autenticação confiável. O GitHub Pages sozinho não guarda segredos do fluxo OAuth/OpenID Connect.

Requisitos: https://www.gov.br/governodigital/pt-br/estrategias-e-governanca-digital/transformacao-digital/servico-de-integracao-aos-produtos-de-identidade-digital-gov.br
Credenciais: https://acesso.gov.br/roteiro-tecnico/solicitacaocredencialprocesso.html

**Importante:** neste modelo, qualquer professor autorizado pode criar outros professores, como solicitado. Conceda esse papel apenas a pessoas de confiança. A operação de criação de contas no Auth e de perfis no Firestore não é atômica: se a segunda etapa falhar, poderá haver um cadastro sem perfil a limpar manualmente no Console. Não use com dados reais de crianças sem antes revisar regras de segurança e conformidade com a LGPD.
