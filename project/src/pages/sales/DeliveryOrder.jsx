import React, { useEffect, useState } from 'react';
import { Layout, Typography, Button, Table, Form, Input, DatePicker, InputNumber, Space, message } from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';
import dayjs from 'dayjs';
import axios from 'axios';
import config from '../../config';

const { Content } = Layout;
const { Title } = Typography;

export default function DeliveryOrder() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [salesOrders, setSalesOrders] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedSOs, setSelectedSOs] = useState([]);
  const [details, setDetails] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = config.API_BASE_URL

  // Fetch sales order
  useEffect(() => {
    const fetchSO = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/sales_order`, {
          headers: { Authorization: token }
        });
        if (res.data.status) {
          setSalesOrders(res.data.data);
        } else {
          message.error('Gagal mengambil data Sales Order');
        }
      } catch (err) {
        console.error(err);
        message.error('Terjadi kesalahan saat mengambil data');
      }
    };
    fetchSO();
  }, []);

  const soColumns = [
    { title: 'Nomor SO', dataIndex: 'nomor_so', key: 'nomor_so' },
    { title: 'Customer', dataIndex: 'nama_customer', key: 'nama_customer' },
    { title: 'Tanggal SO', dataIndex: 'tanggal_so', key: 'tanggal_so' }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys);
      setSelectedSOs(rows);
    }
  };

  const handleGenerate = () => {
    if (!selectedRowKeys.length) {
      message.warning('Pilih minimal satu SO');
      return;
    }

    const combined = selectedSOs.flatMap(so =>
      so.detail_sales_order.map((item, idx) => ({
        key: `${so.id_sales_order}-${item.id_ikan}-${idx}`,
        id_ikan: item.id_ikan,
        nama_ikan: item.nama_ikan,
        pallet: `PALLET-${item.id_ikan}`, // Placeholder pallet name
        id_pallet: item.id_ikan, // sementara samakan, sesuaikan nanti dengan real pallet
        nettoFinal: item.berat,
        netto_first: item.berat,
        netto_second: item.berat,
        so_nomor: so.nomor_so
      }))
    );

    setDetails(combined);
    setIsGenerating(true);
    form.resetFields();
  };

  const handleDetailChange = (key, field, value) => {
    setDetails(prev =>
      prev.map(row => (row.key === key ? { ...row, [field]: value } : row))
    );
  };

  const detailColumns = [
    { title: 'SO', dataIndex: 'so_nomor', key: 'so_nomor' },
    { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
    { title: 'Pallet', dataIndex: 'pallet', key: 'pallet' },
    {
      title: 'Netto First (kg)',
      dataIndex: 'netto_first',
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

  const onFinish = async values => {
    const payload = {
      delivery_order: {
        id_sales_order: selectedSOs[0].id_sales_order, // Asumsi hanya satu SO dipilih
        tanggal_do: dayjs().format('YYYY-MM-DD'),
        nomor_kendaraan: values.kendaraan,
        catatan: values.catatan_do || ''
      },
      detail_delivery_order: details.map(d => ({
        id_ikan: d.id_ikan,
        netto_first: d.netto_first,
        netto_second: d.netto_second
      })),
      detail_pallet: [...new Set(details.map(d => d.id_pallet))],
      update_stok: details.map(d => ({
        id_pallet: d.id_pallet,
        id_ikan: d.id_ikan,
        netto_second: d.netto_second
      }))
    };

    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/delivery_order`, payload, {
        headers: { Authorization: token }
      });
      message.success('Delivery Order berhasil disimpan!');
      navigate('/sales');
    } catch (err) {
      console.error(err);
      message.error('Gagal menyimpan Delivery Order');
    } finally {
      setLoading(false);
    }
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
                dataSource={salesOrders}
                columns={soColumns}
                rowKey="id_sales_order"
                pagination={false}
              />
              <Button type="primary" onClick={handleGenerate} disabled={!selectedRowKeys.length} className="mt-4">
                Generate DO
              </Button>
            </>
          ) : (
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{ kendaraan: '', catatan_do: '' }}
              className="mt-6"
            >
              <Form.Item label="SO Terpilih">
                <Input.TextArea value={selectedSOs.map(so => so.nomor_so).join(', ')} readOnly />
              </Form.Item>

              <Space wrap>
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
