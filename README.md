# MeuFinanceiro

App de controle financeiro pessoal: gasto diário por categoria, cartões de crédito com limite e fatura, contas fixas e assinaturas, metas, relatórios e o dinheiro guardado rendendo um percentual do CDI (calculado dia útil a dia útil, com feriados).

**App no ar:** https://juliemersonamorim996-del.github.io/meu-financeiro/

## Instalar no celular

1. Abra o link acima no Chrome (Android) ou Safari (iPhone).
2. Android: menu **⋮** → **Adicionar à tela de início**. iPhone: **Compartilhar** → **Adicionar à Tela de Início**.
3. Pronto: vira ícone, abre em tela cheia e funciona mesmo sem internet.

## Onde ficam os dados

Por padrão, tudo fica salvo **no próprio aparelho** (armazenamento do navegador). Para deixar celular e computador iguais, ligue a sincronização com um banco Supabase grátis — o passo a passo está em [SUPABASE.md](SUPABASE.md) e também dentro do app, em **Configurações → Sincronizar entre aparelhos**. Sem internet o app continua funcionando e envia o que faltou depois.

Para levar os dados de um aparelho a outro sem nuvem, use **Configurações → Backup → Exportar / Importar**.

## Feito com

HTML, CSS e JavaScript puros — sem framework, sem build, sem dependências. Os gráficos são SVG desenhados na mão.

## Como mexer no código

O app é montado a partir das partes em `src/`:

| Arquivo | O que tem dentro |
| --- | --- |
| `01-style.html` | Todo o CSS: temas claro/escuro em `:root`, cartões de vidro, responsivo |
| `02-markup.html` | Esqueleto da página (barra lateral, topo, menu de baixo) |
| `03-core.js` | Dados, armazenamento, cálculo de saldos, CDI, cartões e faturas |
| `03b-cloud.js` | Sincronização opcional na nuvem (Supabase): login, envio, fila offline |
| `04-charts.js` | Gráficos em SVG |
| `05-pages1.js` | Dashboard, Gasto diário, Transações |
| `06-pages2.js` | Planejamento, Investimentos, Metas, Relatórios, Carteira, Configurações |
| `07-ui.js` | Janelas, menus e formulários |
| `08-boot.js` | Ações dos botões, rotas e início |

Depois de editar:

```bash
python montar.py
```

Isso gera `index.html` (abre com dois cliques), `docs/` (o site publicado) e as versões usadas no Claude. Os ícones vêm de `python gerar-icones.py`.

Para publicar a atualização:

```bash
git add -A && git commit -m "o que mudou" && git push
```

O GitHub Pages republica sozinho em cerca de um minuto.
