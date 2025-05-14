import React, { useState, useEffect } from 'react';
import {
  Layout,
  Typography,
  Button,
  Form,
  Table,
  DatePicker,
  InputNumber,
  Input,
  Switch,
  Row,
  Col,
  Card,
  Modal,
  message
} from 'antd';
import { ArrowLeftIcon, PrinterIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';
import axios from 'axios';
import dayjs from 'dayjs';
import config from '../../config';

const { Content } = Layout;
const { Title } = Typography;

const formatCurrency = (value) => `Rp ${value?.toLocaleString('id-ID') || 0}`;

export default function InvoicePreview() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [doList, setDoList] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [invoiceData, setInvoiceData] = useState({
    tanggal_invoice: dayjs(),
    diskon: 0,
    total: 0,
    grand_total: 0,
    ip: false
  });
  const [customInvoice, setCustomInvoice] = useState([{ nama_ikan: '', netto: 0, harga: 0 }]);
  const [fishModalVisible, setFishModalVisible] = useState(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [modalRowIndex, setModalRowIndex] = useState(null);
  const [modalSelectedKeys, setModalSelectedKeys] = useState([]);
  const [invoiceList, setInvoiceList] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = config.API_BASE_URL

  useEffect(() => {
    const fetchDO = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/delivery_order`, {
          headers: { Authorization: token }
        });
        if (res.data.status) setDoList(res.data.data);
        else message.error('Gagal mengambil data delivery order');
      } catch {
        message.error('Terjadi kesalahan saat mengambil data');
      }
    };
    fetchDO();
  }, []);

  const fetchInvoices = async () => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/invoice`, {
        headers: { Authorization: token }
      });
      if (res.data.status) setInvoiceList(res.data.data);
      else message.error('Gagal mengambil daftar invoice');
    } catch {
      message.error('Terjadi kesalahan saat mengambil daftar invoice');
    }
  };

  useEffect(() => {
    const doTotal = selectedRows.reduce(
      (sum, item) => sum + (item.detail_delivery_order?.reduce((s, d) => s + (d.harga || 0), 0) || 0),
      0
    );
    const customTotal = customInvoice.reduce((sum, i) => sum + (i.harga || 0), 0);
    const total = doTotal + customTotal;
    const grand = total - (invoiceData.diskon || 0);
    setInvoiceData(prev => ({ ...prev, total, grand_total: grand }));
  }, [selectedRows, customInvoice, invoiceData.diskon]);

  const fishList = selectedRows.flatMap(item =>
    item.detail_delivery_order.map(d => ({ ...d, id: d.id_detail_delivery_order }))
  );

  const columnsDO = [
    { title: 'ID DO', dataIndex: 'id_delivery_order', key: 'id_delivery_order' },
    { title: 'Nomor DO', dataIndex: 'nomor_do', key: 'nomor_do' },
    { title: 'Tanggal DO', dataIndex: 'tanggal_do', key: 'tanggal_do' }
  ];

  const columnsFish = [
    { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
    { title: 'Netto Second', dataIndex: 'netto_second', key: 'netto_second' },
    { title: 'Harga', dataIndex: 'harga', key: 'harga' }
  ];

  const columnsInvoice = [
    { title: 'ID Invoice', dataIndex: 'id_invoice', key: 'id_invoice' },
    { title: 'Tanggal', dataIndex: 'tanggal_invoice', key: 'tanggal_invoice' },
    { title: 'Total', dataIndex: 'grand_total', key: 'grand_total', render: v => formatCurrency(v) },
    {
      title: 'Aksi',
      key: 'aksi',
      render: (_, record) => (
        <Button icon={<PrinterIcon size={16} />} onClick={() => handlePrint(record)}>Print</Button>
      )
    }
  ];

  const handleCustomChange = (idx, field, value) => {
    const list = [...customInvoice];
    list[idx][field] = value;
    setCustomInvoice(list);
  };

  const addCustomRow = () => setCustomInvoice([...customInvoice, { nama_ikan: '', netto: 0, harga: 0 }]);
  const removeCustomRow = idx => {
    const list = [...customInvoice];
    list.splice(idx, 1);
    setCustomInvoice(list);
  };

  const openFishModal = idx => {
    setModalRowIndex(idx);
    setModalSelectedKeys([]);
    setFishModalVisible(true);
  };

  const handleModalOk = () => {
    if (modalSelectedKeys.length === 1) {
      const fish = fishList.find(d => d.id === modalSelectedKeys[0]);
      handleCustomChange(modalRowIndex, 'nama_ikan', fish.nama_ikan);
      handleCustomChange(modalRowIndex, 'harga', fish.harga || 0);
      handleCustomChange(modalRowIndex, 'netto', fish.netto_second || 0);
    }
    setFishModalVisible(false);
  };

  const preparePayload = () => {
    const detail_invoices = selectedRows.map(item => ({
      id_delivery_order: item.id_delivery_order,
      details: item.detail_delivery_order.map(d => ({
        id_detail_delivery_order: d.id_detail_delivery_order,
        harga: d.harga || 0
      }))
    }));

    return {
      invoice: {
        tanggal_invoice: invoiceData.tanggal_invoice.format('YYYY-MM-DD'),
        diskon: invoiceData.diskon,
        total: invoiceData.total,
        grand_total: invoiceData.grand_total,
        ip: invoiceData.ip
      },
      detail_invoices,
      custom_invoice: customInvoice
    };
  };

  const submitInvoice = async () => {
    if (!invoiceData.tanggal_invoice || selectedRows.length === 0) {
      return message.warning('Pilih minimal 1 DO dan isi tanggal invoice.');
    }

    const payload = preparePayload();
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/invoice`, payload, {
        headers: { Authorization: token }
      });
      if (res.data.status) {
        message.success('Invoice berhasil dikirim');
        navigate('/invoice');
      } else message.error(res.data.message || 'Gagal mengirim invoice');
    } catch {
      message.error('Terjadi kesalahan saat mengirim invoice');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (record) => {
    const token = sessionStorage.getItem('token');
    const url = `${API_BASE_URL}/invoice_printer/${record.id_invoice}?token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  };

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content>
        <div className="container mx-auto px-6 py-12">
          <Button icon={<ArrowLeftIcon size={16} />} onClick={() => navigate('/sales')} className="mb-4">
            Kembali
          </Button>
          <Button type="default" className="mb-6 ml-2" onClick={() => { fetchInvoices(); setInvoiceModalVisible(true); }}>
            Daftar Invoice
          </Button>
          <Title level={2}>Invoice Preview</Title>

          <Form form={form} layout="vertical">
            <Card title="Invoice dari Penjual" className="mb-6">
              <Table
                rowKey="id_delivery_order"
                rowSelection={{
                  selectedRowKeys: selectedRows.map(r => r.id_delivery_order),
                  onChange: (_, rows) => setSelectedRows(rows)
                }}
                columns={columnsDO}
                dataSource={doList}
                pagination={false}
              />

              <Row gutter={16} className="mt-4">
                <Col span={8}>
                  <Form.Item label="Tanggal Invoice">
                    <DatePicker
                      className="w-full"
                      value={invoiceData.tanggal_invoice}
                      onChange={d => setInvoiceData(prev => ({ ...prev, tanggal_invoice: d }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Diskon (Rp)">
                    <InputNumber
                      className="w-full"
                      min={0}
                      value={invoiceData.diskon}
                      onChange={v => setInvoiceData(prev => ({ ...prev, diskon: v }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Include Pajak (IP)">
                    <Switch
                      checked={invoiceData.ip}
                      onChange={v => setInvoiceData(prev => ({ ...prev, ip: v }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16} className="mt-2">
                <Col>Total: <b>{formatCurrency(invoiceData.total)}</b></Col>
                <Col>Grand Total: <b>{formatCurrency(invoiceData.grand_total)}</b></Col>
              </Row>
            </Card>

            <Card title="Custom Invoice Pembeli" className="mb-6">
              {customInvoice.map((row, idx) => (
                <Row gutter={16} key={idx} className="mb-2">
                  <Col span={6}>
                    <Form.Item label="Nama Ikan">
                      <Input readOnly value={row.nama_ikan} placeholder="Pilih Ikan" />
                      <Button onClick={() => openFishModal(idx)} disabled={!selectedRows.length} className="mt-1">Pilih Ikan</Button>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Netto">
                      <InputNumber
                        className="w-full"
                        value={row.netto}
                        onChange={v => handleCustomChange(idx, 'netto', v)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Harga">
                      <InputNumber
                        className="w-full"
                        value={row.harga}
                        onChange={v => handleCustomChange(idx, 'harga', v)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={3}>
                    <Button danger onClick={() => removeCustomRow(idx)}>Hapus</Button>
                  </Col>
                </Row>
              ))}
              <Button type="dashed" onClick={addCustomRow} disabled={!selectedRows.length}>Tambah Baris</Button>
            </Card>

            <Button type="primary" onClick={submitInvoice} loading={loading} block>Kirim Invoice</Button>
          </Form>

          <Modal
            title="Pilih Ikan"
            visible={fishModalVisible}
            onOk={handleModalOk}
            onCancel={() => setFishModalVisible(false)}
            width={600}
          >
            <Table
              rowKey="id"
              columns={columnsFish}
              dataSource={fishList}
              pagination={false}
              rowSelection={{ type: 'radio', selectedRowKeys: modalSelectedKeys, onChange: keys => setModalSelectedKeys(keys) }}
            />
          </Modal>

          <Modal
            title="Daftar Invoice"
            visible={invoiceModalVisible}
            onCancel={() => setInvoiceModalVisible(false)}
            footer={null}
            width={800}
          >
            <Table
              rowKey="id_invoice"
              columns={columnsInvoice}
              dataSource={invoiceList}
              pagination={false}
            />
          </Modal>
        </div>
      </Content>
      <FooterSection />
    </Layout>
  );
}
