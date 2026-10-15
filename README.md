# Minha Sala Digital — versão 1.4

Site estático para GitHub Pages, com Firebase Authentication e Firestore. Base: versão 1.2.

## Recursos mantidos
- Login individual por e-mail/senha, cadastro de alunos e professores, painel de professores.
- Turmas: criação, mudança de nome e disciplina, exclusão e matrículas.
- Conteúdos, atividades, avisos, prazos, links opcionais para anexos, comentários.

## Recursos 1.3
- Painel com indicadores e atividades com próximas entregas.
- Calendário mensal das atividades de todas as turmas autorizadas.
- Confirmação explícita de leitura de conteúdos, atividades e avisos por alunos; consulta pelo professor.
- Pesquisa por palavra, mês e ordenação nas publicações da turma.
- Edição das publicações preservando os comentários.
- Acessibilidade: fonte ampliada, contraste e leitura simplificada (preferências guardadas neste navegador).

## Instalação
1. Faça uma cópia do projeto/repositório e exporte dados importantes antes de atualizar.
2. Firebase Console → Firestore Database → Rules: cole **todo** o conteúdo de `firestore.rules`, publique e aguarde.
3. GitHub → `saladigital` → envie os arquivos desta pasta na raiz do repositório, substituindo os antigos. Não faça upload apenas do ZIP.
4. No GitHub Pages, aguarde a implantação. Atualize o navegador com Ctrl+Shift+R.
5. Teste professor e aluno fictícios antes de usar com dados reais.

## Observações
- O Firebase Storage não é necessário. Os links anexados externamente continuam disponíveis.
- Confirmação de leitura é um clique voluntário, não rastreamento automático de visualização.
- O calendário destaca prazo de entrega quando existe; caso contrário, a data de publicação.
- Os contadores de atividades incluem todas as turmas acessíveis; a contagem de avisos é da turma selecionada.
- Para reduzir consultas, cargas de dados são feitas por acesso/troca de turma, não em tempo real.
- A exclusão em cascata de turma é feita pelo navegador como na versão anterior; para uso institucional, prefira exclusão por backend com transação/rotina administrada.
- Contas de professor devem ser concedidas somente a usuários de confiança. O código do site é público, mas as credenciais e regras devem continuar protegidas.
- Não exponha dados pessoais de estudantes em anexos públicos; avalie LGPD e política institucional.
- O arquivo de configuração web Firebase não é uma chave administrativa, mas nunca publique chaves privadas de service accounts.


## Novo na versão 1.4 — Criar minha conta
- Na página de login, botão **Criar conta**. O usuário informa nome, e-mail, senha, tipo de perfil (aluno ou professor) e e-mail do professor responsável.
- **Alunos:** a conta é criada imediatamente no Authentication, mas sem acesso a turmas até a aprovação do professor e escolha da turma.
- **Professores:** a conta é criada como `professor_pendente`, sem poderes docentes. Um professor já autorizado precisa aprovar a solicitação na aba **Solicitações**.
- Professores mantêm o cadastramento direto de novos alunos e professores na aba **Criar contas**.
- As solicitações são encontradas por e-mail do professor responsável, que deve corresponder exatamente ao e-mail da conta docente no Authentication.
- Após a aprovação, o solicitante atualiza a página ou entra novamente para obter as novas permissões.
- Instale o novo `firestore.rules` **antes** de enviar os arquivos ao GitHub.
- Se uma falha ocorrer após a criação da conta no Auth, a conta poderá ficar sem perfil; nesse caso um administrador precisará corrigir manualmente.
- As regras não conferem verificação automática de identidade escolar. O professor deverá confirmar a identidade antes de aprovar pedidos, principalmente contas docentes.
- Para operação real com estudantes, revise proteção de dados pessoais, e considere exigir verificação do e-mail e medidas contra abuso na criação de contas.
