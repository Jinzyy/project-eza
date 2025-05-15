import React, { useEffect, useState } from 'react';
import {
  Layout, Typography, Button, Table, Card, Form,
  Select, InputNumber, Space, Badge, message, Modal
} from 'antd';
import { ArrowLeftIcon, PrinterIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';
import dayjs from 'dayjs';
import axios from 'axios';
import config from '../../config';

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

export default function DeliveryOrder() {
  const navigate = useNavigate();
  const [salesOrders, setSalesOrders] = useState([]);
  const [dos, setDos] = useState([]);             // daftar DO
  const [selectedSO, setSelectedSO] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, record: null });
  const API = config.API_BASE_URL;

  // fetch SO & DO
  useEffect(() => {
    (async () => {
      try {
        const token = sessionStorage.getItem('token');
        const [soRes, doRes] = await Promise.all([
          axios.get(`${API}/sales_order`, { headers: { Authorization: token } }),
          axios.get(`${API}/delivery_order`, { headers: { Authorization: token } })
        ]);
        soRes.data.status && setSalesOrders(soRes.data.data);
        doRes.data.status && setDos(doRes.data.data);
      } catch {
        message.error('Gagal mengambil data');
      }
    })();
  }, []);

  // tabel DO
  const doColumns = [
    { title: 'Nomor DO', dataIndex: 'nomor_do', key: 'nomor_do' },
    { title: 'Nomor SO', dataIndex: 'nomor_so', key: 'nomor_so' },
    { title: 'Customer', dataIndex: 'nama_customer', key: 'nama_customer' },
    { title: 'Tanggal DO', dataIndex: 'tanggal_do', key: 'tanggal_do' },
    {
      title: 'Aksi',
      key: 'aksi',
      render: (_, record) => (
        <Button
          icon={<PrinterIcon size={16} />}
          onClick={() => setModal({ visible: true, record })}
        >
          Print
        </Button>
      )
    }
  ];

  // konfirmasi print
  const handlePrint = async () => {
    const { record } = modal;
    setModal({ visible: false, record: null });
    // build payload sesuai contoh
    const payload = {
      nama_customer: record.nama_customer,
      alamat: record.alamat || '',         // jika ada
      nomor_telepon: record.nomor_telepon || '',
      nomor_do: record.nomor_do,
      tanggal_do: record.tanggal_do,
      nomor_kendaraan: record.nomor_kendaraan,
      catatan: record.catatan,
      detail_delivery_order: record.detail_delivery_order.map(d => ({
        nama_ikan: d.nama_ikan,
        quantity: d.netto_second
      }))
    };
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.post(
        `${API}/delivery_order_printer`,
        payload,
        { headers: { Authorization: token }, responseType: 'blob' }
      );
      // download file PDF
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${record.nomor_do}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      message.error('Gagal print DO');
    }
  };

  // Tabel SO
  const soColumns = [
    { title: 'Nomor SO', dataIndex: 'nomor_so', key: 'nomor_so' },
    { title: 'Customer', dataIndex: 'nama_customer', key: 'nama_customer' },
    { title: 'Tanggal SO', dataIndex: 'tanggal_so', key: 'tanggal_so' },
    {
      title: 'Status',
      key: 'processed',
      render: (_, r) => r.processed
        ? <Badge status="success" text="Used" />
        : <Badge status="default" text="Unused" />
    }
  ];
  const rowSelection = {
    type: 'radio',
    onChange: (_, rows) => setSelectedSO(rows[0])
  };

  // Generate kartu ikan
  const handleGenerate = async () => {
    if (!selectedSO) {
      return message.warning('Pilih satu SO dulu');
    }
    const base = selectedSO.detail_sales_order.map(item => ({
      key: item.id_detail_sales_order,
      id_ikan: item.id_ikan,
      nama_ikan: item.nama_ikan,
      pallets: [],
      stokWeight: null,      // baru terisi setelah pilih pallet
      selectedStock: null,
      nettoSecond: null
    }));
    await Promise.all(base.map(async c => {
      try {
        const token = sessionStorage.getItem('token');
        const { data: res } = await axios.get(
          `${API}/stok_ikan?id_ikan=${c.id_ikan}`,
          { headers: { Authorization: token } }
        );
        if (res.status && Array.isArray(res.data) && res.data.length) {
          c.pallets = res.data[0].records;
        }
      } catch {}
    }));
    setCards(base);
  };

  // Pilih pallet → isi stokWeight
  const handleSelectPallet = (key, stokId) => {
    setCards(cs =>
      cs.map(c => {
        if (c.key !== key) return c;
        const stock = c.pallets.find(p => p.id_stok_ikan === stokId);
        return {
          ...c,
          selectedStock: stock,
          stokWeight: stock.berat_bersih_ikan
        };
      })
    );
  };

  const handleNettoSecond = (key, val) => {
    setCards(cs =>
      cs.map(c => c.key === key ? { ...c, nettoSecond: val } : c)
    );
  };

  // Submit DO (tanpa required)
  const handleSubmit = async () => {
    if (!cards.length) return;
    const payload = {
      delivery_order: {
        id_sales_order: selectedSO.id_sales_order,
        tanggal_do: dayjs().format('YYYY-MM-DD'),
        nomor_kendaraan: '',
        catatan: ''
      },
      detail_delivery_order: cards
        .filter(c => c.selectedStock && c.nettoSecond != null)
        .map(c => ({
          id_ikan: c.id_ikan,
          netto_first: c.stokWeight,
          netto_second: c.nettoSecond
        })),
      detail_pallet: [...new Set(
        cards
          .filter(c => c.selectedStock)
          .map(c => c.selectedStock.id_pallet)
      )],
      update_stok: cards
        .filter(c => c.selectedStock && c.nettoSecond != null)
        .map(c => {
          const oldW = c.selectedStock.berat_bersih_ikan;
          const newW = c.nettoSecond < oldW ? oldW - c.nettoSecond : 0;
          return {
            id_stok_ikan: c.selectedStock.id_stok_ikan,
            id_pallet: c.selectedStock.id_pallet,
            id_ikan: c.id_ikan,
            netto_second: newW
          };
        })
    };

    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      await axios.post(`${API}/delivery_order`, payload, {
        headers: { Authorization: token }
      });
      message.success('Delivery Order berhasil disimpan!');
      // refresh daftar DO
      const res = await axios.get(`${API}/delivery_order`, { headers: { Authorization: token } });
      res.data.status && setDos(res.data.data);
      setCards([]); setSelectedSO(null);
    } catch {
      message.error('Gagal menyimpan DO');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="min-h-screen">
      <Header />

      <Content className="container mx-auto px-6 py-8">
        {/* Daftar DO */}
        <Title level={3}>List Delivery Orders</Title>
        <Table
          rowKey="id_delivery_order"
          dataSource={dos}
          columns={doColumns}
          pagination={{ pageSize: 5 }}
        />

        {/* Form Generate DO */}
        {!cards.length ? (
          <>
            <Title level={3}>Buat Delivery Order</Title>
            <Table
              rowKey="id_sales_order"
              dataSource={salesOrders}
              columns={soColumns}
              rowSelection={rowSelection}
              pagination={false}
            />
            <Button
              type="primary"
              onClick={handleGenerate}
              disabled={!selectedSO}
              className="mt-4"
            >
              Generate DO
            </Button>
          </>
        ) : (
          <>
            <Button
              icon={<ArrowLeftIcon size={16} />}
              onClick={() => setCards([])}
              className="mb-4"
            >
              Kembali ke List SO
            </Button>
            <Title level={4}>SO: {selectedSO.nomor_so}</Title>
            <Form layout="vertical">
              <Space direction="vertical" size="large" className="w-full">
                {cards.map(c => (
                  <Card key={c.key} title={c.nama_ikan} className="w-full">
                    <Space wrap>
                      <Form.Item label="Pilih pallet">
                        <Select
                          placeholder="Select pallet"
                          style={{ width: 200 }}
                          onChange={v => handleSelectPallet(c.key, v)}
                          value={c.selectedStock?.id_stok_ikan}
                        >
                          {c.pallets.map(p => (
                            <Option key={p.id_stok_ikan} value={p.id_stok_ikan}>
                              Pallet {p.id_pallet} – {p.berat_bersih_ikan} kg
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Form.Item label="Bobot Ikan dalam Pallet (kg)">
                        <InputNumber value={c.stokWeight || undefined} readOnly />
                      </Form.Item>
                      <Form.Item label="Bobot Ikan setelah ditimbang (kg)">
                        <InputNumber
                          min={0}
                          max={c.stokWeight || 0}
                          value={c.nettoSecond}
                          onChange={v => handleNettoSecond(c.key, v)}
                          disabled={!c.stokWeight}
                        />
                      </Form.Item>
                    </Space>
                  </Card>
                ))}
                <Button
                  type="primary"
                  onClick={handleSubmit}
                  loading={loading}
                  block
                >
                  Simpan DO
                </Button>
              </Space>
            </Form>
          </>
        )}
      </Content>

      <FooterSection />

      {/* Modal konfirmasi print */}
      <Modal
        open={modal.visible}
        onOk={handlePrint}
        onCancel={() => setModal({ visible: false, record: null })}
        okText="Ya, Print"
        cancelText="Batal"
        title="Konfirmasi Print Delivery Order"
      >
        <p>Anda yakin ingin mencetak DO <b>{modal.record?.nomor_do}</b> ?</p>
      </Modal>
    </Layout>
  );
}
