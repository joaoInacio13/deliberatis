import React from 'react';
import { Card } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

const OrderDetailsMap = ({ order, mapRef }) => {
  return (
    <Card 
      title={
        <span style={{ fontSize: '18px', fontWeight: '600' }}>
          <EnvironmentOutlined style={{ marginRight: '8px', color: '#5b5ce1' }} />
          Morada de Entrega
        </span>
      }
      style={{ height: '100%', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}
      bodyStyle={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 58px)', padding: '24px' }}
    >
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>
          {order.rua}, Nº {order.porta}{order.andar ? `, ${order.andar}` : ''}
        </div>
        <div style={{ color: '#666', fontSize: '15px', marginTop: '4px' }}>
          {order.codigo_postal} - {order.cidade}
        </div>
      </div>

      <div 
        ref={mapRef} 
        style={{ 
          flex: 1, 
          minHeight: '320px', 
          width: '100%', 
          borderRadius: '6px', 
          border: '1px solid #e8e8e8',
          zIndex: 1
        }} 
      />
    </Card>
  );
};

export default OrderDetailsMap;
