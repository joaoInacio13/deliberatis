import { _db, _val, _req, _out, _user } from "@netuno/server-types";

try {
  // O Netuno valida o token JWT de forma transparente
  const userId = _user.id();

  // Procuramos o perfil 'cliente' associado ao utilizador nativo autenticado
  const userQuery = _db.query(
    "SELECT id FROM cliente WHERE user_id = ? AND active = true",
    userId
  );

  if (userQuery.size() === 0) {
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Cliente não encontrado.")
    );
  } else {
    const profileId = userQuery.get(0).getInt("id");

    // Obtém parâmetros da encomenda enviados no formulário
    const descricao = _req.getString("descricao");
    const precoString = _req.getString("preco");
    const codigoPostal = _req.getString("codigo_postal");
    const porta = _req.getString("porta");
    const andar = _req.getString("andar");
    const observacoes = _req.getString("observacoes");
    const telefone = _req.getString("telefone");
    const pagamento = _req.getString("pagamento");
    const toTitleCase = (str) => {
      if (!str) return "";
      return str.trim()
        .toLowerCase()
        .split(' ')
        .filter((w) => w.length > 0)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    };
    const rua = toTitleCase(_req.getString("rua"));
    const cidade = toTitleCase(_req.getString("cidade"));

    // Validação dos campos obrigatórios
    if (!descricao || !precoString || !codigoPostal || !porta || !telefone || !pagamento) {
      _out.json(_val.map()
        .set("result", false)
        .set("error", "Por favor, preenche todos os campos obrigatórios.")
      );
    } else if (!/^\d{4}-\d{3}$/.test(codigoPostal)) {
      _out.json(_val.map()
        .set("result", false)
        .set("error", "O código postal indicado é inválido (deve ser no formato XXXX-XXX).")
      );
    } else if (!/^9\d{8}$/.test(telefone)) {
      _out.json(_val.map()
        .set("result", false)
        .set("error", "O número de telefone deve ser português (começar por 9) e ter exatamente 9 dígitos.")
      );
    } else {
      const preco = parseFloat(precoString);
      if (isNaN(preco) || preco <= 0) {
        _out.json(_val.map()
          .set("result", false)
          .set("error", "O preço indicado é inválido.")
        );
      } else {
        // 1. Resolver/Criar o ID de Código Postal (Cache local ou consulta na API)
        const cpQuery = _db.query("SELECT id FROM codigo_postal WHERE codigo = ? AND active = true", codigoPostal);
        let codigoPostalId = null;
        if (cpQuery.size() > 0) {
          codigoPostalId = cpQuery.get(0).getInt("id");
        }

        // FALLBACK: Se a API falhou mas o frontend enviou a rua e a cidade preenchidos manualmente
        if (!codigoPostalId && rua && cidade) {
          try {
            let cidadeId = null;
            const cidadeQuery = _db.query("SELECT id FROM cidade WHERE nome = ? AND active = true", cidade);
            if (cidadeQuery.size() > 0) {
              cidadeId = cidadeQuery.get(0).getInt("id");
            } else {
              cidadeId = _db.insert("cidade", _val.map().set("nome", cidade).set("active", true));
            }

            codigoPostalId = _db.insert("codigo_postal", _val.map()
              .set("codigo", codigoPostal)
              .set("rua", rua)
              .set("cidade_id", cidadeId)
              .set("active", true)
            );
          } catch (e) {
            // Ignorar falhas na inserção manual
          }
        }

        if (!codigoPostalId) {
          _out.json(_val.map()
            .set("result", false)
            .set("error", "Não foi possível validar o código postal indicado.")
          );
        } else {
          // Procura o ID do estado "Pendente" na tabela estado_encomenda
          const estadoQuery = _db.query("SELECT id FROM estado_encomenda WHERE nome = 'Pendente'");
          let estadoId = 1;
          if (estadoQuery.size() > 0) {
            estadoId = estadoQuery.get(0).getInt("id");
          }

          // Procura o ID do método de pagamento na tabela pagamento
          const pagamentoQuery = _db.query("SELECT id FROM pagamento WHERE nome = ?", pagamento);
          let pagamentoId = 1;
          if (pagamentoQuery.size() > 0) {
            pagamentoId = pagamentoQuery.get(0).getInt("id");
          }

          // Obtém coordenadas exatas passadas pelo frontend
          const latitudeString = _req.getString("latitude");
          const longitudeString = _req.getString("longitude");
          const latitude = latitudeString ? parseFloat(latitudeString) : 0.0;
          const longitude = longitudeString ? parseFloat(longitudeString) : 0.0;

          // Insere a nova encomenda associada ao cliente
          const id = _db.insert(
            "encomenda",
            _val.map()
              .set("cliente_id", profileId)
              .set("descricao", descricao)
              .set("preco", preco)
              .set("codigo_postal_id", codigoPostalId)
              .set("porta", porta)
              .set("andar", andar || "")
              .set("observacoes", observacoes || "")
              .set("telefone", telefone)
              .set("pagamento_id", pagamentoId)
              .set("estado_id", estadoId)
              .set("latitude", latitude)
              .set("longitude", longitude)
              .set("active", true)
          );

          _out.json(_val.map()
            .set("result", true)
            .set("id", id)
          );
        }
      }
    }
  }
} catch (e) {
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Erro ao criar encomenda: " + e.message)
  );
}
_out.close();
