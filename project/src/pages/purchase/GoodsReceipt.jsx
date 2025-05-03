import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, Table, Modal, message } from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import axios from 'axios';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';
import config from '../../config';

const { Content } = Layout;
const { Title } = Typography;

// helper untuk mengelompokkan ikan & total beratnya
const groupFishData = (items) => {
  const grouped = {};
  items.forEach(({ nama_ikan, berat_awal, potong_susut }) => {
    const net = berat_awal - potong_susut;
    if (!grouped[nama_ikan]) grouped[nama_ikan] = 0;
    grouped[nama_ikan] += net;
  });
  return Object.entries(grouped).map(([fishName, totalWeight]) => ({
    fishName,
    totalWeight,
  }));
};

// helper untuk total semua berat
const getTotalWeight = (items) =>
  items.reduce((sum, { berat_awal, potong_susut }) => sum + (berat_awal - potong_susut), 0);

function GoodsReceipt() {
  const navigate = useNavigate();
  const [receiptData, setReceiptData] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const token = sessionStorage.getItem('token');
  const authHeader = { headers: { Authorization: token } };

  // Fetch daftar penerimaan
  useEffect(() => {
    axios
      .get(`${config.API_BASE_URL}/penerimaan_barang`, authHeader)
      .then((res) => {
        if (res.data.status && Array.isArray(res.data.data)) {
          setReceiptData(res.data.data);
        } else {
          message.error('Format data tidak sesuai.');
        }
      })
      .catch((err) => {
        message.error('Gagal memuat data penerimaan barang');
        console.error(err);
      });
  }, []);

  // Load detail & show modal
  const showDetail = (record) => {
    axios
      .get(`${config.API_BASE_URL}/penerimaan_barang/${record.id_penerimaan_barang}`, authHeader)
      .then((res) => {
        setSelectedItem(res.data);
        setIsModalVisible(true);
      })
      .catch((err) => {
        message.error('Gagal memuat detail penerimaan');
        console.error(err);
      });
  };

  // Cetak PDF berdasarkan detail dari endpoint
  const handlePrint = (record) => {
    axios
      .get(`${config.API_BASE_URL}/penerimaan_barang/${record.id_penerimaan_barang}`, authHeader)
      .then((res) => {
        const data = res.data;
        const items = data.detail_penerimaan_barang;
        const grouped = groupFishData(items);
        const totalAll = getTotalWeight(items);

        const doc = new jsPDF();
        let y = 20;
        doc.setFontSize(14);
        doc.text('Dokumen Penerimaan Barang', 20, y);

        y += 10;
        doc.setFontSize(12);
        doc.text(`No: ${data.nomor_penerimaan_barang}`, 20, y);
        y += 8;
        doc.text(`Nama Kapal: ${data.nama_kapal}`, 20, y);
        y += 8;
        doc.text(`Tanggal: ${data.tanggal_terima}`, 20, y);
        y += 8;
        doc.text(`Nama Gudang: ${data.nama_gudang}`, 20, y);
        y += 8;
        doc.text(`Container: ${data.metode_kapal}`, 20, y);

        y += 12;
        doc.text('Detail Ikan:', 20, y);
        grouped.forEach(({ fishName, totalWeight }) => {
          y += 8;
          doc.text(`- ${fishName}: ${totalWeight.toLocaleString()} kg`, 25, y);
        });

        y += 12;
        doc.text(`Total Berat Semua Ikan: ${totalAll.toLocaleString()} kg`, 20, y);

        doc.save(`penerimaan_${data.nomor_penerimaan_barang}.pdf`);
      })
      .catch((err) => {
        message.error('Gagal mencetak PDF');
        console.error(err);
      });
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id_penerimaan_barang',
      key: 'id_penerimaan_barang',
    },
    {
      title: 'Nomor Penerimaan',
      dataIndex: 'nomor_penerimaan_barang',
      key: 'nomor_penerimaan_barang',
    },
    {
      title: 'Tanggal',
      dataIndex: 'tanggal_terima',
      key: 'tanggal_terima',
    },
    {
      title: 'Detail',
      key: 'detail',
      render: (_, record) => (
        <Button onClick={() => showDetail(record)}>Lihat Detail</Button>
      ),
    },
    {
      title: 'Cetak',
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
            rowKey="id_penerimaan_barang"
            pagination={false}
            className="mt-6"
          />

          <Modal
            title={`Detail - ${selectedItem?.nomor_penerimaan_barang}`}
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            footer={null}
            width={700}
          >
            {selectedItem && (
              <div>
                <p><strong>No:</strong> {selectedItem.nomor_penerimaan_barang}</p>
                <p><strong>Nama Kapal:</strong> {selectedItem.nama_kapal}</p>
                <p><strong>Tanggal:</strong> {selectedItem.tanggal_terima}</p>
                <p><strong>Nama Gudang:</strong> {selectedItem.nama_gudang}</p>
                <p><strong>Container:</strong> {selectedItem.metode_kapal}</p>

                <Title level={5} className="mt-4">Ringkasan Ikan</Title>
                <Table
                  dataSource={groupFishData(selectedItem.detail_penerimaan_barang)}
                  columns={[
                    { title: 'Jenis Ikan', dataIndex: 'fishName', key: 'fishName' },
                    { title: 'Total Berat (kg)', dataIndex: 'totalWeight', key: 'totalWeight' },
                  ]}
                  rowKey="fishName"
                  pagination={false}
                  size="small"
                />

                <p className="mt-4 font-semibold">
                  Total Berat Semua Ikan: {getTotalWeight(selectedItem.detail_penerimaan_barang).toLocaleString()} kg
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

export default GoodsReceipt;
