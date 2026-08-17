# COMECE AQUI — plano completo, passo a passo

Guia único, do zero até o dashboard funcionando e refatorado. Siga na ordem.
Cada passo tem o comando exato ou o texto exato para copiar.

**Tempo estimado:** Partes 1 a 4 levam cerca de 1 hora. A Parte 5 é o trabalho de
verdade e pode levar algumas sessões — você para e retoma quando quiser.

---

## Mapa das partes

| Parte | O que você faz | Onde |
|---|---|---|
| 1 | Instala o que falta | Terminal |
| 2 | Descobre por que quebrou | Navegador |
| 3 | Monta a pasta do projeto | Terminal |
| 4 | Abre no VS Code com Claude Code | VS Code |
| 5 | Executa a refatoração | Claude Code |
| 6 | Publica | Claude Code |
| 7 | Decide o banco de dados | Conversa com o dev senior |

---

# PARTE 1 — Instalar o que falta

Abra o terminal. No **Windows**, use o PowerShell (tecla Windows, digite
"powershell"). No **Mac**, use o Terminal (Cmd+Espaço, digite "terminal").

- [ ] **1.1** Rode os dois comandos abaixo, um por vez:

```bash
git --version
```

```bash
node --version
```

Cada um deve responder um número (ex.: `git version 2.43.0`).

- [ ] **1.2** Se algum deu erro do tipo "não reconhecido" ou "command not found":
  - **git** → instale em https://git-scm.com (baixe, next-next-next, aceite os padrões)
  - **node** → instale em https://nodejs.org (baixe a versão **LTS**)

  Depois de instalar, **feche e reabra o terminal** e rode os comandos de novo.
  Fechar e reabrir é obrigatório — o terminal só descobre programas novos ao
  iniciar.

> O git baixa e versiona o código. O Node roda os testes. Sem os dois, os passos
> seguintes travam.

---

# PARTE 2 — Descobrir por que o dashboard quebrou

Nada de programação aqui. São 5 minutos no navegador e o resultado define o
conserto.

- [ ] **2.1** Abra este endereço no navegador:

```
https://github.com/bernardocosta-web/undashboardyt/blob/main/index.html
```

- [ ] **2.2** Aperte `Ctrl+F` (ou `Cmd+F` no Mac) e busque por: `API_URL`

  Você vai achar uma linha parecida com esta:

```js
const API_URL = 'https://script.google.com/macros/s/AKfycbz.../exec';
```

- [ ] **2.3** Copie **apenas o endereço** — o que está entre as aspas simples,
  começando em `https://` e terminando em `/exec`.

- [ ] **2.4** Abra uma aba nova, cole esse endereço e aperte Enter.

- [ ] **2.5** Anote o que apareceu. É um destes quatro:

| O que apareceu | O que significa | O que fazer |
|---|---|---|
| Tela de login do Google, ou "Você precisa de acesso" | O endereço deixou de ser público, ou mudou | Passo 2.6 |
| Um texto começando com `{"error":` | O script está quebrando ao ler a planilha | Passo 2.7 |
| Erro 404 / página não encontrada | A publicação foi apagada | Passo 2.6 |
| Muito texto com `"videos":[...]` | **O backend está OK!** | Passo 2.8 |

- [ ] **2.6** *(login ou 404)* Abra a planilha do dashboard → menu
  **Extensões → Apps Script**. No editor que abrir, clique em **Implantar
  (Deploy) → Gerenciar implantações**. Confira se existe uma implantação do tipo
  *App da Web* com:
  - **Executar como:** Eu (sua conta)
  - **Quem tem acesso:** Qualquer pessoa

  Compare o endereço que aparece ali com o que você copiou no passo 2.3. Se forem
  **diferentes**, essa é a causa: em algum momento foi criada uma implantação nova
  (com endereço novo) em vez de atualizar a existente. Anote os dois endereços.

- [ ] **2.7** *(erro em JSON)* No editor do Apps Script, clique em **Execuções**
  no menu da esquerda. Ache a última execução com falha e copie a mensagem de
  erro completa.

- [ ] **2.8** Anote o resultado num lugar que você não perca. Você vai precisar
  dele para fechar o conserto — e para registrar no `docs/decisions/0001`.

> Por que isso primeiro: o dashboard só volta a mostrar dados quando isso for
> resolvido, e você precisa dele funcionando para conferir depois que a
> refatoração não mudou nenhum número.

---

# PARTE 3 — Montar a pasta do projeto

## 3.1 Baixar os arquivos da documentação

- [ ] Na conversa com o Claude, baixe os **11 arquivos** que foram criados. São:

```
CLAUDE.md
SPEC.md
README.md
COMECE-AQUI.md   ← este arquivo
docs/backend/runbook-diagnostico.md
docs/decisions/0000-template.md
docs/decisions/0001-fonte-de-dados-apps-script-vs-mcp.md
docs/decisions/0002-modelo-de-dados-e-armazenamento.md
docs/learning/README.md
docs/learning/01-como-o-youtube-decide.md
docs/learning/02-glossario-de-metricas.md
docs/superpowers/plans/2026-08-17-estabilizacao.md
```

Eles vão para a sua pasta de Downloads. Deixe por enquanto.

## 3.2 Baixar seu repositório

- [ ] No terminal, rode um comando por vez:

```bash
cd ~/Documents
```

```bash
git clone https://github.com/bernardocosta-web/undashboardyt.git
```

```bash
cd undashboardyt
```

> O que aconteceu: você entrou na pasta Documentos, baixou uma cópia do seu
> repositório do GitHub (o `index.html` atual vem junto) e entrou nessa pasta.
> No Windows, se `~/Documents` der erro, use `cd $HOME\Documents`.

## 3.3 Criar um branch de trabalho

- [ ] Rode:

```bash
git checkout -b estabilizacao
```

> **Por que isso importa muito:** o site público é publicado a partir do branch
> `main`. Trabalhando num branch chamado `estabilizacao`, nada que você fizer
> afeta o site até você decidir. É a sua rede de segurança — se tudo der errado,
> o site continua exatamente como está.

## 3.4 Colocar a documentação na pasta

- [ ] Abra a pasta `undashboardyt` no Explorer (Windows) ou Finder (Mac) e mova
  os arquivos baixados para dentro, **respeitando as pastas**. O resultado final:

```
undashboardyt/
├── index.html          ← já estava (veio do clone)
├── CLAUDE.md
├── COMECE-AQUI.md
├── SPEC.md
├── README.md
└── docs/
    ├── backend/
    │   └── runbook-diagnostico.md
    ├── decisions/
    │   ├── 0000-template.md
    │   ├── 0001-fonte-de-dados-apps-script-vs-mcp.md
    │   └── 0002-modelo-de-dados-e-armazenamento.md
    ├── learning/
    │   ├── README.md
    │   ├── 01-como-o-youtube-decide.md
    │   └── 02-glossario-de-metricas.md
    └── superpowers/
        └── plans/
            └── 2026-08-17-estabilizacao.md
```

Crie as subpastas na mão (botão direito → Nova pasta) se precisar. Se preferir,
o Claude Code cria as pastas para você depois — mas os arquivos você precisa
colocar.

- [ ] Salve esse primeiro estado:

```bash
git add .
```

```bash
git commit -m "docs: adiciona documentação base do projeto"
```

---

# PARTE 4 — Abrir no VS Code com Claude Code

## 4.1 Abrir a pasta

- [ ] Ainda no terminal, dentro de `undashboardyt`:

```bash
code .
```

> O `.` significa "a pasta onde eu estou". Se o comando `code` não existir, abra
> o VS Code na mão e vá em **Arquivo → Abrir Pasta**, escolhendo `undashboardyt`.

## 4.2 Instalar a extensão do Claude Code

- [ ] Aperte `Ctrl+Shift+X` (Windows) ou `Cmd+Shift+X` (Mac).
- [ ] Busque por **Claude Code** e clique em **Install**.

Requisito: VS Code 1.94.0 ou superior (veja em Ajuda → Sobre).

## 4.3 Abrir o painel e entrar na conta

- [ ] Clique em **✱ Claude Code** no canto **inferior direito** da janela.

  Esse é o jeito mais confiável de abrir, porque funciona mesmo sem nenhum
  arquivo aberto.

- [ ] Na primeira vez aparece uma tela de login. Clique em **Sign in** e autorize
  no navegador. Sua assinatura do Claude serve; não precisa de chave de API.

## 4.4 Configurar o modo de permissão

- [ ] Na parte de baixo da caixa de texto do Claude, clique no indicador de modo
  e escolha **Manual**.

Os modos são:
- **Manual** — pede sua permissão antes de editar arquivos e antes da maioria dos
  comandos. **Use este.**
- **Plan** — descreve o que vai fazer e espera aprovação antes de mudar nada.
- **Edit automatically** — edita sem perguntar.

> Em Manual, cada mudança aparece como uma comparação lado a lado (verde = o que
> entra, vermelho = o que sai) e você aprova uma por uma. É mais lento e é
> exatamente o que se quer ao mexer em código que já funciona.

## 4.5 Confirmar que o superpowers está ligado

- [ ] Na caixa do Claude, digite e envie:

```
/plugins
```

- [ ] Confirme que **superpowers** aparece na lista de instalados, com a chave
  ligada. Se não estiver, instale por essa mesma tela.

---

# PARTE 5 — Executar a refatoração

Aqui você conversa com o Claude Code. Copie e cole cada texto abaixo na caixa
dele, na ordem.

## 5.1 Primeiro: deixe ele ler (não peça código ainda)

- [ ] Cole:

```
Leia CLAUDE.md, SPEC.md e docs/superpowers/plans/2026-08-17-estabilizacao.md.

Não escreva nem altere nenhum código ainda. Me responda em no máximo
10 linhas: (1) o que este projeto é, (2) qual é o invariante mais
perigoso de quebrar, (3) alguma lacuna que você viu no plano.
```

**Como saber se deu certo:** a resposta precisa mencionar que `ctrStudio` e as
retenções são frações de 0 a 1 (e não percentuais). Se ele não citar isso, os
documentos não foram lidos de verdade — responda "releia o CLAUDE.md inteiro
antes de responder".

> Este passo é barato e evita o cenário caro: descobrir que ele entendeu errado
> depois de cinco arquivos alterados.

## 5.2 Preparar o ambiente de teste

- [ ] Cole:

```
Configure o vitest neste projeto. Crie o package.json com vitest como
devDependency e um script "test". Rode a instalação e me mostre um teste
de exemplo passando. Não toque no index.html ainda.
```

> O vitest é o programa que roda os testes. Vai aparecer uma pasta
> `node_modules` com as dependências — isso é normal, e ela não vai para o
> GitHub.

## 5.3 Executar a Task 1

- [ ] Cole:

```
Use superpowers:executing-plans para executar o plano em
docs/superpowers/plans/2026-08-17-estabilizacao.md.

Execute SOMENTE a Task 1. Siga TDD à risca: escreva o teste primeiro,
rode e me mostre ele FALHANDO, e só então implemente. Pare ao final da
Task 1 para eu revisar.
```

**O que vai acontecer, em ordem:**
1. Ele cria o arquivo de teste
2. Roda e mostra o teste **falhando** — isso é o esperado e é bom sinal: prova
   que o teste está realmente testando algo
3. Cria `src/lib/math.js` copiando as funções do seu `index.html`
4. Roda de novo e mostra **passando**
5. Faz o commit

Em cada arquivo, aparece a comparação lado a lado e você aprova.

## 5.4 Revisar antes de liberar a próxima

- [ ] Olhe o que ele fez e faça **uma** pergunta: ele **copiou** a lógica ou
  "melhorou" ela?

  Nesta fase, melhorar é bug. A função `top80avg` tem que continuar fazendo
  exatamente o que fazia antes, mesmo que pareça estranha. O objetivo é mudar a
  organização do código sem mudar nenhum resultado.

- [ ] Se estiver bom, cole:

```
Aprovado. Siga para a Task 2 com o mesmo processo: teste primeiro,
mostre falhando, implemente, mostre passando, commit. Pare no final.
```

- [ ] Repita para as Tasks 3, 4 e 5, sempre revisando entre elas.

## 5.5 Aviso para quando chegar na Task 4

A partir da Task 4 o `index.html` passa a usar módulos (`import`/`export`), e
isso **não funciona abrindo o arquivo com duplo clique** — o navegador bloqueia
por segurança. Para ver o dashboard funcionando, abra o terminal dentro do VS
Code (`` Ctrl+` ``) e rode:

```bash
python -m http.server 8000
```

Depois abra `http://localhost:8000` no navegador. Se `python` não existir, use
`npx serve`.

> Guarde isto: quando o dashboard "sumir" depois da Task 4, é isso — não é bug.

## 5.6 Conferência final

- [ ] Com o dashboard rodando pelo servidor local, compare com a versão antiga
  (o site público). Confira que batem:
  - os números de todos os KPIs do topo
  - os 7 gráficos
  - a tabela de ranking, incluindo a ordenação
  - o botão de exportar PDF

Se algum número mudou, a refatoração introduziu um bug. Diga ao Claude qual
número está diferente e onde.

---

# PARTE 6 — Publicar

- [ ] Só depois da conferência da 5.6, cole:

```
Faça o push do branch estabilizacao e abra um Pull Request descrevendo
a refatoração.
```

- [ ] Abra o link do Pull Request que ele te der, revise as mudanças no GitHub e
  clique em **Merge** quando estiver seguro.

**É só neste momento que o site público muda.** Até aqui, tudo o que você fez
ficou isolado no seu branch.

---

# PARTE 7 — A decisão do banco de dados

Isso corre em paralelo e não bloqueia nada acima.

- [ ] Leia `docs/decisions/0002-modelo-de-dados-e-armazenamento.md`.
- [ ] Mande para o dev senior. Ele levantou a questão certa; o documento organiza
  as opções e os números do gargalo.
- [ ] Pergunta específica para ele: **já existe um Postgres do n8n que possamos
  usar?** A resposta muda bastante o custo da migração.
- [ ] Quando decidirem, preencha a seção "Decisão" do ADR e mude o Status de
  *Proposto* para *Aceito*.

> Nada do trabalho da Parte 5 é perdido por essa decisão. Ao contrário: o arquivo
> `src/data.js` que nasce na Task 4 é exatamente o ponto onde a fonte de dados
> será trocada depois. Refatorar primeiro deixa a migração mais barata.

---

# Se algo der errado

| Situação | O que fazer |
|---|---|
| Ele começou a fazer coisa demais, fugiu do plano | Aperte `Esc` e diga: "Pare. Volte para a Task N do plano e faça só ela." |
| Um teste falhou e ele mudou **o teste** para passar | Sinal de alerta. Diga: "O teste está correto, a implementação está errada. Não altere o teste." |
| A conversa ficou longa e ele esqueceu o contexto | Digite `/compact`, depois "releia CLAUDE.md antes de continuar" |
| Você quer desfazer as mudanças da task atual | Rode `git checkout -- .` no terminal (desfaz o que não foi commitado). Como cada task termina em commit, você nunca perde mais de uma task |
| Você quer voltar tudo ao início | `git checkout main` — seu branch de trabalho fica intacto e o site nunca foi tocado |

---

# Checklist geral

- [ ] Parte 1 — git e node instalados
- [ ] Parte 2 — descobri por que quebrou (resultado anotado)
- [ ] Parte 3 — repositório clonado, branch criado, docs no lugar
- [ ] Parte 4 — VS Code + Claude Code abertos, modo Manual, superpowers ligado
- [ ] Parte 5 — Tasks 1 a 5 executadas e conferidas
- [ ] Parte 6 — Pull Request feito e merge
- [ ] Parte 7 — ADR 0002 discutido e decidido
