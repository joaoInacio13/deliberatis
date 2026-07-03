import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, DatePicker, Button, Spin, notification } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import _service from '@netuno/service-client';
import './index.less';

const ProfileModal = ({ open, onCancel, onUpdateSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    const token = localStorage.getItem('user_session_token');

    _service({
      url: '/profile',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      success: ({ json }) => {
        setLoading(false);
        if (json.result === true) {
          form.setFieldsValue({
            primeiro_nome: json.primeiro_nome,
            ultimo_nome: json.ultimo_nome,
            email: json.email,
            data_de_nascimento: json.data_de_nascimento ? dayjs(json.data_de_nascimento) : null
          });
        } else {
          notification.error({
            message: 'Erro',
            description: json.error || 'Erro ao obter dados do perfil.'
          });
          onCancel();
        }
      },
      fail: () => {
        setLoading(false);
        notification.error({
          message: 'Erro',
          description: 'Não foi possível ligar ao servidor.'
        });
        onCancel();
      }
    });
  }, [open]);

  const onFinish = (values) => {
    setSubmitting(true);
    const token = localStorage.getItem('user_session_token');

    _service({
      url: '/profile',
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      data: {
        primeiro_nome: values.primeiro_nome,
        ultimo_nome: values.ultimo_nome,
        data_de_nascimento: values.data_de_nascimento ? values.data_de_nascimento.format('YYYY-MM-DD') : null,
        password: values.password || undefined
      },
      success: ({ json }) => {
        setSubmitting(false);
        if (json.result === true) {
          notification.success({
            message: 'Sucesso',
            description: 'Perfil atualizado com sucesso!'
          });
          if (onUpdateSuccess) {
            onUpdateSuccess(values.primeiro_nome);
          }
          form.setFieldsValue({ password: '', confirm_password: '' });
          onCancel();
        } else {
          notification.error({
            message: 'Erro',
            description: json.error || 'Erro ao atualizar o perfil.'
          });
        }
      },
      fail: () => {
        setSubmitting(false);
        notification.error({
          message: 'Erro',
          description: 'Houve uma falha na ligação ao servidor.'
        });
      }
    });
  };

  const disabledDate = (current) => {
    return current && current > dayjs().subtract(16, 'year').endOf('day');
  };

  return (
    <Modal
      title={<span className="profile-modal__title">O Meu Perfil</span>}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      {loading ? (
        <div className="profile-modal__loading-container">
          <Spin size="large" tip="A carregar os teus dados..." />
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
        >
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
            <Input prefix={<UserOutlined style={{ color: '#aaa' }} />} placeholder="Primeiro Nome" size="large" />
          </Form.Item>

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
            <Input prefix={<UserOutlined style={{ color: '#aaa' }} />} placeholder="Último Nome" size="large" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email (Não Editável)"
          >
            <Input prefix={<MailOutlined />} disabled className="profile-modal__input-readonly" size="large" />
          </Form.Item>

          <Form.Item
            name="data_de_nascimento"
            label="Data de Nascimento"
            rules={[{ required: true, message: 'Seleciona a tua data de nascimento!' }]}
          >
            <DatePicker 
              className="profile-modal__date-picker" 
              size="large" 
              placeholder="Selecionar data" 
              format="YYYY-MM-DD" 
              disabledDate={disabledDate} 
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Nova Password (Opcional)"
            rules={[
              { min: 6, message: 'A password deve ter pelo menos 6 caracteres!' },
              {
                pattern: /^(?=.*[A-Z])(?=.*\d)/,
                message: 'A password deve conter pelo menos uma letra maiúscula e um número!'
              }
            ]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#aaa' }} />} placeholder="Password" size="large" />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            label="Confirmar Nova Password"
            dependencies={['password']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('As passwords não coincidem!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#aaa' }} />} placeholder="Confirmar Password" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={submitting}
              className="profile-modal__save-btn"
            >
              Guardar Alterações
            </Button>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default ProfileModal;
