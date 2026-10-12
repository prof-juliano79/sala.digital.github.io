# Minha Sala Digital — GitHub Pages + Firebase

Esta versão conecta o site ao Firebase Authentication e ao Cloud Firestore.
Ela mantém o favicon enviado e as abas Conteúdos publicados e Atividades
(atividades são textos para consulta, não questões respondidas).

## 1. Crie o primeiro professor (somente você)
Firebase Console → Authentication → Users → Add user.
Informe seu e-mail e uma senha forte. Copie o UID criado.

Firestore Database → Data → Start collection:
- Collection ID: `users`
- Document ID: cole **exatamente o UID** da conta criada
- Campos:
  - `name` (string): seu nome
  - `email` (string): o mesmo e-mail cadastrado
  - `role` (string): `professor`

Não crie uma tela pública de cadastro de professores: isso permitiria que
qualquer visitante tentasse obter privilégios administrativos.

## 2. Instale as regras do Firestore
Firestore Database → Rules → substitua tudo pelo conteúdo de
`firestore.rules` e clique **Publish**.
**Não** use regras de teste abertas (`allow read, write: if true`).

## 3. Autorize o domínio GitHub Pages
Firebase Console → Authentication → Settings → Authorized domains →
Add domain. Adicione somente o host do seu site, como
`SEU-USUARIO.github.io` (sem https e sem o caminho do repositório).
O domínio `localhost` pode ser usado para testes locais, quando permitido.

## 4. Publique o site
Crie um repositório no GitHub, envie para a raiz:
`index.html`, `style.css`, `app.js`, `firebase-config.js`,
`favicon.svg`, `.nojekyll`, `README.md`, `firestore.rules`.
Em Settings → Pages, selecione Deploy from a branch → main → /(root).

Abra `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

## 5. Teste
Entre como professor com o e-mail/senha criados no Authentication.
Cadastre uma turma e publique um conteúdo.
Na aba Cadastrar alunos, crie uma conta de aluno fictício e
selecione uma turma. Abra o site em outro navegador ou celular, entre
com a conta do aluno e verifique o conteúdo.

## Segurança e limitações
- A senha fixa JULIANO-PROF foi removida. Senhas são gerenciadas pelo Firebase Auth.
- O `firebase-config.js` é público por design. **Nunca** publique chaves de
  contas de serviço, credenciais administrativas ou senhas.
- Regras do Firestore limitam leitura de turmas e escrita do professor.
- Esta é uma versão inicial: não inclui recuperação administrativa de contas,
  controle de abuso/limites de tentativas, matrículas em várias turmas e edição de matrículas, upload de arquivos,
  auditoria ou revisão formal de LGPD.
- **Não cadastre estudantes reais até validar as regras, políticas de privacidade,
  consentimentos/bases legais pertinentes e segurança.**
- A criação de aluno no navegador cria uma conta no Firebase Authentication
  e depois seu perfil no Firestore. Se a segunda operação falhar, a conta
  de autenticação poderá ficar sem perfil e exigirá limpeza manual no console.
- As regras de criação de perfis permitem apenas o papel `aluno`.
- `firestore.rules` precisa ser colado no Console: GitHub Pages não implanta regras.
