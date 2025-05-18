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
  message,
  Popconfirm
} from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';
import dayjs from 'dayjs';
import config from '../../config';

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function SalesOrder() {
  const navigate = useNavigate();
  const [tableData, setTableData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [ikanList, setIkanList] = useState([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [ikanLoaded, setIkanLoaded] = useState(false);

  const [salesOrders, setSalesOrders] = useState([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  // Filters state
  const [dateRange, setDateRange] = useState([null, null]);
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [sppFilter, setSppFilter] = useState('all'); // 'all', true, false
  const [filterLoading, setFilterLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);

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

  // Fetch Sales Orders with filters and pagination
  const fetchSalesOrders = async (params = {}) => {
    setFilterLoading(true);
    try {
      const query = new URLSearchParams();
      if (params.date_start) query.append('date_start', params.date_start);
      if (params.date_end) query.append('date_end', params.date_end);
      if (params.sort) query.append('sort', params.sort);
      if (params.spp !== undefined && params.spp !== 'all') query.append('spp', params.spp);
      if (params.page) query.append('page', params.page);
      if (params.pageSize) query.append('limit', params.pageSize);

      const url = `${config.API_BASE_URL}/sales_order${query.toString() ? '?' + query.toString() : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: token }
      });
      if (!res.ok) {
        message.error(`Gagal ambil sales order: ${res.status}`);
        setFilterLoading(false);
        return;
      }
      const json = await res.json();
      if (json.status) {
        setSalesOrders(json.data);
        setTotalItems(json.total || 0); // assuming backend returns total count in json.total
      }
    } catch {
      message.error('Kesalahan jaringan saat ambil sales order');
    } finally {
      setFilterLoading(false);
    }
  };

  // Initial fetch with default sort desc and page 1
  useEffect(() => {
    if (token) {
      fetchSalesOrders({ sort: 'desc', page: 1, pageSize });
    }
  }, [token]);

  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  // Add ikan ke tabel
  const handleAddIkan = (ikan) => {
    if (tableData.some(row => row.id_ikan === ikan.id_ikan)) {
      message.warning('Ikan sudah ditambahkan');
      return;
    }
    setTableData(prev => [...prev, {
      key: ikan.id_ikan,
      id_ikan: ikan.id_ikan,
      nama_ikan: ikan.nama_ikan,
      berat: 0,
      harga: 0,
      totalHarga: 0
    }]);
    closeModal();
  };

  // Update data baris
  const handleRowChange = (key, field, value) => {
    setTableData(prev => prev.map(row => {
      if (row.key !== key) return row;
      const updated = { ...row, [field]: value };
      updated.totalHarga = (Number(updated.berat) || 0) * (Number(updated.harga) || 0);
      return updated;
    }));
  };

  // Hapus baris
  const handleRemove = (key) => {
    setTableData(prev => prev.filter(row => row.key !== key));
  };

  // Submit sales order
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
        berat: r.berat,
        harga: r.harga
      }))
    };
    const success = await submitSalesOrder(payload);
    if (success) navigate('/sales/sales-order');
  };

  // Show detail modal
  const showDetailModal = (order) => {
    setSelectedOrderDetails(order);
    setDetailModalVisible(true);
  };

  const closeDetailModal = () => {
    setDetailModalVisible(false);
    setSelectedOrderDetails(null);
  };

  // Confirm and handle Cetak PDF
  const confirmCetakPDF = (order) => {
    Modal.confirm({
      title: 'Konfirmasi Cetak PDF',
      content: `Apakah Anda yakin ingin mencetak PDF untuk Sales Order ${order.nomor_so}?`,
      okText: 'Ya',
      cancelText: 'Batal',
      onOk() {
        handleCetakPDF(order);
      }
    });
  };

  // Handle Cetak PDF
  const handleCetakPDF = async (order) => {
    const payload = {
      nama_customer: order.nama_customer,
      nomor_so: order.nomor_so,
      tanggal_so: order.tanggal_so,
      catatan: order.catatan,
      detail_sales_order: order.detail_sales_order.map(item => ({
        nama_ikan: item.nama_ikan,
        quantity: item.berat,
        harga: item.harga,
        total: item.berat * item.harga
      }))
    };

    try {
      const res = await fetch(`${config.API_BASE_URL}/sales_order_printer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        message.error(err.message || 'Gagal cetak PDF');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${order.nomor_so}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('PDF berhasil diunduh');
    } catch {
      message.error('Terjadi kesalahan saat cetak PDF');
    }
  };

  // Handle filter changes
  const onDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const onSortOrderChange = (value) => {
    setSortOrder(value);
  };

  const onSppFilterChange = (value) => {
    setSppFilter(value);
  };

  // Apply filters with pagination reset
  const applyFilters = () => {
    const params = {};
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.date_start = dateRange[0].format('YYYY-MM-DD');
      params.date_end = dateRange[1].format('YYYY-MM-DD');
    }
    if (sortOrder) {
      params.sort = sortOrder;
    }
    if (sppFilter && sppFilter !== 'all') {
      params.spp = sppFilter;
    }
    params.page = 1;
    params.pageSize = pageSize;
    setCurrentPage(1);
    fetchSalesOrders(params);
  };

  // Reset filters to initial state and reload
  const resetFilters = () => {
    setDateRange([null, null]);
    setSortOrder('desc');
    setSppFilter('all');
    setCurrentPage(1);
    fetchSalesOrders({ sort: 'desc', page: 1, pageSize });
  };

  // Handle page change
  const onPageChange = (page) => {
    setCurrentPage(page);
    const params = {};
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.date_start = dateRange[0].format('YYYY-MM-DD');
      params.date_end = dateRange[1].format('YYYY-MM-DD');
    }
    if (sortOrder) {
      params.sort = sortOrder;
    }
    if (sppFilter && sppFilter !== 'all') {
      params.spp = sppFilter;
    }
    params.page = page;
    params.pageSize = pageSize;
    fetchSalesOrders(params);
  };

  // Kolom tabel detail ikan
  const columns = [
    { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
    {
      title: 'Berat (kg)',
      dataIndex: 'berat',
      key: 'berat',
      render: (val, record) => (
        <InputNumber
          min={0}
          value={val}
          onChange={value => handleRowChange(record.key, 'berat', value)}
          style={{ width: '100%' }}
        />
      )
    },
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

  // Columns for sales order table
  const salesOrderColumns = [
    { title: 'Nomor SO', dataIndex: 'nomor_so', key: 'nomor_so' },
    { title: 'Customer', dataIndex: 'nama_customer', key: 'nama_customer' },
    { title: 'Tanggal SO', dataIndex: 'tanggal_so', key: 'tanggal_so' },
    {
      title: 'Aksi',
      key: 'aksi',
      render: (_, record) => (
        <Space>
          <Button onClick={() => showDetailModal(record)}>Detail</Button>
          <Button icon={<DownloadOutlined />} onClick={() => confirmCetakPDF(record)}>Cetak PDF</Button>
        </Space>
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

              <Button type="dashed" block onClick={openModal} disabled={!ikanLoaded}>+ Tambah Ikan</Button>

              <Table
                dataSource={tableData}
                columns={columns}
                pagination={false}
                rowKey="key"
                locale={{ emptyText: 'Belum ada detail ikan' }}
                summary={pageData => {
                  const totalBerat = pageData.reduce((sum, row) => sum + (row.berat || 0), 0);
                  const totalHarga = pageData.reduce((sum, row) => sum + (row.totalHarga || 0), 0);
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2} style={{ textAlign: 'right' }}>Total</Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>{totalBerat}</Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>{totalHarga.toLocaleString()}</Table.Summary.Cell>
                      <Table.Summary.Cell index={4} />
                    </Table.Summary.Row>
                  );
                }}
              />
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>Simpan Sales Order</Button>
              </Form.Item>
            </Space>
          </Form>

          {/* Filters for Sales Order List */}
          <Title level={2} style={{ marginTop: 40 }}>Daftar Sales Order</Title>
          <Space style={{ marginBottom: 16 }} wrap>
            <RangePicker
              value={dateRange}
              onChange={onDateRangeChange}
              allowClear
              placeholder={['Tanggal Mulai', 'Tanggal Akhir']}
            />
            <Select value={sortOrder} onChange={onSortOrderChange} style={{ width: 150 }}>
              <Option value="asc">Tanggal Ascending</Option>
              <Option value="desc">Tanggal Descending</Option>
            </Select>
            <Select value={sppFilter} onChange={onSppFilterChange} style={{ width: 150 }}>
              <Option value="all">Semua SPP</Option>
              <Option value="1">SPP</Option>
              <Option value="0">Non SPP</Option>
            </Select>
            <Button type="primary" onClick={applyFilters} loading={filterLoading}>Terapkan Filter</Button>
            <Button onClick={resetFilters} disabled={filterLoading}>Reset Filter</Button>
          </Space>

          <Table
            dataSource={salesOrders}
            columns={salesOrderColumns}
            rowKey="id_sales_order"
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: totalItems,
              onChange: onPageChange,
              showSizeChanger: false
            }}
            loading={filterLoading}
          />

          {/* Detail Modal */}
          <Modal
            title={`Detail Sales Order: ${selectedOrderDetails?.nomor_so || ''}`}
            visible={detailModalVisible}
            onCancel={closeDetailModal}
            footer={<Button onClick={closeDetailModal}>Tutup</Button>}
            width={700}
          >
            {selectedOrderDetails && (
              <Table
                dataSource={selectedOrderDetails.detail_sales_order}
                columns={[
                  { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
                  { title: 'Kode Ikan', dataIndex: 'kode_ikan', key: 'kode_ikan' },
                  { title: 'Berat (kg)', dataIndex: 'berat', key: 'berat', render: val => Number(val).toLocaleString() },
                  { title: 'Harga/kg', dataIndex: 'harga', key: 'harga', render: val => Number(val).toLocaleString() },
                  {
                    title: 'Total Harga',
                    key: 'total',
                    render: (_, item) => (item.berat * item.harga).toLocaleString()
                  },
                  { title: 'Catatan', dataIndex: 'catatan', key: 'catatan', render: val => val || '-' }
                ]}
                pagination={true}
                rowKey="id_detail_sales_order"
                size="small"
              />
            )}
          </Modal>

          {/* Modal for adding ikan */}
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
