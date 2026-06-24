import { _db, _val, _req, _out, _header } from "@netuno/server-types";

try {
  const id = _req.getInt("id");
  const targetEstado = _req.getString("estado"); // Expected: "Disponível" or "Indisponível"

  if (!id || !targetEstado) {
    _header.status(400);
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Faltam parâmetros obrigatórios (id, estado).")
    );
    _out.close();
    throw new Error("Validation failed");
  }

  // Restrict transitions only to Available or Unavailable
  if (targetEstado !== "Disponível" && targetEstado !== "Indisponível") {
    _header.status(400);
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Apenas é permitido alterar o estado para 'Disponível' ou 'Indisponível'.")
    );
    _out.close();
    throw new Error("Validation failed");
  }

  // Get current courier details and state
  const currentCourier = _db.query(
    "SELECT e.id, s.nome AS estado_nome " +
    "FROM estafeta e " +
    "LEFT JOIN estafeta_estado s ON e.estado_id = s.id " +
    "WHERE e.id = ? AND e.active = true",
    id
  );

  if (currentCourier.size() === 0) {
    _header.status(404);
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Estafeta não encontrado ou inativo.")
    );
    _out.close();
    throw new Error("Validation failed");
  }

  const currentEstado = currentCourier.get(0).getString("estado_nome");

  // Prevent changing state if they are currently on duty/delivering
  if (currentEstado !== "Disponível" && currentEstado !== "Indisponível") {
    _header.status(400);
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Não é possível alterar manualmente o estado de um estafeta que se encontra em serviço (" + currentEstado + ").")
    );
    _out.close();
    throw new Error("Validation failed");
  }

  // Fetch the target state id
  const targetStateQuery = _db.query(
    "SELECT id FROM estafeta_estado WHERE nome = ? AND active = true",
    targetEstado
  );

  if (targetStateQuery.size() === 0) {
    _header.status(500);
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Estado de destino '" + targetEstado + "' não encontrado nos registos.")
    );
    _out.close();
    throw new Error("Validation failed");
  }

  const targetStateId = targetStateQuery.get(0).getInt("id");

  // Perform the update
  _db.execute(
    "UPDATE estafeta SET estado_id = ? WHERE id = ?",
    targetStateId,
    id
  );

  _out.json(_val.map()
    .set("result", true)
  );

} catch (e) {
  if (e.message !== "Validation failed") {
    _header.status(500);
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Erro interno ao atualizar estado: " + e.message)
    );
  }
}
_out.close();
