import { _db, _val, _out, _user } from "@netuno/server-types";

try {
  // O Netuno valida automaticamente o token JWT enviado no Header Authorization.
  // Se o serviço estiver a correr, significa que a sessão é válida e ativa.
  const userId = _user.id();

  // Procuramos o perfil correspondente na tabela customizada 'cliente'
  const userQuery = _db.query(
    "SELECT primeiro_nome, email FROM cliente WHERE user_id = ? AND active = true",
    userId
  );

  if (userQuery.size() > 0) {
    const user = userQuery.get(0);
    _out.json(_val.map()
      .set("result", true)
      .set("email", user.getString("email"))
      .set("primeiro_nome", user.getString("primeiro_nome"))
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
    .set("error", "Erro ao validar sessão: " + e.message)
  );
}
_out.close();
