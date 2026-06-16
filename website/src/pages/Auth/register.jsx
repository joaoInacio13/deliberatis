import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, DatePicker, Select, notification } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import _service from '@netuno/service-client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * Componente do formulário de registo de utilizadores
 */
const Register = ({ onNavigate }) => {
  const [loading, setLoading] = useState(false);

  // Desativa a seleção de datas que não correspondam a pelo menos 16 anos de idade
  const disabledDate = (current) => {
    return current && current > dayjs().subtract(16, 'year').endOf('day');
  };

  const onFinish = (values) => {
    // Formata a data de nascimento para o padrão YYYY-MM-DD aceito pelo backend
    const formattedValues = {
      ...values,
      data_de_nascimento: values.data_de_nascimento ? values.data_de_nascimento.format('YYYY-MM-DD') : null
    };

    _service({
      url: '/register',
      method: 'POST',
      data: formattedValues,
      start: () => {
        setLoading(true); 
      },
      success: ({ json }) => {
        if (json.result === true) {
          notification.success({
            message: 'Registo com Sucesso!',
            description: 'A tua conta foi criada com sucesso. Já podes fazer login.'
          });
          onNavigate('login');
        } else {
          notification.error({
            message: 'Erro no Registo',
            description: json.error || 'Não foi possível guardar os teus dados.'
          });
        }
      },
      fail: (e) => {
        console.error("Register failed.", e);
        notification.error({
          message: 'Erro no Registo',
          description: 'Houve uma falha na ligação ao servidor.'
        });
      },
      end: () => {
        setLoading(false); 
      }
    });
  };

  return (
    <Card style={{ width: 450, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, color: '#5b5ce1' }}>Criar Conta</Title>
        <Text type="secondary">Junta-te à Deliberatis</Text>
      </div>

      <Form name="register_form" layout="vertical" onFinish={onFinish}>
        {/* Campo do Primeiro Nome */}
        <Form.Item
          name="primeiro_nome"
          label="Primeiro Nome"
          rules={[
            { required: true, message: 'Insere o teu primeiro nome!' },
            { min: 2, message: 'O nome deve ter pelo menos 2 caracteres!' },
            {
              pattern: /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/,
              message: 'O nome deve conter apenas letras!'
            }
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="Ex: João" size="large" />
        </Form.Item>

        {/* Campo do Último Nome */}
        <Form.Item
          name="ultimo_nome"
          label="Último Nome"
          rules={[
            { required: true, message: 'Insere o teu último nome!' },
            { min: 2, message: 'O nome deve ter pelo menos 2 caracteres!' },
            {
              pattern: /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/,
              message: 'O nome deve conter apenas letras!'
            }
          ]}
        >
          <Input prefix={<UserOutlined />} placeholder="Ex: Silva" size="large" />
        </Form.Item>

        {/* Campo de Email com validação de formato email */}
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, type: 'email', message: 'Insere um email válido!' }]}
        >
          <Input prefix={<MailOutlined />} placeholder="Ex: joao@deliberatis.com" size="large" />
        </Form.Item>

        {/* Campo de Password com validação de força (regex para maiúscula, número e min 6 chars) */}
        <Form.Item
          name="password"
          label="Password"
          rules={[
            { required: true, message: 'Insere a tua password!' },
            { min: 6, message: 'A password deve ter pelo menos 6 caracteres!' },
            {
              pattern: /^(?=.*[A-Z])(?=.*\d)/,
              message: 'A password deve conter pelo menos uma letra maiúscula e um número!'
            }
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
        </Form.Item>

        {/* Campo de Data de Nascimento com limite para datas passadas */}
        <Form.Item
          name="data_de_nascimento"
          label="Data de Nascimento"
          rules={[{ required: true, message: 'Seleciona a tua data de nascimento!' }]}
        >
          <DatePicker 
            style={{ width: '100%' }} 
            size="large" 
            placeholder="Selecionar data" 
            format="YYYY-MM-DD" 
            disabledDate={disabledDate} 
            defaultPickerValue={dayjs().subtract(16, 'year')}
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading} style={{ backgroundColor: '#5b5ce1' }}>
            Registar
          </Button>
        </Form.Item>
      </Form>

      {/* Ligação de navegação rápida para voltar ao ecrã de login */}
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
