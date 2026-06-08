# Documentação do Fluxo de Encomendas (Deliberatis)

Este documento descreve detalhadamente o funcionamento da criação, listagem e persistência de encomendas na base de dados H2, assim como as proteções de segurança implementadas no fluxo de encomendas do **Deliberatis**.

---

## 1. Arquitetura da Base de Dados

As encomendas são persistidas na tabela `encomenda` da base de dados H2, cujas propriedades são definidas pelo formulário do Netuno.

### Colunas da Tabela `encomenda`:
*   `id (integer)`: Chave primária autoincrementada.
*   `uid (uuid)`: Identificador único público exposto ao frontend (previne a revelação de IDs sequenciais).
*   `cliente_id (integer)`: Chave estrangeira que aponta para o `id` da tabela `utilizador`.
*   `descricao (character varying)`: Descrição detalhada dos itens da encomenda.
*   `preco (real)`: Preço final da encomenda.
*   `localizacao (character varying)`: Morada/endereço completo para a entrega.
*   `numero_telefone (character varying)`: Contacto telefónico do cliente para a entrega.
*   `metodo_pagamento (character varying)`: Método selecionado (ex: MBWay, Dinheiro na Entrega).
*   `estado (character varying)`: Estado atual da encomenda (padrão: "Pendente").
*   `observacoes (character varying)`: Notas adicionais opcionais fornecidas pelo utilizador.
*   `active (boolean)`: Flag de registo ativo (padrão `true`).
*   `lastchange_time (timestamp)`: Data e hora do registo/última modificação da encomenda.

---

## 2. Fluxo de Criação de Encomenda

O utilizador pode iniciar um pedido de entrega a partir do botão "+ Criar Encomenda" na barra de cabeçalho.

### Frontend (`website/src/containers/HomeContainer/index.jsx`)
*   **Interface:** Um modal flutuante é aberto com um formulário vertical contendo os seguintes campos:
    *   **Descrição da Encomenda** (`TextArea`): Obrigatório, descreve os itens.
    *   **Preço (€)** (`InputNumber`): Obrigatório, valor mínimo de `0.01`, formatado como decimal.
    *   **Endereço de Entrega** (`Input`): Obrigatório, morada completa.
    *   **Telemóvel de Contacto** (`Input`): Obrigatório, com validação de formato numérico de 9 a 15 algarismos.
    *   **Método de Pagamento** (`Select`): Obrigatório, com opções como "MBWay", "Dinheiro na Entrega" ou "Cartão de Crédito/Débito" (padrão: "MBWay").
    *   **Observações Adicionais** (`TextArea`): Opcional.
*   **Submissão:** Ao submeter, o React lê o token de sessão do `localStorage` e envia os dados num pedido POST via `@netuno/service-client` para `/services/orders`.

### Backend (`server/services/orders.post.js`)
*   **Controlo de Acesso & Sessão:**
    *   Verifica a presença do token JWT no header `Authorization` ou parâmetros do pedido.
    *   Valida a assinatura do token e a expiração.
    *   Extrai o email contido de forma segura e consulta a tabela `utilizador` para obter o `id` interno correspondente ao utilizador autenticado.
*   **Validação Defensiva de Dados:**
    *   Garante que todos os campos obrigatórios foram enviados.
    *   Converte o preço recebido para número de vírgula flutuante e valida se é maior que zero.
*   **Persistência:** Insere o registo na tabela `encomenda` com o `cliente_id` associado ao utilizador e o estado inicializado como `"Pendente"`. Retorna o ID de sucesso.

---

## 3. Fluxo de Listagem de Encomendas

A página inicial do cliente apresenta em tempo real as encomendas criadas por este.

### Frontend (`website/src/containers/HomeContainer/index.jsx`)
*   **Carregamento de Dados:** Assim que a sessão é verificada no carregamento da página, o método `loadOrders` efetua um pedido GET para `/services/orders` passando o token JWT.
*   **Apresentação:**
    *   **Sem Encomendas:** Mostra um estado vazio estilizado (`Empty` do Ant Design) com o texto *"Não tem nenhuma encomenda"* e um botão central apelativo para efetuar a primeira encomenda.
    *   **Com Encomendas:** Renderiza os dados numa tabela com as colunas:
        *   **Código:** Exibe a abreviação do `uid` da encomenda (ex: `#0ba4ee4d`) em vez do ID numérico sequencial da BD.
        *   **Data:** Mostra o carimbo de data formatado em `YYYY-MM-DD HH:mm:ss`.
        *   **Descrição:** Texto detalhado dos itens da encomenda.
        *   **Valor:** Preço formatado com símbolo monetário (ex: `12.00€`).
        *   **Estado:** Mostra o estado atual destacado visualmente em cor (ex: "Pendente").

### Backend (`server/services/orders.get.js`)
*   **Autenticação:** Valida a integridade do token JWT enviado.
*   **Resolução do Utilizador:** Obtém o ID do utilizador ativo a partir do email contido na sessão.
*   **Consulta SQL Segura:**
    *   Efetua a query na base de dados H2 selecionando apenas as colunas necessárias (`id`, `uid`, `lastchange_time`, `descricao`, `preco`, `estado`).
    *   Filtra rigorosamente por `cliente_id = ? AND active = true` para garantir que um utilizador apenas possa ver as suas próprias encomendas.
    *   Ordena por `lastchange_time DESC` para exibir sempre as mais recentes no topo.
*   **Mapeamento e Envio:** Monta a lista e retorna o array formatado em JSON.

---

## 4. Segurança Integrada

### Prevenção de IDOR (Insecure Direct Object Reference)
*   O utilizador nunca envia o seu `userId` (ou código numérico) nas requisições de criação ou consulta de encomendas.
*   O `userId` é **resolvido unicamente no backend** a partir do email assinado contido na assinatura criptográfica do token JWT. Isto impede que um utilizador malicioso altere dados na requisição para listar ou criar encomendas em nome de outros utilizadores.

### Prevenção de Enumeração de IDs
*   Os identificadores sequenciais numéricos (`id` primário da base de dados) ficam ocultos e confinados ao backend.
*   Toda a interface pública no frontend utiliza o `uid` (UUID de 36 caracteres gerado pelo Netuno) para expor códigos de encomenda únicos, evitando a enumeração e estimativa de volumes de vendas por parte de terceiros.
