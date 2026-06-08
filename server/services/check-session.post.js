import { _db, _val, _req, _out } from "@netuno/server-types";

// Obtém o token enviado
const token = _req.getString("token");

if (!token) {
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Token não fornecido.")
  );
  _out.close();
}

try {
  const jwtSecret = "MinhaChaveSecretaDeliberatisSuperSegura123!";
  const parts = token.split(".");
  
  if (parts.length !== 3) {
    _out.json(_val.map().set("result", false).set("error", "Token inválido."));
    _out.close();
  }

  const header = parts[0];
  const payload = parts[1];
  const signature = parts[2];

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

  // Recalcular assinatura esperada para validar a integridade
  const sha256_HMAC = Mac.getInstance("HmacSHA256");
  const secret_key = new SecretKeySpec(
    stringToBytes(jwtSecret), 
    "HmacSHA256"
  );
  sha256_HMAC.init(secret_key);
  const hash = sha256_HMAC.doFinal(stringToBytes(header + "." + payload));
  const expectedSignature = Base64.getUrlEncoder().withoutPadding().encodeToString(hash);

  if (signature !== expectedSignature) {
    _out.json(_val.map().set("result", false).set("error", "Assinatura do token inválida."));
    _out.close();
  }

  // Descodifica o payload do Token
  const decodedPayloadBytes = Base64.getUrlDecoder().decode(payload);
  // Converte array de bytes Java para String JS
  const decodedPayload = new (Java.type('java.lang.String'))(decodedPayloadBytes, "UTF-8").toString();
  const data = JSON.parse(decodedPayload);

  // Verifica expiração
  const currentTime = new DateClass().getTime();
  if (currentTime > data.exp) {
    _out.json(_val.map().set("result", false).set("error", "Token expirado."));
    _out.close();
  }

  // Token é válido. Vamos buscar o primeiro nome à BD usando o email do token
  const userQuery = _db.query(
    "SELECT primeiro_nome FROM utilizador WHERE email = ? AND active = true",
    data.email
  );

  if (userQuery.size() > 0) {
    const user = userQuery.get(0);
    _out.json(_val.map()
      .set("result", true)
      .set("email", data.email)
      .set("primeiro_nome", user.getString("primeiro_nome"))
    );
  } else {
    _out.json(_val.map().set("result", false).set("error", "Utilizador não encontrado."));
  }

} catch (e) {
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Erro ao validar sessão: " + e.message)
  );
}
