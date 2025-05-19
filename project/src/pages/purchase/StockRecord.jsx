import React, { useEffect, useState } from 'react';
import { Layout, Typography, Button, Table, Spin } from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../../config';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';

const { Content } = Layout;
const { Title } = Typography;

function StockRecord() {
  const navigate = useNavigate();
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        const token = sessionStorage.getItem('token');

        const [stokRes, ikanRes] = await Promise.all([
          axios.get(`${config.API_BASE_URL}/stok_ikan`, {
            headers: { Authorization: token },
          }),
          axios.get(`${config.API_BASE_URL}/ikan`, {
            headers: { Authorization: token },
          }),
        ]);

        const ikanMap = {};
        ikanRes.data.data.forEach((ikan) => {
          ikanMap[ikan.id_ikan] = ikan.nama_ikan;
        });

        const mappedStock = stokRes.data.data.map((item, index) => {
          const namaIkan = ikanMap[item.id_ikan];
          return {
            key: index + 1,
            nomor: index + 1,
            fishName: namaIkan || `Ikan tidak ditemukan (ID: ${item.id_ikan})`,
            totalStockKg: item.total_berat_bersih,
          };
        });

        setStockData(mappedStock);
      } catch (error) {
        console.error('Gagal mengambil data stok ikan:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, []);

  const columns = [
    {
      title: 'No.',
      dataIndex: 'nomor',
      key: 'nomor',
    },
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

          {loading ? (
            <Spin className="mt-6" />
          ) : (
            <Table
              dataSource={stockData}
              columns={columns}
              pagination={false}
              className="mt-6"
              bordered
            />
          )}
        </div>
      </Content>
    </Layout>
  );
}

export default StockRecord;
