import { _db, _val, _out, _header } from "@netuno/server-types";

try {
  const vehiclesQuery = _db.query(
    "SELECT id, nome, velocidade FROM estafeta_veiculo WHERE active = true ORDER BY nome ASC"
  );
  
  const statesQuery = _db.query(
    "SELECT id, nome FROM estafeta_estado WHERE active = true ORDER BY nome ASC"
  );

  const vehicles = _val.list();
  for (let i = 0; i < vehiclesQuery.size(); i++) {
    const row = vehiclesQuery.get(i);
    vehicles.add(_val.map()
      .set("id", row.getInt("id"))
      .set("nome", row.getString("nome"))
      .set("velocidade", row.getInt("velocidade"))
    );
  }

  const states = _val.list();
  for (let i = 0; i < statesQuery.size(); i++) {
    const row = statesQuery.get(i);
    states.add(_val.map()
      .set("id", row.getInt("id"))
      .set("nome", row.getString("nome"))
    );
  }

  _out.json(_val.map()
    .set("result", true)
    .set("vehicles", vehicles)
    .set("states", states)
  );
} catch (e) {
  _header.status(500);
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Erro ao carregar metadados dos estafetas: " + e.message)
  );
}
_out.close();
