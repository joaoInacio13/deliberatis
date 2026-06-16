import React from 'react';
import { Modal, Button, Input } from 'antd';

const MapModal = ({
  open,
  onCancel,
  onConfirmLocation,
  searchQuery,
  setSearchQuery,
  searchingMap,
  handleMapSearch,
  mapRef
}) => {
  return (
    <Modal
      title="Selecionar Localização no Mapa"
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="confirm" type="primary" onClick={onConfirmLocation} style={{ backgroundColor: '#5b5ce1', borderColor: '#5b5ce1' }}>
          Confirmar Localização
        </Button>
      ]}
      width={600}
      destroyOnClose
    >
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <Input 
          placeholder="Pesquisar localidade (ex: Algarve, Porto, Coimbra)..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          onPressEnter={handleMapSearch}
        />
        <Button type="primary" onClick={handleMapSearch} loading={searchingMap} style={{ backgroundColor: '#5b5ce1', borderColor: '#5b5ce1' }}>
          Pesquisar
        </Button>
      </div>
      <div 
        ref={mapRef} 
        style={{ 
          height: '350px', 
          width: '100%', 
          borderRadius: '8px', 
          border: '1px solid #d9d9d9',
          zIndex: 1
        }} 
      />
      <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
        Clique no mapa para colocar o PIN azul e preencher a morada.
      </div>
    </Modal>
  );
};

export default MapModal;
