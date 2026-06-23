# FinançaLivre

Plataforma de controle financeiro pessoal — React + Vite, hospedada no GitHub Pages.

---

## Como subir no GitHub Pages (passo a passo)

### Pré-requisitos

- Conta no [GitHub](https://github.com) (gratuita)
- [Git](https://git-scm.com/downloads) instalado no seu computador
- [Node.js](https://nodejs.org) instalado (versão 18 ou superior)

---

### 1. Criar o repositório no GitHub

1. Acesse [github.com](https://github.com) e faça login
2. Clique em **New** (botão verde no canto superior esquerdo)
3. Em **Repository name**, coloque: `financalivre`
4. Deixe como **Public**
5. **Não** marque nenhuma opção adicional (sem README, sem .gitignore)
6. Clique em **Create repository**

---

### 2. Ajustar o nome do repositório no projeto

Abra o arquivo `vite.config.js` e confirme que o `base` bate com o nome do seu repositório:

```js
base: '/financalivre/',
```

Se você nomeou o repositório diferente, troque aqui.

---

### 3. Enviar os arquivos para o GitHub

Abra o terminal (Prompt de Comando / PowerShell / Terminal) na pasta do projeto e rode:

```bash
# Inicializa o Git
git init

# Adiciona todos os arquivos
git add .

# Cria o primeiro commit
git commit -m "primeiro commit"

# Renomeia a branch principal para 'main'
git branch -M main

# Conecta ao seu repositório (troque SEU_USUARIO pelo seu usuário do GitHub)
git remote add origin https://github.com/SEU_USUARIO/financalivre.git

# Envia os arquivos
git push -u origin main
```

---

### 4. Ativar o GitHub Pages

1. No seu repositório no GitHub, clique em **Settings** (aba no topo)
2. No menu lateral, clique em **Pages**
3. Em **Source**, selecione **GitHub Actions**
4. Salve

O GitHub vai detectar automaticamente o arquivo `.github/workflows/deploy.yml` e vai fazer o build e o deploy.

---

### 5. Acessar o site

Após 1-2 minutos, seu site estará disponível em:

```
https://SEU_USUARIO.github.io/financalivre/
```

Você pode acompanhar o progresso do deploy em **Actions** no repositório.

---

### Atualizar o site depois de fazer mudanças

Sempre que editar o código, rode:

```bash
git add .
git commit -m "descrição da mudança"
git push
```

O GitHub Pages vai rebuild e publicar automaticamente.

---

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173/financalivre/` no navegador.
