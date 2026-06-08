import { _db, _val, _req, _out, _header } from "@netuno/server-types";

// Obtém o token JWT enviado no Header Authorization ou como parâmetro URL
let token = _req.getString("token");
if (!token) {
  const authHeader = _req.getHeader("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }
}

if (!token) {
  _header.status(401);
  _out.json(_val.map().set("result", false).set("error", "Não autenticado."));
  _out.close();
} else {
  try {
    const jwtSecret = "MinhaChaveSecretaDeliberatisSuperSegura123!";
    const parts = token.split(".");
    
    if (parts.length !== 3) {
      _header.status(401);
      _out.json(_val.map().set("result", false).set("error", "Sessão inválida."));
      _out.close();
    } else {
      const header = parts[0];
      const payload = parts[1];
      const signature = parts[2];

      // Validação da assinatura JWT no GraalVM
      const Base64 = Java.type('java.util.Base64');
      const Mac = Java.type('javax.crypto.Mac');
      const SecretKeySpec = Java.type('javax.crypto.spec.SecretKeySpec');
      const DateClass = Java.type('java.util.Date');

      const stringToBytes = (str) => {
        const utf8 = unescape(encodeURIComponent(str));
        const arr = [];
        for (let i = 0; i < utf8.length; i++) {
          arr.push(utf8.charCodeAt(i));
        }
        return Java.to(arr, "byte[]");
      };

      const sha256_HMAC = Mac.getInstance("HmacSHA256");
      const secret_key = new SecretKeySpec(stringToBytes(jwtSecret), "HmacSHA256");
      sha256_HMAC.init(secret_key);
      const hash = sha256_HMAC.doFinal(stringToBytes(header + "." + payload));
      const expectedSignature = Base64.getUrlEncoder().withoutPadding().encodeToString(hash);

      if (signature !== expectedSignature) {
        _header.status(401);
        _out.json(_val.map().set("result", false).set("error", "Sessão inválida."));
        _out.close();
      } else {
        const decodedPayloadBytes = Base64.getUrlDecoder().decode(payload);
        const decodedPayload = new (Java.type('java.lang.String'))(decodedPayloadBytes, "UTF-8").toString();
        const data = JSON.parse(decodedPayload);

        // Verifica expiração do token
        const currentTime = new DateClass().getTime();
        if (currentTime > data.exp) {
          _header.status(401);
          _out.json(_val.map().set("result", false).set("error", "Sessão expirada."));
          _out.close();
        } else {
          // Com o email do token validado, procuramos o utilizador
          const userQuery = _db.query(
            "SELECT id FROM utilizador WHERE email = ? AND active = true",
            data.email
          );

          if (userQuery.size() === 0) {
            _header.status(404);
            _out.json(_val.map().set("result", false).set("error", "Utilizador não encontrado."));
            _out.close();
          } else {
            const userId = userQuery.get(0).getInt("id");
            let ordersList = _val.list();

            try {
              // Procura as encomendas pertencentes ao cliente logado (usando 'cliente_id')
              const ordersQuery = _db.query(
                "SELECT id, uid, lastchange_time, descricao, preco, estado FROM encomenda WHERE cliente_id = ? AND active = true ORDER BY lastchange_time DESC",
                userId
              );

              // Mapeia o resultado do H2 para uma lista de objetos
              for (let i = 0; i < ordersQuery.size(); i++) {
                const row = ordersQuery.get(i);
                ordersList.add(_val.map()
                  .set("id", row.getInt("id"))
                  .set("uid", row.getString("uid"))
                  .set("data", row.getString("lastchange_time"))
                  .set("descricao", row.getString("descricao"))
                  .set("valor", row.getDouble("preco"))
                  .set("estado", row.getString("estado"))
                );
              }
            } catch (dbError) {
              // Caso a tabela 'encomenda' ainda não exista na BD, falha graciosamente devolvendo lista vazia
            }

            _out.json(_val.map()
              .set("result", true)
              .set("orders", ordersList)
            );
          }
        }
      }
    }
  } catch (e) {
    _header.status(500);
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Erro interno: " + e.message)
    );
  }
}
