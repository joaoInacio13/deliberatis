import { _out, _val } from "@netuno/server-types";

_out.json(_val.map()
  .set("result", false)
  .set("error", "Método HTTP não suportado. Por favor use PUT para atualizar o perfil.")
);
_out.close();
