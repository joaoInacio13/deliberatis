import { _user } from "@netuno/server-types";

// Netuno validates the JWT auth token passed in the query parameter "?auth=TOKEN"
// If the user ID is valid (> 0), the connection handshake is accepted.
if (_user.id() <= 0) {
  throw new Error("Sessão inválida ou expirada.");
}
