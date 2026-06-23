import { _db, _val, _req, _out, _user, _header } from "@netuno/server-types";

try {
  const userId = _user.id();
  const uid = _req.getString("uid");
  const targetStatus = _req.getString("status"); // "Em Trânsito" or "Rejeitada"
  const estafetaId = _req.getInt("estafeta_id"); // required if "Em Trânsito"
  const motivoRejeicao = _req.getString("motivo_rejeicao"); // required if "Rejeitada"

  if (!uid || !targetStatus) {
    _header.status(400);
    _out.json(_val.map().set("result", false).set("error", "Código da encomenda e estado são obrigatórios."));
    _out.close();
    throw new Error("Validation failed");
  }

  // 1. Verify if user is an operator
  const operatorQuery = _db.query(
    "SELECT id FROM operador WHERE user_id = ? AND active = true",
    userId
  );
  if (operatorQuery.size() === 0) {
    _header.status(403);
    _out.json(_val.map().set("result", false).set("error", "Apenas operadores podem alterar o estado das encomendas."));
    _out.close();
    throw new Error("Validation failed");
  }

  // 2. Fetch the order details to ensure it exists and is currently Pendente
  const orderQuery = _db.query(
    "SELECT e.id, s.nome AS estado FROM encomenda e " +
    "LEFT JOIN encomenda_estado s ON e.estado_id = s.id " +
    "WHERE e.uid = ? AND e.active = true",
    uid
  );
  if (orderQuery.size() === 0) {
    _header.status(404);
    _out.json(_val.map().set("result", false).set("error", "Encomenda não encontrada."));
    _out.close();
    throw new Error("Validation failed");
  }

  const orderRow = orderQuery.get(0);
  if (orderRow.getString("estado") !== "Pendente") {
    _header.status(400);
    _out.json(_val.map().set("result", false).set("error", "Apenas encomendas em estado 'Pendente' podem ser decididas."));
    _out.close();
    throw new Error("Validation failed");
  }

  // 3. Find the target status ID (using encomenda_estado)
  const statusQuery = _db.query(
    "SELECT id FROM encomenda_estado WHERE nome = ? AND active = true",
    targetStatus
  );
  if (statusQuery.size() === 0) {
    _header.status(400);
    _out.json(_val.map().set("result", false).set("error", "Estado de destino inválido."));
    _out.close();
    throw new Error("Validation failed");
  }
  const targetStatusId = statusQuery.get(0).getInt("id");

  // 4. Validate decision-specific parameters and execute update
  const updateMap = _val.map()
    .set("estado_id", targetStatusId);

  if (targetStatus === "Em Trânsito") {
    if (!estafetaId) {
      _header.status(400);
      _out.json(_val.map().set("result", false).set("error", "Deve selecionar um estafeta para colocar a encomenda em trânsito."));
      _out.close();
      throw new Error("Validation failed");
    }
    
    // Verify estafeta exists and is active
    const estafetaQuery = _db.query("SELECT id FROM estafeta WHERE id = ? AND active = true", estafetaId);
    if (estafetaQuery.size() === 0) {
      _header.status(400);
      _out.json(_val.map().set("result", false).set("error", "Estafeta selecionado inválido."));
      _out.close();
      throw new Error("Validation failed");
    }

    updateMap.set("estafeta_id", estafetaId);
  } else if (targetStatus === "Rejeitada") {
    if (!motivoRejeicao || motivoRejeicao.trim() === "") {
      _header.status(400);
      _out.json(_val.map().set("result", false).set("error", "Deve fornecer um motivo para rejeitar a encomenda."));
      _out.close();
      throw new Error("Validation failed");
    }
    updateMap.set("motivo_rejeicao", motivoRejeicao);
  } else {
    _header.status(400);
    _out.json(_val.map().set("result", false).set("error", "Decisão não reconhecida."));
    _out.close();
    throw new Error("Validation failed");
  }

  // Perform update in encomenda table
  _db.update("encomenda", orderRow.getInt("id"), updateMap);

  _out.json(_val.map()
    .set("result", true)
  );

} catch (e) {
  if (e.message !== "Validation failed") {
    _header.status(500);
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Erro ao atualizar estado da encomenda: " + e.message)
    );
  }
}
_out.close();
