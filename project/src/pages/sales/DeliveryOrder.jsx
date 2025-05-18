import React, { useEffect, useState } from 'react';
import {
  Layout, Typography, Button, Table, Card, Form, DatePicker,
  Select, InputNumber, Input, Space, Badge, message, Modal
} from 'antd';
import { ArrowLeftIcon, PrinterIcon, EyeIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';
import dayjs from 'dayjs';
import axios from 'axios';
import config from '../../config';

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function DeliveryOrder() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [salesOrders, setSalesOrders] = useState([]);
  const [dos, setDos] = useState([]);
  const [selectedSO, setSelectedSO] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, record: null });
  const [detailModal, setDetailModal] = useState({ visible: false, record: null });
  const [soDetailModal, setSoDetailModal] = useState({ visible: false, record: null });
  const [customers, setCustomers] = useState([]);
  const [doDateRange, setDoDateRange] = useState(null);
  const [soDateRange, setSoDateRange] = useState(null);
  const [doSort, setDoSort] = useState('reset'); // 'ascend', 'descend', 'reset'
  const [soSort, setSoSort] = useState('reset'); // 'ascend', 'descend', 'reset'
  const [doPagination, setDoPagination] = useState({ current: 1, pageSize: 25, total: 0 });
  const [soPagination, setSoPagination] = useState({ current: 1, pageSize: 25, total: 0 });
  const API = config.API_BASE_URL;

  // Helper to format date range to query params
  const formatDateRangeParams = (range) => {
    if (!range || range.length !== 2) return {};
    return {
      date_start: range[0].format('YYYY-MM-DD'),
      date_end:   range[1].format('YYYY-MM-DD')
    };
  };

  // Fetch data with date range filters, sort params, and pagination
  const fetchData = async () => {
    try {
      const token = sessionStorage.getItem('token');

      // Prepare query params for SO and DO
      const soParams = {
        ...formatDateRangeParams(soDateRange),
        ...(soSort !== 'reset' ? { sort: soSort } : {}),
        page: soPagination.current,
        limit: soPagination.pageSize,
      };
      const doParams = {
        ...formatDateRangeParams(doDateRange),
        ...(doSort !== 'reset' ? { sort: doSort } : {}),
        page: doPagination.current,
        limit: doPagination.pageSize,
      };

      // Build query strings
      const soQuery = new URLSearchParams(soParams).toString();
      const doQuery = new URLSearchParams(doParams).toString();

      const [soRes, doRes, custRes] = await Promise.all([
        axios.get(`${API}/sales_order${soQuery ? `?${soQuery}` : ''}`, { headers: { Authorization: token } }),
        axios.get(`${API}/delivery_order${doQuery ? `?${doQuery}` : ''}`, { headers: { Authorization: token } }),
        axios.get(`${API}/customer`, { headers: { Authorization: token } })
      ]);

      if (soRes.data.status) {
        setSalesOrders(soRes.data.data);
        setSoPagination(prev => ({
          ...prev,
          total: soRes.data.total ?? soRes.data.data.length ?? 0,
        }));
      }
      if (doRes.data.status) {
        setDos(doRes.data.data);
        setDoPagination(prev => ({
          ...prev,
          total: doRes.data.total ?? doRes.data.data.length ?? 0,
        }));
      }
      if (custRes.data.status) setCustomers(custRes.data.data);
    } catch (error) {
      console.error('Fetch data error:', error);
      message.error('Gagal mengambil data');
    }
  };

  // Refetch data on mount and when date ranges, sort, or pagination change
  useEffect(() => {
    fetchData();
  }, [soDateRange, doDateRange, soSort, doSort, soPagination.current, doPagination.current]);

  // Handle DO table pagination change
  const handleDoTableChange = (pagination) => {
    setDoPagination(prev => ({
      ...prev,
      current: pagination.current,
      pageSize: 25,
    }));
  };

  // Handle SO table pagination change
  const handleSoTableChange = (pagination) => {
    setSoPagination(prev => ({
      ...prev,
      current: pagination.current,
      pageSize: 25,
    }));
  };

  const doColumns = [
    { title: 'Nomor DO', dataIndex: 'nomor_do', key: 'nomor_do' },
    { title: 'Nomor SO', dataIndex: 'nomor_so', key: 'nomor_so' },
    { title: 'Customer', dataIndex: 'nama_customer', key: 'nama_customer' },
    {
      title: 'Tanggal DO',
      dataIndex: 'tanggal_do',
      key: 'tanggal_do',
    },
    {
      title: 'Aksi', key: 'aksi',
      render: (_, record) => (
        <Space>
          <Button
            icon={<PrinterIcon size={16} />}
            onClick={() => setModal({ visible: true, record })}
          >
            Print
          </Button>
          <Button
            icon={<EyeIcon size={16} />}
            onClick={() => setDetailModal({ visible: true, record })}
          >
          </Button>
        </Space>
      )
    }
  ];

  const soColumns = [
    { title: 'Nomor SO', dataIndex: 'nomor_so', key: 'nomor_so' },
    { title: 'Customer', dataIndex: 'nama_customer', key: 'nama_customer' },
    {
      title: 'Tanggal SO',
      dataIndex: 'tanggal_so',
      key: 'tanggal_so',
    },
    {
      title: 'Status', key: 'processed',
      render: (_, r) =>
        r.processed
          ? <Badge status="success" text="Used" />
          : <Badge status="default" text="Unused" />
    },
    {
      title: 'Aksi', key: 'aksi',
      render: (_, record) => (
        <Button
          icon={<EyeIcon size={16} />}
          onClick={() => setSoDetailModal({ visible: true, record })}
        >
        </Button>
      )
    }
  ];

  const rowSelection = {
    type: 'radio',
    onChange: (_, rows) => setSelectedSO(rows[0])
  };

  const handlePrint = async () => {
    const { record } = modal;
    setModal({ visible: false, record: null });
    const customer = customers.find(c => c.id_customer === record.id_customer) || {};

    const payload = {
      nama_customer:   record.nama_customer,
      alamat:          customer.alamat || '',
      nomor_telepon:   customer.nomor_telepon || '',
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

    if (!tanggal_do || !tanggal_do.format) {
      message.error('Tanggal DO tidak valid');
      return;
    }

    // All items with selectedStock and nettoSecond go to detail_delivery_order
    const detailDeliveryOrder = cards
      .filter(c => c.selectedStock && c.nettoSecond != null)
      .map(c => ({
        id_ikan:      c.id_ikan,
        netto_first:  c.stokWeight,
        netto_second: c.nettoSecond
      }));

    // Only 'pecah' mode items go to update_stok
    const updateStok = cards
      .filter(c => c.mode === 'pecah' && c.selectedStock && c.nettoSecond != null)
      .map(c => ({
        id_pallet:    c.selectedStock.id_pallet,
        id_ikan:      c.id_ikan,
        netto_second: c.stokWeight - c.nettoSecond  // Subtract user input from original weight
      }));

    // Collect all id_pallet from selected pallets ONLY in 'pilih' mode
    const detailPallet = Array.from(new Set(
      cards
        .filter(c => c.mode === 'pilih' && c.selectedStock)
        .map(c => c.selectedStock.id_pallet)
    ));

    const payload = {
      delivery_order: {
        id_sales_order: selectedSO.id_sales_order,
        tanggal_do:      tanggal_do.format('YYYY-MM-DD'),
        nomor_kendaraan,
        catatan
      },
      detail_delivery_order: detailDeliveryOrder,
      detail_pallet:        detailPallet,
      update_stok:          updateStok
    };

    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      const res = await axios.post(`${API}/delivery_order`, payload, {
        headers: { Authorization: token }
      });
      if (res.data.status) {
        message.success(`DO berhasil: ${res.data.nomor_do}`);

        setTimeout(async () => {
          const list = await axios.get(`${API}/delivery_order`, { headers: { Authorization: token } });
          if (list.data.status) setDos(list.data.data);
        }, 500);

        form.resetFields();
        form.setFieldsValue({ tanggal_do: dayjs(), nomor_kendaraan: '', catatan: '' });
        setCards([]);
        setSelectedSO(null);
      } else {
        message.error('Gagal menyimpan DO');
      }
    } catch (error) {
      if (error.response) {
        message.error(`Gagal menyimpan DO: ${error.response.data.message || 'Error server'}`);
      } else {
        message.error('Gagal menyimpan DO');
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <Layout className="min-h-screen">
      <Header />
      <Content className="container mx-auto px-6 py-8">
        <Button icon={<ArrowLeftIcon size={16} />} onClick={() => navigate('/sales')} className="mb-6">Kembali</Button>
        <Title level={3}>List Delivery Orders</Title>
        <Space style={{ marginBottom: 16 }} align="center" wrap>
          <RangePicker
            onChange={(dates) => {
              setDoDateRange(dates);
              setDoPagination(prev => ({ ...prev, current: 1 }));
            }}
            allowClear
            placeholder={['Tanggal mulai', 'Tanggal akhir']}
          />
          <Select
            value={doSort}
            onChange={(value) => {
              setDoSort(value);
              setDoPagination(prev => ({ ...prev, current: 1 }));
            }}
            style={{ width: 160 }}
            options={[
              { label: 'Urutkan: Default', value: 'reset' },
              { label: 'Tanggal Terlama', value: 'asc' },
              { label: 'Tanggal Terbaru', value: 'desc' }
            ]}
          />
        </Space>
        <Table
          rowKey="id_delivery_order"
          dataSource={dos}
          columns={doColumns}
          pagination={{
            current: doPagination.current,
            pageSize: 10,
            total: doPagination.total,
            showSizeChanger: false,
          }}
          onChange={handleDoTableChange}
          loading={loading}
        />
        {!cards.length ? (
          <>
            <Title level={3}>Buat Delivery Order</Title>
            <Space style={{ marginBottom: 16 }} align="center" wrap>
              <RangePicker
                onChange={(dates) => {
                  setSoDateRange(dates);
                  setSoPagination(prev => ({ ...prev, current: 1 }));
                }}
                allowClear
                placeholder={['Tanggal mulai', 'Tanggal akhir']}
              />
              <Select
                value={soSort}
                onChange={(value) => {
                  setSoSort(value);
                  setSoPagination(prev => ({ ...prev, current: 1 }));
                }}
                style={{ width: 160 }}
                options={[
                  { label: 'Default', value: 'reset' },
                  { label: 'Tanggal Terlama', value: 'asc' },
                  { label: 'Tanggal Terbaru', value: 'desc' }
                ]}
              />
            </Space>
            <Table
              rowKey="id_sales_order"
              dataSource={salesOrders}
              columns={soColumns}
              rowSelection={rowSelection}
              pagination={{
                current: soPagination.current,
                pageSize: 25,
                total: soPagination.total,
                showSizeChanger: false,
              }}
              onChange={handleSoTableChange}
              loading={loading}
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
      <Modal
        open={detailModal.visible}
        onCancel={() => setDetailModal({ visible: false, record: null })}
        footer={null}
        title={`Detail Delivery Order: ${detailModal.record?.nomor_do}`}
        width={700}
      >
        {detailModal.record?.detail_delivery_order?.length ? (
          <Table
            dataSource={detailModal.record.detail_delivery_order}
            rowKey="id_detail_delivery_order"
            pagination={false}
            columns={[
              { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
              { title: 'Kode Ikan', dataIndex: 'kode_ikan', key: 'kode_ikan' },
              { title: 'Netto First (kg)', dataIndex: 'netto_first', key: 'netto_first' },
              { title: 'Netto Second (kg)', dataIndex: 'netto_second', key: 'netto_second' }
            ]}
            size="small"
          />
        ) : (
          <p>Tidak ada detail untuk DO ini.</p>
        )}
      </Modal>
      <Modal
        open={soDetailModal.visible}
        onCancel={() => setSoDetailModal({ visible: false, record: null })}
        footer={null}
        title={`Detail Sales Order: ${soDetailModal.record?.nomor_so}`}
        width={700}
      >
        {soDetailModal.record?.detail_sales_order?.length ? (
          <Table
            dataSource={soDetailModal.record.detail_sales_order}
            rowKey="id_detail_sales_order"
            pagination={false}
            columns={[
              { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
              { title: 'Kode Ikan', dataIndex: 'kode_ikan', key: 'kode_ikan' },
              { title: 'Berat (kg)', dataIndex: 'berat', key: 'berat' },
              { title: 'Harga', dataIndex: 'harga', key: 'harga', render: val => `Rp ${val.toLocaleString()}` }
            ]}
            size="small"
          />
        ) : (
          <p>Tidak ada detail untuk SO ini.</p>
        )}
      </Modal>
    </Layout>
  );
}
