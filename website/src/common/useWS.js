import { useEffect, useState } from 'react';
import _ws from "@netuno/ws-client";

function useWS(onMessage) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const getWebsocketURL = () => {
    if (typeof netuno !== 'undefined' && netuno.config && netuno.config.websocket) {
      return netuno.config.websocket.url;
    }
    return 'ws://localhost:9000/ws/private/';
  };

  const getWebsocketServicesPrefix = () => {
    if (typeof netuno !== 'undefined' && netuno.config && netuno.config.websocket) {
      return netuno.config.websocket.servicesPrefix;
    }
    return '/services/ws/private/';
  };

  const load = (onFinish) => {
    const token = localStorage.getItem('user_session_token');
    if (!token) {
      onFinish && onFinish(false);
      return;
    }

    _ws.config({
      url: getWebsocketURL() + '?auth=' + token,
      servicesPrefix: getWebsocketServicesPrefix(),
      method: 'GET',
      autoReconnect: true,
      connect: (event) => {
        console.log('ws connected', event);
        setConnecting(false);
        setConnected(true);
        onFinish && onFinish(true);
      },
      close: (event) => {
        console.log('ws closed', event);
        setConnecting(false);
        setConnected(false);
        onFinish && onFinish(false);
      },
      error: (error) => {
        console.error('ws error', error);
        setConnecting(false);
        setConnected(false);
        onFinish && onFinish(false);
      },
      message: (data, event) => {
        console.log('ws message received', { data, event });
        onMessage && onMessage(data, event);
      }
    });

    _ws.connect();
    setConnecting(true);
  };

  const close = () => {
    _ws.close();
    setConnected(false);
    setConnecting(false);
  };

  return {
    isConnecting: () => connecting,
    isConnected: () => connected,
    load,
    close
  };
}

export default useWS;
