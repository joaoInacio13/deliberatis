# Guia de Configuração do Ambiente de Desenvolvimento Remoto (WSL -> Contentor Netuno)

Este guia documenta todos os passos realizados para configurar, ligar e correr o projeto **deliberatis** no contentor de desenvolvimento remoto a partir do WSL.

---

## 1. Configuração do Atalho SSH no WSL

Para evitar digitar o comando de ligação SSH longo com todas as portas e utilizadores, configurámos um atalho no teu WSL.

No ficheiro `~/.ssh/config` do teu WSL local, foi adicionada a seguinte configuração:
```text
Host netuno-dev
    HostName joao-inacio.dev.netuno.org
    User joao-inacio
    Port 23522
```

Graças a isto, para te ligares ao contentor a partir do terminal do WSL, basta correres:
```bash
ssh netuno-dev
```
*Palavra-passe do SSH:* `Pqhg8gyzZmq7VXGn`

---

## 2. Instalação do Netuno no Contentor Remoto

Uma vez dentro da consola do contentor remoto, realizámos a instalação limpa da versão experimental/teste do Netuno:

1. Criação e entrada na pasta da plataforma:
   ```bash
   mkdir -p netuno && cd netuno
   ```
2. Download do instalador da versão `testing`:
   ```bash
   curl -L https://github.com/netuno-org/platform/releases/download/testing/netuno-setup.jar -o netuno-setup.jar
   ```
3. Execução da instalação:
   ```bash
   java -jar netuno-setup.jar install version=testing
   ```

---

## 3. Clonagem do Projeto e Configuração Local

O contentor precisa de ter uma cópia do código do teu projeto para o conseguir executar.

1. Navegar até à pasta de aplicações do Netuno no contentor remoto:
   ```bash
   cd ~/netuno/apps/
   ```
2. Clonar o repositório do GitHub:
   ```bash
   git clone https://github.com/joaoInacio13/deliberatis.git
   ```
3. Criar o ficheiro de configuração local de desenvolvimento:
   * No editor, criámos o ficheiro `netuno/apps/deliberatis/config/_development.json` com as definições locais do banco de dados H2, tokens JWT e configurações de execução dos watchers do Vite/Bun.

---

## 4. Inicialização do VS Code Server (IDE no Browser)

Para editar ficheiros diretamente no contentor a partir do teu browser:

1. Executar o comando na raiz (`~`) do contentor:
   ```bash
   cd ~
   code
   ```
2. Aceder ao editor via browser:
   🔗 [http://joao-inacio.dev.netuno.org:23555](http://joao-inacio.dev.netuno.org:23555)
3. Fazer login com a password gerada. Podes sempre consultar a password configurada correndo:
   ```bash
   cat ~/.config/code-server/config.yaml
   ```

> **Dica:** Se o VS Code Server ficar travado com o erro `EADDRINUSE`, podes forçar a paragem dos processos antigos correndo:
> `pkill -9 -f code-server` e depois executar `code` novamente.

---

## 5. Iniciar o Netuno e Executar a Aplicação

Para colocar o projeto online e acessível no browser:

1. No terminal integrado do VS Code (ou na consola do SSH), navegar até à pasta do Netuno:
   ```bash
   cd ~/netuno
   ```
2. Iniciar o servidor especificando a aplicação `deliberatis`:
   ```bash
   ./netuno server app=deliberatis
   ```
   *O Netuno irá descarregar as dependências e iniciar os servidores do frontend (Vite) de forma automática.*

---

## 6. Portas de Acesso Web

Com o servidor Netuno ativo no contentor, podes aceder aos seguintes links no teu browser:

* **Painel de Administração (Netuno Backoffice):**
  [http://joao-inacio.dev.netuno.org:23590](http://joao-inacio.dev.netuno.org:23590) (Porta externa correspondente à 9000 interna)
* **Frontend do Website (Vite):**
  [http://joao-inacio.dev.netuno.org:23530](http://joao-inacio.dev.netuno.org:23530) (Porta externa correspondente à 3000 interna)

---

## 7. Fluxo de Trabalho Recomendado (Colaboração com a IA)

Como eu (a IA) estou a correr no teu WSL local, o nosso fluxo de desenvolvimento ideal será:

```mermaid
graph LR
    A[Eu edito o código no WSL] --> B[Tu fazes Git Commit & Push para o GitHub]
    B --> C[No terminal do VS Code Online no Contentor, fazes Git Pull]
    C --> D[O Netuno atualiza e mostra as mudanças online!]
```
