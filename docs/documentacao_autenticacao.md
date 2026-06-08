# Documentação do Fluxo de Autenticação (Deliberatis)

Este documento descreve detalhadamente o funcionamento dos formulários de Registo e Login, a validação de dados, a encriptação de palavras-passe, e o mecanismo de controlo de sessão usando JWT (JSON Web Tokens) no projeto **Deliberatis**.

---

## 1. Arquitetura Geral

O projeto foi reestruturado de forma similar ao **Diversa21**, separando o código público (site/login/registo) do backoffice administrativo:
*   **`website/`**: Contém o frontend público baseado em React + Vite. O build do JavaScript é exportado diretamente para a pasta pública do Netuno em `public/scripts/website.js`.
*   **`ui/`**: Focado unicamente na administração do Netuno (`DashboardContainer`), compilando para `public/scripts/ui.js`.
*   **`public/`**: Pasta de ficheiros estáticos do Netuno. Contém `auth.html` (portal de registo/login) e `home.html` (página reservada).
*   **`server/services/`**: Endpoints de API desenvolvidos em JavaScript (correndo em GraalVM no Netuno) que comunicam com a base de dados H2.

---

## 2. Formulário de Registo (Sign Up)

O registo recolhe dados do utilizador, valida as regras de negócio no frontend e envia-os de forma segura para o backend.

### Frontend (`website/src/containers/AuthContainer/register.jsx`)
*   **Campos recolhidos:** Primeiro Nome, Último Nome, Email, Password, Data de Nascimento.
*   **Regras de Validação no Frontend:**
    1.  **Nomes:** Deve conter pelo menos 2 caracteres e apenas letras (rejeita números ou símbolos especiais, mas aceita acentos portugueses, hífens e apóstrofos).
    2.  **Email:** Deve ter o formato padrão de email (`exemplo@dominio.com`).
    3.  **Password:** Mínimo de 6 caracteres, contendo pelo menos uma letra maiúscula e um número.
    4.  **Idade Mínima (16 anos):** O calendário (`DatePicker` do Ant Design) desativa a seleção de datas que correspondam a menos de 16 anos e abre posicionado exatamente há 16 anos atrás para poupar cliques ao utilizador.
*   **Comunicação:** Efetua um pedido POST via `@netuno/service-client` para o endpoint `/services/register`.

### Backend (`server/services/register.post.js`)
*   **Validações de Segurança (Defensiva):**
    *   Verifica se todos os campos obrigatórios estão preenchidos.
    *   Valida novamente as regras de tamanho e formato dos nomes, password e idade mínima (16 anos).
    *   Pesquisa na base de dados para garantir que o **email** já não se encontra registado.
*   **Encriptação da Password:**
    *   A password nunca é gravada em texto limpo.
    *   É gerado um salt seguro usando `_crypto.bcryptSalt()`.
    *   A password é encriptada através de `_crypto.bcryptHash(password, salt)` antes de ser inserida na tabela `utilizador`.
*   **Base de Dados:** Os utilizadores são registados na tabela `utilizador` com o estado `active: true` e a coluna `tipo_de_utilizador: "cliente"`.

---

## 3. Formulário de Login & Emissão de JWT

O login autentica o utilizador e emite um token assinado digitalmente.

### Frontend (`website/src/containers/AuthContainer/login.jsx`)
*   **Campos recolhidos:** Email e Password.
*   **Comunicação:** Efetua um pedido POST para `/services/login`.
*   **Sucesso:** O servidor devolve um token JWT. O frontend guarda-o no browser através de `localStorage.setItem('user_session_token', token)` e redireciona o utilizador para `/public/home.html`.

### Backend (`server/services/login.post.js`)
*   **Validação da Password (Bcrypt):**
    *   Recupera o hash Bcrypt armazenado para o email fornecido.
    *   Gera um hash com a password fornecida usando o hash guardado como salt: `_crypto.bcryptHash(password, storedHash)`.
    *   Se o resultado bater certo com o hash original, a credencial é correta.
*   **Geração de Token JWT (Stateless):**
    *   Como o Netuno corre sobre GraalVM/JVM, usamos as classes nativas do Java (`java.util.Base64` e `javax.crypto.Mac`) para construir e assinar o token de forma segura, sem dependências externas.
    *   **Header:** `{"alg":"HS256","typ":"JWT"}` (Base64)
    *   **Payload:** Contém o email do utilizador e a data de expiração (`exp` = 24 horas a partir do momento atual).
    *   **Assinatura:** Assinatura HmacSHA256 gerada a partir do `Header.Payload` usando uma chave secreta do servidor de 32+ caracteres.

---

## 4. Proteção de Páginas Privadas (JWT)

A página reservada `home.html` está protegida contra acessos anónimos.

### Frontend (`public/home.html`)
*   Ao carregar, um script autoinvocado (`IIFE`) verifica se existe o token no `localStorage`.
*   **Se não existir:** Redireciona imediatamente para `auth.html`.
*   **Se existir:** Faz um pedido POST em segundo plano para `/services/check-session` passando o token.
    *   Se for válido: Mostra o conteúdo da página ao utilizador e altera dinamicamente a mensagem de cabeçalho para "Bem-vindo, [Nome]!" com o primeiro nome retornado.
    *   Se for inválido/expirado: Limpa o `localStorage` e expulsa o utilizador para `auth.html`.
*   **Logout:** Ao clicar em "Terminar Sessão", limpa o `user_session_token` do `localStorage` e redireciona o utilizador.

### Backend (`server/services/check-session.post.js`)
*   Recupera a assinatura HmacSHA256 calculada com a chave secreta e compara com a assinatura contida no token para garantir que o token não foi adulterado no cliente.
*   Verifica a data de expiração (`exp`) contida no payload do token em relação ao relógio atual do servidor.
*   Se for válido, faz um pedido à base de dados para pesquisar o `primeiro_nome` associado ao email do token e retorna-o.
*   Retorna `result: true` se o token for válido e íntegro.

