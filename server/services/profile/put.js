import { _db, _val, _req, _out, _user, _crypto } from "@netuno/server-types";

try {
  const userId = _user.id();

  const primeiroNome = _req.getString("primeiro_nome");
  const ultimoNome = _req.getString("ultimo_nome");
  const dataNascimento = _req.getString("data_de_nascimento");
  const password = _req.getString("password");

  // Validate required fields
  if (!primeiroNome || !ultimoNome || !dataNascimento) {
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Os campos Nome e Data de Nascimento são obrigatórios.")
    );
    _out.close();
  } else {
    // Name validation
    const regexNome = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]{2,}$/;
    if (!regexNome.test(primeiroNome) || !regexNome.test(ultimoNome)) {
      _out.json(_val.map()
        .set("result", false)
        .set("error", "Os nomes devem ter pelo menos 2 caracteres e conter apenas letras.")
      );
      _out.close();
    } else {
      // Age validation (min 16 years old)
      const cal = java.util.Calendar.getInstance();
      cal.add(java.util.Calendar.YEAR, -16);
      const dataMinima = new java.text.SimpleDateFormat("yyyy-MM-dd").format(cal.getTime());
      
      if (dataNascimento > dataMinima) {
        _out.json(_val.map()
          .set("result", false)
          .set("error", "Deves ter pelo menos 16 anos.")
        );
        _out.close();
      } else if (password && (password.length < 6 || !/[A-Z]/.test(password) || !/\d/.test(password))) {
        // Password validation (if provided)
        _out.json(_val.map()
          .set("result", false)
          .set("error", "A password deve ter pelo menos 6 caracteres, conter pelo menos uma letra maiúscula e um número.")
        );
        _out.close();
      } else {
        // Identify table
        let isOperator = false;
        let userQuery = _db.query("SELECT id FROM cliente WHERE user_id = ?", userId);
        let tableName = "cliente";

        if (userQuery.size() === 0) {
          userQuery = _db.query("SELECT id FROM operador WHERE user_id = ?", userId);
          if (userQuery.size() > 0) {
            isOperator = true;
            tableName = "operador";
          }
        }

        if (userQuery.size() > 0) {
          const profileId = userQuery.get(0).getInt("id");

          // 1. Update native Netuno user
          _db.execute(
            "UPDATE netuno_user SET name = ? WHERE id = ?",
            primeiroNome + " " + ultimoNome,
            userId
          );

          if (password) {
            const passwordEncriptada = _crypto.bcryptHash(password, _crypto.bcryptSalt());
            _db.execute(
              "UPDATE netuno_user SET pass = ? WHERE id = ?",
              passwordEncriptada,
              userId
            );

            // 2. Update custom table with password
            _db.execute(
              `UPDATE ${tableName} SET primeiro_nome = ?, ultimo_nome = ?, data_de_nascimento = ?, password = ? WHERE id = ?`,
              primeiroNome,
              ultimoNome,
              dataNascimento,
              passwordEncriptada,
              profileId
            );
          } else {
            // 2. Update custom table without password
            _db.execute(
              `UPDATE ${tableName} SET primeiro_nome = ?, ultimo_nome = ?, data_de_nascimento = ? WHERE id = ?`,
              primeiroNome,
              ultimoNome,
              dataNascimento,
              profileId
            );
          }

          _out.json(_val.map().set("result", true));
        } else {
          _out.json(_val.map()
            .set("result", false)
            .set("error", "Perfil não encontrado para atualização.")
          );
        }
      }
    }
  }
} catch (e) {
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Erro ao atualizar perfil: " + e.message)
  );
}
_out.close();
