import { _db, _val, _req, _out, _user, _crypto, _smtp, _log } from "@netuno/server-types";

// Obtém os dados do formulário de registo enviados pelo cliente
const primeiroNome = _req.getString("primeiro_nome");
const ultimoNome = _req.getString("ultimo_nome");
const email = _req.getString("email");
const password = _req.getString("password");
const dataNascimento = _req.getString("data_de_nascimento");

// Valida que todos os campos obrigatórios foram preenchidos
if (!primeiroNome || !ultimoNome || !email || !password || !dataNascimento) {
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Todos os campos são obrigatórios.")
  );
  _out.close();
} else {
  // Validação de formato de nome: apenas letras (incluindo acentos e apóstrofos), espaços, e mínimo de 2 caracteres
  const regexNome = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]{2,}$/;
  if (!regexNome.test(primeiroNome) || !regexNome.test(ultimoNome)) {
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Os nomes devem ter pelo menos 2 caracteres e conter apenas letras.")
    );
    _out.close();
  } else if (password.length < 6 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    // Validação de força da password: mínimo 6 caracteres, pelo menos uma maiúscula e um número
    _out.json(_val.map()
      .set("result", false)
      .set("error", "A password deve ter pelo menos 6 caracteres, conter pelo menos uma letra maiúscula e um número.")
    );
    _out.close();
  } else {
    // Validação de segurança: a idade deve ser de pelo menos 16 anos
    const cal = java.util.Calendar.getInstance();
    cal.add(java.util.Calendar.YEAR, -16);
    const dataMinima = new java.text.SimpleDateFormat("yyyy-MM-dd").format(cal.getTime());
    if (dataNascimento > dataMinima) {
      _out.json(_val.map()
        .set("result", false)
        .set("error", "Deves ter pelo menos 16 anos para te registares.")
      );
      _out.close();
    } else {
      try {
        // Verifica se o email já se encontra registado na base de dados (utilizadores nativos do Netuno)
        const checkEmail = _db.query(
          "SELECT id FROM netuno_user WHERE mail = ? OR user = ?",
          email, email
        );

        if (checkEmail.size() > 0) {
          _out.json(_val.map()
            .set("result", false)
            .set("error", "Este email já está registado.")
          );
          _out.close();
        } else {
          // 1. Garante que o grupo "cliente" existe
          const groupQuery = _db.query("SELECT id FROM netuno_group WHERE code = 'cliente'");
          let groupId = null;
          if (groupQuery.size() > 0) {
            groupId = groupQuery.get(0).getInt("id");
          } else {
            const nextIdQuery = _db.query("SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM netuno_group");
            groupId = nextIdQuery.get(0).getInt("next_id");
            _db.execute(
              "INSERT INTO netuno_group (id, name, code, login_allowed, active) VALUES (?, ?, ?, ?, ?)",
              groupId, "Cliente", "cliente", true, true
            );
          }

          // 2. Cria o utilizador nativo no Netuno (o Netuno trata a hash da password automaticamente)
          const newUserId = _user.create(_val.map()
            .set("name", primeiroNome + " " + ultimoNome)
            .set("user", email)
            .set("pass", password)
            .set("mail", email)
            .set("group_id", groupId)
            .set("active", true)
          );

          // Garante a associação do grupo na base de dados
          _db.execute("UPDATE netuno_user SET group_id = ? WHERE id = ?", groupId, newUserId);

          const passwordEncriptada = _crypto.bcryptHash(password, _crypto.bcryptSalt());

          const isOperador = email.endsWith("deliberatis.com");
          const tableName = isOperador ? "operador" : "cliente";

          // 3. Insere o perfil detalhado na tabela customizada correspondente ligando ao utilizador do Netuno
          const id = _db.insert(
            tableName,
            _val.map()
              .set("user_id", newUserId)
              .set("group_id", groupId)
              .set("primeiro_nome", primeiroNome)
              .set("ultimo_nome", ultimoNome)
              .set("email", email)
              .set("password", passwordEncriptada)
              .set("data_de_nascimento", dataNascimento)
              .set("active", true)
          );

          /*
          try {
            _smtp.init().to(email)
              .subject("Bem-vindo ao Deliberatis")
              .html("<h2>Olá " + primeiroNome + " " + ultimoNome + ",</h2><p>A tua conta no Deliberatis foi criada com sucesso!</p><p>Agora já podes fazer login com o teu email: <strong>" + email + "</strong>.</p><br><p>Melhores cumprimentos,<br>Equipa Deliberatis</p>")
              .send();
          } catch (smtpError) {
            _log.error("SMTP error during registration: " + smtpError.message);
          }
          */

          _out.json(_val.map()
            .set("result", true)
            .set("id", id)
          );
        }
      } catch (e) {
        // Trata exceções da base de dados e devolve o erro formatado
        _out.json(_val.map()
          .set("result", false)
          .set("error", e.message || "Erro ao registar o utilizador na base de dados.")
        );
      }
    }
  }
}
