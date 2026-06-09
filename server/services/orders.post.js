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
    const localizacao = _req.getString("localizacao");
    const observacoes = _req.getString("observacoes");
    const telefone = _req.getString("telefone");
    const pagamento = _req.getString("pagamento");

    // Validação dos campos obrigatórios
    if (!descricao || !precoString || !localizacao || !telefone || !pagamento) {
      _out.json(_val.map()
        .set("result", false)
        .set("error", "Por favor, preenche todos os campos obrigatórios.")
      );
    } else {
      const preco = parseFloat(precoString);
      if (isNaN(preco) || preco <= 0) {
        _out.json(_val.map()
          .set("result", false)
          .set("error", "O preço indicado é inválido.")
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

        // Insere a nova encomenda associada ao cliente
        const id = _db.insert(
          "encomenda",
          _val.map()
            .set("cliente_id", profileId)
            .set("descricao", descricao)
            .set("preco", preco)
            .set("localizacao", localizacao)
            .set("observacoes", observacoes || "")
            .set("telefone", telefone)
            .set("pagamento_id", pagamentoId)
            .set("estado_id", estadoId)
            .set("active", true)
        );

        _out.json(_val.map()
          .set("result", true)
          .set("id", id)
        );
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
