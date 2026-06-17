import React from 'react';
import { Table, Button, Empty, Select } from 'antd';
import { CarOutlined, InboxOutlined } from '@ant-design/icons';

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

const OrdersTableOperadorComponent = ({ orders, onStatusChange }) => {
  const columns = [
    {
      title: 'Data',
      dataIndex: 'data',
      key: 'data',
      render: (text) => formatDate(text),
      sorter: (a, b) => (a.data || '').localeCompare(b.data || '')
    },
    {
      title: 'Cliente',
      key: 'cliente',
      sorter: (a, b) => (a.cliente_nome || '').localeCompare(b.cliente_nome || ''),
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: '600', color: '#333' }}>{record.cliente_nome}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>{record.cliente_email}</div>
        </div>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado, record) => {
        return (
          <Select
            value={estado}
            onChange={(newStatus) => onStatusChange(record.uid, newStatus)}
            style={{ width: '150px', fontWeight: 'bold' }}
            popupClassName="status-select-popup"
            dropdownStyle={{ fontWeight: '600' }}
            options={[
              {
                value: 'Pendente',
                label: (
                  <span style={{ color: '#f0ad4e', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="dot-pulse-orange" style={{ margin: 0 }} />
                    Pendente
                  </span>
                )
              },
              {
                value: 'Em Trânsito',
                label: (
                  <span style={{ color: '#5b5ce1', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="car-animation-wrapper">
                      <CarOutlined style={{ fontSize: '14px' }} />
                    </span>
                    Em Trânsito
                  </span>
                )
              }
            ]}
          />
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
              Não existem encomendas pendentes no sistema
            </span>
          }
          style={{ padding: '32px 0' }}
        />
      </>
    );
  }

  return (
    <>
      {styleBlock}
      <Table
        dataSource={orders}
        columns={columns}
        rowKey="id"
        pagination={{
          pageSize: 8,
          showTotal: (total, range) => `Total: ${total} ${total === 1 ? 'encomenda pendente' : 'encomendas pendentes'}`
        }}
      />
    </>
  );
};

export default OrdersTableOperadorComponent;
