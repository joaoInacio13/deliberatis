// Importa os recursos do servidor Netuno para base de dados, mapas de valores, requisições, respostas e criptografia
import { _db, _val, _req, _out, _crypto } from "@netuno/server-types";

// Obtém os dados do formulário de registo enviados pelo cliente
const primeiroNome = _req.getString("primeiro_nome");
const ultimoNome = _req.getString("ultimo_nome");
const email = _req.getString("email");
const password = _req.getString("password");
const dataNascimento = _req.getString("data_de_nascimento");

// Por regra de negócio, todo o utilizador registado através do portal público é um 'cliente'
const tipoUtilizador = "cliente";

// Valida que todos os campos obrigatórios foram preenchidos
if (!primeiroNome || !ultimoNome || !email || !password || !dataNascimento) {
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Todos os campos são obrigatórios.")
  );
  _out.close();
}

// Validação de formato de nome: apenas letras (incluindo acentos e apóstrofos), espaços, e mínimo de 2 caracteres
const regexNome = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]{2,}$/;
if (!regexNome.test(primeiroNome) || !regexNome.test(ultimoNome)) {
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Os nomes devem ter pelo menos 2 caracteres e conter apenas letras.")
  );
  _out.close();
}

// Validação de força da password: mínimo 6 caracteres, pelo menos uma maiúscula e um número
if (password.length < 6 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
  _out.json(_val.map()
    .set("result", false)
    .set("error", "A password deve ter pelo menos 6 caracteres, conter pelo menos uma letra maiúscula e um número.")
  );
  _out.close();
}

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
}

try {
  // Verifica se o email já se encontra registado na base de dados
  const checkEmail = _db.query(
    "SELECT id FROM utilizador WHERE email = ?",
    email
  );

  if (checkEmail.size() > 0) {
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Este email já está registado.")
    );
    _out.close();
  }

  // Gera o salt do Bcrypt e encripta a password para que nunca fique guardada em texto limpo
  const salt = _crypto.bcryptSalt();
  const passwordEncriptada = _crypto.bcryptHash(password, salt);

  // Insere o novo utilizador na tabela 'utilizador' no H2 com o estado ativo (padrão de formulário do Netuno)
  const id = _db.insert(
    "utilizador",
    _val.map()
      .set("primeiro_nome", primeiroNome)
      .set("ultimo_nome", ultimoNome)
      .set("email", email)
      .set("password", passwordEncriptada)
      .set("data_de_nascimento", dataNascimento)
      .set("tipo_de_utilizador", tipoUtilizador)
      .set("active", true)
  );

  // Retorna sucesso e o identificador do utilizador criado
  _out.json(_val.map()
    .set("result", true)
    .set("id", id)
  );
} catch (e) {
  // Trata exceções da base de dados e devolve o erro formatado
  _out.json(_val.map()
    .set("result", false)
    .set("error", e.message || "Erro ao registar o utilizador na base de dados.")
  );
}
