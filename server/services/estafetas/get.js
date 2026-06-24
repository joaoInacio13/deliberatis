import { _db, _val, _out, _header } from "@netuno/server-types";

try {
  const query = _db.query(
    "SELECT e.id, e.uid, e.nome, e.telefone, e.data_nascimento, e.matricula, e.latitude, e.longitude, " +
    "v.nome AS veiculo, v.id AS veiculo_id, v.velocidade AS velocidade, s.nome AS estado, s.id AS estado_id " +
    "FROM estafeta e " +
    "LEFT JOIN estafeta_veiculo v ON e.veiculo_id = v.id " +
    "LEFT JOIN estafeta_estado s ON e.estado_id = s.id " +
    "WHERE e.active = true " +
    "ORDER BY e.nome ASC"
  );

  const list = _val.list();
  for (let i = 0; i < query.size(); i++) {
    const row = query.get(i);
    list.add(_val.map()
      .set("id", row.getInt("id"))
      .set("uid", row.getString("uid"))
      .set("nome", row.getString("nome"))
      .set("telefone", row.getString("telefone"))
      .set("data_nascimento", row.getString("data_nascimento"))
      .set("matricula", row.getString("matricula"))
      .set("latitude", row.getDouble("latitude"))
      .set("longitude", row.getDouble("longitude"))
      .set("veiculo", row.getString("veiculo"))
      .set("veiculo_id", row.getInt("veiculo_id"))
      .set("velocidade", row.getInt("velocidade"))
      .set("estado", row.getString("estado"))
      .set("estado_id", row.getInt("estado_id"))
    );
  }

  _out.json(_val.map()
    .set("result", true)
    .set("couriers", list)
  );
} catch (e) {
  _header.status(500);
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Erro ao carregar estafetas: " + e.message)
  );
}
_out.close();
