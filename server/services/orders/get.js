import { _db, _val, _out, _user, _header } from "@netuno/server-types";

try {
  // O Netuno valida automaticamente o token JWT enviado no Header Authorization.
  const userId = _user.id();
  let ordersList = _val.list();

  // Procuramos o perfil 'cliente' associado ao utilizador nativo autenticado
  const userQuery = _db.query(
    "SELECT id FROM cliente WHERE user_id = ? AND active = true",
    userId
  );

  if (userQuery.size() > 0) {
    const profileId = userQuery.get(0).getInt("id");

    // Procura as encomendas pertencentes ao cliente relacionando com a tabela estado_encomenda
    const ordersQuery = _db.query(
      "SELECT e.id, e.uid, e.lastchange_time, e.descricao, e.preco, s.nome AS estado " +
      "FROM encomenda e " +
      "LEFT JOIN estado_encomenda s ON e.estado_id = s.id " +
      "WHERE e.cliente_id = ? AND e.active = true " +
      "ORDER BY e.lastchange_time DESC",
      profileId
    );

    // Mapeia o resultado para uma lista
    for (let i = 0; i < ordersQuery.size(); i++) {
      const row = ordersQuery.get(i);
      ordersList.add(_val.map()
        .set("id", row.getInt("id"))
        .set("uid", row.getString("uid"))
        .set("data", row.getString("lastchange_time"))
        .set("descricao", row.getString("descricao"))
        .set("valor", row.getDouble("preco"))
        .set("estado", row.getString("estado"))
      );
    }
  }

  _out.json(_val.map()
    .set("result", true)
    .set("orders", ordersList)
  );

} catch (e) {
  _header.status(500);
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Erro ao obter encomendas: " + e.message)
  );
}
_out.close();
