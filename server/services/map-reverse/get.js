import { _req, _out, _val, _header } from "@netuno/server-types";

try {
  const lat = _req.getString("lat");
  const lng = _req.getString("lng");
  
  if (!lat || !lng) {
    _out.json(_val.map().set("result", false).set("error", "Parâmetros 'lat' e 'lng' obrigatórios."));
  } else {
    const URL = Java.type("java.net.URL");
    const BufferedReader = Java.type("java.io.BufferedReader");
    const InputStreamReader = Java.type("java.io.InputStreamReader");

    const urlString = "https://nominatim.openstreetmap.org/reverse?lat=" + lat + "&lon=" + lng + "&format=json&addressdetails=1";
    const url = new URL(urlString);
    const con = url.openConnection();
    con.setRequestMethod("GET");
    con.setRequestProperty("User-Agent", "Mozilla/5.0 (Deliberatis App)");
    
    const status = con.getResponseCode();
    if (status === 200) {
      const inStream = new BufferedReader(new InputStreamReader(con.getInputStream(), "UTF-8"));
      let inputLine;
      let content = "";
      while ((inputLine = inStream.readLine()) !== null) {
        content += inputLine;
      }
      inStream.close();
      con.disconnect();

      _out.json(JSON.parse(content));
    } else {
      con.disconnect();
      _header.status(status);
      _out.json(_val.map().set("result", false).set("error", "Erro ao comunicar com o Nominatim. Status: " + status));
    }
  }
} catch (e) {
  _header.status(500);
  _out.json(_val.map().set("result", false).set("error", e.toString()));
}
_out.close();
