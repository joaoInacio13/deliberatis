import React from 'react';
import { Table, Button, Empty } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';

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

const OrdersTable = ({ orders, handleOpenCreateModal }) => {
  const columns = [
    {
      title: 'Data',
      dataIndex: 'data',
      key: 'data',
      render: (text) => formatDate(text)
    },
    {
      title: 'Descrição',
      dataIndex: 'descricao',
      key: 'descricao',
    },
    {
      title: 'Valor',
      dataIndex: 'valor',
      key: 'valor',
      render: (valor) => `${valor.toFixed(2)}€`,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => {
        let color = '#f0ad4e';
        let dotClass = 'dot-pulse-orange';
        if (estado === 'Em Trânsito') {
          color = '#5b5ce1';
          dotClass = 'dot-pulse-blue';
        } else if (estado === 'Entregue') {
          color = '#5cb85c';
          dotClass = 'dot-static-green';
        }
        return (
          <span style={{ fontWeight: 'bold', color, display: 'inline-flex', alignItems: 'center' }}>
            <span className={dotClass} />
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
      .dot-pulse-orange, .dot-pulse-blue, .dot-static-green {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 8px;
        display: inline-block;
      }
      .dot-pulse-orange {
        background-color: #f0ad4e;
        box-shadow: 0 0 0 0 rgba(240, 173, 78, 0.7);
        animation: pulse-orange 1.5s infinite;
      }
      .dot-pulse-blue {
        background-color: #5b5ce1;
        box-shadow: 0 0 0 0 rgba(91, 92, 225, 0.7);
        animation: pulse-blue 1.5s infinite;
      }
      .dot-static-green {
        background-color: #5cb85c;
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
      @keyframes pulse-blue {
        0% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(91, 92, 225, 0.7);
        }
        70% {
          transform: scale(1);
          box-shadow: 0 0 0 6px rgba(91, 92, 225, 0);
        }
        100% {
          transform: scale(0.95);
          box-shadow: 0 0 0 0 rgba(91, 92, 225, 0);
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
      <Table
        dataSource={orders}
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

export default OrdersTable;
