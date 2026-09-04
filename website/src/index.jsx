import React from "react";
import { createRoot } from "react-dom/client";
import _service from '@netuno/service-client';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router';
import AuthContainer from "./pages/Auth";
import HomeContainer from "./pages/Home";
import OrderDetailsContainer from "./pages/OrderDetails";
import EstafetasContainer from "./pages/Estafetas";
import TrackingContainer from "./pages/Tracking";
import StatisticsContainer from "./pages/Statistics";

import { ConfigProvider } from "antd";
import antLocale_ptPT from "antd/lib/locale/pt_PT";

_service.config({
  prefix: typeof netuno !== 'undefined' ? netuno.config.urlServices : '/services/'
});

const App = () => {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/auth" element={<AuthContainer onLoginSuccess={() => navigate('/home')} />} />
      <Route path="/home" element={<HomeContainer />} />
      <Route path="/estafetas" element={<EstafetasContainer />} />
      <Route path="/estatisticas" element={<StatisticsContainer />} />
      <Route path="/order-details" element={<OrderDetailsContainer />} />
      <Route path="/tracking" element={<TrackingContainer />} />
    </Routes>
  );
};

const appDiv = document.getElementById("app");
if (appDiv) {
  const root = createRoot(appDiv);
  root.render(
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#5b5ce1',
          colorLink: '#5b5ce1',
          borderRadius: 5,
        }
      }}
      locale={antLocale_ptPT}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  );
}
