import React, { useEffect, useState } from 'react';
import {
  Layout, Typography, Button, Table, Card, Form, DatePicker,
  Select, InputNumber, Input, Space, Badge, message, Modal
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
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [salesOrders, setSalesOrders] = useState([]);
  const [dos, setDos] = useState([]);
  const [selectedSO, setSelectedSO] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, record: null });
  const API = config.API_BASE_URL;

  useEffect(() => {
    (async () => {
      try {
        const token = sessionStorage.getItem('token');
        const [soRes, doRes] = await Promise.all([
          axios.get(`${API}/sales_order`,   { headers: { Authorization: token } }),
          axios.get(`${API}/delivery_order`, { headers: { Authorization: token } })
        ]);
        if (soRes.data.status) setSalesOrders(soRes.data.data);
        if (doRes.data.status) setDos(doRes.data.data);
      } catch {
        message.error('Gagal mengambil data');
      }
    })();
  }, []);

  const doColumns = [
    { title: 'Nomor DO',   dataIndex: 'nomor_do',    key: 'nomor_do' },
    { title: 'Nomor SO',   dataIndex: 'nomor_so',    key: 'nomor_so' },
    { title: 'Customer',   dataIndex: 'nama_customer', key: 'nama_customer' },
    { title: 'Tanggal DO', dataIndex: 'tanggal_do',  key: 'tanggal_do' },
    {
      title: 'Aksi', key: 'aksi',
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

  const handlePrint = async () => {
    const { record } = modal;
    setModal({ visible: false, record: null });
    const payload = {
      nama_customer:   record.nama_customer,
      alamat:          record.alamat || '',
      nomor_telepon:   record.nomor_telepon || '',
      nomor_do:        record.nomor_do,
      tanggal_do:      record.tanggal_do,
      nomor_kendaraan: record.nomor_kendaraan,
      catatan:         record.catatan,
      detail_delivery_order: record.detail_delivery_order.map(d => ({
        nama_ikan: d.nama_ikan,
        quantity:  d.netto_second
      }))
    };
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.post(
        `${API}/delivery_order_printer`,
        payload,
        { headers: { Authorization: token }, responseType: 'blob' }
      );
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

  const soColumns = [
    { title: 'Nomor SO',   dataIndex: 'nomor_so',    key: 'nomor_so' },
    { title: 'Customer',   dataIndex: 'nama_customer', key: 'nama_customer' },
    { title: 'Tanggal SO', dataIndex: 'tanggal_so',  key: 'tanggal_so' },
    {
      title: 'Status', key: 'processed',
      render: (_, r) =>
        r.processed
          ? <Badge status="success" text="Used" />
          : <Badge status="default" text="Unused" />
    }
  ];

  const rowSelection = {
    type: 'radio',
    onChange: (_, rows) => setSelectedSO(rows[0])
  };

  const handleGenerate = async () => {
    if (!selectedSO) {
      return message.warning('Pilih satu SO dulu');
    }
    const base = selectedSO.detail_sales_order.map(item => ({
      key: item.id_detail_sales_order,
      id_ikan: item.id_ikan,
      nama_ikan: item.nama_ikan,
      pallets: [],
      stokWeight: null,
      selectedStock: null,
      nettoSecond: null,
      mode: 'pilih'
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

  const handleModeChange = (key, mode) => {
    setCards(cs => cs.map(c => c.key === key ? { ...c, mode } : c));
  };

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
    setCards(cs => cs.map(c => c.key === key ? { ...c, nettoSecond: val } : c));
  };

  const handleSubmit = async () => {
    let fv;
    try {
      fv = await form.validateFields();
    } catch {
      return;
    }
    const { tanggal_do, nomor_kendaraan, catatan } = fv;
    const details = cards
      .filter(c => c.mode === 'pilih' && c.selectedStock && c.nettoSecond != null)
      .map(c => ({
        id_ikan:      c.id_ikan,
        netto_first:  c.stokWeight,
        netto_second: c.nettoSecond
      }));
    const updates = cards
      .filter(c => c.mode === 'pecah' && c.selectedStock && c.nettoSecond != null)
      .map(c => ({
        id_ikan:      c.id_ikan,
        id_pallet:    c.selectedStock.id_pallet,
        netto_second: c.nettoSecond
      }));
    const pallets = Array.from(new Set([
      ...details.map(d => d.id_pallet),
      ...updates.map(u => u.id_pallet)
    ]));
    const payload = {
      delivery_order: {
        id_sales_order: selectedSO.id_sales_order,
        tanggal_do:      tanggal_do.format('YYYY-MM-DD'),
        nomor_kendaraan,
        catatan
      },
      detail_delivery_order: details,
      detail_pallet:        pallets,
      update_stok:          updates
    };
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      const res = await axios.post(`${API}/delivery_order`, payload, {
        headers: { Authorization: token }
      });
      if (res.data.status) {
        message.success(`DO berhasil: ${res.data.nomor_do}`);
        const list = await axios.get(`${API}/delivery_order`, { headers: { Authorization: token } });
        if (list.data.status) setDos(list.data.data);
        form.resetFields({ tanggal_do: dayjs(), nomor_kendaraan: '', catatan: '' });
        setCards([]);
        setSelectedSO(null);
      } else {
        message.error('Gagal menyimpan DO');
      }
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
        <Title level={3}>List Delivery Orders</Title>
        <Table
          rowKey="id_delivery_order"
          dataSource={dos}
          columns={doColumns}
          pagination={{ pageSize: 5 }}
        />
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
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                tanggal_do: dayjs(),
                nomor_kendaraan: '',
                catatan: ''
              }}
            >
              <Space direction="vertical" size="large" className="w-full">
                <Form.Item
                  name="tanggal_do"
                  label="Tanggal DO"
                  rules={[{ required: true, message: 'Pilih tanggal DO' }]}
                >
                  <DatePicker format="YYYY-MM-DD" />
                </Form.Item>
                <Form.Item
                  name="nomor_kendaraan"
                  label="Nomor Kendaraan"
                  rules={[{ required: true, message: 'Masukkan nomor kendaraan' }]}
                >
                  <Input placeholder="Plat nomor kendaraan" />
                </Form.Item>
                <Form.Item name="catatan" label="Catatan">
                  <Input.TextArea rows={2} placeholder="Catatan tambahan (opsional)" />
                </Form.Item>
                {cards.map(c => (
                  <Card key={c.key} title={c.nama_ikan} className="w-full">
                    <Space wrap>
                      <Form.Item label="Mode Pengambilan">
                        <Select
                          style={{ width: 160 }}
                          value={c.mode}
                          onChange={v => handleModeChange(c.key, v)}
                        >
                          <Option value="pilih">Pilih Pallet</Option>
                          <Option value="pecah">Pecah Pallet</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item label="Pilih Pallet">
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
                      <Form.Item label="Bobot dalam Pallet (kg)">
                        <InputNumber value={c.stokWeight ?? undefined} readOnly />
                      </Form.Item>
                      <Form.Item label="Bobot Timbang (kg)">
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
                <Form.Item>
                  <Button
                    type="primary"
                    onClick={handleSubmit}
                    loading={loading}
                    block
                  >
                    Simpan DO
                  </Button>
                </Form.Item>
              </Space>
            </Form>
          </>
        )}
      </Content>
      <FooterSection />
      <Modal
        open={modal.visible}
        onOk={handlePrint}
        onCancel={() => setModal({ visible: false, record: null })}
        okText="Ya, Print"
        cancelText="Batal"
        title="Konfirmasi Print Delivery Order"
      >
        <p>Anda yakin ingin mencetak DO <b>{modal.record?.nomor_do}</b>?</p>
      </Modal>
    </Layout>
  );
}
