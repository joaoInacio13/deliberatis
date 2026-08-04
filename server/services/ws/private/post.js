import { _user, _header, _out } from "@netuno/server-types";

let logged = false;

try {
  if (_user.id() > 0) {
    logged = true;
  }
} catch (e) {
  // Se _user.id() falhar por não haver autenticação
}

if (!logged) {
  _header.status(401);
  _out.close();
}
