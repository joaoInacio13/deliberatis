import { _db, _val, _req, _out, _crypto } from "@netuno/server-types";

// Obtém os parâmetros do pedido
const email = _req.getString("email");
const password = _req.getString("password");

// Valida campos obrigatórios
if (!email || !password) {
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Email e password são obrigatórios.")
  );
  _out.close();
}

try {
  // Procura o utilizador ativo pelo email
  const userQuery = _db.query(
    "SELECT id, password, primeiro_nome FROM utilizador WHERE email = ? AND active = true",
    email
  );

  if (userQuery.size() === 0) {
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Email ou password incorretos.")
    );
    _out.close();
  }

  const user = userQuery.get(0);
  const storedHash = user.getString("password");

  // Valida a password gerando o hash com o mesmo salt guardado na BD
  const checkHash = _crypto.bcryptHash(password, storedHash);

  if (checkHash === storedHash) {
    _out.json(_val.map()
      .set("result", true)
      .set("primeiro_nome", user.getString("primeiro_nome"))
    );
  } else {
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Email ou password incorretos.")
    );
  }
} catch (e) {
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Erro ao processar o login: " + e.message)
  );
}
