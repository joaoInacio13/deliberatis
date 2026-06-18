import { _db, _val, _out, _user, _header, _req } from "@netuno/server-types";

try {
  const userId = _user.id();
  const uid = _req.getString("uid");
  const telefone = _req.getString("telefone");
  const codigoPostal = _req.getString("codigo_postal");
  const porta = _req.getString("porta");
  const andar = _req.getString("andar");
  
  const toTitleCase = (str) => {
    if (!str) return "";
    return str.trim()
      .toLowerCase()
      .split(' ')
      .filter((w) => w.length > 0)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };
  const rua = toTitleCase(_req.getString("rua"));
  const cidade = toTitleCase(_req.getString("cidade"));

  if (!uid) {
    _header.status(400);
    _out.json(_val.map().set("result", false).set("error", "Código único da encomenda em falta."));
  } else if (!telefone || !codigoPostal || !porta || !rua || !cidade) {
    _header.status(400);
    _out.json(_val.map().set("result", false).set("error", "Por favor, preenche todos os campos obrigatórios."));
  } else if (!/^\d{4}-\d{3}$/.test(codigoPostal)) {
    _header.status(400);
    _out.json(_val.map().set("result", false).set("error", "O código postal indicado é inválido (deve ser no formato XXXX-XXX)."));
  } else if (!/^9\d{8}$/.test(telefone)) {
    _header.status(400);
    _out.json(_val.map().set("result", false).set("error", "O número de telefone deve ser português (começar por 9) e ter exatamente 9 dígitos."));
  } else {
    // 1. Procurar o perfil 'cliente' associado ao utilizador nativo autenticado
    const userQuery = _db.query(
      "SELECT id FROM cliente WHERE user_id = ? AND active = true",
      userId
    );

    if (userQuery.size() === 0) {
      _header.status(403);
      _out.json(_val.map().set("result", false).set("error", "Cliente não encontrado ou não autorizado."));
    } else {
      const profileId = userQuery.get(0).getInt("id");

      // 2. Procura a encomenda pelo UID, garantindo que pertence ao cliente
      const orderQuery = _db.query(
        "SELECT e.id, s.nome AS estado_nome " +
        "FROM encomenda e " +
        "LEFT JOIN encomenda_estado s ON e.estado_id = s.id " +
        "WHERE e.cliente_id = ? AND e.uid = ? AND e.active = true",
        profileId, uid
      );

      if (orderQuery.size() === 0) {
        _header.status(404);
        _out.json(_val.map().set("result", false).set("error", "Encomenda não encontrada."));
      } else {
        const orderRow = orderQuery.get(0);
        const orderId = orderRow.getInt("id");
        const statusNome = orderRow.getString("estado_nome");

        // 3. Garantir que o estado é "Pendente"
        if (statusNome !== "Pendente") {
          _header.status(400);
          _out.json(_val.map().set("result", false).set("error", "Apenas encomendas com o estado 'Pendente' podem ser editadas."));
        } else {
          // 4. Resolver/Criar o ID de Código Postal (Cache local ou consulta na API)
          const cpQuery = _db.query("SELECT id FROM codigo_postal WHERE codigo = ? AND active = true", codigoPostal);
          let codigoPostalId = null;
          if (cpQuery.size() > 0) {
            codigoPostalId = cpQuery.get(0).getInt("id");
          }

          // FALLBACK: Se o código postal não existir localmente, tenta inserir
          if (!codigoPostalId && rua && cidade) {
            try {
              let cidadeId = null;
              const cidadeQuery = _db.query("SELECT id FROM cidade WHERE nome = ? AND active = true", cidade);
              if (cidadeQuery.size() > 0) {
                cidadeId = cidadeQuery.get(0).getInt("id");
              } else {
                cidadeId = _db.insert("cidade", _val.map().set("nome", cidade).set("active", true));
              }

              codigoPostalId = _db.insert("codigo_postal", _val.map()
                .set("codigo", codigoPostal)
                .set("rua", rua)
                .set("cidade_id", cidadeId)
                .set("active", true)
              );
            } catch (e) {
              // Ignorar falhas na inserção manual e prosseguir
            }
          }

          if (!codigoPostalId) {
            _header.status(400);
            _out.json(_val.map().set("result", false).set("error", "Não foi possível validar o código postal indicado."));
          } else {
            // Obtém coordenadas exatas passadas pelo frontend
            const latitudeString = _req.getString("latitude");
            const longitudeString = _req.getString("longitude");
            const latitude = latitudeString ? parseFloat(latitudeString) : 0.0;
            const longitude = longitudeString ? parseFloat(longitudeString) : 0.0;

            // 5. Atualizar a encomenda
            _db.execute(
              "UPDATE encomenda SET telefone = ?, codigo_postal_id = ?, porta = ?, andar = ?, latitude = ?, longitude = ? WHERE id = ?",
              telefone, codigoPostalId, porta, andar || "", latitude, longitude, orderId
            );

            _out.json(_val.map()
              .set("result", true)
              .set("message", "Encomenda atualizada com sucesso.")
            );
          }
        }
      }
    }
  }
} catch (e) {
  _header.status(500);
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Erro ao atualizar a encomenda: " + e.message)
  );
}
_out.close();
