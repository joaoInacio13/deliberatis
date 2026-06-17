import { _db, _val, _out, _user, _header } from "@netuno/server-types";

try {
  // O Netuno valida automaticamente o token JWT enviado no Header Authorization.
  const userId = _user.id();
  let ordersList = _val.list();

  // Procuramos o perfil correspondente na tabela customizada 'cliente'
  let userQuery = _db.query(
    "SELECT id FROM cliente WHERE user_id = ? AND active = true",
    userId
  );
  let isOperator = false;
  let profileId = null;

  if (userQuery.size() > 0) {
    profileId = userQuery.get(0).getInt("id");
  } else {
    // Se não for cliente, verifica se é um operador
    userQuery = _db.query(
      "SELECT id FROM operador WHERE user_id = ? AND active = true",
      userId
    );
    if (userQuery.size() > 0) {
      profileId = userQuery.get(0).getInt("id");
      isOperator = true;
    }
  }

  if (profileId !== null) {
    let ordersQuery;
    if (isOperator) {
      // O operador tem acesso a todas as encomendas pendentes e respetivos dados do cliente
      ordersQuery = _db.query(
        "SELECT e.id, e.uid, e.lastchange_time, e.descricao, e.preco, e.porta, e.andar, e.telefone, e.observacoes, " +
        "s.nome AS estado, p.nome AS pagamento, cp.codigo AS codigo_postal, cp.rua, c.nome AS cidade, " +
        "cl.primeiro_nome AS cliente_primeiro_nome, cl.ultimo_nome AS cliente_ultimo_nome, cl.email AS cliente_email " +
        "FROM encomenda e " +
        "LEFT JOIN estado_encomenda s ON e.estado_id = s.id " +
        "LEFT JOIN pagamento p ON e.pagamento_id = p.id " +
        "LEFT JOIN codigo_postal cp ON e.codigo_postal_id = cp.id " +
        "LEFT JOIN cidade c ON cp.cidade_id = c.id " +
        "LEFT JOIN cliente cl ON e.cliente_id = cl.id " +
        "WHERE e.active = true AND s.nome = 'Pendente' " +
        "ORDER BY e.lastchange_time DESC"
      );
    } else {
      // O cliente apenas tem acesso às suas próprias encomendas
      ordersQuery = _db.query(
        "SELECT e.id, e.uid, e.lastchange_time, e.descricao, e.preco, e.porta, e.andar, e.telefone, e.observacoes, " +
        "s.nome AS estado, p.nome AS pagamento, cp.codigo AS codigo_postal, cp.rua, c.nome AS cidade " +
        "FROM encomenda e " +
        "LEFT JOIN estado_encomenda s ON e.estado_id = s.id " +
        "LEFT JOIN pagamento p ON e.pagamento_id = p.id " +
        "LEFT JOIN codigo_postal cp ON e.codigo_postal_id = cp.id " +
        "LEFT JOIN cidade c ON cp.cidade_id = c.id " +
        "WHERE e.cliente_id = ? AND e.active = true " +
        "ORDER BY e.lastchange_time DESC",
        profileId
      );
    }

    // Mapeia o resultado para uma lista
    for (let i = 0; i < ordersQuery.size(); i++) {
      const row = ordersQuery.get(i);
      const mapItem = _val.map()
        .set("id", row.getInt("id"))
        .set("uid", row.getString("uid"))
        .set("data", row.getString("lastchange_time"))
        .set("descricao", row.getString("descricao"))
        .set("valor", row.getDouble("preco"))
        .set("estado", row.getString("estado"))
        .set("porta", row.getString("porta"))
        .set("andar", row.getString("andar"))
        .set("telefone", row.getString("telefone"))
        .set("observacoes", row.getString("observacoes") || "")
        .set("pagamento", row.getString("pagamento"))
        .set("codigo_postal", row.getString("codigo_postal"))
        .set("rua", row.getString("rua"))
        .set("cidade", row.getString("cidade"));

      if (isOperator) {
        const cNome = (row.getString("cliente_primeiro_nome") || "") + " " + (row.getString("cliente_ultimo_nome") || "");
        mapItem.set("cliente_nome", cNome.trim() || "N/A")
               .set("cliente_email", row.getString("cliente_email") || "N/A");
      }
      ordersList.add(mapItem);
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
