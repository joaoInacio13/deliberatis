# 📖 Explicação Detalhada do Código (Deliberatis)

Este documento fornece um guia completo e detalhado (método a método, componente a componente) sobre todos os ficheiros do projeto **Deliberatis**, abrangendo os **serviços do backend**, os **componentes visuais** e os **contentores React**.

---

## 🗺️ 1. Visão Geral da Arquitetura

O **Deliberatis** é construído usando:
* **Backend**: O framework Netuno (serviços em JavaScript rodando sobre GraalVM com ligação à base de dados H2).
* **Frontend**: Aplicação React estruturada por contentores leves (Containers) que controlam o fluxo de estado e a API, e componentes reutilizáveis (Components) responsáveis exclusivamente pela renderização visual.

---

## ⚙️ 2. Serviços Backend (`server/services/`)

Estes scripts em JavaScript correm do lado do servidor do Netuno e comunicam diretamente com a base de dados H2.

### 2.1. `check-session/post.js`
Valida se o utilizador possui um token JWT ativo e retorna os seus dados de perfil.
* **Fluxo**:
  1. O Netuno interceta o pedido e valida o cabeçalho `Authorization: Bearer <token>`.
  2. `_user.id()`: Obtém o ID do utilizador autenticado pelo token JWT.
  3. `_db.query(...)`: Pesquisa o primeiro nome e email na tabela `cliente` correspondente ao ID do utilizador.
  4. Retorna um objeto JSON contendo `{ result: true, primeiro_nome, email }`.

### 2.2. `register/post.js`
Gere a criação de novos utilizadores e perfis de clientes.
* **Métodos e fluxo**:
  1. Lê os parâmetros enviados no corpo do pedido POST (`primeiro_nome`, `ultimo_nome`, `email`, `password`, `data_de_nascimento`).
  2. Valida regras de negócio: nomes válidos (regex), password forte (regex) e idade mínima de 16 anos (usando a classe `java.util.Calendar`).
  3. `_db.query(...)`: Garante que o email de utilizador ainda não existe.
  4. `_user.create(...)`: Insere o utilizador no motor de segurança interno do Netuno (o framework cifra a password automaticamente).
  5. `_crypto.bcryptHash(...)`: Cifra a password para gravação no perfil customizado.
  6. `_db.insert("cliente", ...)`: Regista os detalhes do perfil na tabela customizada `cliente` associado ao ID do utilizador nativo criado.

### 2.3. `orders/get.js`
Lista todas as encomendas pertencentes ao cliente autenticado.
* **Fluxo**:
  1. `_user.id()`: Obtém o ID do utilizador da sessão ativa.
  2. `_db.query(...)`: Procura o ID do perfil cliente e executa uma consulta à tabela `encomenda` cruzando dados (`LEFT JOIN`) com a tabela `estado_encomenda` para trazer o estado textual (ex: "Pendente").
  3. Retorna a lista de encomendas formatada com `{ result: true, orders: [...] }`.

### 2.4. `orders/post.js`
Submete uma nova encomenda.
* **Fluxo**:
  1. Obtém o ID do cliente logado e lê os campos da encomenda (`descricao`, `preco`, `codigo_postal`, `rua`, `porta`, `andar`, `telefone`, `pagamento`).
  2. Executa validações rigorosas (formatos de telefone, código postal e preço maior que zero).
  3. `toTitleCase(str)`: Formata a rua e a cidade para capitalizarem a primeira letra de cada palavra.
  4. Valida se o código postal existe na tabela `codigo_postal`. Se não, cria-o e associa-o à cidade correspondente.
  5. `_db.insert("encomenda", ...)`: Grava a encomenda na base de dados relacionando o cliente, o código postal, o método de pagamento e define o estado inicial como "Pendente".

### 2.5. `order/get.js`
Carrega os detalhes completos de uma encomenda específica (com geocodificação).
* **Métodos principais**:
  * `httpGet(urlString)`: Utiliza o `HttpClient` do Java para realizar uma requisição externa à API Nominatim do OpenStreetMap.
  * `geocode(address)` e `geocodePostalCode(code)`: Convertem a morada textual em coordenadas (latitude e longitude) usando a API Nominatim.
  * **Fluxo**:
    1. Lê o parâmetro `uid` da encomenda.
    2. Procura a encomenda pertencente ao cliente autenticado usando `LEFT JOIN` nas tabelas relacionadas.
    3. Caso a encomenda ainda não tenha latitude/longitude em cache ou gravadas, despoleta o geocoder externo baseando-se na Rua/Código Postal/Cidade e atualiza a base de dados.
    4. Devolve o objeto `{ result: true, order: { ... } }` incluindo as coordenadas prontas para o mapa.

### 2.6. `postal-code/get.js`
Valida códigos postais em tempo real, usando uma base de dados local de cache.
* **Fluxo**:
  1. Valida se o código inserido possui o formato `XXXX-XXX`.
  2. Pesquisa a rua e a cidade na tabela local `codigo_postal` (cache).
  3. Caso não encontre, realiza o pedido HTTP ao Nominatim para obter a morada geográfica correspondente e, se for válida para Portugal, grava as informações de cache local (para evitar novas chamadas externas) e responde com sucesso.

### 2.7. `map-search/get.js` e `map-reverse/get.js`
Estes dois serviços simplificam a pesquisa textual no mapa e a geocodificação reversa (coordenadas para morada) respetivamente.
* Utilizam a função base do `HttpClient` do Java modernos para interagir com o OpenStreetMap de forma segura no backend.

---

## 🎨 3. Componentes Frontend (`website/src/components/`)

Estes componentes visuais recebem parâmetros e focam-se na renderização do layout.

### 3.1. `OrdersTableComponent/index.jsx`
Desenha a grelha de listagem das encomendas no dashboard principal.
* **Componente `formatDate(dateStr)`**: Converte a data do formato padrão de base de dados para o formato de leitura português (`dia/mês/ano hora:minuto:segundo`).
* **Renderização de Estado (Estado Column)**: Define dinamicamente o estilo do texto e o dot animado:
  * `dot-pulse-orange`: Pisca em laranja para estado "Pendente".
  * `dot-pulse-blue`: Pisca em azul para estado "Em Trânsito".
  * `dot-static-green`: Círculo verde estático para o estado "Entregue".
* **Botão "Mais Detalhes"**: Botão primário azul estilizado que encaminha o utilizador para a página de detalhes: `window.location.href = /public/order-details.html?uid={uid}`.

### 3.2. `CreateOrderModalComponent/index.jsx`
Mostra o formulário de criação de encomendas.
* **Props controladas**: Recebe a referência do formulário, controlo de submissão, eventos de alteração de campos e estados de validação do código postal.
* **Campos integrados**: Descrição, preço, código postal (com ícones de validação em tempo real), rua (atualizado por preenchimento automático), cidade, porta, andar, contacto telefónico e método de pagamento.

### 3.3. `MapModalComponent/index.jsx`
O modal que envolve o mapa interativo do Leaflet.
* **Campo de Pesquisa**: Uma barra de texto com botão para pesquisar e focar localizações diretamente em Portugal continental e ilhas.
* **Div `#mapRef`**: O nó DOM físico que serve de âncora para carregar o mapa Leaflet de forma nativa.

### 3.4. `OrderDetailsComponent/OrderTimeline/index.jsx`
Desenha a linha temporal gráfica (`Steps` do Antd) que sinaliza a evolução da encomenda nos 3 estados: *Submetida* ➡️ *Em Trânsito* ➡️ *Entregue*.

### 3.5. `OrderDetailsComponent/OrderDetailsInfo/index.jsx`
Cartão de informações gerais da encomenda.
* Trata a data formatada, o valor total, descrição longa de itens, telefone de contacto e método de pagamento.
* **Lógica do Link de Rastreio**: Caso o estado seja "Pendente", renderiza um aviso a vermelho indicando que o link está indisponível. Nos restantes estados, mostra um link hipertexto seguro apontando para o sistema de tracking.

### 3.6. `OrderDetailsComponent/OrderDetailsMap/index.jsx`
Cartão da morada que mostra a rua, porta, código postal e cidade e monta o contentor do mapa estático com o pin azul correspondente.

---

## 📦 4. Contentores React (`website/src/containers/`)

Os contentores atuam como os "cérebros" dos ecrãs, gerindo pedidos à API e as variáveis de estado.

### 4.1. `AuthContainer/login.jsx` e `register.jsx`
* **`login.jsx`**: Trata a autenticação chamando o serviço nativo do Netuno `/_auth`. Guarda o token JWT retornado no `localStorage` com a chave `user_session_token` e redireciona para a página principal.
* **`register.jsx`**: Recolhe os dados dos campos do formulário e submete para o serviço backend `/services/register`.

### 4.2. `HomeContainer/index.jsx`
O controlador principal da página Dashboard (`home.html`).
* **`useEffect` de Arranque**: Valida o token JWT através de `/services/check-session`. Se a sessão for válida, guarda o nome do utilizador e despoleta `loadOrders()` para ir buscar a lista de encomendas do cliente.
* **`handlePostalCodeChange`**: Deteta a digitação do código postal. Quando este atinge 8 caracteres (formato `XXXX-XXX`), efetua a chamada ao backend para autocompletar os campos de Rua e Cidade, atualizando o formulário.
* **`handleCreateOrder`**: Trata o fluxo de submissão interceptando o envio. Abre o modal do mapa com o geocoding da morada inserida para que o utilizador confirme obrigatoriamente a posição do pin no mapa de Portugal antes de gravar.

### 4.3. `OrderDetailsContainer/index.jsx`
O controlador da página de detalhes da encomenda (`order-details.html`).
* **Lógica de Entrada**: Lê o parâmetro `uid` do endereço URL. Se não existir, avisa o utilizador e redireciona de volta para o painel principal.
* **`initMap`**: Inicia e desenha a instância do mapa do Leaflet focando as coordenadas exatas (`latitude`, `longitude`) devolvidas pelo serviço backend `/services/order`.
* **Tratamento de Limpeza**: Garante que o mapa é totalmente removido da memória do browser ao sair da página, prevenindo problemas de desempenho.
