import React from 'react';
import { Form, Input, Button, Card, Typography } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const Register = ({ onNavigate }) => {
  const onFinish = (values) => {
    alert('Registo simulado com sucesso! Agora podes fazer login.');
    onNavigate('login');
  };

  return (
    <Card style={{ width: 400, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: '#5b5ce1' }}>Criar Conta</Title>
        <Text type="secondary">Junta-te à Deliberatis</Text>
      </div>

      <Form name="register_form" layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="username"
          rules={[{ required: true, message: 'Escolhe um nome de utilizador!' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Utilizador" size="large" />
        </Form.Item>

        <Form.Item
          name="email"
          rules={[{ required: true, type: 'email', message: 'Insere um email válido!' }]}
        >
          <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Cria uma password!' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" block style={{ backgroundColor: '#5b5ce1' }}>
            Registar
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Text>Já tens conta? </Text>
        <a onClick={() => onNavigate('login')} style={{ color: '#5b5ce1', fontWeight: 'bold' }}>
          Faz login aqui
        </a>
      </div>
    </Card>
  );
};

export default Register;