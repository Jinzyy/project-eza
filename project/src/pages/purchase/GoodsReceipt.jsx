import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, Table, Modal, message } from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import axios from 'axios';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';
import config from '../../config'

const { Content } = Layout;
const { Title } = Typography;

function GoodsReceipt() {
  const navigate = useNavigate();
  const [receiptData, setReceiptData] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const token = sessionStorage.getItem('token');
  const authHeader = { headers: { Authorization: token } };

  // Fetch data penerimaan
  useEffect(() => {
    axios.get(`${config.API_BASE_URL}/penerimaan_barang`, authHeader)
    .then((res) => {
      if (Array.isArray(res.data)) {
        setReceiptData(res.data);
      } else {
        message.error('Format data tidak sesuai.');
        setReceiptData([]);
      }
    })
    .catch((err) => {
      message.error('Gagal memuat data penerimaan barang');
      console.error(err);
    });
  }, []);

  const showDetail = (record) => {
    axios.get(`${config.API_BASE_URL}/penerimaan_barang/${record.key}`, authHeader)
    .then((res) => {
      setSelectedItem(res.data);
      setIsModalVisible(true);
    })
    .catch((err) => {
      message.error('Gagal memuat detail penerimaan');
      console.error(err);
    });
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
            rowKey="key"
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
