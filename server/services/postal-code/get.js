import { _db, _val, _req, _out } from "@netuno/server-types";

const DISTRITOS = [
  "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco", "Coimbra", 
  "Évora", "Faro", "Guarda", "Leiria", "Lisboa", "Portalegre", 
  "Porto", "Santarém", "Setúbal", "Viana do Castelo", "Vila Real", "Viseu"
];

const HttpClient = Java.type("java.net.http.HttpClient");
const HttpRequest = Java.type("java.net.http.HttpRequest");
const HttpResponse = Java.type("java.net.http.HttpResponse");
const URI = Java.type("java.net.URI");

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

try {
  const code = _req.getString("code");

  if (!code || !/^\d{4}-\d{3}$/.test(code)) {
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Código postal inválido. Use o formato XXXX-XXX.")
    );
  } else {
    // 1. Procurar localmente na cache da base de dados
    const cpQuery = _db.query(
      "SELECT cp.rua, c.nome AS cidade " +
      "FROM codigo_postal cp " +
      "LEFT JOIN cidade c ON cp.cidade_id = c.id " +
      "WHERE cp.codigo = ? AND cp.active = true",
      code
    );

    if (cpQuery.size() > 0) {
      const row = cpQuery.get(0);
      _out.json(_val.map()
        .set("result", true)
        .set("rua", row.getString("rua"))
        .set("cidade", row.getString("cidade"))
      );
    } else {
      // 2. Fallback: Procurar na API do Nominatim
      try {
        const searchUrl = "https://nominatim.openstreetmap.org/search?postalcode=" + code + "&countrycodes=pt&format=json&limit=1";
        const searchRes = JSON.parse(httpGet(searchUrl));

        if (searchRes && searchRes.length > 0) {
          const lat = searchRes[0].lat;
          const lon = searchRes[0].lon;

          const reverseUrl = "https://nominatim.openstreetmap.org/reverse?lat=" + lat + "&lon=" + lon + "&format=json&addressdetails=1";
          const reverseRes = JSON.parse(httpGet(reverseUrl));

          if (reverseRes && reverseRes.address) {
            const addr = reverseRes.address;
            const road = addr.road || addr.pedestrian || addr.footway || addr.path || addr.cycleway || '';
            const districtVal = addr.state || addr.county || addr.city || '';
            
            const matchedDistrict = DISTRITOS.find(d => 
              districtVal.toLowerCase().indexOf(d.toLowerCase()) !== -1 || 
              d.toLowerCase().indexOf(districtVal.toLowerCase()) !== -1
            ) || '';

            if (matchedDistrict) {
              // Obter ou criar ID da cidade
              let cidadeId = null;
              const cidadeQuery = _db.query("SELECT id FROM cidade WHERE nome = ? AND active = true", matchedDistrict);
              if (cidadeQuery.size() > 0) {
                cidadeId = cidadeQuery.get(0).getInt("id");
              } else {
                cidadeId = _db.insert("cidade", _val.map().set("nome", matchedDistrict).set("active", true));
              }

              // Inserir na cache de código postal
              _db.insert("codigo_postal", _val.map()
                .set("codigo", code)
                .set("rua", road)
                .set("cidade_id", cidadeId)
                .set("active", true)
              );

              _out.json(_val.map()
                .set("result", true)
                .set("rua", road)
                .set("cidade", matchedDistrict)
              );
            } else {
              _out.json(_val.map()
                .set("result", false)
                .set("error", "Código postal não encontrado na cache local.")
              );
            }
          } else {
            _out.json(_val.map()
              .set("result", false)
              .set("error", "Código postal não encontrado na cache local.")
            );
          }
        } else {
          _out.json(_val.map()
            .set("result", false)
            .set("error", "Código postal não encontrado na cache local.")
          );
        }
      } catch (externalError) {
        _out.json(_val.map()
          .set("result", false)
          .set("error", "Código postal não encontrado na cache local.")
        );
      }
    }
  }
} catch (e) {
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Erro interno: " + e.toString())
  );
}
_out.close();
