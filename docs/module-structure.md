# モジュール構造図

`src/` 配下のモジュールの依存関係です。矢印は「import する側 → される側」。

## レイヤー全体

```mermaid
flowchart TD
  proxy["proxy.ts<br/>(リクエスト前処理)"]

  subgraph app["app/ (Next.js App Router)"]
    pages["(app)/ ・ (auth)/<br/>画面 page.tsx / layout.tsx"]
    routes["Route Handlers<br/>api/preview ・ api/uploads<br/>files/[id]/[name] ・ up<br/>wiki/[...title] ・ pages/[id]/markdown"]
  end

  subgraph components["components/"]
    comp["機能コンポーネント<br/>PageForm, Sidebar, Markdown ..."]
    ui["components/ui/<br/>shadcn/ui 部品"]
  end

  actions["actions/<br/>Server Actions"]
  lib["lib/<br/>ドメイン・インフラ"]
  hooks["hooks/<br/>use-mobile"]

  pages --> comp
  pages --> ui
  pages --> actions
  pages --> lib
  routes --> lib
  comp --> ui
  comp --> actions
  comp --> lib
  ui --> hooks
  ui --> lib
  actions --> lib
```

## lib/ の内部依存

```mermaid
flowchart LR
  subgraph auth["認証・権限"]
    access
    session
    users
    password
    totp
    secret
    roles
    rate-limit
  end

  subgraph domain["ドメイン"]
    pages
    folders
    uploads
    settings
    markdown
    wikilinks
  end

  subgraph infra["基盤"]
    db
    migrations
    seed
    env
    errors
    text
  end

  access --> session & settings & users
  session --> db & env & users
  users --> db & env & errors & password & roles & secret & text & totp
  secret --> env

  markdown --> pages & text & wikilinks
  pages --> db & errors & text & wikilinks
  folders --> db & errors & text
  uploads --> db & env & errors & text
  settings --> color-mode & db & errors & text

  db --> env & migrations & seed
  seed --> env & password & text
  format --> env
```

依存のない単独モジュール: `color-mode`, `diff`, `flash`, `form`, `origin`, `params`, `utils`（`cn`）。

## actions/ → lib/

| Action | 主に使う lib |
| --- | --- |
| `auth.ts` | access, session, users, rate-limit, flash, form, text |
| `account.ts` | access, session, users, settings, rate-limit, flash, form, errors |
| `pages.ts` | access, pages, flash, form, errors |
| `folders.ts` | access, folders, flash, form, errors |
| `uploads.ts` | access, uploads, flash |
| `users.ts` | access, users, flash, form, errors |
| `settings.ts` | access, settings, session, users, db, env, flash, form, errors |

## Route Handlers → lib/

| Route | 使う lib |
| --- | --- |
| `api/preview` | markdown, origin, session, users |
| `api/uploads` | uploads, origin, session, users, errors |
| `files/[id]/[name]` | uploads, session, settings |
| `up` | db |
| `(app)/wiki/[...title]` | pages, session, settings |
| `(app)/pages/[id]/markdown` | pages, session, settings |
