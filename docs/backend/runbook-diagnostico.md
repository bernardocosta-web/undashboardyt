# Runbook — diagnóstico do `/exec` (preventivo)

> ## ⚠ NÃO HÁ PROBLEMA EM ABERTO
>
> **Em 17/08/2026 o backend foi verificado e estava operacional:** o `/exec`
> devolve JSON válido, inclusive em janela anônima, e o dashboard público
> renderiza KPIs, gráficos e tabela normalmente.
>
> Este runbook é **preventivo**. Use se algum dia o banner "Erro:" aparecer.
> Não é uma tarefa pendente e não bloqueia nenhuma etapa do plano de
> estabilização.
>
> **Sobre a suspeita original:** a documentação deste repositório afirmava que o
> backend estava quebrado. Os erros de console que motivaram o diagnóstico eram um
> aviso do CDN do Tailwind e um erro de extensão do Chrome — nenhum da aplicação.
> **A causa da suspeita não foi confirmada:** pode ter sido instabilidade
> transitória do endpoint ou diagnóstico incorreto. Não há evidência que permita
> escolher, e nenhuma causa foi inventada para fechar a lacuna.

## Quando usar

Se o dashboard mostrar o banner "Erro:" ao carregar. Nesse cenário o front está
saudável — ele carrega, tenta buscar os dados e cai no `catch`, mostrando o
banner. A falha estaria no backend (o Apps Script `/exec`), não na página. Os
passos abaixo levam à causa em poucos minutos.

> **Antes de suspeitar do backend, descarte ruído do navegador.** Avisos do CDN do
> Tailwind (`cdn.tailwindcss.com should not be used in production`) e erros de
> extensão do Chrome aparecem no console e **não** são da aplicação. O sinal
> confiável é o banner "Erro:" na tela e o `/exec` aberto direto no navegador —
> não a mera presença de vermelho no console. Foi essa confusão que gerou o
> diagnóstico incorreto de 2026.

## Passo 1 — abra o `/exec` direto no navegador

Pegue a URL em `index.html` (`const API_URL = 'https://script.google.com/.../exec'`)
e cole no navegador. O que aparece decide tudo:

### A) Tela de login / "Você precisa de acesso"
O deployment perdeu o acesso público **ou** a URL mudou.
Causa mais comum: foi feito *Deploy → New deployment* (gera nova URL) em vez de
*Manage deployments → editar → nova versão* (mantém a URL).

**Correção:**
1. No editor do Apps Script → *Deploy → Manage deployments*.
2. Confirme que existe um deployment do tipo **Web app** com:
   - *Execute as:* **Me** (o dono da conta/planilha)
   - *Who has access:* **Anyone**
3. Se a URL atual difere da que está no `index.html`, ou atualize o `index.html`
   com a nova URL, ou (melhor) edite o deployment existente publicando uma nova
   versão para **preservar a URL antiga**.
4. Reabra o `/exec` — deve devolver JSON.

### B) Um JSON `{"error":"..."}`
O código do Apps Script está quebrando ao **ler a planilha**. Provável se as abas
ou colunas mudaram (você reestruturou o "UN Dashboard Proxy" com prefixo `uni`).

**Correção:**
1. No editor do Apps Script → *Execuções* (Executions) → veja o stack trace da
   última execução com erro.
2. Alinhe os nomes de aba/coluna que o script lê com os nomes atuais da planilha,
   **ou** mantenha um mapeamento explícito no topo do script.
3. Rode a função de leitura manualmente no editor pra confirmar antes de
   reimplantar.

### C) `404` / página não encontrada
O deployment foi arquivado/apagado. Crie um novo Web app deployment (config do
item A.2) e atualize `API_URL` no `index.html`.

### D) JSON correto, mas `subscribers: []`
Não é o bug de carregamento — é a limitação conhecida da Brand Account. O
carregamento em si está OK; se o dashboard ainda mostra "Erro:", volte aos itens
acima. Para inscritos, ver `docs/decisions/0001`.

## Passo 2 — registre o que achou

Anote no ADR `docs/decisions/0001` qual foi a causa. Isso alimenta a decisão de
manter o Apps Script ou migrar a fonte de dados — que é a raiz da fragilidade
(ponto único de falha, difícil de testar, acoplado à sua conta Google).

## Nota

Não dá pra diagnosticar isto de fora: `script.google.com` exige a sua sessão
Google. Este passo é seu; com o retorno (A/B/C/D + stack trace, se houver), o
resto do conserto e a decisão de fonte de dados seguem no plano de estabilização.
