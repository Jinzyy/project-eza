import React, { useState, useEffect } from 'react';
import {
  Layout,
  Typography,
  Button,
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Table,
  Modal,
  InputNumber,
  Space,
  message
} from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';
import dayjs from 'dayjs';
import config from '../../config';

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

export default function SalesOrder() {
  const navigate = useNavigate();
  const [tableData, setTableData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [ikanList, setIkanList] = useState([]);
  const [palletList, setPalletList] = useState([]);
  const [stokGroups, setStokGroups] = useState([]);  // grouped by ikan
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [ikanLoaded, setIkanLoaded] = useState(false);
  const [palletLoaded, setPalletLoaded] = useState(false);
  const [stokLoaded, setStokLoaded] = useState(false);

  const token = sessionStorage.getItem('token');

  // Fetch Customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch(`${config.API_BASE_URL}/customer`, { headers: { Authorization: token } });
        if (!res.ok) {
          message.error(`Gagal ambil customers: ${res.status}`);
          return;
        }
        const json = await res.json();
        if (json.status) setCustomers(json.data);
      } catch {
        message.error('Kesalahan jaringan saat ambil customers');
      } finally {
        setCustomersLoaded(true);
      }
    };
    if (token) fetchCustomers();
  }, [token]);

  // Fetch Ikan
  useEffect(() => {
    const fetchIkan = async () => {
      try {
        const res = await fetch(`${config.API_BASE_URL}/ikan`, { headers: { Authorization: token } });
        if (!res.ok) {
          message.error(`Gagal ambil ikan: ${res.status}`);
          return;
        }
        const json = await res.json();
        if (json.status) setIkanList(json.data);
      } catch {
        message.error('Kesalahan jaringan saat ambil ikan');
      } finally {
        setIkanLoaded(true);
      }
    };
    if (token) fetchIkan();
  }, [token]);

  // Fetch Pallet
  useEffect(() => {
    const fetchPallet = async () => {
      try {
        const res = await fetch(`${config.API_BASE_URL}/pallet`, { headers: { Authorization: token } });
        if (!res.ok) {
          message.error(`Gagal ambil pallet: ${res.status}`);
          return;
        }
        const json = await res.json();
        if (json.status) setPalletList(json.data);
      } catch {
        message.error('Kesalahan jaringan saat ambil pallet');
      } finally {
        setPalletLoaded(true);
      }
    };
    if (token) fetchPallet();
  }, [token]);

  // Fetch Stok Ikan grouped by ikan (all)
  useEffect(() => {
    const fetchStokGroups = async () => {
      try {
        const res = await fetch(`${config.API_BASE_URL}/stok_ikan?params=all`, { headers: { Authorization: token } });
        if (!res.ok) {
          message.error(`Gagal ambil stok ikan: ${res.status}`);
          return;
        }
        const json = await res.json();
        if (json.status) setStokGroups(json.data);
      } catch {
        message.error('Kesalahan jaringan saat ambil stok ikan');
      } finally {
        setStokLoaded(true);
      }
    };
    if (token) fetchStokGroups();
  }, [token]);

  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  // Tambah ikan ke tabel detail
  const handleAddIkan = (ikan) => {
    if (tableData.some(row => row.id_ikan === ikan.id_ikan)) {
      message.warning('Ikan sudah ditambahkan');
      return;
    }
    setTableData(prev => [...prev, {
      key: ikan.id_ikan,
      id_ikan: ikan.id_ikan,
      nama_ikan: ikan.nama_ikan,
      netoIkan: 0,
      id_pallet: null,
      beratPallet: 0,
      beratDitimbang: 0,
      nettoFinal: 0,
      harga: 0,
      totalHarga: 0
    }]);
    closeModal();
  };  // Update data baris tabel detail
  const handleRowChange = (key, field, value) => {
    setTableData(prev => prev.map(row => {
      if (row.key !== key) return row;
      const updated = { ...row, [field]: value };

      if (field === 'id_pallet') {
        // Set berat pallet
        const pal = palletList.find(p => p.id_pallet === value);
        updated.beratPallet = pal ? pal.berat_pallet : 0;
        // Set netto ikan from stok data
        const group = stokGroups.find(g => g.id_ikan === row.id_ikan);
        const record = group?.records.find(r => r.id_pallet === value);
        updated.netoIkan = record ? record.berat_bersih_ikan : 0;
      }

      // Calculate nettoFinal and totalHarga
      const beratDitimbang = Number(updated.beratDitimbang) || 0;
      const beratPallet = Number(updated.beratPallet) || 0;
      updated.nettoFinal = Math.max(0, beratDitimbang - beratPallet);
      updated.totalHarga = updated.nettoFinal * (Number(updated.harga) || 0);

      return updated;
    }));
  };

  // Hapus baris detail ikan
  const handleRemove = (key) => {
    setTableData(prev => prev.filter(row => row.key !== key));
  };

  // Submit sales order ke backend
  const submitSalesOrder = async (payload) => {
    try {
      setLoading(true);
      const response = await fetch(`${config.API_BASE_URL}/sales_order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify(payload)
      });
      console.log('Payload Sales Order:', payload);
      const data = await response.json();
      setLoading(false);
      if (!response.ok) {
        message.error(data.message || 'Gagal menyimpan sales order');
        return false;
      }
      message.success('Sales order berhasil disimpan!');
      return true;
    } catch {
      setLoading(false);
      message.error('Terjadi kesalahan saat mengirim data');
      return false;
    }
  };

  // Handle submit form
  const onFinish = async (values) => {
    if (!tableData.length) {
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
    const success = await submitSalesOrder(payload);
    if (success) navigate('/sales');
  };

  // Kolom tabel detail ikan
  const columns = [
    { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
    {
      title: 'Pallet',
      dataIndex: 'id_pallet',
      key: 'pallet',
      render: (val, record) => {
        const group = stokGroups.find(g => g.id_ikan === record.id_ikan);  
        const available = group ? group.records.map(r => r.id_pallet) : [];
        return (
          <Select
            placeholder="Pilih Pallet"
            style={{ width: 140 }}
            value={val}
            onChange={value => handleRowChange(record.key, 'id_pallet', value)}
            loading={!stokLoaded || !palletLoaded}
            allowClear
          >
            {palletList
              .filter(p => available.includes(p.id_pallet))
              .map(p => (
                <Option key={p.id_pallet} value={p.id_pallet}>{p.nomor_pallet}</Option>
              ))}
          </Select>
        );
      }
    },
    { title: 'Netto Ikan (kg)', dataIndex: 'netoIkan', key: 'netoIkan' },
    {
      title: 'Berat Ditimbang (kg)',
      dataIndex: 'beratDitimbang',
      key: 'beratDitimbang',
      render: (val, record) => (
        <InputNumber
          min={0}
          value={val}
          onChange={value => handleRowChange(record.key, 'beratDitimbang', value)}
          style={{ width: '100%' }}
        />
      )
    },
    { title: 'Berat Pallet (kg)', dataIndex: 'beratPallet', key: 'beratPallet' },
    { title: 'Netto Final (kg)', dataIndex: 'nettoFinal', key: 'netoFinal' },
    {
      title: 'Harga/kg',
      dataIndex: 'harga',
      key: 'harga',
      render: (val, record) => (
        <InputNumber
          min={0}
          value={val}
          onChange={value => handleRowChange(record.key, 'harga', value)}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Total Harga', dataIndex: 'totalHarga', key: 'totalHarga',
      render: val => val.toLocaleString()
    },
    {
      title: 'Aksi', key: 'aksi', render: (_, record) => (
        <Button danger onClick={() => handleRemove(record.key)}>Hapus</Button>
      )
    }
  ];

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content>
        <div className="container mx-auto px-6 py-12">
          <Button icon={<ArrowLeftIcon size={16} />} onClick={() => navigate('/sales')} className="mb-6">Kembali</Button>
          <Title level={2}>Sales Order (SO)</Title>

          <Form layout="vertical" onFinish={onFinish} initialValues={{ spp: false, tanggal_so: dayjs() }} className="mt-6">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Space wrap>
                <Form.Item name="id_customer" label="Customer" rules={[{ required: true }]}>                
                  <Select placeholder="Pilih Customer" style={{ minWidth: 200 }} loading={!customersLoaded} allowClear>
                    {customers.map(c => <Option key={c.id_customer} value={c.id_customer}>{c.nama_customer}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="tanggal_so" label="Tanggal SO" rules={[{ required: true }]}><DatePicker /></Form.Item>
                <Form.Item name="spp" label="SPP" valuePropName="checked"><Switch /></Form.Item>
              </Space>

              <Form.Item name="catatan" label="Catatan"><Input.TextArea rows={3} placeholder="Catatan tambahan" /></Form.Item>

              <Button type="dashed" block onClick={openModal} disabled={!ikanLoaded || !stokLoaded}>+ Tambah Ikan</Button>

              <Table
              dataSource={tableData}
              columns={columns}
              pagination={false}
              rowKey="key"
              locale={{ emptyText: 'Belum ada detail ikan' }}
              summary={pageData => {
                const totalNetto = pageData.reduce((sum, row) => sum + (row.nettoFinal || 0), 0);
                const totalHarga = pageData.reduce((sum, row) => sum + (row.totalHarga || 0), 0);
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5} style={{ textAlign: 'right' }}>Total</Table.Summary.Cell>
                    <Table.Summary.Cell index={5}>{totalNetto}</Table.Summary.Cell>
                    <Table.Summary.Cell index={6} />
                    <Table.Summary.Cell index={7}>{totalHarga.toLocaleString()}</Table.Summary.Cell>
                    <Table.Summary.Cell index={8} />
                  </Table.Summary.Row>
                );
              }}
            />

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>Simpan Sales Order</Button>
              </Form.Item>
            </Space>
          </Form>

          <Modal title="Pilih Ikan" open={modalVisible} onCancel={closeModal} footer={null} width={600} destroyOnClose>
            <Table dataSource={ikanList} loading={!ikanLoaded} columns={[
              { title: 'Kode Ikan', dataIndex: 'kode_ikan', key: 'kode_ikan' },
              { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
              { title: 'Aksi', key: 'aksi', render: (_, ikan) => <Button type="link" onClick={() => handleAddIkan(ikan)}>Tambah</Button> }
            ]} rowKey="id_ikan" pagination={{ pageSize: 5 }} locale={{ emptyText: ikanLoaded ? 'Data ikan tidak tersedia' : 'Memuat ikan...' }} />
          </Modal>
        </div>
      </Content>
      <FooterSection />
    </Layout>
  );
}
