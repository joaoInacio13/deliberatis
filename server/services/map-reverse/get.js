import { _req, _out, _val, _header } from "@netuno/server-types";

try {
  const lat = _req.getString("lat");
  const lng = _req.getString("lng");
  
  if (!lat || !lng) {
    _out.json(_val.map().set("result", false).set("error", "Parâmetros 'lat' e 'lng' obrigatórios."));
  } else {
    const HttpClient = Java.type("java.net.http.HttpClient");
    const HttpRequest = Java.type("java.net.http.HttpRequest");
    const HttpResponse = Java.type("java.net.http.HttpResponse");
    const URI = Java.type("java.net.URI");

    const urlString = "https://nominatim.openstreetmap.org/reverse?lat=" + lat + "&lon=" + lng + "&format=json&addressdetails=1";
    
    const client = HttpClient.newHttpClient();
    const request = HttpRequest.newBuilder()
      .uri(URI.create(urlString))
      .header("User-Agent", "Mozilla/5.0 (Deliberatis App)")
      .GET()
      .build();

    const response = client.send(request, HttpResponse.BodyHandlers.ofString());
    const status = response.statusCode();

    if (status === 200) {
      _out.json(JSON.parse(response.body()));
    } else {
      _header.status(status);
      _out.json(_val.map().set("result", false).set("error", "Erro ao comunicar com o Nominatim. Status: " + status));
    }
  }
} catch (e) {
  _header.status(500);
  _out.json(_val.map().set("result", false).set("error", e.toString()));
}
_out.close();
