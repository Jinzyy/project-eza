import React, { useState, useEffect } from 'react';
import {
  Layout,
  Typography,
  Button,
  Form,
  Table,
  DatePicker,
  InputNumber,
  Switch,
  Row,
  Col,
  Card,
  Modal,
  message,
  Space,
  Select,
  Descriptions,
  Tag,
  Pagination,
  Input,
  Progress
} from 'antd';
import { ArrowLeftIcon, PrinterIcon, EyeIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import Header from '../../components/Header';
import config from '../../config';

const { Content } = Layout;
const { Title } = Typography;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

const formatCurrency = v => `Rp ${v?.toLocaleString('id-ID') || 0}`;

export default function InvoicePreview() {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // --- State DO & Invoice List ---
  const [doList, setDoList] = useState([]);
  const [priceMap, setPriceMap] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);

  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [invoiceList, setInvoiceList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters / sort / pagination DO
  const [doDateRange, setDoDateRange] = useState([]);
  const [doSppFilter, setDoSppFilter] = useState(null);
  const [doSortOrder, setDoSortOrder] = useState('desc');
  const [doPageSize, setDoPageSize] = useState(10);
  const [doCurrentPage, setDoCurrentPage] = useState(1);
  const [doTotalItems, setDoTotalItems] = useState(0);

  // Filters / sort / pagination Invoice
  const [invoiceDateRange, setInvoiceDateRange] = useState([]);
  const [invoiceIpFilter, setInvoiceIpFilter] = useState(null);
  const [invoiceSortOrder, setInvoiceSortOrder] = useState('desc');
  const [invoicePageSize, setInvoicePageSize] = useState(25);
  const [invoiceCurrentPage, setInvoiceCurrentPage] = useState(1);
  const [invoiceTotalItems, setInvoiceTotalItems] = useState(0);

  // Detail modals
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDoDetail, setSelectedDoDetail] = useState(null);
  const [detailInvoiceModalVisible, setDetailInvoiceModalVisible] = useState(false);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);

  // --- NEW: Payment Modal State ---
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [invoiceToPay, setInvoiceToPay] = useState(null);
  const [paymentValue, setPaymentValue] = useState(0);

  const [summaryAdjustments, setSummaryAdjustments] = useState({});

  // Invoice form data
  const [invoiceData, setInvoiceData] = useState({
    tanggal_invoice: dayjs(),
    diskon: 0,
    ip: false
  });

  const API = config.API_BASE_URL;

  // Fetch DO list
  const fetchDOList = async (spp, sort, page, limit, dateRange) => {
    try {
      const token = sessionStorage.getItem('token');
      const params = { page, limit, sort };
      if (spp !== null) params.spp = spp ? 1 : 0;
      if (dateRange.length === 2) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      const res = await axios.get(`${API}/delivery_order`, {
        headers: { Authorization: token },
        params
      });
      if (res.data.status) {
        setDoList(res.data.data);
        setDoCurrentPage(res.data.pagination.current_page);
        setDoTotalItems(res.data.pagination.total_items);
      } else {
        message.error(res.data.message || 'Gagal mengambil data DO');
      }
    } catch {
      message.error('Gagal mengambil data DO');
    }
  };

  // Fetch ikan prices
  useEffect(() => {
    (async () => {
      try {
        const token = sessionStorage.getItem('token');
        const soRes = await axios.get(`${API}/sales_order`, { headers: { Authorization: token } });
        if (soRes.data.status) {
          const map = {};
          soRes.data.data.forEach(so =>
            so.detail_sales_order.forEach(d => {
              map[d.id_ikan] = d.harga;
            })
          );
          setPriceMap(map);
        }
      } catch {
        message.error('Gagal mengambil data harga ikan');
      }
    })();
  }, []);

  // Re-fetch DO on filter/sort/page change
  useEffect(() => {
    fetchDOList(doSppFilter, doSortOrder, doCurrentPage, doPageSize, doDateRange);
  }, [doSppFilter, doSortOrder, doCurrentPage, doPageSize, doDateRange]);

  // Fetch invoices
  const fetchInvoices = async (sortOrder, page, limit, ipFilter, dateRange) => {
    try {
      const token = sessionStorage.getItem('token');
      const params = { sort: sortOrder, page, limit };
      if (ipFilter !== null) params.ip = ipFilter ? 1 : 0;
      if (dateRange.length === 2) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      const res = await axios.get(`${API}/invoice`, {
        headers: { Authorization: token },
        params
      });
      if (res.data.status) {
        setInvoiceList(res.data.data);
        setInvoiceCurrentPage(res.data.pagination.current_page);
        setInvoiceTotalItems(res.data.pagination.total_items);
      } else {
        message.error(res.data.message || 'Gagal mengambil daftar invoice');
      }
    } catch {
      message.error('Gagal mengambil daftar invoice');
    }
  };

  // Re-fetch invoices when modal opens or filters change
  useEffect(() => {
    if (invoiceModalVisible) {
      fetchInvoices(invoiceSortOrder, invoiceCurrentPage, invoicePageSize, invoiceIpFilter, invoiceDateRange);
    }
  }, [invoiceModalVisible, invoiceSortOrder, invoiceCurrentPage, invoicePageSize, invoiceIpFilter, invoiceDateRange]);

  // Aggregate DO details
  const summaryData = React.useMemo(() => {
    const agg = {};
    selectedRows.forEach(doItem =>
      doItem.detail_delivery_order.forEach(d => {
        const harga = priceMap[d.id_ikan] || 0;
        const netto = d.netto_second || 0;
        if (!agg[d.id_ikan]) {
          agg[d.id_ikan] = {
            id_ikan: d.id_ikan,
            nama_ikan: d.nama_ikan,
            netto,
            harga,
            subtotal: harga * netto
          };
        } else {
          agg[d.id_ikan].netto += netto;
          agg[d.id_ikan].subtotal += harga * netto;
        }
      })
    );
    return Object.values(agg);
  }, [selectedRows, priceMap]);

  // Totals
  const total = summaryData.reduce((s, r) => s + r.subtotal, 0);
  const discountedTotal = total - (invoiceData.diskon || 0);
  const grandTotal = invoiceData.ip
    ? discountedTotal - discountedTotal * 0.0025
    : discountedTotal;

  // Columns
  const columnsDO = [
    {
      title: 'No.',
      key: 'running',
      render: (_, __, idx) => (doCurrentPage - 1) * doPageSize + idx + 1,
      width: 60
    },
    { title: 'Nomor DO', dataIndex: 'nomor_do', key: 'nomor_do' },
    {
      title: 'Tanggal DO',
      dataIndex: 'tanggal_do',
      key: 'tanggal_do',
      sorter: (a, b) => dayjs(a.tanggal_do).diff(dayjs(b.tanggal_do))
    },
    {
      title: 'SPP',
      dataIndex: 'spp',
      key: 'spp',
      render: spp => (
        <Tag color={spp === 1 ? 'green' : 'red'}>
          {spp === 1 ? 'True' : 'False'}
        </Tag>
      )
    },
    {
      title: 'Aksi',
      key: 'aksi',
      render: (_, record) => (
        <Button icon={<EyeIcon size={16} />} onClick={() => showDetailModal(record)}>Lihat Detail </Button>
      )
    }
  ];

  const columnsInvoice = [
    {
      title: 'No.',
      key: 'idx',
      render: (_, __, i) => (invoiceCurrentPage - 1) * invoicePageSize + i + 1,
      width: 60
    },
    { title: 'Nomor Invoice', dataIndex: 'nomor_invoice', key: 'nomor_invoice' },
    {
      title: 'Tanggal',
      dataIndex: 'tanggal_invoice',
      key: 'tanggal_invoice',
      sorter: (a, b) => dayjs(a.tanggal_invoice).diff(dayjs(b.tanggal_invoice))
    },
    { title: 'Grand Total', dataIndex: 'grand_total', key: 'grand_total', render: v => formatCurrency(v) },
    {
      title: 'Progress',
      key: 'progress',
      render: (_, record) => {
        const percent = record.grand_total
          ? Math.round((record.payment_progress || 0) / record.grand_total * 100)
          : 0;
        return <Progress percent={percent} size="small" />;
      }
    },
    {
      title: 'Aksi',
      key: 'aksi',
      render: (_, r) => (
        <Space>
          <Button icon={<EyeIcon size={16} />} onClick={() => showInvoiceDetail(r)}>Lihat Detail</Button>
          <Button icon={<PrinterIcon size={16} />} onClick={() => showPrintConfirm(r)}>Cetak PDF</Button>
          <Button danger onClick={() => showDeleteModal(r)}>Delete</Button>
          {/* --- Tombol Payment Baru --- */}
          <Button type="primary" onClick={() => openPaymentModal(r)}>
            Payment
          </Button>
        </Space>
      )
    }
  ];

  // --- Modal Handlers ---
  const showDetailModal = doRecord => {
    setSelectedDoDetail(doRecord);
    setDetailModalVisible(true);
  };
  const handleDetailModalClose = () => {
    setDetailModalVisible(false);
    setSelectedDoDetail(null);
  };

  const showInvoiceDetail = invoice => {
    // Buat source detail sama seperti sebelumya
    const detailSource = invoice.detail_invoices.map(item => {
      const qty = item.netto_second_total || 0;
      const harga = item.records[0]?.harga || priceMap[item.id_ikan] || 0;
      return {
        nama_ikan: item.nama_ikan,
        quantity: qty,
        harga,
        total: qty * harga
      };
    });
    setSelectedInvoiceDetail({ ...invoice, detail_invoices: detailSource });
    setDetailInvoiceModalVisible(true);
  };
  const handleDetailInvoiceModalClose = () => {
    setSelectedInvoiceDetail(null);
    setDetailInvoiceModalVisible(false);
  };

  // Print
  const showPrintConfirm = invoice => {
    confirm({
      title: 'Cetak Nota',
      content: `Anda yakin ingin mencetak nota untuk invoice ${invoice.nomor_invoice}?`,
      okText: 'Ya, Cetak',
      cancelText: 'Batal',
      onOk: async () => {
        try {
          const payload = formatNotaPayload(invoice);
          const token = sessionStorage.getItem('token');
          const res = await axios.post(
            `${API}/invoice_printer`,
            payload,
            { headers: { Authorization: token }, responseType: 'blob' }
          );
          const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = `${invoice.nomor_invoice}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } catch {
          message.error('Gagal mencetak nota');
        }
      }
    });
  };

  // Format payload print (tidak berubah)
  const formatNotaPayload = invoice => {
    const detail_invoices = invoice.detail_invoices.map(item => {
      const qty = item.netto_second_total || 0;
      const harga = item.records[0]?.harga || priceMap[item.id_ikan] || 0;
      return {
        nama_ikan: item.nama_ikan,
        quantity: qty,
        harga: harga,
        total: qty * harga
      };
    });
    const quantity_total = detail_invoices.reduce((s, d) => s + d.quantity, 0);
    const total_dpp = detail_invoices.reduce((s, d) => s + d.total, 0);
    const diskon = invoice.diskon || 0;
    const pph = invoice.ip === 1 ? Number((total_dpp * 0.0025).toFixed(2)) : 0;
    const grand_total = invoice.ip === 1
      ? Number((total_dpp - diskon - pph).toFixed(2))
      : Number((total_dpp - diskon).toFixed(2));

    return {
      nama_customer: invoice.nama_customer,
      nomor_invoice: invoice.nomor_invoice,
      tanggal_invoice: invoice.tanggal_invoice,
      quantity_total,
      total_dpp,
      diskon,
      pph,
      grand_total,
      detail_invoices
    };
  };

  // Submit Invoice (tanpa custom_invoice)
  const submitInvoice = async () => {
    // validasi tanggal
    try {
      await form.validateFields(['tanggal_invoice']);
    } catch {
      return message.warning('Pilih tanggal invoice');
    }
    if (!selectedRows.length) {
      return message.warning('Pilih minimal satu DO');
    }

    // hitung total dan grand total (sudah ada di state)
    const payload = {
      invoice: {
        tanggal_invoice: invoiceData.tanggal_invoice.format('YYYY-MM-DD'),
        diskon: Number(invoiceData.diskon.toFixed(2)),
        total: Number(total.toFixed(2)),
        grand_total: Number(grandTotal.toFixed(2)),
        ip: invoiceData.ip ? 1 : 0
      },
      detail_invoices: selectedRows.map(doItem => ({
        id_delivery_order: doItem.id_delivery_order,
        details: doItem.detail_delivery_order.map(d => ({
          id_ikan: d.id_ikan,
          netto: d.netto_second || d.netto_first || 0,
          harga: Number((priceMap[d.id_ikan] || 0).toFixed(2))
        }))
      }))
    };

    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      const res = await axios.post(`${API}/invoice`, payload, {
        headers: { Authorization: token }
      });
      if (res.data.status) {
        message.success('Invoice berhasil dikirim');
        // refresh daftar invoice
        fetchInvoices(invoiceSortOrder, invoiceCurrentPage, invoicePageSize, invoiceIpFilter, invoiceDateRange);
        form.resetFields();
        setSelectedRows([]);
        setInvoiceModalVisible(false);
        navigate('/sales/invoice');
      } else {
        message.error(res.data.message);
      }
    } finally {
      setLoading(false);
    }
  };


  // Delete Invoice
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const showDeleteModal = invoice => {
    setInvoiceToDelete(invoice);
    setDeleteModalVisible(true);
  };

  useEffect(() => {
    const totalRowDiscount = Object.values(summaryAdjustments)
      .reduce((sum, adj) => sum + (adj.diskon || 0), 0);
    setInvoiceData(prev => ({
      ...prev,
      diskon: totalRowDiscount
    }));
  }, [summaryAdjustments]);

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content className="container mx-auto px-6 py-12">
        <Space className="mb-4">
          <Button icon={<ArrowLeftIcon size={16} />} onClick={() => navigate('/sales')}>Kembali</Button>
          <Button onClick={() => setInvoiceModalVisible(true)}>Daftar Invoice</Button>
        </Space>
        <Title level={2}>Invoice Preview</Title>
        <Form form={form} layout="vertical">
          {/* Pilih DO */}
          <Card title="Pilih Delivery Orders" className="mb-6">
            <Space className="mb-4" wrap>
              <RangePicker
                onChange={vals => { setDoDateRange(vals || []); setDoCurrentPage(1); }}
                allowClear
              />
              <Select
                placeholder="Filter SPP"
                allowClear
                style={{ width: 120 }}
                value={doSppFilter}
                onChange={v => { setDoSppFilter(v ?? null); setDoCurrentPage(1); }}
              >
                <Select.Option value={true}>Ya</Select.Option>
                <Select.Option value={false}>Tidak</Select.Option>
              </Select>
              <Select
                style={{ width: 160 }}
                value={doSortOrder}
                onChange={v => { setDoSortOrder(v); setDoCurrentPage(1); }}
              >
                <Select.Option value="desc">Tanggal Terbaru</Select.Option>
                <Select.Option value="asc">Tanggal Terlama</Select.Option>
              </Select>
            </Space>
            <Table
              rowKey="id_delivery_order"
              dataSource={doList}
              columns={columnsDO}
              pagination={false}
              rowSelection={{
                selectedRowKeys: selectedRows.map(r => r.id_delivery_order),
                onChange: (_, rows) => setSelectedRows(rows)
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <Select
                style={{ width: 120 }}
                value={doPageSize}
                onChange={v => { setDoPageSize(v); setDoCurrentPage(1); }}
              >
                {[10, 25, 50, 100].map(n => (
                  <Select.Option key={n} value={n}>{n} / halaman</Select.Option>
                ))}
              </Select>
              <Pagination
                current={doCurrentPage}
                pageSize={doPageSize}
                total={doTotalItems}
                onChange={(p, ps) => { setDoCurrentPage(p); setDoPageSize(ps); }}
                showSizeChanger={false}
              />
            </div>
            <Modal
              title={`Detail Delivery Order: ${selectedDoDetail?.nomor_do || ''}`}
              visible={detailModalVisible}
              onCancel={handleDetailModalClose}
              footer={null}
              width={600}
            >
              {selectedDoDetail && (
                <>
                  <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="Nomor DO">{selectedDoDetail.nomor_do}</Descriptions.Item>
                    <Descriptions.Item label="Nomor SO">{selectedDoDetail.nomor_so}</Descriptions.Item>
                    <Descriptions.Item label="Nama Customer">{selectedDoDetail.nama_customer}</Descriptions.Item>
                    <Descriptions.Item label="Tanggal DO">{selectedDoDetail.tanggal_do}</Descriptions.Item>
                    <Descriptions.Item label="Nomor Kendaraan">{selectedDoDetail.nomor_kendaraan}</Descriptions.Item>
                    <Descriptions.Item label="Catatan">{selectedDoDetail.catatan}</Descriptions.Item>
                    <Descriptions.Item label="Employee">{selectedDoDetail.employee_name}</Descriptions.Item>
                  </Descriptions>
                  <Table
                    style={{ marginTop: 16 }}
                    size="small"
                    rowKey="id_detail_delivery_order"
                    dataSource={selectedDoDetail.detail_delivery_order}
                    pagination={false}
                    columns={[
                      { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
                      { title: 'Kode Ikan', dataIndex: 'kode_ikan', key: 'kode_ikan' },
                      { title: 'Netto First (kg)', dataIndex: 'netto_first', key: 'netto_first' },
                      { title: 'Netto Second (kg)', dataIndex: 'netto_second', key: 'netto_second' }
                    ]}
                  />
                </>
              )}
            </Modal>
          </Card>

          {/* Summary */}
          {summaryData.length > 0 && (
            <Card title="Summary" className="mb-6">
              <Table
                rowKey="id_ikan"
                dataSource={summaryData}
                pagination={false}
                columns={[
                  {
                    title: 'Nama Ikan',
                    dataIndex: 'nama_ikan',
                    key: 'nama_ikan'
                  },
                  {
                    title: 'Netto (kg)',
                    dataIndex: 'netto',
                    key: 'netto'
                  },
                  {
                    title: 'Diskon Berat (kg)',
                    key: 'diskonBerat',
                    render: (_, record) => {
                      const adj = summaryAdjustments[record.id_ikan] || {};
                      return (
                        <InputNumber
                          min={0}
                          style={{ width: 100 }}
                          value={adj.diskonBerat || 0}
                          onChange={val => {
                            const diskonVal = (val || 0) * record.harga;
                            setSummaryAdjustments(prev => ({
                              ...prev,
                              [record.id_ikan]: {
                                ...prev[record.id_ikan],
                                diskonBerat: val || 0,
                                diskon: diskonVal
                              }
                            }));
                          }}
                        />
                      );
                    }
                  },
                  {
                    title: 'Harga (Rp)',
                    dataIndex: 'harga',
                    key: 'harga',
                    render: v => formatCurrency(v)
                  },
                  // {
                  //   title: 'Diskon (Rp)',
                  //   key: 'diskon',
                  //   render: (_, record) => {
                  //     const adj = summaryAdjustments[record.id_ikan] || {};
                  //     return (
                  //       <InputNumber
                  //         min={0}
                  //         style={{ width: 120 }}
                  //         value={adj.diskon || 0}
                  //         onChange={val => {
                  //           setSummaryAdjustments(prev => ({
                  //             ...prev,
                  //             [record.id_ikan]: {
                  //               ...prev[record.id_ikan],
                  //               diskon: val || 0
                  //             }
                  //           }));
                  //         }}
                  //       />
                  //     );
                  //   }
                  // },
                  {
                    title: 'Subtotal (Rp)',
                    dataIndex: 'subtotal',
                    key: 'subtotal',
                    render: v => formatCurrency(v)
                  }
                ]}
              />
            </Card>
          )}

          {/* Detail Invoice */}
          <Card title="Detail Invoice" className="mb-6">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="tanggal_invoice"
                  label="Tanggal Invoice"
                  rules={[{ required: true, message: 'Pilih tanggal invoice' }]}
                  initialValue={invoiceData.tanggal_invoice}
                >
                  <DatePicker
                    format="YYYY-MM-DD"
                    onChange={d => setInvoiceData(prev => ({ ...prev, tanggal_invoice: d }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Diskon">
                  <InputNumber
                    className="w-full"
                    min={0}
                    value={invoiceData.diskon}
                    onChange={v => setInvoiceData(prev => ({ ...prev, diskon: v }))}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Include Pajak">
                  <Switch
                    checked={invoiceData.ip}
                    onChange={v => setInvoiceData(prev => ({ ...prev, ip: v }))}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Space size="large">
              <div>Total: <b>{formatCurrency(total)}</b></div>
              <div>Grand Total: <b>{formatCurrency(grandTotal)}</b></div>
            </Space>
          </Card>


          <Button type="primary" onClick={submitInvoice} loading={loading} block>
            Kirim Invoice
          </Button>
        </Form>

        {/* Daftar Invoice Modal */}
        <Modal
          title="Daftar Invoice"
          open={invoiceModalVisible}
          onCancel={() => setInvoiceModalVisible(false)}
          footer={null}
          width={1000}
        >
          <Space className="mb-4" wrap>
            <RangePicker
              onChange={vals => { setInvoiceDateRange(vals || []); setInvoiceCurrentPage(1); }}
              allowClear
            />
            <Select
              style={{ width: 160 }}
              placeholder="Filter Pajak"
              allowClear
              value={invoiceIpFilter}
              onChange={v => { setInvoiceIpFilter(v ?? null); setInvoiceCurrentPage(1); }}
            >
              <Select.Option value={true}>Include Pajak</Select.Option>
              <Select.Option value={false}>Exclude Pajak</Select.Option>
            </Select>
            <Select
              style={{ width: 160 }}
              value={invoiceSortOrder}
              onChange={v => { setInvoiceSortOrder(v); setInvoiceCurrentPage(1); }}
            >
              <Select.Option value="desc">Tanggal Terbaru</Select.Option>
              <Select.Option value="asc">Tanggal Terlama</Select.Option>
            </Select>
          </Space>
          <Table
            rowKey="id_invoice"
            dataSource={invoiceList}
            columns={columnsInvoice}
            pagination={false}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <Select
              style={{ width: 120 }}
              value={invoicePageSize}
              onChange={v => { setInvoicePageSize(v); setInvoiceCurrentPage(1); }}
            >
              {[10, 25, 50, 100].map(n => (
                <Select.Option key={n} value={n}>{n} / halaman</Select.Option>
              ))}
            </Select>
            <Pagination
              current={invoiceCurrentPage}
              pageSize={invoicePageSize}
              total={invoiceTotalItems}
              onChange={(p, ps) => { setInvoiceCurrentPage(p); setInvoicePageSize(ps); }}
              showSizeChanger={false}
            />
          </div>
        </Modal>

        {/* Detail Invoice Modal */}
        <Modal
          title={`Detail Invoice: ${selectedInvoiceDetail?.nomor_invoice || ''}`}
          visible={detailInvoiceModalVisible}
          onCancel={handleDetailInvoiceModalClose}
          footer={null}
          width={700}
        >
          {selectedInvoiceDetail && (
            <>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Nomor Invoice">
                  {selectedInvoiceDetail.nomor_invoice}
                </Descriptions.Item>
                <Descriptions.Item label="Tanggal Invoice">
                  {selectedInvoiceDetail.tanggal_invoice}
                </Descriptions.Item>
                <Descriptions.Item label="Nama Customer">
                  {selectedInvoiceDetail.nama_customer}
                </Descriptions.Item>
                <Descriptions.Item label="Diskon">
                  {selectedInvoiceDetail.diskon}
                </Descriptions.Item>
                <Descriptions.Item label="Include Pajak">
                  {selectedInvoiceDetail.ip ? 'Ya' : 'Tidak'}
                </Descriptions.Item>
                <Descriptions.Item label="Grand Total">
                  {formatCurrency(selectedInvoiceDetail.grand_total)}
                </Descriptions.Item>
              </Descriptions>
              <Table
                style={{ marginTop: 16 }}
                size="small"
                rowKey={(r, i) => i}
                dataSource={selectedInvoiceDetail.detail_invoices}
                pagination={false}
                columns={[
                  { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
                  { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
                  { title: 'Harga (Rp)', dataIndex: 'harga', key: 'harga', render: v => formatCurrency(v) },
                  { title: 'Total (Rp)', dataIndex: 'total', key: 'total', render: v => formatCurrency(v) },
                ]}
              />
            </>
          )}
        </Modal>

        {/* Konfirmasi Hapus Invoice */}
        <Modal
          title="Konfirmasi Hapus Invoice"
          open={deleteModalVisible}
          onCancel={() => setDeleteModalVisible(false)}
          onOk={async () => {
            try {
              await axios.delete(`${config.API_BASE_URL}/invoice/${invoiceToDelete.id_invoice}`, {
                headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
              });
              message.success("Invoice berhasil dihapus");
              setInvoiceList(invoiceList.filter(inv => inv.id_invoice !== invoiceToDelete.id_invoice));
            } catch {
              message.error("Gagal menghapus invoice");
            } finally {
              setDeleteModalVisible(false);
            }
          }}
          okText="Hapus"
          okButtonProps={{ danger: true }}
          cancelText="Batal"
        >
          <p>Apakah Anda yakin ingin menghapus invoice <b>{invoiceToDelete?.nomor_invoice}</b>?</p>
        </Modal>

        {/* --- Modal Payment Baru --- */}
        <Modal
          title={`Payment Invoice: ${invoiceToPay?.nomor_invoice || ''}`}
          open={paymentModalVisible}
          onCancel={() => setPaymentModalVisible(false)}
          okText="Simpan"
          onOk={async () => {
            try {
              await axios.put(
                `${API}/invoice/${invoiceToPay.id_invoice}`,
                { payment: Number(paymentValue) },
                { headers: { Authorization: sessionStorage.getItem('token') } }
              );
              message.success('Payment berhasil disimpan');
              // refresh daftar invoice
              fetchInvoices(invoiceSortOrder, invoiceCurrentPage, invoicePageSize, invoiceIpFilter, invoiceDateRange);
            } catch {
              message.error('Gagal menyimpan payment');
            } finally {
              setPaymentModalVisible(false);
              setPaymentValue(0);
              setInvoiceToPay(null);
            }
          }}
        >
          {invoiceToPay && (
            <p>
              Sisa pembayaran:{' '}
              <b>
                {formatCurrency(
                  invoiceToPay.grand_total - (invoiceToPay.payment_progress || 0)
                )}
              </b>
            </p>
          )}
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            value={paymentValue}
            onChange={v => setPaymentValue(v || 0)}
            placeholder="Masukkan nominal pembayaran"
          />
        </Modal>
      </Content>
    </Layout>
  );

  // Fungsi untuk membuka payment modal
  function openPaymentModal(invoice) {
    setInvoiceToPay(invoice);
    setPaymentValue(invoice.payment || 0);
    setPaymentModalVisible(true);
  }
}
