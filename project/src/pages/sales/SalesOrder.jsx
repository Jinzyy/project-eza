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
  Tag
} from 'antd';
import { ArrowLeftIcon, EyeIcon } from 'lucide-react';
import { DownloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import dayjs from 'dayjs';
import config from '../../config';

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function SalesOrder() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
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

  // Approval state based on piutang
  const [acc, setAcc] = useState(true);

  // Filters state
  const [dateRange, setDateRange] = useState([null, null]);
  const [sortOrder, setSortOrder] = useState('desc');
  const [sppFilter, setSppFilter] = useState('all');
  const [filterLoading, setFilterLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);

  const [ikanFilter, setIkanFilter] = useState('');

  const token = sessionStorage.getItem('token');

  // Fetch customers
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

  // Fetch ikan
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

  // Check piutang via GET params when customer selected
  const handleCustomerSelect = async (id_customer) => {
    setAcc(true);
    try {
      const res = await fetch(`${config.API_BASE_URL}/piutang?customer_id=${id_customer}`, {
        headers: { Authorization: token }
      });
      if (!res.ok) {
        message.error(`Gagal cek piutang: ${res.status}`);
        return;
      }
      const json = await res.json();
      if (json.status && json.data.total_hutang > 0) {
        Modal.warning({
          title: 'Peringatan Hutang',
          content: 'Customer ini memiliki utang. Sales order tidak dapat di-approve.'
        });
        setAcc(false);
      } else {
        setAcc(true);
      }
    } catch {
      message.error('Kesalahan jaringan saat cek piutang');
    }
  };

  // Fetch sales orders with acc filter
  const fetchSalesOrders = async (params = {}) => {
    setFilterLoading(true);
    try {
      const query = new URLSearchParams();
      if (params.date_start) query.append('date_start', params.date_start);
      if (params.date_end) query.append('date_end', params.date_end);
      if (params.sort) query.append('sort', params.sort);
      if (params.spp !== undefined && params.spp !== 'all') query.append('spp', params.spp);
      query.append('acc', 1);
      query.append('page', params.page || 1);
      query.append('limit', params.pageSize || pageSize);

      const url = `${config.API_BASE_URL}/sales_order?${query.toString()}`;
      const res = await fetch(url, { headers: { Authorization: token } });
      if (!res.ok) {
        message.error(`Gagal ambil sales order: ${res.status}`);
        return;
      }
      const json = await res.json();
      if (json.status) {
        setSalesOrders(json.data);
        setTotalItems(json.total || 0);
        setCurrentPage(params.page || 1);
      }
    } catch {
      message.error('Kesalahan jaringan saat ambil sales order');
    } finally {
      setFilterLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (token) {
      fetchSalesOrders({ sort: 'desc', page: 1, pageSize });
    }
  }, [token]);

  const openModal = () => setModalVisible(true);
  const closeModal = () => setModalVisible(false);

  // Add ikan with harga_jual
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
      harga: ikan.harga_jual,
      totalHarga: 0
    }]);
    closeModal();
  };

  // Update row
  const handleRowChange = (key, field, value) => {
    setTableData(prev => prev.map(row => {
      if (row.key !== key) return row;
      const updated = { ...row, [field]: value };
      updated.totalHarga = (Number(updated.berat) || 0) * (Number(updated.harga) || 0);
      return updated;
    }));
  };

  // Remove row
  const handleRemove = (key) => {
    setTableData(prev => prev.filter(row => row.key !== key));
  };

  // Submit payload
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

  // Handle form submit
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
        catatan: values.catatan || '',
        acc: acc
      },
      detail_sales_order: tableData.map(r => ({
        id_ikan: r.id_ikan,
        berat: r.berat,
        harga: r.harga
      }))
    };
    const success = await submitSalesOrder(payload);
    if (success) {
      form.resetFields();
      setTableData([]);
      fetchSalesOrders({ sort: 'desc', page: 1, pageSize });
    }
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

  // Confirm and print PDF
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

  // Print PDF
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

  // Filter handlers
  const onDateRangeChange = (dates) => setDateRange(dates);
  const onSortOrderChange = (value) => setSortOrder(value);
  const onSppFilterChange = (value) => setSppFilter(value);

  // Apply filters
  const applyFilters = () => {
    const params = {};
    if (dateRange[0] && dateRange[1]) {
      params.date_start = dateRange[0].format('YYYY-MM-DD');
      params.date_end = dateRange[1].format('YYYY-MM-DD');
    }
    if (sortOrder) params.sort = sortOrder;
    if (sppFilter !== 'all') params.spp = sppFilter;
    params.page = 1;
    params.pageSize = pageSize;
    setCurrentPage(1);
    fetchSalesOrders(params);
  };

  // Reset filters
  const resetFilters = () => {
    setDateRange([null, null]);
    setSortOrder('desc');
    setSppFilter('all');
    setCurrentPage(1);
    fetchSalesOrders({ sort: 'desc', page: 1, pageSize });
  };

  // Page change
  const onPageChange = (page) => {
    const params = { page, pageSize };
    if (dateRange[0] && dateRange[1]) {
      params.date_start = dateRange[0].format('YYYY-MM-DD');
      params.date_end = dateRange[1].format('YYYY-MM-DD');
    }
    if (sortOrder) params.sort = sortOrder;
    if (sppFilter !== 'all') params.spp = sppFilter;
    fetchSalesOrders(params);
  };

  // Table columns
  const detailColumns = [
    { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
    { title: 'Kode Ikan', dataIndex: 'kode_ikan', key: 'kode_ikan' },
    { title: 'Berat (kg)', dataIndex: 'berat', key: 'berat', render: val => Number(val).toLocaleString() },
    { title: 'Harga/kg', dataIndex: 'harga', key: 'harga', render: val => Number(val).toLocaleString() },
    { title: 'Total Harga', key: 'total', render: (_, item) => (item.berat * item.harga).toLocaleString() },
  ];

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content>
        <div className="container mx-auto px-6 py-12">
          <Button icon={<ArrowLeftIcon size={16} />} onClick={() => navigate('/sales')} className="mb-6">Kembali</Button>
          <Title level={2}>Sales Order (SO)</Title>

          <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ spp: false, tanggal_so: dayjs() }} className="mt-6">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Space wrap>
                <Form.Item name="id_customer" label="Customer" rules={[{ required: true }]}>
                  <Select
                    showSearch                          // enable search input
                    placeholder="Pilih Customer"
                    style={{ minWidth: 200 }}
                    allowClear
                    optionFilterProp="children"       // filter by option text
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                    onChange={handleCustomerSelect}
                  >
                    {customers.map(c => (
                      <Option key={c.id_customer} value={c.id_customer}>
                        {c.nama_customer}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="tanggal_so" label="Tanggal SO" rules={[{ required: true }]}><DatePicker /></Form.Item>
                <Form.Item name="spp" label="SPP" valuePropName="checked"><Switch /></Form.Item>
              </Space>

              <Form.Item name="catatan" label="Catatan"><Input.TextArea rows={3} placeholder="Catatan tambahan" /></Form.Item>

              <Button type="dashed" block onClick={openModal} disabled={!ikanLoaded}>+ Tambah Ikan</Button>

              <Table
                dataSource={tableData}
                columns={detailColumns}
                pagination={false}
                rowKey="key"
                locale={{ emptyText: 'Belum ada detail ikan' }}
                summary={pageData => {
                  const totalBerat = pageData.reduce((sum, row) => sum + (row.berat || 0), 0);
                  const totalHarga = pageData.reduce((sum, row) => sum + (row.totalHarga || 0), 0);
                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2} style={{ textAlign: 'right' }}>Total</Table.Summary.Cell><Table.Summary.Cell index={2}>{totalBerat}</Table.Summary.Cell><Table.Summary.Cell index={3}>{totalHarga.toLocaleString()}</Table.Summary.Cell><Table.Summary.Cell index={4} />
                    </Table.Summary.Row>
                  );
                }}
              />
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>Simpan Sales Order</Button>
              </Form.Item>
            </Space>
          </Form>

          <Title level={2} style={{ marginTop: 40 }}>Daftar Sales Order</Title>
          <Space style={{ marginBottom: 16 }} wrap>
            <RangePicker value={dateRange} onChange={onDateRangeChange} allowClear placeholder={['Tanggal Mulai', 'Tanggal Akhir']} />
            <Select value={sortOrder} onChange={onSortOrderChange} style={{ width: 150 }}><Option value="asc">Tanggal Ascending</Option><Option value="desc">Tanggal Descending</Option></Select>
            <Select value={sppFilter} onChange={onSppFilterChange} style={{ width: 150 }}><Option value="all">Semua SPP</Option><Option value="1">SPP</Option><Option value="0">Non SPP</Option></Select>
            <Button type="primary" onClick={applyFilters} loading={filterLoading}>Terapkan Filter</Button><Button onClick={resetFilters} disabled={filterLoading}>Reset Filter</Button>
          </Space>

          <Table
            dataSource={salesOrders}
            columns={[
              { title: 'Nomor SO', dataIndex: 'nomor_so', key: 'nomor_so' },
              { title: 'Customer', dataIndex: 'nama_customer', key: 'nama_customer' },
              { title: 'Tanggal SO', dataIndex: 'tanggal_so', key: 'tanggal_so' },
              {
                title: 'Aksi', key: 'aksi', render: (_, record) => (<Space><Button icon={<EyeIcon size={16}/>} onClick={() => showDetailModal(record)}>Lihat Detail</Button><Button icon={<DownloadOutlined/>} onClick={() => confirmCetakPDF(record)}>Cetak PDF</Button></Space>)
              }
            ]}
            rowKey="id_sales_order"
            pagination={{ current: currentPage, pageSize, total: totalItems, onChange: onPageChange, showSizeChanger: false }}
            loading={filterLoading}
          />

          <Modal
            title={`Detail Sales Order: ${selectedOrderDetails?.nomor_so || ''}`}
            visible={detailModalVisible}
            onCancel={closeDetailModal}
            footer={<Button onClick={closeDetailModal}>Tutup</Button>}
            width={700}
          >
            {selectedOrderDetails && (
              <div>
                <p><strong>Customer:</strong> {selectedOrderDetails.nama_customer}</p>
                <p>
                  <strong>SPP:</strong>{' '}
                  <Tag color={selectedOrderDetails.spp ? 'green' : 'red'}>
                    {selectedOrderDetails.spp ? 'Ya' : 'Tidak'}
                  </Tag>
                </p>
                <p><strong>Catatan:</strong> {selectedOrderDetails.catatan || '-'}</p>
                <Table
                  dataSource={selectedOrderDetails.detail_sales_order}
                  columns={detailColumns}
                  rowKey="id_detail_sales_order"
                  pagination={false}
                  size="small"
                />
              </div>
            )}
          </Modal>

          <Modal title="Pilih Ikan" visible={modalVisible} onCancel={closeModal} footer={null} width={600} destroyOnClose>
            <Input.Search
              placeholder="Cari nama ikan…"
              allowClear
              onSearch={setIkanFilter}
              style={{ marginBottom: 16 }}
            />
            <Table
              dataSource={
                ikanList.filter(i =>
                    i.nama_ikan.toLowerCase().includes(ikanFilter.toLowerCase())
                  )
              }
              loading={!ikanLoaded}
              columns={[
                { title: 'Kode Ikan', dataIndex: 'kode_ikan', key: 'kode_ikan' },
                { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
                { title: 'Aksi', key: 'aksi', render: (_, ikan) => <Button type="link" onClick={() => handleAddIkan(ikan)}>Tambah</Button> }
              ]}
              rowKey="id_ikan"
              pagination={{ pageSize: 5 }}
              locale={{ emptyText: ikanLoaded ? 'Data ikan tidak tersedia' : 'Memuat ikan...' }}
            />
          </Modal>
        </div>
      </Content>
    </Layout>
  );
}
