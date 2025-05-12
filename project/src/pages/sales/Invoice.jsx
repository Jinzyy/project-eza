import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, Form, Table, DatePicker, InputNumber, Input, Switch, Row, Col, Card, Modal } from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';

const { Content } = Layout;
const { Title } = Typography;

export default function InvoicePreview() {
  const navigate = useNavigate();

  // Mock data untuk preview, include nama_ikan di details
  const mockDoList = [
    { id: 1, tanggal_delivery: '2025-04-20', details: [
        { id: 1, nama_ikan: 'Tuna', harga: 300 },
        { id: 2, nama_ikan: 'Salmon', harga: 300 }
      ]
    },
    { id: 2, tanggal_delivery: '2025-04-25', details: [
        { id: 3, nama_ikan: 'Tuna', harga: 400 },
        { id: 4, nama_ikan: 'Mackerel', harga: 420 }
      ]
    },
  ];

  const [selectedRows, setSelectedRows] = useState([]);
  const [invoiceData, setInvoiceData] = useState({ tanggal_invoice: null, diskon: 0, total: 0, grand_total: 0, ip: false });
  const [customInvoice, setCustomInvoice] = useState([{ nama_ikan: '', netto: 0, harga: 0 }]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalRowIndex, setModalRowIndex] = useState(null);
  const [modalSelectedKeys, setModalSelectedKeys] = useState([]);

  // Recalculate totals
  useEffect(() => {
    const doTotal = selectedRows.reduce(
      (sum, item) => sum + (item.details?.reduce((s, d) => s + d.harga, 0) || 0), 0
    );
    const customTotal = customInvoice.reduce((sum, i) => sum + i.harga, 0);
    const total = doTotal + customTotal;
    const grand = total - invoiceData.diskon;
    setInvoiceData(prev => ({ ...prev, total, grand_total: grand }));
  }, [selectedRows, customInvoice, invoiceData.diskon]);

  // Daftar ikan dari DO terpilih
  const fishList = selectedRows.flatMap(item => item.details);

  // Kolom tabel DO
  const columnsDO = [
    { title: 'ID DO', dataIndex: 'id', key: 'id' },
    { title: 'Tanggal DO', dataIndex: 'tanggal_delivery', key: 'tanggal_delivery' },
    { title: 'Total DO', key: 'total_do', render: r => r.details.reduce((sum, d) => sum + d.harga, 0) },
  ];

  const rowSelection = {
    selectedRowKeys: selectedRows.map(r => r.id),
    onChange: (_, rows) => setSelectedRows(rows),
  };

  // Kolom di modal LOV
  const columnsFish = [
    { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
    { title: 'Harga', dataIndex: 'harga', key: 'harga' },
  ];

  const handleCustomChange = (idx, field, value) => {
    const list = [...customInvoice];
    list[idx][field] = value;
    setCustomInvoice(list);
  };

  const addCustomRow = () => setCustomInvoice([...customInvoice, { nama_ikan: '', netto: 0, harga: 0 }]);

  const removeCustomRow = idx => {
    const list = [...customInvoice]; list.splice(idx, 1); setCustomInvoice(list);
  };

  const openFishModal = idx => {
    setModalRowIndex(idx);
    setModalSelectedKeys([]);
    setModalVisible(true);
  };

  const handleModalOk = () => {
    if (modalSelectedKeys.length === 1) {
      const fish = fishList.find(d => d.id === modalSelectedKeys[0]);
      handleCustomChange(modalRowIndex, 'nama_ikan', fish.nama_ikan);
      handleCustomChange(modalRowIndex, 'harga', fish.harga);
    }
    setModalVisible(false);
  };

  const previewPayload = () => {
    const detail_invoices = selectedRows.map(item => ({
      id_delivery_order: item.id,
      details: item.details.map(d => ({ id_detail_delivery_order: d.id, harga: d.harga })),
    }));

    const payload = { invoice: invoiceData, detail_invoices, custom_invoice: customInvoice };

    Modal.info({ title: 'Preview Payload', width: 600, content: <pre style={{ maxHeight: 400, overflow: 'auto' }}>{JSON.stringify(payload, null, 2)}</pre> });
  };

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content>
        <div className="container mx-auto px-6 py-12">
          <Button icon={<ArrowLeftIcon size={16}/>} onClick={() => navigate('/sales')} className="mb-6">Kembali</Button>
          <Title level={2}>Invoice Preview</Title>

          <Form layout="vertical">
            <Card title="Invoice dari Penjual" className="mb-6">
              <Table rowKey="id" rowSelection={rowSelection} columns={columnsDO} dataSource={mockDoList} pagination={false} />
              <Row gutter={16} className="mt-4">
                <Col span={8}><Form.Item label="Tanggal Invoice"><DatePicker className="w-full" onChange={(_, v) => setInvoiceData(prev => ({ ...prev, tanggal_invoice: v }))}/></Form.Item></Col>
                <Col span={8}><Form.Item label="Diskon (Rp)"><InputNumber className="w-full" min={0} value={invoiceData.diskon} onChange={v => setInvoiceData(prev => ({ ...prev, diskon: v }))}/></Form.Item></Col>
                <Col span={8}><Form.Item label="Include Pajak (IP)"><Switch checked={invoiceData.ip} onChange={v => setInvoiceData(prev => ({ ...prev, ip: v }))}/></Form.Item></Col>
              </Row>
              <Row gutter={16} className="mt-2"><Col>Total: <b>{invoiceData.total}</b></Col><Col>Grand Total: <b>{invoiceData.grand_total}</b></Col></Row>
            </Card>

            <Card title="Custom Invoice Pembeli" className="mb-6">
              {customInvoice.map((row, idx) => (
                <Row gutter={16} key={idx} className="mb-2">
                  <Col span={6}><Form.Item label="Nama Ikan"><Input readOnly value={row.nama_ikan} placeholder="Pilih Ikan" /><Button onClick={() => openFishModal(idx)} disabled={!selectedRows.length}>Pilih Ikan</Button></Form.Item></Col>
                  <Col span={6}><Form.Item label="Netto"><InputNumber className="w-full" value={row.netto} onChange={v => handleCustomChange(idx, 'netto', v)}/></Form.Item></Col>
                  <Col span={6}><Form.Item label="Harga"><InputNumber className="w-full" value={row.harga} onChange={v => handleCustomChange(idx, 'harga', v)}/></Form.Item></Col>
                  <Col span={3}><Button danger onClick={() => removeCustomRow(idx)}>Hapus</Button></Col>
                </Row>
              ))}
              <Button type="dashed" onClick={addCustomRow} disabled={!selectedRows.length}>Tambah Baris</Button>
            </Card>

            <Button type="primary" onClick={previewPayload}>Preview Payload</Button>
          </Form>

          <Modal title="Pilih Ikan" visible={modalVisible} onOk={handleModalOk} onCancel={() => setModalVisible(false)}>
            <Table
              rowKey="id"
              columns={columnsFish}
              dataSource={fishList}
              pagination={false}
              rowSelection={{
                type: 'radio',
                selectedRowKeys: modalSelectedKeys,
                onChange: keys => setModalSelectedKeys(keys),
              }}
            />
          </Modal>
        </div>
      </Content>
      <FooterSection />
    </Layout>
  );
}
