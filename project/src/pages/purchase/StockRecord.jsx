import React, { useState } from 'react';
import { Layout, Typography, Button, Table, Modal } from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';

const { Content } = Layout;
const { Title } = Typography;

const stockData = [
  {
    key: '1',
    fishName: 'Ikan Tuna',
    totalStockKg: 150,
    shrinkage: [
      { container: 'Container A', amountKg: 5 },
      { container: 'Container B', amountKg: 3 },
    ],
  },
  {
    key: '2',
    fishName: 'Ikan Salmon',
    totalStockKg: 100,
    shrinkage: [
      { container: 'Container C', amountKg: 2 },
      { container: 'Container D', amountKg: 4 },
    ],
  },
];

function StockRecord() {
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
    doc.text('Laporan Stok Ikan', 20, 20);
    doc.setFontSize(12);
    doc.text(`Nama Ikan: ${record.fishName}`, 20, 30);
    doc.text(`Total Stok: ${record.totalStockKg} kg`, 20, 40);

    let y = 50;
    doc.text('Potong Susut:', 20, y);
    record.shrinkage.forEach((item, index) => {
      y += 10;
      doc.text(`${item.container}: ${item.amountKg} kg`, 30, y);
    });

    const totalShrinkage = record.shrinkage.reduce((sum, s) => sum + s.amountKg, 0);
    doc.text(`Total Susut: ${totalShrinkage} kg`, 20, y + 15);

    doc.save(`stok_${record.fishName}.pdf`);
  };

  const columns = [
    {
      title: 'Nama Ikan',
      dataIndex: 'fishName',
      key: 'fishName',
    },
    {
      title: 'Total Stok (kg)',
      dataIndex: 'totalStockKg',
      key: 'totalStockKg',
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
        <Button onClick={() => handlePrint(record)} type="primary">
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
          <Title level={2}>Pencatatan Stok Ikan</Title>

          <Table
            dataSource={stockData}
            columns={columns}
            pagination={false}
            className="mt-6"
          />

          <Modal
            title={`Detail Susut - ${selectedItem?.fishName}`}
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            footer={null}
          >
            {selectedItem && (
              <div>
                <p>Total Stok: {selectedItem.totalStockKg} kg</p>
                <p>Rincian Potong Susut:</p>
                <ul>
                  {selectedItem.shrinkage.map((item, index) => (
                    <li key={index}>{item.container}: {item.amountKg} kg</li>
                  ))}
                </ul>
                <p>
                  <strong>Total Susut: </strong>
                  {selectedItem.shrinkage.reduce((sum, item) => sum + item.amountKg, 0)} kg
                </p>
              </div>
            )}
          </Modal>
        </div>
      </Content>
      <FooterSection />
    </Layout>
  );
}

export default StockRecord;
