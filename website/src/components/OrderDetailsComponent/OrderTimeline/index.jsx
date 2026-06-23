import React from 'react';
import { Card, Steps } from 'antd';

const OrderTimeline = ({ statusIndex, statusText, rejectionReason }) => {
  const isRejected = statusText === 'Rejeitada';
  return (
    <Card style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', padding: '12px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '28px', color: '#444', fontSize: '20px', fontWeight: '600' }}>
        Estado do Pedido
      </h3>
      <Steps
        current={isRejected ? 0 : statusIndex}
        status={isRejected ? 'error' : undefined}
        items={[
          { 
            title: <span style={{ fontSize: '16px', fontWeight: '600' }}>{isRejected ? 'Rejeitada' : 'Submetida'}</span>, 
            description: <span style={{ fontSize: '13px' }}>{isRejected ? `Motivo: ${rejectionReason || 'Não especificado'}` : 'Encomenda registada'}</span> 
          },
          { 
            title: <span style={{ fontSize: '16px', fontWeight: '600' }}>Em Trânsito</span>, 
            description: <span style={{ fontSize: '13px' }}>A caminho da morada</span> 
          },
          { 
            title: <span style={{ fontSize: '16px', fontWeight: '600' }}>Entregue</span>, 
            description: <span style={{ fontSize: '13px' }}>Entregue com sucesso</span> 
          }
        ]}
      />
    </Card>
  );
};

export default OrderTimeline;
