import React, { useState } from 'react';
import { Layout, Typography, Button, Form, Input, Select, DatePicker, Checkbox, Table, Modal, InputNumber, Space, message } from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';
import dayjs from 'dayjs';

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

// Mock data
const mockCustomers = [
  { id_customer: 1, nama_customer: 'PT Laut Sejahtera' },
  { id_customer: 2, nama_customer: 'CV Samudra Jaya' }
];
const mockIkanList = [
  { id: 1, nama_ikan: 'Kakap Merah', netto: 100 },
  { id: 2, nama_ikan: 'Tuna', netto: 80 }
];
const mockPalletList = [
  { id_pallet: 1, nomor_pallet: 'PAL01', berat_pallet: 2.5 },
  { id_pallet: 2, nomor_pallet: 'PAL02', berat_pallet: 3.0 }
];

export default function SalesOrder() {
  const navigate = useNavigate();
  const [tableData, setTableData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  const handleAddIkan = (ikan) => {
    if (tableData.some(row => row.id_ikan === ikan.id)) {
      message.warning('Ikan sudah ditambahkan');
      return;
    }
    const newRow = {
      key: ikan.id,
      id_ikan: ikan.id,
      nama_ikan: ikan.nama_ikan,
      netoIkan: ikan.netto,
      id_pallet: null,
      beratPallet: 0,
      beratDitimbang: 0,
      nettoFinal: 0,
      harga: 0,
      totalHarga: 0
    };
    setTableData(prev => [...prev, newRow]);
    closeModal();
  };

  const handleRowChange = (key, field, value) => {
    setTableData(prev => prev.map(row => {
      if (row.key !== key) return row;
      const updated = { ...row, [field]: value };
      if (field === 'id_pallet') {
        const pal = mockPalletList.find(p => p.id_pallet === value);
        updated.beratPallet = pal ? pal.berat_pallet : 0;
      }
      updated.nettoFinal = Math.max(0, (updated.beratDitimbang || 0) - updated.beratPallet);
      updated.totalHarga = updated.nettoFinal * (updated.harga || 0);
      return updated;
    }));
  };

  const handleRemove = (key) => {
    setTableData(prev => prev.filter(row => row.key !== key));
  };

  const columns = [
    { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
    { title: 'Pallet', dataIndex: 'id_pallet', key: 'pallet', render: (val, record) => (
      <Select
        placeholder="Pilih Pallet"
        style={{ width: 120 }}
        value={val}
        onChange={value => handleRowChange(record.key, 'id_pallet', value)}
      >
        {mockPalletList.map(p => (
          <Option key={p.id_pallet} value={p.id_pallet}>{p.nomor_pallet}</Option>
        ))}
      </Select>
    )},
    { title: 'Netto Ikan (kg)', dataIndex: 'netoIkan', key: 'netoIkan' },
    { title: 'Berat Ditimbang (kg)', dataIndex: 'beratDitimbang', key: 'beratDitimbang', render: (val, record) => (
      <InputNumber
        min={0}
        value={val}
        onChange={value => handleRowChange(record.key, 'beratDitimbang', value)}
      />
    )},
    { title: 'Berat Pallet (kg)', dataIndex: 'beratPallet', key: 'beratPallet' },
    { title: 'Netto Final (kg)', dataIndex: 'nettoFinal', key: 'nettoFinal' },
    { title: 'Harga/kg', dataIndex: 'harga', key: 'harga', render: (val, record) => (
      <InputNumber
        min={0}
        value={val}
        onChange={value => handleRowChange(record.key, 'harga', value)}
      />
    )},
    { title: 'Total Harga', dataIndex: 'totalHarga', key: 'totalHarga', render: val => val.toLocaleString() },
    { title: 'Aksi', key: 'aksi', render: (_, record) => (
      <Button danger onClick={() => handleRemove(record.key)}>Hapus</Button>
    )}
  ];

  const onFinish = (values) => {
    if (tableData.length === 0) {
      message.warning('Tambahkan minimal satu detail ikan');
      return;
    }
    const payload = {
      sales_order: {
        id_customer: values.id_customer,
        spp: values.spp,
        tanggal_so: values.tanggal_so.format('YYYY-MM-DD'),
        catatan: values.catatan || ''
      },
      detail_sales_order: tableData.map(r => ({
        id_ikan: r.id_ikan,
        id_pallet: r.id_pallet,
        berat: r.nettoFinal,
        harga: r.harga
      }))
    };
    console.log('Payload:', payload);
    message.success('Data Sales Order (mock) siap disimpan!');
    navigate('/sales');
  };

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content>
        <div className="container mx-auto px-6 py-12">
          <Button
            icon={<ArrowLeftIcon size={16} />}
            onClick={() => navigate('/sales')}
            className="mb-6"
          >
            Kembali
          </Button>
          <Title level={2}>Sales Order (SO)</Title>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ spp: false, tanggal_so: dayjs() }}
            className="mt-6"
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Space wrap>
                <Form.Item name="id_customer" label="Customer" rules={[{ required: true }]}>  
                  <Select placeholder="Pilih Customer" style={{ minWidth: 200 }}>
                    {mockCustomers.map(c => (
                      <Option key={c.id_customer} value={c.id_customer}>{c.nama_customer}</Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="tanggal_so" label="Tanggal SO" rules={[{ required: true }]}>  
                  <DatePicker />
                </Form.Item>
                <Form.Item name="spp" valuePropName="checked">
                  <Checkbox>SPP</Checkbox>
                </Form.Item>
              </Space>

              <Form.Item name="catatan" label="Catatan">
                <Input.TextArea rows={3} placeholder="Catatan tambahan" />
              </Form.Item>

              <Button type="dashed" block onClick={openModal}>+ Tambah Ikan</Button>

              <Table
                dataSource={tableData}
                columns={columns}
                pagination={false}
                rowKey="key"
              />

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>
                  Simpan Sales Order
                </Button>
              </Form.Item>
            </Space>
          </Form>

          <Modal
            title="Pilih Ikan"
            visible={modalVisible}
            onCancel={closeModal}
            footer={null}
            width={600}
          >
            <Table
              dataSource={mockIkanList}
              columns={[
                { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
                { title: 'Stok (kg)', dataIndex: 'netto', key: 'netto' },
                { title: 'Aksi', key: 'aksi', render: (_, ikan) => (
                  <Button type="link" onClick={() => handleAddIkan(ikan)}>Tambah</Button>
                )}
              ]}
              rowKey="id"
              pagination={{ pageSize: 5 }}
            />
          </Modal>
        </div>
      </Content>
      <FooterSection />
    </Layout>
  );
}
