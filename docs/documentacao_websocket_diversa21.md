# Documentação da Infraestrutura WebSocket no Diversa21

Esta documentação detalha a arquitetura e implementação da infraestrutura de WebSockets configurada no backend do **Diversa21**. Serve como guia de referência técnica para explicar a solução à equipa e guiar futuras integrações em tempo real (como chats ou notificações imediatas).

---

## 1. Visão Geral: O que é o WebSocket?

Tradicionalmente, a comunicação web usa o protocolo **HTTP**, que funciona num modelo de **Pedido/Resposta** unidirecional:
1. O browser pede dados ao servidor.
2. O servidor responde e a ligação é fechada.
3. O servidor nunca consegue contactar o browser por iniciativa própria (Push).

O **WebSocket** estabelece uma **ligação TCP persistente e bidirecional** (full-duplex). Após o aperto de mão (handshake) inicial, o canal fica aberto indefinidamente. Isto permite que:
* O cliente envie dados a qualquer momento sem abrir novas conexões.
* O servidor envie notificações em tempo real de forma imediata (Push), reduzindo a latência a milissegundos e eliminando a necessidade de *polling* constante.

---

## 2. O Desafio do Estado das Sessões

Por padrão, a ligação WebSocket identifica cada cliente através de um **ID de Sessão único** (ex: `03867e22-5338-49a5-86de-076ddccd371b`) gerado em memória pelo servidor Netuno. 
No entanto, o servidor não sabe a qual utilizador (`people`) pertence aquela ligação.

Para resolver este mapeamento, implementámos um mecanismo híbrido em base de dados e memória que regista quais sessões WebSocket pertencem a quais utilizadores em cada instante.

---

## 3. Arquitetura e Componentes Implementados

A nossa infraestrutura de WebSockets é composta por 5 partes integradas:

```
[Cliente (Browser)]
       │ (ws://.../ws/private/?auth=JWT)
       ▼
┌──────────────────────────────────────────────┐
│             Servidor Netuno                  │
│  (Valida JWT e encaminha para o Endpoint)    │
└──────────────────────┬───────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
 ┌───────────┐                   ┌───────────┐
 │  post.js  │                   │ delete.js │
 │ (Ao ligar)│                   │(Ao fechar)│
 └─────┬─────┘                   └─────┬─────┘
       │                               │
       │ (Regista na BD)               │ (Remove da BD)
       ▼                               ▼
 ┌───────────────────────────────────────────┐
 │       Tabela "people_ws_session"          │
 └───────────────────────────────────────────┘
```

### A. Tabela de Sessões (`people_ws_session`)
Criada no backoffice do Netuno sob a tabela pai `people`. Contém:
* `people_id` (Chave estrangeira): Associa a ligação ao ID do utilizador logado.
* `session_id` (Texto): O ID único da sessão WebSocket (`_ws.sessionId()`).

### B. Configurações (`sample.json` / `_development.json`)
Adicionámos duas configurações cruciais:
1. **Definições do Endpoint (`ws.endpoints`):** Mapeia o endereço público `/ws/private` para a execução dos scripts de ciclo de vida localizados em `/services/ws/private/`.
2. **Definições de Frontend (`settings.websocket`):** Disponibiliza de forma dinâmica a URL de ligação do WebSocket local (`ws://localhost:9000/ws/private/`) e o prefixo de serviços para o cliente React.
3. **Cron Job (`cron.jobs`):** Agenda a execução periódica do serviço de limpeza de sessões órfãs (`ws-sessions`).

### C. Scripts de Ciclo de Vida (Serviços WS)
Localizados na pasta `server/services/ws/private/`:
* **`post.js` (Conexão Iniciada):**
  Quando o utilizador abre a ligação passando o token JWT (`?auth=TOKEN`), o Netuno valida-o e preenche o `_user.id`. O script lê a pessoa logada, obtém o seu ID e insere na tabela `people_ws_session` o par `(people_id, session_id)`. Se o utilizador não for válido, a ligação é fechada por segurança.
* **`delete.js` (Conexão Terminada):**
  Quando o browser fecha ou desliga o WebSocket, o script executa imediatamente e remove a linha da base de dados correspondente àquele `session_id`.
* **`get.js` e `put.js`:** Stubs em falta para permitir o roteamento do ciclo de vida completo do Netuno.

### D. Limpeza de Sessões Órfãs (Job `ws-sessions.js`)
Se um utilizador perder a ligação à internet repentinamente ou a máquina ir abaixo, o ciclo `delete.js` pode não ser executado. Para evitar acumulação de dados obsoletos na base de dados:
* Criámos o Cron Job [ws-sessions.js](file:///home/joao_inacio/netuno/apps/diversa21/server/services/jobs/ws-sessions.js) que roda a cada 15 minutos.
* Ele lê todas as sessões guardadas em `people_ws_session` e verifica se ainda são válidas em memória usando `_ws.session(session_id)`. Se a ligação já não existir (retornar `null`), limpa o registo obsoleto da BD.

### E. Métodos Globais para Notificação (`people.js`)
Para facilitar o disparo de mensagens para os utilizadores a partir de qualquer ponto do backend, implementámos dois helpers na biblioteca core de pessoas:
* **`people.wsSendService(dbPeople, message)`**: Executa um serviço e envia a resposta para todas as sessões ativas dessa pessoa.
* **`people.wsSendAsService(dbPeople, message)`**: Formata uma mensagem no padrão de resposta de serviço e envia-a diretamente, ativando os listeners registados no frontend.

---

## 4. Exemplo Prático de Utilização no Código Backend

Se quiseres enviar uma notificação de "Novo Amigo Aceite" em tempo real para o utilizador de destino:

```javascript
import people from "#core/lib/people.js";
import { _val } from "@netuno/server-types";

// 1. Obténs o registo da base de dados do utilizador de destino (dbPeopleTo)
// 2. Chamas o helper de WebSocket passando os dados:
people.wsSendAsService(
  dbPeopleTo,
  _val.map()
    .set("service", "friend/status/changed")
    .set("content", _val.map()
      .set("uid", dbPeopleLogged.getString("uid"))
      .set("online", true)
    )
);
```

Desta forma, se o utilizador de destino tiver uma aba aberta com ligação ativa, a notificação irá aparecer instantaneamente na sua interface sem necessidade de qualquer recarregamento de página.
