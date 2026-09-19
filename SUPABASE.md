# Ligar a sincronização entre aparelhos

Sem isso, o app salva tudo **no próprio aparelho**. Ligando, celular e computador mostram os mesmos dados. É grátis e leva uns 5 minutos. O banco é seu — ninguém além de quem tem o seu login enxerga os dados.

## 1. Criar o projeto

1. Entre em **https://supabase.com** e crie uma conta (pode ser com o GitHub).
2. Clique em **New project**. Dê um nome (ex.: `meufinanceiro`), escolha a região **South America (São Paulo)** e guarde a senha do banco que ele pedir (você não vai precisar dela no app).
3. Espere uns 2 minutos até o projeto ficar pronto.

## 2. Criar a tabela

No menu da esquerda, abra **SQL Editor → New query**, cole o comando abaixo e clique em **Run**:

```sql
create table if not exists public.mf_itens (
  user_id uuid not null references auth.users on delete cascade,
  colecao text not null,
  item_id text not null,
  dados jsonb,
  apagado boolean not null default false,
  atualizado timestamptz not null default now(),
  primary key (user_id, colecao, item_id)
);

alter table public.mf_itens enable row level security;

create policy "dono le" on public.mf_itens for select using (auth.uid() = user_id);
create policy "dono insere" on public.mf_itens for insert with check (auth.uid() = user_id);
create policy "dono atualiza" on public.mf_itens for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dono apaga" on public.mf_itens for delete using (auth.uid() = user_id);

alter publication supabase_realtime add table public.mf_itens;
```

O `row level security` com essas quatro políticas é o que garante que cada login só enxerga as próprias linhas.

## 3. Copiar as duas chaves

Vá em **Settings → API** e copie:

- **Project URL** — algo como `https://xxxxxxxxxxxx.supabase.co`
- **anon public** — uma chave bem longa começando com `eyJ...`

⚠️ Copie a **anon public**, nunca a **service_role**. A anon foi feita para ficar dentro do app; sozinha ela não abre nada, porque as políticas acima exigem login.

## 4. Ligar no app

No app, abra **Configurações → Sincronizar entre aparelhos**, cole as duas chaves e clique em **Conectar**. Depois:

1. Digite seu e-mail e uma senha (mínimo 6 letras) e clique em **Criar meu login**.
2. Se o Supabase pedir confirmação por e-mail, confirme e volte para clicar em **Entrar**.
3. No outro aparelho, repita só o passo 4 (colar as chaves e **Entrar** com o mesmo login).

Pronto. O que você anotar em um aparelho aparece no outro em alguns segundos. Sem internet, o app continua funcionando e envia o que faltou quando a conexão voltar (aparece "x lançamentos esperando internet").

## Dicas

- **Trocar de celular:** é só instalar, colar as chaves e entrar com o mesmo login.
- **Parar de sincronizar:** Configurações → **Desligar nuvem**. Os dados continuam no aparelho.
- **Backup extra:** Configurações → **Exportar backup** gera um arquivo `.json` com tudo.
