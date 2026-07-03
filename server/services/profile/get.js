import { _db, _val, _out, _user } from "@netuno/server-types";

try {
  const userId = _user.id();

  // Search first in custom 'cliente' table
  let userQuery = _db.query(
    "SELECT primeiro_nome, ultimo_nome, email, data_de_nascimento FROM cliente WHERE user_id = ? AND active = true",
    userId
  );

  let isOperator = false;

  if (userQuery.size() === 0) {
    // Search in custom 'operador' table
    userQuery = _db.query(
      "SELECT primeiro_nome, ultimo_nome, email, data_de_nascimento FROM operador WHERE user_id = ? AND active = true",
      userId
    );
    if (userQuery.size() > 0) {
      isOperator = true;
    }
  }

  if (userQuery.size() > 0) {
    const user = userQuery.get(0);
    _out.json(_val.map()
      .set("result", true)
      .set("primeiro_nome", user.getString("primeiro_nome"))
      .set("ultimo_nome", user.getString("ultimo_nome"))
      .set("email", user.getString("email"))
      .set("data_de_nascimento", user.getString("data_de_nascimento"))
      .set("group", isOperator ? "operador" : "cliente")
    );
  } else {
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Utilizador não encontrado.")
    );
  }
} catch (e) {
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Erro ao carregar o perfil: " + e.message)
  );
}
_out.close();
