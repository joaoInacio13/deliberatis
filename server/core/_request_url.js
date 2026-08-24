const requestUrl = _url.request();

if (!requestUrl.startsWith("/services") && !requestUrl.startsWith("/public") && requestUrl !== "/" && requestUrl.indexOf(".") === -1) {
  try {
    const Files = Java.type("java.nio.file.Files");
    const Paths = Java.type("java.nio.file.Paths");
    const path = Paths.get("/home/joao_inacio/netuno/apps/deliberatis/public/index.html");
    _header.contentTypeHTML();
    _out.copy(Files.newInputStream(path));
    _out.close();
  } catch (e) {
    _log.error("Failed to serve SPA index.html: " + e.getMessage());
  }
} else if (requestUrl === "/") {
  try {
    const Files = Java.type("java.nio.file.Files");
    const Paths = Java.type("java.nio.file.Paths");
    const path = Paths.get("/home/joao_inacio/netuno/apps/deliberatis/public/index.html");
    _header.contentTypeHTML();
    _out.copy(Files.newInputStream(path));
    _out.close();
  } catch (e) {
    _log.error("Failed to serve SPA index.html: " + e.getMessage());
  }
} else {
  _url.to(requestUrl);
}
