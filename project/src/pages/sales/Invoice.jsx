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
  Input,
  Select,
  Descriptions,
  Tag,
  Pagination
} from 'antd';
import { ArrowLeftIcon, SearchIcon, PrinterIcon, EyeIcon } from 'lucide-react';
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

  const [doList, setDoList] = useState([]);
  const [priceMap, setPriceMap] = useState({});

  const [selectedRows, setSelectedRows] = useState([]);
  const [invoiceData, setInvoiceData] = useState({
    tanggal_invoice: dayjs(),
    diskon: 0,
    ip: false
  });
  const [customEnabled, setCustomEnabled] = useState(false);
  const [customInvoice, setCustomInvoice] = useState([
    { id_ikan: null, nama_ikan: '', netto: 0, harga: 0 }
  ]);
  const [fishModal, setFishModal] = useState({ open: false, rowIdx: null });

  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [invoiceList, setInvoiceList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  const [doDateRange, setDoDateRange] = useState([]);
  const [invoiceDateRange, setInvoiceDateRange] = useState([]);

  // Pagination and filters for DO
  const [doPageSize, setDoPageSize] = useState(10);
  const [doCurrentPage, setDoCurrentPage] = useState(1);
  const [doTotalItems, setDoTotalItems] = useState(0);
  const [doSppFilter, setDoSppFilter] = useState(null);
  const [doSortOrder, setDoSortOrder] = useState('desc'); // 'desc' = latest first

  // Filters and sort for invoice
  const [invoiceIpFilter, setInvoiceIpFilter] = useState(null);
  const [invoiceSortOrder, setInvoiceSortOrder] = useState('desc'); // 'desc' = latest first
  const [invoicePageSize, setInvoicePageSize] = useState(25);
  const [invoiceCurrentPage, setInvoiceCurrentPage] = useState(1);
  const [invoiceTotalItems, setInvoiceTotalItems] = useState(0);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDoDetail, setSelectedDoDetail] = useState(null);

  const [detailInvoiceModalVisible, setDetailInvoiceModalVisible] = useState(false);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);

  const API = config.API_BASE_URL;

  // Fetch DO list with filters, sort, and pagination params
  const fetchDOList = async (spp = null, sort = 'desc', page = 1, limit = doPageSize, dateRange = []) => {
    try {
      const token = sessionStorage.getItem('token');
      const params = { page, limit };
      if (spp !== null) params.spp = spp ? 1 : 0;
      if (sort) params.sort = sort;
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

  // Fetch sales order prices on mount
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

  // Fetch DO list on filters, sort, pagination, or date range change
  useEffect(() => {
    fetchDOList(doSppFilter, doSortOrder, doCurrentPage, doPageSize, doDateRange);
  }, [doSppFilter, doSortOrder, doCurrentPage, doPageSize, doDateRange]);

  // Fetch invoices with sort, filter, pagination, and date range parameters
  const fetchInvoices = async (sortOrder = 'desc', page = 1, limit = invoicePageSize, ipFilter = invoiceIpFilter, dateRange = invoiceDateRange) => {
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

  // Fetch invoices when modal visible or filters/sort/pagination change
  useEffect(() => {
    if (invoiceModalVisible) {
      fetchInvoices(invoiceSortOrder, invoiceCurrentPage, invoicePageSize, invoiceIpFilter, invoiceDateRange);
    }
  }, [invoiceModalVisible, invoiceSortOrder, invoiceCurrentPage, invoicePageSize, invoiceIpFilter, invoiceDateRange]);

  // Aggregate selected DO details for summary
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

  const total = customEnabled
    ? customInvoice.reduce((s, c) => s + (c.harga || 0) * (c.netto || 0), 0)
    : summaryData.reduce((s, r) => s + r.subtotal, 0);

  // Grand total calculation with discount and tax
  const discountedTotal = total - (invoiceData.diskon || 0);
  const grandTotal = invoiceData.ip
    ? discountedTotal - discountedTotal * 0.0025
    : discountedTotal;

  const fishList = summaryData.map(r => ({
    id_ikan: r.id_ikan,
    nama_ikan: r.nama_ikan,
    harga: r.harga
  }));

  const columnsFish = [
    { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
    { title: 'Harga (Rp)', dataIndex: 'harga', key: 'harga', render: v => formatCurrency(v) }
  ];

  const openFishModal = idx => setFishModal({ open: true, rowIdx: idx });
  const handleFishSelect = rec => {
    setCustomInvoice(ci =>
      ci.map((r, i) =>
        i === fishModal.rowIdx
          ? { ...r, id_ikan: rec.id_ikan, nama_ikan: rec.nama_ikan, harga: rec.harga }
          : r
      )
    );
    setFishModal({ open: false, rowIdx: null });
  };

  // Columns for DO table with SPP tag
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
        <Button icon={<EyeIcon size={16} />} onClick={() => showDetailModal(record)}>
        </Button>
      )
    }
  ];

  // Columns for invoice table inside modal
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
      title: 'Aksi',
      key: 'aksi',
      render: (_, r) => (
        <Space>
          <Button icon={<EyeIcon size={16} />} onClick={() => showInvoiceDetail(r)}></Button>
          <Button icon={<PrinterIcon size={16} />} onClick={() => showPrintConfirm(r)}>
            Cetak PDF
          </Button>
          <Button danger onClick={() => showDeleteModal(r)}>
            Delete
          </Button>
        </Space>
      )
    }
  ];

  // Show print confirmation modal and print PDF
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

  // Format payload for printing invoice
  const formatNotaPayload = invoice => {
    const useCustom = Array.isArray(invoice.custom_invoices) && invoice.custom_invoices.length > 0;

    const detail_invoices = (useCustom
      ? invoice.custom_invoices.map(c => {
          const qty = c.netto_total || 0;
          const harga = c.records[0]?.harga ?? 0;
          return {
            nama_ikan: c.nama_ikan,
            quantity: qty,
            harga: harga,
            total: qty * harga
          };
        })
      : invoice.detail_invoices.map(item => {
          const qty = item.netto_second_total || 0;
          const harga = item.records[0]?.harga ?? (priceMap[item.id_ikan] || 0);
          return {
            nama_ikan: item.nama_ikan,
            quantity: qty,
            harga: harga,
            total: qty * harga
          };
        })
    );

    const quantity_total = detail_invoices.reduce((s, d) => s + d.quantity, 0);
    const total_dpp = detail_invoices.reduce((s, d) => s + d.total, 0);
    const diskon = invoice.diskon || 0;

    const pph = invoice.ip === 1
      ? Number((total_dpp * 0.0025).toFixed(2))
      : 0;

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

  // Submit invoice creation
  const submitInvoice = async () => {
    try {
      await form.validateFields(['tanggal_invoice']);
    } catch {
      return message.warning('Pilih tanggal invoice');
    }
    if (!selectedRows.length && !customEnabled) return message.warning('Pilih minimal satu DO atau aktifkan custom invoice');

    const payload = {
      invoice: {
        tanggal_invoice: invoiceData.tanggal_invoice.format('YYYY-MM-DD'),
        diskon: Number(invoiceData.diskon.toFixed(2)),
        total: Number(total.toFixed(2)),
        grand_total: Number(grandTotal.toFixed(2)),
        ip: invoiceData.ip
      },
      detail_invoices: customEnabled ? [] : selectedRows.map(doItem => ({
        id_delivery_order: doItem.id_delivery_order,
        details: doItem.detail_delivery_order.map(d => ({
          id_detail_delivery_order: d.id_detail_delivery_order,
          harga: Number((priceMap[d.id_ikan] || 0).toFixed(2))
        }))
      })),
      custom_invoice: customEnabled
        ? customInvoice
            .filter(c => c.id_ikan)
            .map(c => ({
              nama_ikan: c.nama_ikan,
              netto: Number(c.netto),
              harga: Number(c.harga.toFixed(2))
            }))
        : []
    };

    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      const res = await axios.post(`${API}/invoice`, payload, {
        headers: { Authorization: token }
      });
      if (res.data.status) {
        message.success('Invoice berhasil dikirim');
        fetchInvoices(invoiceSortOrder, invoiceCurrentPage, invoicePageSize, invoiceIpFilter, invoiceDateRange);
        form.resetFields();
        setSelectedRows([]);
        setCustomInvoice([{ id_ikan: null, nama_ikan: '', netto: 0, harga: 0 }]);
        setCustomEnabled(false);
        setInvoiceModalVisible(false);
        navigate('/sales/invoice');
      } else {
        message.error(res.data.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show delete confirmation modal
  const showDeleteModal = invoice => {
    setInvoiceToDelete(invoice);
    setDeleteModalVisible(true);
  };

  // Show DO detail modal
  const showDetailModal = doRecord => {
    setSelectedDoDetail(doRecord);
    setDetailModalVisible(true);
  };

  const handleDetailModalClose = () => {
    setDetailModalVisible(false);
    setSelectedDoDetail(null);
  };

  // Show invoice detail modal
  const showInvoiceDetail = invoice => {
    const useCustom = Array.isArray(invoice.custom_invoices) && invoice.custom_invoices.length > 0;
    const detailSource = (useCustom
      ? invoice.custom_invoices.map(c => ({
          nama_ikan: c.nama_ikan,
          quantity: c.netto_total,
          harga: c.records[0].harga,
          total: c.netto_total * c.records[0].harga
        }))
      : invoice.detail_invoices.map(item => {
          const qty = item.netto_second_total || 0;
          const harga = item.records[0].harga || priceMap[item.id_ikan] || 0;
          return {
            nama_ikan: item.nama_ikan,
            quantity: qty,
            harga,
            total: qty * harga
          };
        })
    );

    setSelectedInvoiceDetail({ ...invoice, detail_invoices: detailSource });
    setDetailInvoiceModalVisible(true);
  };

  const handleDetailInvoiceModalClose = () => {
    setSelectedInvoiceDetail(null);
    setDetailInvoiceModalVisible(false);
  };

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
          <Card title="Pilih Delivery Orders" className="mb-6">
            <Space className="mb-4" wrap>
              <RangePicker
                onChange={vals => {
                  setDoDateRange(vals || []);
                  setDoCurrentPage(1);
                }}
                allowClear
              />
              <Select
                placeholder="Filter SPP"
                allowClear
                style={{ width: 120 }}
                onChange={value => {
                  setDoSppFilter(value ?? null);
                  setDoCurrentPage(1);
                }}
                value={doSppFilter}
              >
                <Select.Option value={true}>Ya</Select.Option>
                <Select.Option value={false}>Tidak</Select.Option>
              </Select>
              <Select
                style={{ width: 160 }}
                value={doSortOrder}
                onChange={value => {
                  setDoSortOrder(value);
                  setDoCurrentPage(1);
                }}
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
                onChange: (_, rows) => setSelectedRows(rows),
                getCheckboxProps: () => ({ disabled: customEnabled })
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <Select
                style={{ width: 120 }}
                value={doPageSize}
                onChange={value => {
                  setDoPageSize(value);
                  setDoCurrentPage(1);
                }}
              >
                <Select.Option value={10}>10 / halaman</Select.Option>
                <Select.Option value={25}>25 / halaman</Select.Option>
                <Select.Option value={50}>50 / halaman</Select.Option>
                <Select.Option value={100}>100 / halaman</Select.Option>
              </Select>
              <Pagination
                current={doCurrentPage}
                pageSize={doPageSize}
                total={doTotalItems}
                onChange={(page, pageSize) => {
                  setDoCurrentPage(page);
                  setDoPageSize(pageSize);
                }}
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
              {selectedDoDetail ? (
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
              ) : (
                <p>Loading...</p>
              )}
            </Modal>
          </Card>
          {summaryData.length > 0 && (
            <Card
              title="Summary"
              className="mb-6"
              style={{
                filter: customEnabled ? 'blur(3px)' : 'none',
                pointerEvents: customEnabled ? 'none' : 'auto',
                userSelect: customEnabled ? 'none' : 'auto',
                opacity: customEnabled ? 0.6 : 1
              }}
            >
              <Table
                rowKey="id_ikan"
                dataSource={summaryData}
                pagination={false}
                columns={[
                  { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
                  { title: 'Netto (kg)', dataIndex: 'netto', key: 'netto' },
                  { title: 'Harga (Rp)', dataIndex: 'harga', key: 'harga', render: v => formatCurrency(v) },
                  { title: 'Subtotal (Rp)', dataIndex: 'subtotal', key: 'subtotal', render: v => formatCurrency(v) }
                ]}
              />
            </Card>
          )}
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
          <Card title="Custom Invoice Pembeli" className="mb-6">
            <Form.Item label="Enable Custom Invoice">
              <Switch checked={customEnabled} onChange={setCustomEnabled} />
            </Form.Item>
            {customEnabled && customInvoice.map((row, idx) => (
              <Row gutter={16} key={idx} className="mb-2">
                <Col span={6}>
                  <Form.Item label="Nama Ikan">
                    <Input
                      value={row.nama_ikan}
                      onChange={e => {
                        const newName = e.target.value;
                        setCustomInvoice(ci =>
                          ci.map((r, i) => (i === idx ? { ...r, nama_ikan: newName } : r))
                        );
                      }}
                    />
                    <Button
                      icon={<SearchIcon size={16} />}
                      onClick={() => openFishModal(idx)}
                      disabled={!fishList.length}
                      className="mt-1"
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Netto (kg)">
                    <InputNumber className="w-full" min={0} value={row.netto} onChange={v => setCustomInvoice(ci => ci.map((r,i)=>(i===idx?{...r,netto:v}:r)))} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="Harga">
                    <InputNumber className="w-full" min={0} value={row.harga} onChange={v => setCustomInvoice(ci => ci.map((r,i)=>(i===idx?{...r,harga:v}:r)))} />
                  </Form.Item>
                </Col>
                <Col span={3}>
                  <Button danger onClick={()=>setCustomInvoice(ci=>ci.filter((_,i)=>i!==idx))}>Hapus</Button>
                </Col>
              </Row>
            ))}
            {customEnabled && <Button type="dashed" onClick={()=>setCustomInvoice(ci=>[...ci,{ id_ikan:null,nama_ikan:'',netto:0,harga:0 }])}>Tambah Baris</Button>}
          </Card>
          <Button type="primary" onClick={submitInvoice} loading={loading} block>Kirim Invoice</Button>
        </Form>
        <Modal title="Pilih Ikan" open={fishModal.open} footer={null} onCancel={()=>setFishModal({ open:false, rowIdx:null })} width={400}>
          <Table rowKey="id_ikan" dataSource={fishList} columns={columnsFish} pagination={false} onRow={rec=>({ onClick:()=>handleFishSelect(rec) })} />
        </Modal>
        <Modal
          title="Daftar Invoice"
          open={invoiceModalVisible}
          onCancel={() => setInvoiceModalVisible(false)}
          footer={null}
          width={800}
        >
          <Space className="mb-4" wrap>
            <RangePicker
              onChange={vals => {
                setInvoiceDateRange(vals || []);
                setInvoiceCurrentPage(1);
              }}
              allowClear
            />
            <Select
              style={{ width: 160 }}
              placeholder="Filter Pajak"
              allowClear
              onChange={value => {
                setInvoiceIpFilter(value ?? null);
                setInvoiceCurrentPage(1);
              }}
              value={invoiceIpFilter}
            >
              <Select.Option value={true}>Include Pajak</Select.Option>
              <Select.Option value={false}>Exclude Pajak</Select.Option>
            </Select>
            <Select
              style={{ width: 160 }}
              value={invoiceSortOrder}
              onChange={value => {
                setInvoiceSortOrder(value);
                setInvoiceCurrentPage(1);
              }}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <Select
              style={{ width: 120 }}
              value={invoicePageSize}
              onChange={value => {
                setInvoicePageSize(value);
                setInvoiceCurrentPage(1);
              }}
            >
              <Select.Option value={10}>10 / halaman</Select.Option>
              <Select.Option value={25}>25 / halaman</Select.Option>
              <Select.Option value={50}>50 / halaman</Select.Option>
              <Select.Option value={100}>100 / halaman</Select.Option>
            </Select>
            <Pagination
              current={invoiceCurrentPage}
              pageSize={invoicePageSize}
              total={invoiceTotalItems}
              onChange={(page, pageSize) => {
                setInvoiceCurrentPage(page);
                setInvoicePageSize(pageSize);
              }}
              showSizeChanger={false}
            />
          </div>
        </Modal>
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
                rowKey={(record, index) => record || index}
                dataSource={selectedInvoiceDetail.nomor_do || []}
                pagination={false}
                columns={[
                  { title: 'Nomor DO', dataIndex: '', key: 'nomor_do', render: text => text }
                ]}
              />
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
            } catch (error) {
              console.error("Gagal hapus invoice:", error);
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
      </Content>
    </Layout>
  );
}
