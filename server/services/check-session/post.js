import { _db, _val, _out, _user } from "@netuno/server-types";

try {
  // O Netuno valida automaticamente o token JWT enviado no Header Authorization.
  // Se o serviço estiver a correr, significa que a sessão é válida e ativa.
  const userId = _user.id();

  // Procuramos o perfil correspondente na tabela customizada 'cliente'
  let userQuery = _db.query(
    "SELECT primeiro_nome, email FROM cliente WHERE user_id = ? AND active = true",
    userId
  );

  let isOperator = false;

  if (userQuery.size() === 0) {
    // Se não for cliente, procuramos na tabela 'operador'
    userQuery = _db.query(
      "SELECT primeiro_nome, email FROM operador WHERE user_id = ? AND active = true",
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
      .set("email", user.getString("email"))
      .set("primeiro_nome", user.getString("primeiro_nome"))
      .set("group", isOperator ? "operador" : "cliente")
    );
  } else {
    // Fallback caso o utilizador tenha sido criado no painel de administração e não esteja em nenhuma das tabelas customizadas
    const nativeName = _user.getString("name");
    const nativeEmail = _user.getString("mail");
    const firstName = nativeName ? nativeName.split(" ")[0] : "Admin";

    _out.json(_val.map()
      .set("result", true)
      .set("email", nativeEmail || "")
      .set("primeiro_nome", firstName)
      .set("group", "cliente")
    );
  }
} catch (e) {
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Erro ao validar sessão: " + e.message)
  );
}
_out.close();
