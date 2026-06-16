# ⚛️ Guia e Dicas Práticas de React (Deliberatis)

Este documento descreve os conceitos, hooks e padrões do **React** utilizados no desenvolvimento do projeto **Deliberatis**, servindo como guia de referência e conjunto de boas práticas para manter a consistência do código.

---

## 1. Conceitos React Utilizados no Projeto

### 1.1. Componentes Funcionais (Functional Components)
Toda a nossa interface é baseada em componentes funcionais. São funções de JavaScript que recebem parâmetros (chamados de `props`) e retornam a estrutura visual (JSX).

**Exemplo:**
```jsx
const MeuComponente = ({ titulo }) => {
  return <h1>{titulo}</h1>;
};
```

### 1.2. Modulação e Comunicação via `Props`
Dividimos ecrãs grandes em subcomponentes mais pequenos (ex: `OrdersTableComponent`, `OrderTimeline`). 
* Os dados e as funções de controlo de estado são passados do componente pai (o contentor principal) para os filhos através de **`props`**.
* Usamos **desestruturação de objetos** nos argumentos para aceder diretamente a essas propriedades de forma limpa:
  ```jsx
  const MapModal = ({ open, onCancel, mapRef }) => { ... }
  ```

---

## 2. Hooks Utilizados (O Coração do React)

Os *Hooks* são funções que permitem ligar o estado e o ciclo de vida do React dentro de componentes funcionais.

### 2.1. `useState` (Gestão de Estado local)
Guarda valores que, ao serem alterados, forçam o React a redesenhar a tela (re-render) com os novos dados.

**Onde foi usado:**
* Controlo de carregamento (`loading`, `submitting`).
* Armazenamento dos dados carregados do backend (`orders`, `order`).
* Visibilidade de modais (`isModalOpen`, `isMapModalOpen`).

**Exemplo Prático:**
```javascript
const [orders, setOrders] = useState([]); // Inicia com array vazio
// setOrders(novasEncomendas) atualiza o estado e redesenha a tabela
```

### 2.2. `useEffect` (Efeitos Colaterais e Ciclo de Vida)
Permite executar código em resposta a determinados eventos do ciclo de vida do componente: ao montar na tela, ao desmontar, ou quando alguma variável específica muda.

**Onde foi usado:**
* **Ao Carregar a Página (Mount)**: Validar a sessão do utilizador e puxar a lista de encomendas do backend logo que o componente é montado (usando a lista de dependências vazia `[]`).
* **Ao Mudar Variáveis**: Inicializar ou atualizar o mapa Leaflet apenas quando o modal do mapa é aberto (`isMapModalOpen`) ou quando os dados da encomenda são carregados (`order`).
* **Limpeza (Cleanup)**: Destruir a instância do mapa do Leaflet quando o componente sai da tela (`return () => mapInstance.remove()`) para evitar fugas de memória (memory leaks).

**Exemplo de Cleanup:**
```javascript
useEffect(() => {
  // Código executado ao montar ou alterar variáveis
  return () => {
    // Código de limpeza executado ao desmontar
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }
  };
}, []);
```

### 2.3. `useRef` (Referências Persistentes)
Permite referenciar um elemento físico do HTML (DOM) ou armazenar uma variável que **pode ser alterada sem forçar um re-render** da tela.

**Onde foi usado:**
* **Referência de Elemento**: Guardar o elemento `div` onde o Leaflet se vai desenhar (`<div ref={mapRef} />`).
* **Referência de Objeto**: Guardar a instância do mapa do Leaflet (`mapInstanceRef`) de forma a conseguirmos manipular o mapa em funções diferentes sem re-renderizar o componente.

**Exemplo Prático:**
```javascript
const mapRef = useRef(null); // Liga-se ao HTML via ref={mapRef}
const mapInstanceRef = useRef(null); // Guarda a instância do Leaflet
```

---

## 3. Integração com Ant Design (Antd)

Utilizámos a biblioteca **Ant Design** para acelerar o desenvolvimento com componentes visuais ricos:
* **`Form`**: Facilita a validação de dados em tempo real (ex: formato de telefone `^9\d{8}$`, e-mail, e campos obrigatórios). Através do hook `Form.useForm()`, conseguimos limpar ou ler os dados do formulário a qualquer momento.
* **`Table`**: Desenha tabelas de forma simples com paginação automática integrada.
* **`Steps`**: Cria a linha temporal nos detalhes da encomenda de forma nativa.

---

## 4. 💡 Dicas Úteis de React para o Futuro

### 4.1. Cuidado com Fugas de Memória com Mapas e Bibliotecas Externas
Sempre que usar bibliotecas de terceiros que manipulam diretamente o HTML (como Leaflet, Chart.js, D3), lembre-se de **destruir a instância no retorno (cleanup) do `useEffect`**. Caso contrário, se o utilizador entrar e sair da página várias vezes, a memória do browser pode esgotar.

### 4.2. Mantenha os Contentores (Containers) Leves
* **Containers (Pai)**: Devem focar-se na lógica de negócio (chamar a API, tratar erros, validar a sessão e gerir o estado principal).
* **Componentes (Filhos)**: Devem ser o mais burros/focados possíveis, recebendo propriedades e apenas desenhando a UI. Isto torna o código muito fácil de testar, reutilizar e ler (evitando ficheiros gigantes com mais de 300 linhas).

### 4.3. Regras de Ouro dos Hooks
1. **Apenas chame Hooks no topo**: Nunca coloque `useState` ou `useEffect` dentro de blocos condicionais (`if`) ou loops (`for`). O React baseia-se na ordem estrita de chamada para saber qual estado corresponde a qual variável.
2. **Dependências Corretas**: No `useEffect`, certifique-se de que coloca no array final todas as variáveis externas que usa dentro dele. Se quiser que rode apenas uma vez ao abrir a página, passe o array vazio `[]`.
