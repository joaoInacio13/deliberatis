import React from "react";
import { createRoot } from "react-dom/client";
import _service from '@netuno/service-client';
import DashboardContainer from "./containers/DashboardContainer";
import AuthContainer from "./containers/AuthContainer";

import { ConfigProvider, theme } from "antd";
import antLocale_enGB from "antd/lib/locale/en_GB";
import antLocale_enUS from "antd/lib/locale/en_US";
import antLocale_esES from "antd/lib/locale/es_ES";
import antLocale_ptBR from "antd/lib/locale/pt_BR";
import antLocale_ptPT from "antd/lib/locale/pt_PT";

// Configura defensivamente o prefixo de acesso à API de serviços do Netuno
_service.config({
  prefix: typeof netuno !== 'undefined' ? netuno.config.urlServices : '/services/'
});

// Deteta se o elemento de base do Dashboard de Administração está presente no DOM
const dashboardDiv = document.getElementById("app-dashboard");
const dashboardContainer = dashboardDiv ? createRoot(dashboardDiv) : false;

// Inicializa a interface de Dashboard do Backoffice administrativo do Netuno
if (dashboardContainer) {
  dashboardContainer.render(
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#5b5ce1',
          colorLink: '#5b5ce1',
          borderRadius: 5,
        },
        algorithm: theme.darkAlgorithm
      }}
      locale={
        (typeof netuno !== 'undefined' && {
          'en_us': antLocale_enUS,
          'en_gb': antLocale_enGB,
          'es_es': antLocale_esES,
          'pt_br': antLocale_ptBR,
          'pt_pt': antLocale_ptPT
        }[netuno.config.langCode]) || antLocale_ptPT
      }
    >
      <DashboardContainer/>
    </ConfigProvider>
  );
}

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
        },
        algorithm: theme.darkAlgorithm
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

// Configurações e callbacks de eventos do Backoffice Netuno (apenas ativos quando 'netuno' está definido)
if (typeof netuno !== 'undefined') {
  netuno.addNavigationLoad(() => {
    $('[netuno-navigation]').find('a').on('netuno:click', (e)=> {
      const link = $(e.target);
      if (dashboardContainer && link.is('[netuno-navigation-dashboard]')) {
        // Callback para cliques no menu lateral do Dashboard
      }
    });
  });

  netuno.addContentLoad((container) => {
    // Quando qualquer conteúdo dinâmico for carregado pelo Netuno (ex: formulários de tabelas)
    if (container.is('[netuno-form-search="YOUR_FORM_NAME"]')) {
      // Quando a pesquisa do formulário é aberta
    } else if (container.is('[netuno-form-edit="YOUR_FORM_NAME"]')) {
      // Quando a edição de registo é aberta
    }
  });

  netuno.addPageLoad(() => {
    // Lógicas disparadas ao carregar completamente a página do Backoffice
    let modal = $('#app-dashboard-modal-form');
    modal.on('hidden.bs.modal', ()=> {
      modal.find('[netuno-form-edit]').empty();
    });
    $('#app-dashboard-modal-form-button').on('click', ()=> {
      modal.modal('show');
      netuno.loadFormEdit(modal.find('[netuno-form]'));
    });
    modal.find('[netuno-form]').on('netuno:save', ()=> {
      modal.modal('hide');
    });
  });
}
