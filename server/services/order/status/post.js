import { _db, _val, _out, _user, _header, _req } from "@netuno/server-types";

try {
  const userId = _user.id();
  const uid = _req.getString("uid");
  const estado = _req.getString("estado");

  if (!uid || !estado) {
    _header.status(400);
    _out.json(_val.map().set("result", false).set("error", "Código único da encomenda e o novo estado são obrigatórios."));
  } else {
    // 1. Verifica se o utilizador autenticado é um operador
    const operatorQuery = _db.query(
      "SELECT id FROM operador WHERE user_id = ? AND active = true",
      userId
    );

    if (operatorQuery.size() === 0) {
      _header.status(403);
      _out.json(_val.map().set("result", false).set("error", "Apenas operadores podem atualizar o estado das encomendas."));
    } else {
      // 2. Procura a encomenda pelo UID
      const orderQuery = _db.query(
        "SELECT id FROM encomenda WHERE uid = ? AND active = true",
        uid
      );

      if (orderQuery.size() === 0) {
        _header.status(404);
        _out.json(_val.map().set("result", false).set("error", "Encomenda não encontrada."));
      } else {
        const orderId = orderQuery.get(0).getInt("id");

        // 3. Procura o ID do estado correspondente
        const statusQuery = _db.query(
          "SELECT id FROM encomenda_estado WHERE nome = ? AND active = true",
          estado
        );

        if (statusQuery.size() === 0) {
          _header.status(400);
          _out.json(_val.map().set("result", false).set("error", "Estado de encomenda inválido: " + estado));
        } else {
          const statusId = statusQuery.get(0).getInt("id");

          // 4. Atualiza o estado da encomenda
          _db.execute(
            "UPDATE encomenda SET estado_id = ? WHERE id = ?",
            statusId, orderId
          );

          _out.json(_val.map()
            .set("result", true)
            .set("message", "Estado da encomenda atualizado com sucesso.")
          );
        }
      }
    }
  }
} catch (e) {
  _header.status(500);
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Erro ao atualizar estado da encomenda: " + e.message)
  );
}
_out.close();
