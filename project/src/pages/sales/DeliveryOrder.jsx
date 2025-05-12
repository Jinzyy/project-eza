import React, { useState } from 'react';
import { Layout, Typography, Button, Table, Form, Input, DatePicker, InputNumber, Space, message } from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';
import dayjs from 'dayjs';

const { Content } = Layout;
const { Title } = Typography;

// Mock Sales Order data
const mockSOList = [
  { id: 1, nomor_so: 'SO-001', customer: 'PT Laut Sejahtera', tanggal_so: '2025-04-25' },
  { id: 2, nomor_so: 'SO-002', customer: 'CV Samudra Jaya', tanggal_so: '2025-04-27' }
];
// Mock details include id_pallet
const mockSODetailsMap = {
  1: [
    { key: '1-1', id_ikan: 1, nama_ikan: 'Kakap Merah', id_pallet: 3, pallet: 'PAL01', nettoFinal: 50.5 },
    { key: '1-2', id_ikan: 2, nama_ikan: 'Tuna', id_pallet: 4, pallet: 'PAL02', nettoFinal: 30.0 }
  ],
  2: [
    { key: '2-1', id_ikan: 3, nama_ikan: 'Gurame', id_pallet: 5, pallet: 'PAL03', nettoFinal: 40.0 }
  ]
};

export default function DeliveryOrder() {
  const navigate = useNavigate();
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedSOs, setSelectedSOs] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const soColumns = [
    { title: 'Nomor SO', dataIndex: 'nomor_so', key: 'nomor_so' },
    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
    { title: 'Tanggal SO', dataIndex: 'tanggal_so', key: 'tanggal_so' }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys);
      setSelectedSOs(rows);
    }
  };

  // Columns for DO details: two weight inputs
  const detailColumns = [
    { title: 'SO', dataIndex: 'so_nomor', key: 'so_nomor' },
    { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
    { title: 'Pallet', dataIndex: 'pallet', key: 'pallet' },
    {
      title: 'Netto First (kg)',
      dataIndex: 'netto_first',
      key: 'netto_first',
      render: (val, record) => (
        <InputNumber
          min={0}
          max={record.nettoFinal}
          value={val}
          onChange={value => handleDetailChange(record.key, 'netto_first', value)}
        />
      )
    },
    {
      title: 'Netto Second (kg)',
      dataIndex: 'netto_second',
      key: 'netto_second',
      render: (val, record) => (
        <InputNumber
          min={0}
          max={record.netto_first || record.nettoFinal}
          value={val}
          onChange={value => handleDetailChange(record.key, 'netto_second', value)}
        />
      )
    }
  ];

  const handleGenerate = () => {
    if (!selectedRowKeys.length) {
      message.warning('Pilih minimal satu SO');
      return;
    }
    const combined = selectedRowKeys.flatMap(id => 
      mockSODetailsMap[id].map(item => ({
        ...item,
        so_nomor: mockSOList.find(so => so.id === id).nomor_so,
        netto_first: item.nettoFinal,
        netto_second: item.nettoFinal
      }))
    );
    setDetails(combined);
    setIsGenerating(true);
    form.resetFields();
  };

  const handleDetailChange = (key, field, value) => {
    setDetails(prev => prev.map(row => row.key === key ? { ...row, [field]: value } : row));
  };

  const onFinish = values => {
    const payload = {
      delivery_order: {
        id_sales_order: selectedRowKeys,
        tanggal_do: values.tanggal_do.format('YYYY-MM-DD'),
        nomor_kendaraan: values.kendaraan,
        catatan: values.catatan_do || ''
      },
      detail_delivery_order: details.map(d => ({
        id_ikan: d.id_ikan,
        netto_first: d.netto_first,
        netto_second: d.netto_second
      })),
      detail_pallet: details.map(d => d.id_pallet),
      update_stok: details.map(d => ({
        id_pallet: d.id_pallet,
        id_ikan: d.id_ikan,
        netto_second: d.netto_second
      }))
    };
    console.log('DO Payload:', payload);
    message.success('Payload DO siap disimpan!');
    navigate('/sales');
  };

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content>
        <div className="container mx-auto px-6 py-12">
          <Button
            icon={<ArrowLeftIcon size={16} />}
            onClick={() => isGenerating ? setIsGenerating(false) : navigate('/sales')}
            className="mb-6"
          >
            {isGenerating ? 'Kembali ke List SO' : 'Kembali'}
          </Button>
          <Title level={2}>Delivery Order (DO)</Title>

          {!isGenerating ? (
            <>
              <Table
                rowSelection={rowSelection}
                dataSource={mockSOList}
                columns={soColumns}
                rowKey="id"
                pagination={false}
              />
              <Button type="primary" onClick={handleGenerate} disabled={!selectedRowKeys.length} className="mt-4">
                Generate DO untuk {selectedRowKeys.length} SO
              </Button>
            </>
          ) : (
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ tanggal_do: dayjs(), kendaraan: '', catatan_do: '' }}
              className="mt-6"
            >
              <Form.Item label="SO Terpilih">
                <Input.TextArea value={selectedSOs.map(so => so.nomor_so).join(', ')} readOnly />
              </Form.Item>

              <Space wrap>
                <Form.Item name="tanggal_do" label="Tanggal DO" rules={[{ required: true }]}>  
                  <DatePicker />
                </Form.Item>
                <Form.Item name="kendaraan" label="Nomor Kendaraan" rules={[{ required: true }]}>  
                  <Input placeholder="Plat nomor kendaraan" />
                </Form.Item>
                <Form.Item name="catatan_do" label="Catatan DO">
                  <Input.TextArea rows={2} placeholder="Catatan tambahan" />
                </Form.Item>
              </Space>

              <Table
                dataSource={details}
                columns={detailColumns}
                pagination={false}
                rowKey="key"
              />

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>
                  Simpan DO
                </Button>
              </Form.Item>
            </Form>
          )}
        </div>
      </Content>
      <FooterSection />
    </Layout>
  );
}