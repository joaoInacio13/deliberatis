import { _req, _out, _val, _header } from "@netuno/server-types";

try {
  const query = _req.getString("q");
  if (!query) {
    _out.json(_val.map().set("result", false).set("error", "Parâmetro 'q' em falta."));
  } else {
    const HttpClient = Java.type("java.net.http.HttpClient");
    const HttpRequest = Java.type("java.net.http.HttpRequest");
    const HttpResponse = Java.type("java.net.http.HttpResponse");
    const URI = Java.type("java.net.URI");

    const urlString = "https://nominatim.openstreetmap.org/search?q=" + encodeURIComponent(query) + "&format=json&limit=1&countrycodes=pt";
    
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
