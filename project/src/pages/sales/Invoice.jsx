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
  Descriptions
} from 'antd';
import { ArrowLeftIcon, SearchIcon, PrinterIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';
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
  const [invoiceIpFilter, setInvoiceIpFilter] = useState(null);
  const [invoiceSortOrder, setInvoiceSortOrder] = useState('desc'); // 'desc' = Tanggal Terbaru, 'asc' = Tanggal Terlama

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDoDetail, setSelectedDoDetail] = useState(null);

  // New states for invoice detail modal
  const [detailInvoiceModalVisible, setDetailInvoiceModalVisible] = useState(false);
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);

  const API = config.API_BASE_URL;

  useEffect(() => {
    (async () => {
      try {
        const token = sessionStorage.getItem('token');
        const [doRes, soRes] = await Promise.all([
          axios.get(`${API}/delivery_order`, { headers: { Authorization: token } }),
          axios.get(`${API}/sales_order`, { headers: { Authorization: token } })
        ]);
        if (doRes.data.status) setDoList(doRes.data.data);
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
        message.error('Gagal mengambil data awal');
      }
    })();
  }, []);

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

  // Updated grandTotal calculation treating diskon as fixed amount
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

  // Fetch invoices with sort parameter
  const fetchInvoices = async (sortOrder = 'desc') => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get(`${API}/invoice`, {
        headers: { Authorization: token },
        params: { sort: sortOrder }
      });
      if (res.data.status) setInvoiceList(res.data.data);
      else message.error(res.data.message);
    } catch {
      message.error('Gagal mengambil daftar invoice');
    }
  };

  useEffect(() => {
    fetchInvoices(invoiceSortOrder);
  }, [invoiceSortOrder]);

  // Refactor formatNotaPayload to compute harga and total properly
  const formatNotaPayload = invoice => {
    const detail_invoices = invoice.detail_invoices.map(item => {
      const qty = item.netto_second_total || 0;
      // Use harga from priceMap if available, else fallback to 0
      const harga = item.records && item.records[0]?.harga != null ? item.records[0].harga : (priceMap[item.id_ikan] || 0);
      const total = qty * harga;
      return {
        nama_ikan: item.nama_ikan,
        quantity: qty,
        harga,
        total
      };
    });
    const quantity_total = detail_invoices.reduce((sum, d) => sum + d.quantity, 0);
    const total_dpp = detail_invoices.reduce((sum, d) => sum + d.total, 0);
    const diskon = invoice.diskon || 0;
    const pph = Number((total_dpp * 0.0075).toFixed(2));
    const grand_total = Number((total_dpp - diskon - pph).toFixed(2));
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

  const showPrintConfirm = invoice => {
    confirm({
      title: 'Cetak Nota',
      content: `Anda yakin ingin mencetak nota untuk invoice ${invoice.nomor_invoice}?`,
      okText: 'Ya, Cetak',
      cancelText: 'Batal',
      onOk: async () => {
        try {
          const payload = formatNotaPayload(invoice);
          console.log('Payload untuk /invoice_printer:\n', JSON.stringify(payload, null, 2));
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

  const filteredDO = doList
    .filter(d => {
      if (!doDateRange.length) return true;
      const [from, to] = doDateRange;
      const t = dayjs(d.tanggal_do);
      return t.isBetween(from, to, 'day', '[]');
    })
    .sort((a, b) => dayjs(b.tanggal_do).diff(dayjs(a.tanggal_do)));

  const columnsDO = [
    { title: 'No.', key: 'running', render: (_, __, idx) => idx + 1 },
    { title: 'Nomor DO', dataIndex: 'nomor_do', key: 'nomor_do' },
    {
      title: 'Tanggal DO',
      dataIndex: 'tanggal_do',
      key: 'tanggal_do',
      sorter: (a, b) => dayjs(a.tanggal_do).diff(dayjs(b.tanggal_do))
    },
    {
      title: 'Status',
      dataIndex: 'processed',
      key: 'processed',
      render: processed => (processed ? 'True' : 'False')
    },
    {
      title: 'Aksi',
      key: 'aksi',
      render: (_, record) => (
        <Button onClick={() => showDetailModal(record)}>
          Lihat Detail
        </Button>
      )
    }
  ];

  const submitInvoice = async () => {
    try {
      await form.validateFields(['tanggal_invoice']);
    } catch {
      return message.warning('Pilih tanggal invoice');
    }
    if (!selectedRows.length) return message.warning('Pilih minimal satu DO');

    // Prepare detail_invoices with harga from priceMap
    const detail_invoices = selectedRows.map(doItem => ({
      id_delivery_order: doItem.id_delivery_order,
      details: doItem.detail_delivery_order.map(d => ({
        id_detail_delivery_order: d.id_detail_delivery_order,
        harga: priceMap[d.id_ikan] || 0
      }))
    }));

    const payload = {
      invoice: {
        tanggal_invoice: invoiceData.tanggal_invoice.format('YYYY-MM-DD'),
        diskon: invoiceData.diskon, // fixed amount discount
        total,
        grand_total: grandTotal,
        ip: invoiceData.ip
      },
      detail_invoices,
      custom_invoice: customEnabled
        ? customInvoice
            .filter(c => c.id_ikan)
            .map(c => ({
              nama_ikan: c.nama_ikan,
              netto: c.netto,
              harga: c.harga
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
        fetchInvoices(invoiceSortOrder);
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

  const showDeleteModal = invoice => {
    setInvoiceToDelete(invoice);
    setDeleteModalVisible(true);
  };

  const showDetailModal = doRecord => {
    setSelectedDoDetail(doRecord);
    setDetailModalVisible(true);
  };

  const handleDetailModalClose = () => {
    setDetailModalVisible(false);
    setSelectedDoDetail(null);
  };

  // Show invoice detail modal
  const showInvoiceDetail = (invoice) => {
    // Preprocess detail_invoices to ensure harga and grand_total fields exist for display
    if (invoice.detail_invoices) {
      invoice.detail_invoices = invoice.detail_invoices.map(item => {
        const harga = item.records && item.records[0]?.harga != null ? item.records[0].harga : (priceMap[item.id_ikan] || 0);
        const qty = item.netto_second_total || 0;
        const grand_total = harga * qty;
        return {
          ...item,
          harga,
          grand_total
        };
      });
    }
    setSelectedInvoiceDetail(invoice);
    setDetailInvoiceModalVisible(true);
  };

  const handleDetailInvoiceModalClose = () => {
    setSelectedInvoiceDetail(null);
    setDetailInvoiceModalVisible(false);
  };

  // Filter and sort invoice list locally for display with defensive checks
  const filteredSortedInvoiceList = invoiceList
    .filter(inv => {
      if (invoiceDateRange.length === 2) {
        const [from, to] = invoiceDateRange;
        if (!inv.tanggal_invoice) return false; // skip if no date
        const t = dayjs(inv.tanggal_invoice);
        if (!t.isValid()) return false; // skip invalid dates
        if (!t.isBetween(from, to, 'day', '[]')) return false;
      }
      if (invoiceIpFilter === null) return true;
      return inv.ip === (invoiceIpFilter ? 1 : 0);
    })
    .sort((a, b) => {
      const dateA = dayjs(a.tanggal_invoice);
      const dateB = dayjs(b.tanggal_invoice);
      if (!dateA.isValid()) return 1; // push invalid dates to end
      if (!dateB.isValid()) return -1;
      if (invoiceSortOrder === 'asc') {
        return dateA.diff(dateB);
      } else {
        return dateB.diff(dateA);
      }
    });

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
            <Space className="mb-4">
              <RangePicker onChange={vals => setDoDateRange(vals || [])} allowClear />
            </Space>
            <Table
              rowKey="id_delivery_order"
              dataSource={filteredDO}
              columns={columnsDO}
              pagination={{ pageSize: 10 }}
              rowSelection={{
                selectedRowKeys: selectedRows.map(r => r.id_delivery_order),
                onChange: (_, rows) => setSelectedRows(rows),
                getCheckboxProps: () => ({ disabled: customEnabled })
              }}
            />
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
          <Space className="mb-4">
            <RangePicker
              onChange={vals => setInvoiceDateRange(vals || [])}
              allowClear
            />
            <Select
              style={{ width: 160 }}
              placeholder="Filter Pajak"
              allowClear
              onChange={value => setInvoiceIpFilter(value ?? null)}
              value={invoiceIpFilter}
            >
              <Select.Option value={true}>Include Pajak</Select.Option>
              <Select.Option value={false}>Exclude Pajak</Select.Option>
            </Select>
            <Select
              style={{ width: 160 }}
              value={invoiceSortOrder}
              onChange={value => setInvoiceSortOrder(value)}
            >
              <Select.Option value="desc">Tanggal Terbaru</Select.Option>
              <Select.Option value="asc">Tanggal Terlama</Select.Option>
            </Select>
          </Space>
          <Table
            rowKey="id_invoice"
            dataSource={filteredSortedInvoiceList}
            columns={[
              { title: 'No.', key: 'idx', render: (_, __, i) => i + 1 },
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
                    <Button onClick={() => showInvoiceDetail(r)}>Detail</Button>
                    <Button icon={<PrinterIcon size={16} />} onClick={() => showPrintConfirm(r)}>
                      Cetak PDF
                    </Button>
                    <Button danger onClick={() => showDeleteModal(r)}>
                      Delete
                    </Button>
                  </Space>
                )
              }
            ]}
            pagination={{ pageSize: 25 }}
          />
        </Modal>
        <Modal
          title={`Detail Invoice: ${selectedInvoiceDetail?.nomor_invoice || ''}`}
          visible={detailInvoiceModalVisible}
          onCancel={handleDetailInvoiceModalClose}
          footer={null}
          width={700}
        >
          {selectedInvoiceDetail ? (
            <>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Nomor Invoice">{selectedInvoiceDetail.nomor_invoice}</Descriptions.Item>
                <Descriptions.Item label="Tanggal Invoice">{selectedInvoiceDetail.tanggal_invoice}</Descriptions.Item>
                <Descriptions.Item label="Nama Customer">{selectedInvoiceDetail.nama_customer}</Descriptions.Item>
                <Descriptions.Item label="Diskon">{selectedInvoiceDetail.diskon}</Descriptions.Item>
                <Descriptions.Item label="Include Pajak">{selectedInvoiceDetail.ip ? 'Ya' : 'Tidak'}</Descriptions.Item>
                <Descriptions.Item label="Grand Total">{formatCurrency(selectedInvoiceDetail.grand_total)}</Descriptions.Item>
              </Descriptions>
              <Table
                style={{ marginTop: 16 }}
                size="small"
                rowKey="id_detail_invoice"
                dataSource={selectedInvoiceDetail.detail_invoices}
                pagination={false}
                columns={[
                  { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
                  { title: 'Quantity', dataIndex: 'netto_second_total', key: 'quantity' },
                  { title: 'Harga (Rp)', dataIndex: 'harga', key: 'harga', render: v => formatCurrency(v) },
                  { title: 'Total (Rp)', dataIndex: 'grand_total', key: 'total', render: v => formatCurrency(v) }
                ]}
              />
            </>
          ) : (
            <p>Loading...</p>
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
