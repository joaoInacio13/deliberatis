import { _db, _val, _out, _user, _header } from "@netuno/server-types";

try {
  const userId = _user.id();
  if (userId <= 0) {
    _header.status(401);
    _out.json(_val.map().set("result", false).set("error", "Sessão expirada ou não autenticado."));
  } else {
    const operatorQuery = _db.query(
      "SELECT id FROM operador WHERE user_id = ? AND active = true",
      userId
    );

    if (operatorQuery.size() === 0) {
      _header.status(403);
      _out.json(_val.map().set("result", false).set("error", "Apenas operadores podem aceder às estatísticas."));
    } else {
      const totalOrdersQuery = _db.query("SELECT COUNT(*) AS total FROM encomenda WHERE active = true");
      const totalOrders = totalOrdersQuery.size() > 0 ? totalOrdersQuery.get(0).getInt("total") : 0;

      const statusCountsQuery = _db.query(
        "SELECT s.nome AS estado, COUNT(e.id) AS total, COALESCE(SUM(e.preco), 0) AS total_valor " +
        "FROM encomenda_estado s " +
        "LEFT JOIN encomenda e ON e.estado_id = s.id AND e.active = true " +
        "WHERE s.active = true " +
        "GROUP BY s.id, s.nome"
      );

      let pendingOrders = 0;
      let inTransitOrders = 0;
      let deliveredOrders = 0;
      let rejectedOrders = 0;
      let deliveredRevenue = 0.0;

      for (let i = 0; i < statusCountsQuery.size(); i++) {
        const item = statusCountsQuery.get(i);
        const estadoNome = item.getString("estado");
        const count = item.getInt("total");
        const revenue = item.getDouble("total_valor");

        if (estadoNome === "Pendente") pendingOrders = count;
        else if (estadoNome === "Em Trânsito") inTransitOrders = count;
        else if (estadoNome === "Entregue") {
          deliveredOrders = count;
          deliveredRevenue = revenue;
        } else if (estadoNome === "Rejeitada") {
          rejectedOrders = count;
        }
      }

      const deliverySuccessRate = totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100).toFixed(1) : 0;

      const deliveredTimesQuery = _db.query(
        "SELECT e.data_inicio, e.data_entrega, e.duracao_segundos " +
        "FROM encomenda e " +
        "JOIN encomenda_estado s ON e.estado_id = s.id " +
        "WHERE s.nome = 'Entregue' AND e.active = true"
      );

      let totalDeliveredSeconds = 0;
      let deliveredCountWithTime = 0;

      for (let i = 0; i < deliveredTimesQuery.size(); i++) {
        const row = deliveredTimesQuery.get(i);
        const dataInicioStr = row.getString("data_inicio");
        const dataEntregaStr = row.getString("data_entrega");
        const duracaoSegundos = row.getInt("duracao_segundos");

        let durationSeconds = 0;
        if (dataInicioStr && dataEntregaStr) {
          try {
            const start = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").parse(dataInicioStr.replace('T', ' ').split('.')[0]).getTime();
            const end = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").parse(dataEntregaStr.replace('T', ' ').split('.')[0]).getTime();
            durationSeconds = Math.max(0, Math.floor((end - start) / 1000));
          } catch (e) {
            durationSeconds = duracaoSegundos > 0 ? duracaoSegundos : 0;
          }
        } else if (duracaoSegundos > 0) {
          durationSeconds = duracaoSegundos;
        }

        if (durationSeconds > 0) {
          totalDeliveredSeconds += durationSeconds;
          deliveredCountWithTime++;
        }
      }

      const avgDeliverySecondsGlobal = deliveredCountWithTime > 0 
        ? Math.round(totalDeliveredSeconds / deliveredCountWithTime) 
        : 0;

      const couriersQuery = _db.query(
        "SELECT est.id, est.nome, est.matricula, est.telefone, " +
        "v.nome AS veiculo, v.velocidade, " +
        "es.nome AS estado " +
        "FROM estafeta est " +
        "LEFT JOIN estafeta_veiculo v ON est.veiculo_id = v.id " +
        "LEFT JOIN estafeta_estado es ON est.estado_id = es.id " +
        "WHERE est.active = true " +
        "ORDER BY est.nome ASC"
      );

      const couriersList = _val.list();
      let totalCouriersActive = 0;
      let totalCouriersAvailable = 0;

      for (let i = 0; i < couriersQuery.size(); i++) {
        const cRow = couriersQuery.get(i);
        const courierId = cRow.getInt("id");
        const courierEstado = cRow.getString("estado");

        if (courierEstado === "Disponível") totalCouriersAvailable++;
        if (courierEstado !== "Inativo") totalCouriersActive++;

        const courierOrdersQuery = _db.query(
          "SELECT e.data_inicio, e.data_entrega, e.duracao_segundos, e.preco, s.nome AS estado " +
          "FROM encomenda e " +
          "JOIN encomenda_estado s ON e.estado_id = s.id " +
          "WHERE e.estafeta_id = ? AND e.active = true",
          courierId
        );

        let courierDeliveredCount = 0;
        let courierInTransitCount = 0;
        let courierTotalValue = 0.0;
        let courierTotalDurationSecs = 0;
        let courierDurationCount = 0;

        for (let j = 0; j < courierOrdersQuery.size(); j++) {
          const oRow = courierOrdersQuery.get(j);
          const oEstado = oRow.getString("estado");
          const oPreco = oRow.getDouble("preco");

          if (oEstado === "Entregue") {
            courierDeliveredCount++;
            courierTotalValue += oPreco;

            const startStr = oRow.getString("data_inicio");
            const endStr = oRow.getString("data_entrega");
            const durSec = oRow.getInt("duracao_segundos");

            let tripSecs = 0;
            if (startStr && endStr) {
              try {
                const start = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").parse(startStr.replace('T', ' ').split('.')[0]).getTime();
                const end = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").parse(endStr.replace('T', ' ').split('.')[0]).getTime();
                tripSecs = Math.max(0, Math.floor((end - start) / 1000));
              } catch (e) {
                tripSecs = durSec > 0 ? durSec : 0;
              }
            } else if (durSec > 0) {
              tripSecs = durSec;
            }

            if (tripSecs > 0) {
              courierTotalDurationSecs += tripSecs;
              courierDurationCount++;
            }
          } else if (oEstado === "Em Trânsito") {
            courierInTransitCount++;
          }
        }

        const courierAvgDurationSecs = courierDurationCount > 0 
          ? Math.round(courierTotalDurationSecs / courierDurationCount) 
          : 0;

        couriersList.push(_val.map()
          .set("id", courierId)
          .set("nome", cRow.getString("nome"))
          .set("matricula", cRow.getString("matricula"))
          .set("telefone", cRow.getString("telefone"))
          .set("veiculo", cRow.getString("veiculo") || "N/A")
          .set("velocidade", cRow.getInt("velocidade"))
          .set("estado", courierEstado || "Disponível")
          .set("entregas_concluidas", courierDeliveredCount)
          .set("entregas_ativas", courierInTransitCount)
          .set("tempo_medio_segundos", courierAvgDurationSecs)
          .set("valor_total_entregue", courierTotalValue)
        );
      }

      const cityStatsQuery = _db.query(
        "SELECT c.nome AS cidade, COUNT(e.id) AS total, " +
        "SUM(CASE WHEN s.nome = 'Entregue' THEN 1 ELSE 0 END) AS entregues " +
        "FROM encomenda e " +
        "JOIN codigo_postal cp ON e.codigo_postal_id = cp.id " +
        "JOIN cidade c ON cp.cidade_id = c.id " +
        "LEFT JOIN encomenda_estado s ON e.estado_id = s.id " +
        "WHERE e.active = true " +
        "GROUP BY c.id, c.nome " +
        "ORDER BY total DESC " +
        "LIMIT 5"
      );

      const cityStatsList = _val.list();
      for (let i = 0; i < cityStatsQuery.size(); i++) {
        const row = cityStatsQuery.get(i);
        cityStatsList.push(_val.map()
          .set("cidade", row.getString("cidade"))
          .set("total", row.getInt("total"))
          .set("entregues", row.getInt("entregues"))
        );
      }

      const paymentStatsQuery = _db.query(
        "SELECT p.nome AS metodo, COUNT(e.id) AS total, COALESCE(SUM(e.preco), 0) AS total_valor " +
        "FROM pagamento p " +
        "LEFT JOIN encomenda e ON e.pagamento_id = p.id AND e.active = true " +
        "WHERE p.active = true " +
        "GROUP BY p.id, p.nome " +
        "ORDER BY total DESC"
      );

      const paymentStatsList = _val.list();
      for (let i = 0; i < paymentStatsQuery.size(); i++) {
        const row = paymentStatsQuery.get(i);
        paymentStatsList.push(_val.map()
          .set("metodo", row.getString("metodo"))
          .set("total", row.getInt("total"))
          .set("total_valor", row.getDouble("total_valor"))
        );
      }

      _out.json(_val.map()
        .set("result", true)
        .set("kpis", _val.map()
          .set("total_encomendas", totalOrders)
          .set("pendentes", pendingOrders)
          .set("em_transito", inTransitOrders)
          .set("entregues", deliveredOrders)
          .set("rejeitadas", rejectedOrders)
          .set("taxa_sucesso", parseFloat(deliverySuccessRate))
          .set("faturacao_entregue", deliveredRevenue)
          .set("tempo_medio_segundos", avgDeliverySecondsGlobal)
          .set("estafetas_total", couriersQuery.size())
          .set("estafetas_ativos", totalCouriersActive)
          .set("estafetas_disponiveis", totalCouriersAvailable)
        )
        .set("couriers", couriersList)
        .set("city_stats", cityStatsList)
        .set("payment_stats", paymentStatsList)
      );
    }
  }
} catch (e) {
  _header.status(500);
  _out.json(_val.map()
    .set("result", false)
    .set("error", "Erro ao carregar estatísticas: " + e.message)
  );
}
_out.close();
