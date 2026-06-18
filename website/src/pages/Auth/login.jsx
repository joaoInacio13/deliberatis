import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, notification } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import _service from '@netuno/service-client';

const { Title, Text } = Typography;

/**
 * Componente do formulário de Login de utilizadores
 */
const Login = ({ onNavigate, onLoginFake }) => {
  const [loading, setLoading] = useState(false);

  const onFinish = (values) => {
    _service({
      url: '/_auth',
      method: 'POST',
      data: {
        username: values.email,
        password: values.password,
        jwt: true
      },
      start: () => {
        setLoading(true);
      },
      success: ({ json }) => {
        if (json.result === true) {
          localStorage.setItem('user_session_token', json.access_token);
          notification.success({
            message: 'Sessão Iniciada!',
            description: 'Login efetuado com sucesso!'
          });
          onLoginFake(); // Redireciona para o portal/home
        } else {
          notification.error({
            message: 'Erro no Login',
            description: json.error || 'Credenciais inválidas.'
          });
        }
      },
      fail: (e) => {
        console.error("Login request failed: ", e);
        notification.error({
          message: 'Erro no Login',
          description: 'Não foi possível ligar ao servidor ou credenciais inválidas.'
        });
      },
      end: () => {
        setLoading(false);
      }
    });
  };

  return (
    <Card style={{ width: 400, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img src="/public/images/logo_deliberatis.png" alt="Deliberatis Logo" style={{ maxHeight: '48px', width: 'auto', marginBottom: '8px' }} />
        <br />
        <Text type="secondary">Inicia sessão na tua conta</Text>
      </div>

      <Form name="login_form" layout="vertical" onFinish={onFinish}>
        {/* Campo do Email */}
        <Form.Item
          name="email"
          rules={[
            { required: true, message: 'Por favor, insere o teu email!' },
            { type: 'email', message: 'Insere um email válido!' }
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="Ex: joao@deliberatis.com" size="large" />
        </Form.Item>

        {/* Campo da Palavra-passe */}
        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Por favor, insere a tua password!' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ backgroundColor: '#5b5ce1' }}>
            Entrar
          </Button>
        </Form.Item>
      </Form>

      {/* Ligação de navegação rápida para ir para o ecrã de registo */}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Text>Não tens conta? </Text>
        <a onClick={() => onNavigate('register')} style={{ color: '#5b5ce1', fontWeight: 'bold' }}>
          Regista-te aqui
        </a>
      </div>
    </Card>
  );
};

export default Login;

