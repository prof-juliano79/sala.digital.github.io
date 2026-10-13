# Minha Sala Digital — ampliação (GitHub Pages + Firebase)

## O que foi preservado
- Login Firebase, professor principal já cadastrado, contas de alunos, conteúdos publicados e atividades para leitura.
- Configuração Firebase existente (`firebase-config.js`) e identidade visual.
- Repositório existente `saladigital`: não precisa criar outro nem apagar o banco.

## O que foi adicionado
- Aba **Turmas** para professor criar e abrir turmas. O formulário também continua em **Início**.
- **Atividades** com até 5 fotos/documentos de até 10 MB por arquivo.
- **Comentários** de alunos e professores em atividades e avisos.
- Aba **Avisos** para comunicados do professor e comentários.
- Os dados são compartilhados pelo Firestore; os anexos vão para Firebase Storage.

## Atualização (ordem recomendada)
1. Faça cópia dos arquivos atuais do repositório.
2. No Firebase Console, **Firestore Database > Rules**, cole todo o conteúdo de `firestore.rules` e clique **Publish**. As regras substituem as anteriores, preservando o acesso às turmas, usuários e conteúdos existentes.
3. No Firebase Console, abra **Storage > Get started**. Se o Firebase solicitar **plano Blaze / faturamento**, avalie custos antes de ativar. Configure o bucket no projeto. Em **Storage > Rules**, cole `storage.rules` e clique **Publish**. O site funciona sem Storage para turmas, textos, comentários e avisos; anexos só funcionarão depois dessa etapa.
4. No GitHub, abra o repositório `saladigital`. Envie os arquivos deste pacote para a **raiz**, substituindo os homônimos (não envie o ZIP fechado). O GitHub Pages continua em `main / (root)`.
5. Aguarde a publicação e abra https://prof-juliano79.github.io/saladigital/ . Pressione Ctrl+Shift+R.
6. Teste com conta de professor e conta de aluno fictícia. Verifique Turmas, Avisos, Comentários e anexo PDF pequeno.

## Notas de segurança e operação
- **Não exclua a coleção `users`, nem recrie a conta principal**. Ela já funciona.
- O arquivo `firestore.rules` e `storage.rules` no GitHub são apenas cópias; é obrigatório **publicá-los no Console Firebase**.
- Alunos só veem turmas em que estão matriculados, conforme as regras. Só professores donos da turma publicam e removem avisos/atividades.
- Os comentários ficam em texto e são públicos **dentro da turma**. O professor pode apagar comentários ao excluir a publicação. Não há edição de comentários nem moderação individual nesta versão.
- **Atenção:** links gerados por `getDownloadURL()` têm token de acesso: quem possuir o link poderá abrir o arquivo, mesmo sem login. Não anexe dados pessoais, provas sigilosas ou documentos sensíveis. O controle de acesso por login nas regras do Storage não revoga links previamente compartilhados.
- A exclusão de uma publicação tenta remover comentários e arquivos antes de apagar o registro. Se houver falha de rede/permissão, alguns dados poderão exigir limpeza manual.
- Os anexos são enviados após a criação da atividade; se um upload falhar, a atividade poderá ficar criada sem todos os anexos.
- **Limites e custos** do Storage e Firestore dependem do plano e uso. A versão não foi testada no projeto Firebase real; valide com contas fictícias antes de uso com estudantes e revise a LGPD.
- Para estudantes reais, avalie autorização, privacidade e políticas da escola.
