# SICAD — Sistema de Cadastro e Consulta de Indivíduos

> Sistema para Segurança e Investigação · Next.js + Tailwind CSS + Supabase

## Guia de Instalação e Deploy

> [!IMPORTANT]
> Antes de iniciar, você precisa de uma conta gratuita no [Supabase](https://supabase.com).

---

### 1. Criar o Projeto no Supabase

1. Acesse [app.supabase.com](https://app.supabase.com) e crie um novo projeto
2. Anote a **URL** e a **anon key** (em Settings → API)
3. Abra o **SQL Editor** e execute o conteúdo do arquivo [`supabase/schema.sql`](file:///C:/Users/Tatio/.gemini/antigravity/scratch/sicad/supabase/schema.sql)
   - Isso cria todas as tabelas, triggers, índices, políticas RLS e o bucket de storage
4. Em **Storage**, verifique se o bucket `fotos` foi criado (caso contrário, crie-o manualmente como público)

---

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.local.example` para `.env.local` e preencha com seus dados:

```bash
cp .env.local.example .env.local
```

Edite o `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

---

### 3. Rodar Localmente

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Você será redirecionado para a tela de login.

---

### 4. Deploy na Vercel (Gratuito)

1. Faça push do código para um repositório no GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique **Deploy**

---

### 5. Configurar Autenticação no Supabase

Em **Authentication → URL Configuration** no dashboard do Supabase:
- **Site URL**: `https://seu-app.vercel.app` (ou `http://localhost:3000` para dev)
- **Redirect URLs**: adicione `https://seu-app.vercel.app/**`

---

## Stack Tecnológica

| Camada | Tecnologia | Plano |
|--------|-----------|-------|
| Frontend | Next.js 14 + React 18 + Tailwind CSS | — |
| Backend/Auth | Supabase (PostgreSQL + Auth + Storage) | Free Tier |
| Deploy | Vercel | Free Tier |

## Estrutura do Projeto

```
sicad/
├── supabase/
│   └── schema.sql              # DDL + RLS + Storage policies
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + ThemeProvider
│   │   ├── page.tsx            # Redirect → /dashboard
│   │   ├── login/page.tsx      # Autenticação
│   │   ├── register/page.tsx   # Registro de operador
│   │   ├── dashboard/page.tsx  # Busca e listagem
│   │   ├── cadastro/page.tsx   # Formulário multi-etapas (criar/editar)
│   │   └── individuo/[id]/     # Ficha completa (dossiê)
│   ├── components/
│   │   ├── Navbar.tsx          # Navegação + dark mode toggle
│   │   └── ThemeProvider.tsx   # next-themes wrapper
│   ├── lib/
│   │   ├── supabase/client.ts  # Browser Supabase client
│   │   ├── supabase/server.ts  # Server Supabase client
│   │   └── utils.ts            # Formatadores, validações, constantes
│   ├── types/database.ts       # TypeScript types
│   └── middleware.ts           # Auth guard
├── .env.local.example
└── package.json
```

## Funcionalidades

- ✅ Autenticação com e-mail/senha
- ✅ RBAC: operadores e administradores
- ✅ Row Level Security no Supabase
- ✅ Cadastro multi-etapas com validação
- ✅ Máscaras de CPF, RG, CEP
- ✅ Upload de até 5 fotos com compressão
- ✅ Galeria com lightbox e zoom
- ✅ Busca global (nome, vulgo, CPF)
- ✅ Filtros avançados (cidade, bairro, artigos)
- ✅ Ficha completa estilo dossiê
- ✅ Observações colaborativas em linha do tempo
- ✅ Edição e exclusão restritas ao autor/admin
- ✅ Modo escuro
- ✅ Totalmente responsivo
