import { _db, _val, _req, _out, _header } from "@netuno/server-types";

const LocalDate = Java.type("java.time.LocalDate");
const Period = Java.type("java.time.Period");

function generateLicensePlate() {
  const num1 = Math.floor(10 + Math.random() * 90); // 10-99
  const num2 = Math.floor(10 + Math.random() * 90); // 10-99
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const char1 = letters.charAt(Math.floor(Math.random() * letters.length));
  const char2 = letters.charAt(Math.floor(Math.random() * letters.length));
  return num1 + "-" + char1 + char2 + "-" + num2;
}

try {
  const nome = _req.getString("nome");
  const telefone = _req.getString("telefone");
  const dataNascimento = _req.getString("data_nascimento"); // Expected formatted as YYYY-MM-DD
  const veiculoId = _req.getInt("veiculo_id");

  if (!nome || !telefone || !dataNascimento || !veiculoId) {
    _header.status(400);
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Todos os campos obrigatórios devem ser preenchidos.")
    );
    _out.close();
    throw new Error("Validation failed");
  }

  // Verify age (minimum 18 years old)
  try {
    const birthDateObj = LocalDate.parse(dataNascimento);
    const currentDate = LocalDate.now();
    const age = Period.between(birthDateObj, currentDate).getYears();
    if (age < 18) {
      _header.status(400);
      _out.json(_val.map()
        .set("result", false)
        .set("error", "O estafeta deve ter pelo menos 18 anos de idade.")
      );
      _out.close();
      throw new Error("Validation failed");
    }
  } catch (parseError) {
    if (parseError.message === "Validation failed") {
      throw parseError;
    }
    _header.status(400);
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Data de nascimento inválida.")
    );
    _out.close();
    throw new Error("Validation failed");
  }

  // Get state ID for 'Disponível'
  let estadoId = null;
  const estadoQuery = _db.query("SELECT id FROM estafeta_estado WHERE nome = 'Disponível' AND active = true");
  if (estadoQuery.size() > 0) {
    estadoId = estadoQuery.get(0).getInt("id");
  } else {
    _header.status(500);
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Estado 'Disponível' não encontrado na base de dados.")
    );
    _out.close();
    throw new Error("Validation failed");
  }

  // Generate unique license plate
  let matricula = "";
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 100) {
    matricula = generateLicensePlate();
    const dupCheck = _db.query(
      "SELECT id FROM estafeta WHERE matricula = ? AND active = true",
      matricula
    );
    if (dupCheck.size() === 0) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    _header.status(500);
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Falha ao gerar matrícula única.")
    );
    _out.close();
    throw new Error("Validation failed");
  }

  // Generate random coordinates within Portugal mainland bounding box
  const minLat = 36.95;
  const maxLat = 42.15;
  const minLng = -9.50;
  const maxLng = -6.18;
  const latitude = minLat + Math.random() * (maxLat - minLat);
  const longitude = minLng + Math.random() * (maxLng - minLng);

  // Insert into database
  const insertMap = _val.map()
    .set("nome", nome)
    .set("telefone", telefone)
    .set("data_nascimento", dataNascimento)
    .set("veiculo_id", veiculoId)
    .set("estado_id", estadoId)
    .set("matricula", matricula)
    .set("latitude", latitude)
    .set("longitude", longitude)
    .set("active", true);

  const newId = _db.insert("estafeta", insertMap);

  _out.json(_val.map()
    .set("result", true)
    .set("id", newId)
  );

} catch (e) {
  if (e.message !== "Validation failed") {
    _header.status(500);
    _out.json(_val.map()
      .set("result", false)
      .set("error", "Erro ao criar estafeta: " + e.message)
    );
  }
}
_out.close();
