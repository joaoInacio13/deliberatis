import { _db, _val, _out, _user, _header, _req, _smtp, _log } from "@netuno/server-types";

try {
  const userId = _user.id();
  const uid = _req.getString("uid");
  const estado = _req.getString("estado");

  if (!uid || !estado) {
    _header.status(400);
    _out.json(_val.map().set("result", false).set("error", "Código único da encomenda e o novo estado são obrigatórios."));
  } else {
      const orderQuery = _db.query(
        "SELECT id, cliente_id FROM encomenda WHERE uid = ? AND active = true",
        uid
      );

      if (orderQuery.size() === 0) {
        _header.status(404);
        _out.json(_val.map().set("result", false).set("error", "Encomenda não encontrada."));
      } else {
        const orderId = orderQuery.get(0).getInt("id");
        const orderClienteId = orderQuery.get(0).getInt("cliente_id");

        const operatorQuery = _db.query(
          "SELECT id FROM operador WHERE user_id = ? AND active = true",
          userId
        );

        const clientQuery = _db.query(
          "SELECT id FROM cliente WHERE user_id = ? AND active = true",
          userId
        );
        let isOwner = false;
        if (clientQuery.size() > 0) {
          const clientProfileId = clientQuery.get(0).getInt("id");
          if (clientProfileId === orderClienteId) {
            isOwner = true;
          }
        }

        if (operatorQuery.size() === 0 && !isOwner) {
          _header.status(403);
          _out.json(_val.map().set("result", false).set("error", "Apenas operadores ou o cliente associado à encomenda podem atualizar o estado."));
        } else {
          const statusQuery = _db.query(
            "SELECT id FROM encomenda_estado WHERE nome = ? AND active = true",
            estado
          );

          if (statusQuery.size() === 0) {
            _header.status(400);
            _out.json(_val.map().set("result", false).set("error", "Estado de encomenda inválido: " + estado));
          } else {
            const statusId = statusQuery.get(0).getInt("id");

          if (estado === "Entregue") {
            _db.execute(
              "UPDATE encomenda SET estado_id = ?, data_entrega = CURRENT_TIMESTAMP WHERE id = ?",
              statusId, orderId
            );

            const clientQuery = _db.query(
              "SELECT nu.mail, e.descricao FROM encomenda e " +
              "JOIN cliente c ON e.cliente_id = c.id " +
              "JOIN netuno_user nu ON c.user_id = nu.id " +
              "WHERE e.id = ?",
              orderId
            );
            if (clientQuery.size() > 0) {
              const clientMail = clientQuery.get(0).getString("mail");
              const descricao = clientQuery.get(0).getString("descricao");
              try {
                _smtp.init().to(clientMail)
                  .subject("Encomenda Entregue! - #" + uid.substring(0, 8))
                  .html("<h2>A tua encomenda foi entregue!</h2><p>Confirmamos que a encomenda <strong>" + descricao + "</strong> foi entregue com sucesso.</p><>Obrigado por escolheres o Deliberatis!</p><br><p>Melhores cumprimentos,<br>Equipa Deliberatis</p>")
                  .send();
              } catch (smtpError) {
                _log.error("SMTP error during delivery notification: " + smtpError.message);
              }
            }
          } else {
            _db.execute(
              "UPDATE encomenda SET estado_id = ? WHERE id = ?",
              statusId, orderId
            );
          }

          _out.json(_val.map()
            .set("result", true)
            .set("message", "Estado da encomenda atualizado com sucesso.")
          );
        }
      }
    }
  }
} catch (e) {
  _header.status(500);
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Erro ao atualizar estado da encomenda: " + e.message)
  );
}
_out.close();
