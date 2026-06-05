import React from 'react';
import { Form, Input, Button, Card, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * Componente do formulário de Login de utilizadores
 */
const Login = ({ onNavigate, onLoginFake }) => {
  return (
    <Card style={{ width: 400, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: '#5b5ce1' }}>Deliberatis</Title>
        <Text type="secondary">Inicia sessão na tua conta</Text>
      </div>

      {/* Ao submeter com sucesso, chama a função de autenticação simulada (onLoginFake) */}
      <Form name="login_form" layout="vertical" onFinish={onLoginFake}>
        {/* Campo do Nome de Utilizador ou Email */}
        <Form.Item
          name="username"
          rules={[{ required: true, message: 'Por favor, insere o teu utilizador!' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Utilizador ou Email" size="large" />
        </Form.Item>

        {/* Campo da Palavra-passe */}
        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Por favor, insere a tua password!' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" block style={{ backgroundColor: '#5b5ce1' }}>
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