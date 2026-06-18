import { _db, _val, _out, _user, _header, _req } from "@netuno/server-types";

const HttpClient = Java.type("java.net.http.HttpClient");
const HttpRequest = Java.type("java.net.http.HttpRequest");
const HttpResponse = Java.type("java.net.http.HttpResponse");
const URI = Java.type("java.net.URI");
const URLEncoder = Java.type("java.net.URLEncoder");

function httpGet(urlString) {
  const client = HttpClient.newHttpClient();
  const request = HttpRequest.newBuilder()
    .uri(URI.create(urlString))
    .header("User-Agent", "Mozilla/5.0 (Deliberatis App)")
    .GET()
    .build();
  const response = client.send(request, HttpResponse.BodyHandlers.ofString());
  const status = response.statusCode();
  if (status === 200) {
    return response.body();
  }
  throw new Error("HTTP error " + status);
}

function geocode(address) {
  try {
    const encoded = URLEncoder.encode(address, "UTF-8");
    const searchUrl = "https://nominatim.openstreetmap.org/search?q=" + encoded + "&countrycodes=pt&format=json&limit=1";
    const res = JSON.parse(httpGet(searchUrl));
    if (res && res.length > 0) {
      return {
        lat: parseFloat(res[0].lat),
        lon: parseFloat(res[0].lon)
      };
    }
  } catch (e) {
    // Fail silently
  }
  return null;
}

function geocodePostalCode(code) {
  try {
    const searchUrl = "https://nominatim.openstreetmap.org/search?postalcode=" + code + "&countrycodes=pt&format=json&limit=1";
    const res = JSON.parse(httpGet(searchUrl));
    if (res && res.length > 0) {
      return {
        lat: parseFloat(res[0].lat),
        lon: parseFloat(res[0].lon)
      };
    }
  } catch (e) {
    // Fail silently
  }
  return null;
}

try {
  const userId = _user.id();
  const uid = _req.getString("uid");

  if (!uid) {
    _header.status(400);
    _out.json(_val.map().set("result", false).set("error", "Código único da encomenda em falta."));
  } else {
    let userQuery = _db.query(
      "SELECT id FROM cliente WHERE user_id = ? AND active = true",
      userId
    );
    let isOperator = false;
    let profileId = null;

    if (userQuery.size() > 0) {
      profileId = userQuery.get(0).getInt("id");
    } else {
      userQuery = _db.query(
        "SELECT id FROM operador WHERE user_id = ? AND active = true",
        userId
      );
      if (userQuery.size() > 0) {
        profileId = userQuery.get(0).getInt("id");
        isOperator = true;
      }
    }

    if (profileId === null) {
      _header.status(404);
      _out.json(_val.map().set("result", false).set("error", "Utilizador não encontrado."));
    } else {
      let orderQuery;
      if (isOperator) {
        orderQuery = _db.query(
          "SELECT e.id, e.uid, e.lastchange_time, e.descricao, e.preco, e.porta, e.andar, e.telefone, e.observacoes, " +
          "e.latitude, e.longitude, " +
          "s.nome AS estado, p.nome AS pagamento, cp.codigo AS codigo_postal, cp.rua, c.nome AS cidade " +
          "FROM encomenda e " +
          "LEFT JOIN encomenda_estado s ON e.estado_id = s.id " +
          "LEFT JOIN pagamento p ON e.pagamento_id = p.id " +
          "LEFT JOIN codigo_postal cp ON e.codigo_postal_id = cp.id " +
          "LEFT JOIN cidade c ON cp.cidade_id = c.id " +
          "WHERE e.uid = ? AND e.active = true",
          uid
        );
      } else {
        orderQuery = _db.query(
          "SELECT e.id, e.uid, e.lastchange_time, e.descricao, e.preco, e.porta, e.andar, e.telefone, e.observacoes, " +
          "e.latitude, e.longitude, " +
          "s.nome AS estado, p.nome AS pagamento, cp.codigo AS codigo_postal, cp.rua, c.nome AS cidade " +
          "FROM encomenda e " +
          "LEFT JOIN encomenda_estado s ON e.estado_id = s.id " +
          "LEFT JOIN pagamento p ON e.pagamento_id = p.id " +
          "LEFT JOIN codigo_postal cp ON e.codigo_postal_id = cp.id " +
          "LEFT JOIN cidade c ON cp.cidade_id = c.id " +
          "WHERE e.cliente_id = ? AND e.uid = ? AND e.active = true",
          profileId, uid
        );
      }

      if (orderQuery.size() === 0) {
        _header.status(404);
        _out.json(_val.map().set("result", false).set("error", "Encomenda não encontrada."));
      } else {
        const row = orderQuery.get(0);
        const ruaVal = row.getString("rua");
        const cpVal = row.getString("codigo_postal");
        const cidadeVal = row.getString("cidade");

        let latitude = row.getDouble("latitude");
        let longitude = row.getDouble("longitude");

        // Fallback para Nominatim se os valores forem nulos, inválidos ou iguais a 0.0
        if (!latitude || !longitude || (latitude === 0.0 && longitude === 0.0)) {
          const fullAddr = ruaVal + ", " + cpVal + ", " + cidadeVal + ", Portugal";
          let coords = geocode(fullAddr);
          if (!coords && cpVal) {
            coords = geocodePostalCode(cpVal);
          }
          if (!coords && ruaVal && cidadeVal) {
            coords = geocode(ruaVal + ", " + cidadeVal + ", Portugal");
          }
          if (!coords && cidadeVal) {
            coords = geocode(cidadeVal + ", Portugal");
          }
          if (coords) {
            latitude = coords.lat;
            longitude = coords.lon;
          }
        }

        _out.json(_val.map()
          .set("result", true)
          .set("order", _val.map()
            .set("id", row.getInt("id"))
            .set("uid", row.getString("uid"))
            .set("data", row.getString("lastchange_time"))
            .set("descricao", row.getString("descricao"))
            .set("valor", row.getDouble("preco"))
            .set("estado", row.getString("estado"))
            .set("porta", row.getString("porta"))
            .set("andar", row.getString("andar"))
            .set("telefone", row.getString("telefone"))
            .set("observacoes", row.getString("observacoes") || "")
            .set("pagamento", row.getString("pagamento"))
            .set("codigo_postal", row.getString("codigo_postal"))
            .set("rua", row.getString("rua"))
            .set("cidade", row.getString("cidade"))
            .set("latitude", latitude)
            .set("longitude", longitude)
          )
        );
      }
    }
  }
} catch (e) {
  _header.status(500);
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Erro ao obter detalhes da encomenda: " + e.message)
  );
}
_out.close();
