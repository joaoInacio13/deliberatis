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
    // Segredo para assinatura do JWT (deve ter 32+ caracteres)
    const jwtSecret = "MinhaChaveSecretaDeliberatisSuperSegura123!";
    
    // Importação explícita das classes Java via GraalVM Java.type
    const Base64 = Java.type('java.util.Base64');
    const Mac = Java.type('javax.crypto.Mac');
    const SecretKeySpec = Java.type('javax.crypto.spec.SecretKeySpec');
    const DateClass = Java.type('java.util.Date');

    // Função auxiliar robusta para converter String JS em Array de Bytes Java (byte[]) no GraalVM
    const stringToBytes = (str) => {
      const utf8 = unescape(encodeURIComponent(str));
      const arr = [];
      for (let i = 0; i < utf8.length; i++) {
        arr.push(utf8.charCodeAt(i));
      }
      return Java.to(arr, "byte[]");
    };

    // Geração do Token JWT usando as classes nativas de Criptografia do Java
    const header = Base64.getUrlEncoder().withoutPadding().encodeToString(
      stringToBytes('{"alg":"HS256","typ":"JWT"}')
    );
    const exp = new DateClass().getTime() + (24 * 60 * 60 * 1000); // Expira em 24h
    const payload = Base64.getUrlEncoder().withoutPadding().encodeToString(
      stringToBytes(JSON.stringify({ email: email, exp: exp }))
    );
    
    // Assinatura HMAC-SHA256
    const sha256_HMAC = Mac.getInstance("HmacSHA256");
    const secret_key = new SecretKeySpec(
      stringToBytes(jwtSecret), 
      "HmacSHA256"
    );
    sha256_HMAC.init(secret_key);
    const hash = sha256_HMAC.doFinal(stringToBytes(header + "." + payload));
    const signature = Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
    
    const token = header + "." + payload + "." + signature;

    _out.json(_val.map()
      .set("result", true)
      .set("primeiro_nome", user.getString("primeiro_nome"))
      .set("token", token)
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
