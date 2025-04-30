import React, { useState } from 'react';
import { Layout, Typography, Button, Table, Modal } from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';

const { Content } = Layout;
const { Title } = Typography;

const receiptData = [
  {
    key: '1',
    fishName: 'Ikan Kakap',
    receivedKg: 200,
    date: '2025-04-25',
    supplier: 'PT Laut Segar',
    notes: 'Diterima dalam kondisi baik',
  },
  {
    key: '2',
    fishName: 'Ikan Kembung',
    receivedKg: 120,
    date: '2025-04-28',
    supplier: 'CV Laut Biru',
    notes: 'Sebagian es mencair, perlu dicek ulang',
  },
];

function GoodsReceipt() {
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const showDetail = (record) => {
    setSelectedItem(record);
    setIsModalVisible(true);
  };

  const handlePrint = (record) => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Dokumen Penerimaan Barang', 20, 20);
    doc.setFontSize(12);
    doc.text(`Nama Ikan: ${record.fishName}`, 20, 30);
    doc.text(`Jumlah Diterima: ${record.receivedKg} kg`, 20, 40);
    doc.text(`Tanggal Penerimaan: ${record.date}`, 20, 50);
    doc.text(`Supplier: ${record.supplier}`, 20, 60);
    doc.text(`Catatan: ${record.notes}`, 20, 70);
    doc.save(`penerimaan_${record.fishName}.pdf`);
  };

  const columns = [
    {
      title: 'Nama Ikan',
      dataIndex: 'fishName',
      key: 'fishName',
    },
    {
      title: 'Jumlah Diterima (kg)',
      dataIndex: 'receivedKg',
      key: 'receivedKg',
    },
    {
      title: 'Tanggal',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Detail',
      key: 'detail',
      render: (_, record) => (
        <Button onClick={() => showDetail(record)}>
          Lihat Detail
        </Button>
      ),
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" onClick={() => handlePrint(record)}>
          Cetak PDF
        </Button>
      ),
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content>
        <div className="container mx-auto px-6 py-12">
          <Button 
            icon={<ArrowLeftIcon size={16} />} 
            onClick={() => navigate('/purchase')}
            className="mb-6"
          >
            Kembali
          </Button>
          <Title level={2}>Dokumen Penerimaan Barang</Title>

          <Table
            dataSource={receiptData}
            columns={columns}
            pagination={false}
            className="mt-6"
          />

          <Modal
            title={`Detail - ${selectedItem?.fishName}`}
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            footer={null}
          >
            {selectedItem && (
              <div>
                <p><strong>Jumlah Diterima:</strong> {selectedItem.receivedKg} kg</p>
                <p><strong>Tanggal:</strong> {selectedItem.date}</p>
                <p><strong>Supplier:</strong> {selectedItem.supplier}</p>
                <p><strong>Catatan:</strong> {selectedItem.notes}</p>
              </div>
            )}
          </Modal>
        </div>
      </Content>
      <FooterSection />
    </Layout>
  );
}

export default GoodsReceipt;
