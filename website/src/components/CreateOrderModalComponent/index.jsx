import React from 'react';
import { Modal, Form, Input, InputNumber, Select, Button, Spin } from 'antd';
import { LoadingOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';

const { Option } = Select;

const DISTRITOS = [
  "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco", "Coimbra", 
  "Évora", "Faro", "Guarda", "Leiria", "Lisboa", "Portalegre", 
  "Porto", "Santarém", "Setúbal", "Viana do Castelo", "Vila Real", "Viseu"
];

const CreateOrderModal = ({
  open,
  onCancel,
  form,
  submitting,
  onFinish,
  onValuesChange,
  openMapModal,
  postalCodeStatus,
  postalCodeErrorMsg,
  loadingPostalCode,
  handlePostalCodeChange
}) => {
  return (
    <Modal
      title="Criar Nova Encomenda"
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ metodo_pagamento: 'MBWay' }}
        onValuesChange={onValuesChange}
      >
        {/* Campo Descrição */}
        <Form.Item
          name="descricao"
          label="Descrição da Encomenda"
          rules={[{ required: true, message: 'Insere os detalhes da encomenda!' }]}
        >
          <Input.TextArea placeholder="Ex: Hambúrguer, Batatas Fritas e Cola Zero" rows={3} />
        </Form.Item>

        {/* Botão para abrir o Mapa */}
        <div style={{ marginBottom: '16px' }}>
          <Button 
            type="dashed" 
            onClick={openMapModal}
            style={{ width: '100%', height: '40px', fontWeight: '500' }}
          >
            🗺️ Selecionar Localização no Mapa
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          {/* Campo Preço */}
          <Form.Item
            name="preco"
            label="Preço (€)"
            rules={[{ required: true, message: 'Insere o valor da encomenda!' }]}
            style={{ flex: 1 }}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              step={0.01}
              placeholder="Ex: 12.50"
              formatter={(value) => `${value}`}
            />
          </Form.Item>

          {/* Campo Código Postal */}
          <Form.Item
            name="codigo_postal"
            label="Código Postal"
            rules={[
              { required: true, message: 'Insere o código postal!' },
              { pattern: /^\d{4}-\d{3}$/, message: 'Formato inválido (XXXX-XXX)!' }
            ]}
            validateStatus={postalCodeStatus === 'error' ? 'error' : postalCodeStatus === 'success' ? 'success' : ''}
            help={postalCodeErrorMsg || null}
            style={{ flex: 1 }}
          >
            <Input 
              placeholder="Ex: 4000-011" 
              onChange={handlePostalCodeChange} 
              maxLength={8} 
              suffix={
                loadingPostalCode ? (
                  <Spin size="small" indicator={<LoadingOutlined style={{ fontSize: 16 }} spin />} />
                ) : postalCodeStatus === 'success' ? (
                  <CheckCircleFilled style={{ color: '#52c41a' }} />
                ) : postalCodeStatus === 'error' ? (
                  <CloseCircleFilled style={{ color: '#ff4d4f' }} />
                ) : null
              }
            />
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          {/* Campo Rua */}
          <Form.Item
            name="rua"
            label="Rua"
            rules={[{ required: true, message: 'Falta preencher a rua!' }]}
            style={{ flex: 2 }}
          >
            <Input placeholder="Ex: Rua Quinta da Bica (ou aguarde preenchimento)" style={{ color: '#000000' }} />
          </Form.Item>

          {/* Campo Cidade */}
          <Form.Item
            name="cidade"
            label="Cidade / Distrito"
            rules={[{ required: true, message: 'Falta selecionar o distrito!' }]}
            style={{ flex: 1 }}
          >
            <Select placeholder="Selecionar..." showSearch filterOption={(input, option) => (option?.value ?? '').toLowerCase().includes(input.toLowerCase())}>
              {DISTRITOS.map(d => (
                <Option key={d} value={d}>{d}</Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          {/* Campo Porta */}
          <Form.Item
            name="porta"
            label="Porta/Nº"
            rules={[{ required: true, message: 'Insere o número de porta!' }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="Ex: 10" />
          </Form.Item>

          {/* Campo Andar */}
          <Form.Item
            name="andar"
            label="Andar / Fração"
            rules={[{ required: true, message: 'Insere o andar ou fração!' }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="Ex: 3º Esq" />
          </Form.Item>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          {/* Campo Número de Telemóvel */}
          <Form.Item
            name="telefone"
            label="Telemóvel de Contacto"
            rules={[
              { required: true, message: 'Insere o contacto telefónico!' },
              { pattern: /^9\d{8}$/, message: 'Insere um número de telefone português válido (9 dígitos e que começe por 9)!' }
            ]}
            style={{ flex: 1 }}
          >
            <Input placeholder="Ex: 912345678" />
          </Form.Item>

          {/* Campo Método de Pagamento */}
          <Form.Item
            name="pagamento"
            label="Método de Pagamento"
            rules={[{ required: true }]}
            style={{ flex: 1 }}
          >
            <Select>
              <Option value="MBWay">MBWay</Option>
              <Option value="Dinheiro na Entrega">Dinheiro na Entrega</Option>
              <Option value="Cartão de Crédito/Débito">Cartão de Crédito/Débito</Option>
            </Select>
          </Form.Item>
        </div>

        {/* Campo Observações (Opcional) */}
        <Form.Item
          name="observacoes"
          label="Observações Adicionais (Opcional)"
        >
          <Input.TextArea placeholder="Ex: Sem cebola, campainha avariada, etc." rows={2} />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onCancel} style={{ marginRight: '8px' }}>
            Cancelar
          </Button>
          <Button type="primary" htmlType="submit" loading={submitting} style={{ backgroundColor: '#5b5ce1', borderColor: '#5b5ce1' }}>
            Submeter Encomenda
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateOrderModal;
