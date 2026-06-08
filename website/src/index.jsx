import React from "react";
import { createRoot } from "react-dom/client";
import _service from '@netuno/service-client';
import AuthContainer from "./containers/AuthContainer";
import HomeContainer from "./containers/HomeContainer";

import { ConfigProvider } from "antd";
import antLocale_ptPT from "antd/lib/locale/pt_PT";

// Configura o prefixo de acesso à API de serviços do Netuno
_service.config({
  prefix: typeof netuno !== 'undefined' ? netuno.config.urlServices : '/services/'
});

// Deteta se o elemento de base da Autenticação está presente no DOM (ex: na página auth.html pública)
const authDiv = document.getElementById("app-auth");
const authContainer = authDiv ? createRoot(authDiv) : false;

// Inicializa a interface do Portal de Autenticação pública
if (authContainer) {
  authContainer.render(
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
      {/* Ao obter sucesso no Login, redireciona o utilizador para a página pública home.html */}
      <AuthContainer onLoginSuccess={() => {
        window.location.href = "/public/home.html";
      }} />
    </ConfigProvider>
  );
}

// Deteta se o elemento de base do Dashboard de Encomendas está presente no DOM (ex: na página home.html)
const homeDiv = document.getElementById("app-home");
const homeContainer = homeDiv ? createRoot(homeDiv) : false;

// Inicializa a interface do Dashboard de Encomendas pública
if (homeContainer) {
  homeContainer.render(
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
      <HomeContainer />
    </ConfigProvider>
  );
}

