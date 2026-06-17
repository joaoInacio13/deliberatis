import React, { useState } from 'react';
import { Table, Button, Empty, Segmented } from 'antd';
import { ShoppingCartOutlined, CarOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.substring(0, 19).split(' ');
  if (parts.length === 2) {
    const dateParts = parts[0].split('-');
    if (dateParts.length === 3) {
      const [year, month, day] = dateParts;
      return `${day}/${month}/${year} ${parts[1]}`;
    }
  }
  return dateStr;
};

const OrdersTableCliente = ({ orders, handleOpenCreateModal }) => {
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  const filteredOrders = selectedStatus === 'Todos'
    ? orders
    : orders.filter(order => order.estado === selectedStatus);

  const columns = [
    {
      title: 'Data',
      dataIndex: 'data',
      key: 'data',
      render: (text) => formatDate(text),
      sorter: (a, b) => (a.data || '').localeCompare(b.data || '')
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
      sorter: (a, b) => (a.descricao || '').localeCompare(b.descricao || '')
    },
    {
      title: 'Valor',
      dataIndex: 'valor',
      key: 'valor',
      render: (valor) => `${valor.toFixed(2)}€`,
      sorter: (a, b) => (a.valor || 0) - (b.valor || 0)
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => {
        if (estado === 'Em Trânsito') {
          return (
            <span style={{ fontWeight: 'bold', color: '#5b5ce1', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="car-animation-wrapper">
                <CarOutlined style={{ fontSize: '16px' }} />
              </span>
              {estado}
            </span>
          );
        } else if (estado === 'Entregue') {
          return (
            <span style={{ fontWeight: 'bold', color: '#2eb82e', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircleOutlined style={{ fontSize: '15px' }} />
              {estado}
            </span>
          );
        } else if (estado === 'Rejeitada') {
          return (
            <span style={{ fontWeight: 'bold', color: '#e03b3b', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <CloseCircleOutlined style={{ fontSize: '15px' }} />
              {estado}
            </span>
          );
        }
        return (
          <span style={{ fontWeight: 'bold', color: '#f0ad4e', display: 'inline-flex', alignItems: 'center' }}>
            <span className="dot-pulse-orange" />
            {estado}
          </span>
        );
      }
    },
    {
      title: 'Ações',
      key: 'acoes',
      render: (_, record) => (
        <Button
          type="primary"
          onClick={() => window.location.href = `/public/order-details.html?uid=${record.uid}`}
          style={{ fontWeight: '600', backgroundColor: '#5b5ce1', borderColor: '#5b5ce1', borderRadius: '6px' }}
        >
          Mais Detalhes
        </Button>
      )
    }
  ];

  const styleBlock = (
    <style>{`
      .ant-segmented {
        background-color: #f0f2ff !important;
        border: 1px solid #dcdffb !important;
      }
      .ant-segmented-item-selected {
        background-color: #5b5ce1 !important;
        color: #ffffff !important;
      }
      .ant-segmented-item-selected .ant-segmented-item-label {
        color: #ffffff !important;
      }
      .ant-segmented-item:hover {
        color: #5b5ce1 !important;
      }
      .dot-pulse-orange {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 8px;
        display: inline-block;
        background-color: #f0ad4e;
        box-shadow: 0 0 0 0 rgba(240, 173, 78, 0.7);
        animation: pulse-orange 1.5s infinite;
      }
      .car-animation-wrapper {
        display: inline-block;
        animation: car-engine-idle 1.5s infinite ease-in-out;
      }
      @keyframes car-engine-idle {
        0% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-1.5px);
        }
        100% {
          transform: translateY(0);
        }
      }
      @keyframes pulse-orange {
        0% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(240, 173, 78, 0.7);
        }
        70% {
          transform: scale(1);
          box-shadow: 0 0 0 6px rgba(240, 173, 78, 0);
        }
        100% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(240, 173, 78, 0);
        }
      }
      .ant-table-pagination.ant-pagination {
        width: 100% !important;
        display: flex !important;
        align-items: center !important;
      }
      .ant-pagination-total-text {
        margin-right: auto !important;
        font-weight: 600;
        color: #555555;
      }
    `}</style>
  );

  if (orders.length === 0) {
    return (
      <>
        {styleBlock}
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: '#999999', fontSize: '16px' }}>
              Não tem nenhuma encomenda
            </span>
          }
          style={{ padding: '32px 0' }}
        >
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            onClick={handleOpenCreateModal}
            style={{ backgroundColor: '#5b5ce1', borderColor: '#5b5ce1' }}
          >
            Fazer a Primeira Encomenda
          </Button>
        </Empty>
      </>
    );
  }

  return (
    <>
      {styleBlock}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-start' }}>
        <Segmented
          options={['Todos', 'Pendente', 'Em Trânsito', 'Entregue', 'Rejeitada']}
          value={selectedStatus}
          onChange={setSelectedStatus}
          style={{ fontWeight: '600', padding: '4px' }}
        />
      </div>
      <Table
        dataSource={filteredOrders}
        columns={columns}
        rowKey="id"
        pagination={{
          pageSize: 8,
          showTotal: (total, range) => `Total: ${total} ${total === 1 ? 'encomenda' : 'encomendas'}`
        }}
      />
    </>
  );
};

export default OrdersTableCliente;
