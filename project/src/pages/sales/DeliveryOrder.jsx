import React, { useEffect, useState } from 'react';
import {
  Layout, Typography, Button, Table, Card, Form, DatePicker,
  Select, InputNumber, Space, message, Modal, Tag, Input, Switch,
  Progress
} from 'antd';
import { ArrowLeftIcon, PrinterIcon, EyeIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';
import dayjs from 'dayjs';
import axios from 'axios';
import config from '../../config';

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function DeliveryOrder() {
  const [form] = Form.useForm();
  const [customForm] = Form.useForm();
  const navigate = useNavigate();

  const [salesOrders, setSalesOrders] = useState([]);
  const [dos, setDos] = useState([]);
  const [selectedSO, setSelectedSO] = useState(null);
  const [cards, setCards] = useState([]);

  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, record: null });
  const [detailModal, setDetailModal] = useState({ visible: false, record: null });
  const [soDetailModal, setSoDetailModal] = useState({ visible: false, record: null });

  const [customModal, setCustomModal] = useState({ visible: false, record: null });
  const [confirmCustom, setConfirmCustom] = useState({ visible: false });

  const [customers, setCustomers] = useState([]);
  const [doDateRange, setDoDateRange] = useState(null);
  const [soDateRange, setSoDateRange] = useState(null);

  const [doSort, setDoSort] = useState('reset');
  const [soSort, setSoSort] = useState('reset');

  const [doPagination, setDoPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [soPagination, setSoPagination] = useState({ current: 1, pageSize: 25, total: 0 });

  const [doSPPFilter, setDoSPPFilter] = useState(null);

  const [soProcessedFilter, setSoProcessedFilter] = useState(null);

  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [pendingCustomRecord, setPendingCustomRecord] = useState(null);


  const API = config.API_BASE_URL;

  // Helpers
  const formatDateRangeParams = (range) => {
    if (!range || range.length !== 2) return {};
    return {
      date_start: range[0].format('YYYY-MM-DD'),
      date_end:   range[1].format('YYYY-MM-DD'),
    };
  };

  // Fetch SO, DO, Customers
  const fetchData = async () => {
    const token = sessionStorage.getItem('token');

    // Sales Orders
    try {
      const soParams = {
        ...formatDateRangeParams(soDateRange),
        ...(soProcessedFilter != null ? { processed: soProcessedFilter } : {}),
        ...(soSort !== 'reset' ? { sort: soSort } : {}),
        page:  soPagination.current,
        limit: soPagination.pageSize,
      };
      const soQ = new URLSearchParams(soParams).toString();
      const { data: soRes } = await axios.get(
        `${API}/sales_order${soQ ? `?${soQ}` : ''}`,
        { headers: { Authorization: token } }
      );
      if (soRes.status) {
        setSalesOrders(soRes.data);
        setSoPagination({
          current:  soRes.pagination.current_page,
          pageSize: soRes.pagination.per_page,
          total:    soRes.pagination.total_items,
        });
      }
    } catch {
      message.error('Gagal mengambil Sales Order');
    }

    // Delivery Orders
    try {
      const doParams = {
        ...formatDateRangeParams(doDateRange),
        ...(doSort !== 'reset' ? { sort: doSort } : {}),
        page:  doPagination.current,
        limit: doPagination.pageSize,
        ...(doSPPFilter != null ? { spp: doSPPFilter } : {}),
      };
      const doQ = new URLSearchParams(doParams).toString();
      const { data: doRes } = await axios.get(
        `${API}/delivery_order${doQ ? `?${doQ}` : ''}`,
        { headers: { Authorization: token } }
      );
      if (doRes.status) {
        setDos(doRes.data);
        setDoPagination({
          current:  doRes.pagination.current_page,
          pageSize: doRes.pagination.per_page,
          total:    doRes.pagination.total_items,
        });
      }
    } catch {
      // silent
    }

    // Customers
    try {
      const { data: custRes } = await axios.get(
        `${API}/customer`,
        { headers: { Authorization: token } }
      );
      if (custRes.status) setCustomers(custRes.data);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchData();
  }, [
    soDateRange, doDateRange,
    soSort, doSort,
    doSPPFilter,
    soProcessedFilter,
    soPagination.current, soPagination.pageSize,
    doPagination.current, doPagination.pageSize,
  ]);

  // Table pagination handlers
  const handleDoTableChange = (pagination) =>
    setDoPagination(prev => ({ ...prev, current: pagination.current, pageSize: pagination.pageSize }));
  const handleSoTableChange = (pagination) =>
    setSoPagination(prev => ({ ...prev, current: pagination.current, pageSize: pagination.pageSize }));

  // Columns
  const doColumns = [
    { title: 'Nomor DO', dataIndex: 'nomor_do', key: 'nomor_do' },
    { title: 'Nomor SO', dataIndex: 'nomor_so', key: 'nomor_so' },
    { title: 'Customer', dataIndex: 'nama_customer', key: 'nama_customer' },
    { title: 'Tanggal DO', dataIndex: 'tanggal_do', key: 'tanggal_do' },
    {
      title: 'SPP',
      dataIndex: 'spp',
      key: 'spp',
      render: val => <Tag color={val ? 'green' : 'red'}>{val ? 'True' : 'False'}</Tag>
    },
    {
      title: 'Aksi', key: 'aksi',
      render: (_, rec) => (
        <Space>
          <Button
            icon={<PrinterIcon size={16} />}
            onClick={() => setModal({ visible: true, record: rec })}
          >Print</Button>
          <Button
            icon={<EyeIcon size={16} />}
            onClick={() => setDetailModal({ visible: true, record: rec })}
          >Lihat Detail</Button>
          <Button
            onClick={() => {
              // Tampilkan modal warning terlebih dahulu
              setWarningModalVisible(true);
              // Simpan record yang akan diproses agar bisa dipakai setelah konfirmasi
              setPendingCustomRecord(rec);
            }}
          >
            Custom DO
          </Button>
        </Space>
      )
    }
  ];

  const soColumns = [
    { title: 'Nomor SO', dataIndex: 'nomor_so', key: 'nomor_so' },
    { title: 'Customer', dataIndex: 'nama_customer', key: 'nama_customer' },
    { title: 'Tanggal SO', dataIndex: 'tanggal_so', key: 'tanggal_so' },
    {
      title: 'Status', key: 'processed',
      render: (_, r) => (
        <Tag color={r.processed ? 'green' : 'red'}>
          {r.processed ? 'Sudah Dipakai' : 'Belum Dipakai'}
        </Tag>
      )
    },
    {
      title: 'Progress',
      key: 'progress',
      render: (_, record) => {
        // total berat dan berat_terkirim
        const totalBerat    = record.detail_sales_order.reduce((sum, d) => sum + d.berat, 0);
        const totalTerkirim = record.detail_sales_order.reduce((sum, d) => sum + d.berat_terkirim, 0);
        const percent       = totalBerat
          ? Math.round((totalTerkirim / totalBerat) * 100)
          : 0;
        return <Progress percent={percent} size="small" />;
      }
    },
    {
      title: 'Aksi', key: 'aksi',
      render: (_, r) => (
        <Button
          icon={<EyeIcon size={16} />}
          onClick={() => { setSoDetailModal({ visible: true, record: r }); fetchData(); }}
        >Lihat Detail</Button>
      )
    }
  ];

  const rowSelection = {
    type: 'radio',
    onChange: (_, rows) => setSelectedSO(rows[0]),
  };

  // Generate DO: build cards
  const handleGenerate = async () => {
    if (!selectedSO) return message.warning('Pilih satu Sales Order dahulu');
    const base = selectedSO.detail_sales_order.map(item => ({
      key: item.id_detail_sales_order,
      id_ikan: item.id_ikan,
      nama_ikan: item.nama_ikan,
      pallets: [],
      stokWeight: null,
      selectedStock: null,
      nettoSecond: null,
      mode: 'pilih',
    }));

    await Promise.all(base.map(async c => {
      try {
        const token = sessionStorage.getItem('token');
        const { data: res } = await axios.get(
          `${API}/stok_ikan?id_ikan=${c.id_ikan}`,
          { headers: { Authorization: token } }
        );
        if (res.status && res.data.length) {
          c.pallets = res.data[0].records;
        }
      } catch { /* silent */ }
    }));

    setCards(base);
  };

  // Card handlers
  const handleModeChange = (key, mode) =>
    setCards(cs => cs.map(c => c.key === key ? { ...c, mode } : c));
  const handleSelectPallet = (key, stokId) =>
    setCards(cs => cs.map(c => {
      if (c.key !== key) return c;
      const stock = c.pallets.find(p => p.id_stok_ikan === stokId);
      return { ...c, selectedStock: stock, stokWeight: stock.berat_bersih_ikan };
    }));
  const handleNettoSecond = (key, val) =>
    setCards(cs => cs.map(c => c.key === key ? { ...c, nettoSecond: val } : c));

  // Submit DO
  const handleSubmit = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }

    const { tanggal_do, nomor_kendaraan, catatan, is_spp } = form.getFieldsValue();

    const detailDeliveryOrder = cards
      .filter(c => c.selectedStock && c.nettoSecond != null)
      .map(c => ({
        id_ikan:      c.id_ikan,
        netto_first:  c.stokWeight,
        netto_second: c.nettoSecond,
      }));

    const updateStok = cards
      .filter(c => c.mode === 'pecah' && c.selectedStock && c.nettoSecond != null)
      .map(c => ({
        id_pallet:    c.selectedStock.id_pallet,
        id_ikan:      c.id_ikan,
        netto_second: c.stokWeight - c.nettoSecond,
      }));

    const detailPallet = Array.from(new Set(
      cards
        .filter(c => c.mode === 'pilih' && c.selectedStock)
        .map(c => c.selectedStock.id_pallet)
    ));

    const payload = {
      delivery_order: {
        id_sales_order: selectedSO.id_sales_order,
        tanggal_do:     tanggal_do.format('YYYY-MM-DD'),
        nomor_kendaraan,
        catatan,
        spp: is_spp,
      },
      detail_delivery_order: detailDeliveryOrder,
      detail_pallet:         detailPallet,
      update_stok:           updateStok,
    };

    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const { data: res } = await axios.post(
        `${API}/delivery_order`,
        payload,
        { headers: { Authorization: token } }
      );
      if (res.status) {
        message.success(`DO berhasil: ${res.nomor_do}`);
        fetchData();
        form.resetFields();
        setCards([]);
        setSelectedSO(null);
      } else {
        message.error('Gagal menyimpan DO');
      }
    } catch (e) {
      message.error(e.response?.data?.message || 'Gagal menyimpan DO');
    } finally {
      setLoading(false);
    }
  };

  // Send Custom DO
  const handleCustomSend = async () => {
    try {
      await customForm.validateFields();
    } catch {
      return;
    }
    const record = customModal.record;
    const { items } = customForm.getFieldsValue();

    const payload = {
      ...record,
      detail_delivery_order: items.map(i => ({
        id_detail_delivery_order: i.key,
        nama_ikan:                i.nama_ikan,
        harga:                    i.harga,
      })),
      request_custom: true,
    };

    setConfirmCustom({ visible: false });
    try {
      const token = sessionStorage.getItem('token');
      await axios.post(
        `${API}/delivery_order`,
        payload,
        { headers: { Authorization: token } }
      );
      message.success('Custom DO berhasil dikirim');
      setCustomModal({ visible: false, record: null });
      fetchData();
    } catch {
      message.error('Gagal kirim Custom DO');
    }
  };

  const handleCustomSubmit = async (values) => {
  if (!customModal.record) return;

  const token = sessionStorage.getItem('token');
  const payload = {
    detail_delivery_order: values.items.map(item => ({
      id_ikan: item.id_ikan,
      netto_first: item.netto_first,
      netto_second: item.netto_second,
      id_delivery_order: customModal.record.id_delivery_order,
    })),
  };

  try {
    setLoading(true);
    const res = await axios.post(
      `${API}/custom_delivery_order`,
      payload,
      { headers: { Authorization: token } }
    );
    if (res.data.status) {
      message.success('Custom DO berhasil dikirim');
      setCustomModal({ visible: false, record: null });
      fetchData(); // refresh data jika perlu
    } else {
      message.error('Gagal mengirim Custom DO');
    }
  } catch (error) {
    message.error('Terjadi kesalahan saat mengirim Custom DO');
  } finally {
    setLoading(false);
  }
};


  return (
    <Layout className="min-h-screen">
      <Header />
      <Content className="container mx-auto px-6 py-8">

        {/* Back button */}
        <Button
          icon={<ArrowLeftIcon size={16} />}
          onClick={() => navigate('/sales')}
          className="mb-6"
        >
          Kembali
        </Button>

        {/* Delivery Orders Table */}
        <Title level={3}>List Delivery Orders</Title>
        <Space style={{ marginBottom: 16 }} wrap>
          <RangePicker
            onChange={dates => {
              setDoDateRange(dates);
              setDoPagination(p => ({ ...p, current: 1 }));
            }}
            allowClear
          />
          <Select
            value={doSort}
            onChange={v => {
              setDoSort(v);
              setDoPagination(p => ({ ...p, current: 1 }));
            }}
            style={{ width: 160 }}
          >
            <Option value="reset">Default</Option>
            <Option value="asc">Tanggal Terlama</Option>
            <Option value="desc">Tanggal Terbaru</Option>
          </Select>
          <Select
            placeholder="Filter SPP"
            value={doSPPFilter}
            onChange={v => {
              setDoSPPFilter(v);
              setDoPagination(p => ({ ...p, current: 1 }));
            }}
            allowClear
            style={{ width: 120 }}
          >
            <Option value={1}>SPP: True</Option>
            <Option value={0}>SPP: False</Option>
          </Select>
        </Space>

        <Table
          rowKey="id_delivery_order"
          dataSource={dos}
          columns={doColumns}
          pagination={{
            ...doPagination,
            showSizeChanger: true,
            pageSizeOptions: ['10','25','50','100']
          }}
          onChange={handleDoTableChange}
          loading={loading}
        />

        {/* Sales Orders & Generate DO */}
        <Title level={3} className="mt-8">Buat Delivery Order</Title>
        <Space style={{ marginBottom: 16 }} wrap>
          <RangePicker
            onChange={dates => {
              setSoDateRange(dates);
              setSoPagination(p => ({ ...p, current: 1 }));
            }}
            allowClear
          />
          <Select
            value={soSort}
            onChange={v => {
              setSoSort(v);
              setSoPagination(p => ({ ...p, current: 1 }));
            }}
            style={{ width: 160 }}
          >
            <Option value="reset">Default</Option>
            <Option value="asc">Tanggal Terlama</Option>
            <Option value="desc">Tanggal Terbaru</Option>
          </Select>
          <Select
            placeholder="Filter Status"
            value={soProcessedFilter}
            onChange={value => {
              setSoProcessedFilter(value);
              setSoPagination(p => ({ ...p, current: 1 }));
            }}
            allowClear
            style={{ width: 180 }}
            options={[
              { label: 'Semua Status', value: null },
              { label: 'Sudah Dipakai', value: 1 },
              { label: 'Belum Dipakai', value: 0 }
            ]}
          />
        </Space>

        <Table
          rowKey="id_sales_order"
          dataSource={salesOrders}
          columns={soColumns}
          rowSelection={rowSelection}
          pagination={{
            ...soPagination,
            showSizeChanger: true,
            pageSizeOptions: ['10','25','50','100']
          }}
          onChange={handleSoTableChange}
          loading={loading}
        />

        <Button
          type="primary"
          onClick={handleGenerate}
          disabled={!selectedSO}
        >
          Generate DO
        </Button>

        {/* DO Form */}
        {cards.length > 0 && (
          <Card title={`Form DO: ${selectedSO.nomor_so}`} className="mt-6">
            <Form form={form} layout="vertical">
              <Form.Item
                name="tanggal_do"
                label="Tanggal DO"
                initialValue={dayjs()}
                rules={[{ required: true, message: 'Tanggal DO wajib diisi' }]}
              >
                <DatePicker className="w-full" />
              </Form.Item>
              <Form.Item name="nomor_kendaraan" label="Nomor Kendaraan">
                <Input />
              </Form.Item>
              <Form.Item name="catatan" label="Catatan">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item
                name="is_spp"
                label="SPP"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              {cards.map(c => {
                // find the matching SO detail for this card
                const detail = selectedSO.detail_sales_order.find(
                  d => d.id_detail_sales_order === c.key
                );
                // use detail.berat (e.g. 400.0) as the “needed” weight
                const neededKg = detail?.berat ?? '-';

                return (
                  <Card
                    key={c.key}
                    className="mt-4"
                    title={
                      <span>
                        {c.nama_ikan}{' '}
                        <span style={{ color: 'gray', fontWeight: 'normal' }}>
                          – Butuh {neededKg} kg
                        </span>
                      </span>
                    }
                  >
                    <Space wrap>
                      <Select
                        value={c.mode}
                        onChange={v => handleModeChange(c.key, v)}
                      >
                        <Option value="pilih">Pilih Pallet</Option>
                        <Option value="pecah">Pecah Pallet</Option>
                      </Select>

                      <Select
                        placeholder="Pilihan Pallet"
                        style={{ width: 200 }}
                        value={c.selectedStock?.id_stok_ikan}
                        onChange={v => handleSelectPallet(c.key, v)}
                      >
                        {c.pallets.map(p => (
                          <Option key={p.id_stok_ikan} value={p.id_stok_ikan}>
                            Pallet {p.id_pallet} – {p.berat_bersih_ikan} kg
                          </Option>
                        ))}
                      </Select>

                      <InputNumber
                        readOnly
                        value={c.stokWeight}
                        placeholder="Berat Pallet (kg)"
                      />

                      <InputNumber
                        min={0}
                        max={c.stokWeight || 0}
                        value={c.nettoSecond}
                        placeholder="Berat Timbang (kg)"
                        onChange={v => handleNettoSecond(c.key, v)}
                      />
                    </Space>
                  </Card>
                );
              })}

              <Button
                type="primary"
                block
                className="mt-4"
                loading={loading}
                onClick={handleSubmit}
              >
                Simpan DO
              </Button>
            </Form>
          </Card>
        )}
      </Content>

      {/* Print Confirmation */}
      <Modal
        visible={modal.visible}
        title={`Print DO ${modal.record?.nomor_do}`}
        onOk={() => {
          /* print logic here */
          setModal({ visible: false, record: null });
        }}
        onCancel={() => setModal({ visible: false, record: null })}
        okText="Ya, Print"
        cancelText="Batal"
      >
        <p>Anda yakin ingin mencetak DO <b>{modal.record?.nomor_do}</b>?</p>
      </Modal>

      {/* Detail DO */}
      <Modal
        visible={detailModal.visible}
        footer={null}
        onCancel={() => setDetailModal({ visible: false, record: null })}
        title={`Detail DO: ${detailModal.record?.nomor_do}`}
        width={700}
      >
        {detailModal.record?.detail_delivery_order?.length ? (
          <Table
            dataSource={detailModal.record.detail_delivery_order}
            rowKey="id_detail_delivery_order"
            pagination={false}
            columns={[
              { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
              { title: 'Netto First', dataIndex: 'netto_first', key: 'netto_first' },
              { title: 'Netto Second', dataIndex: 'netto_second', key: 'netto_second' },
            ]}
            size="small"
          />
        ) : (
          <p>Tidak ada detail.</p>
        )}
      </Modal>

      <Modal
        visible={warningModalVisible}
        title="Peringatan"
        onCancel={() => setWarningModalVisible(false)}
        onOk={() => {
          // Setelah user setuju, tutup modal warning dan buka modal Custom DO
          setWarningModalVisible(false);

          if (pendingCustomRecord) {
            // Inisialisasi form dengan data dari record yang disimpan
            const items = pendingCustomRecord.detail_delivery_order.map(d => ({
              key: d.id_detail_delivery_order,
              id_ikan: d.id_ikan,
              nama_ikan: d.nama_ikan,
              netto_first: d.netto_first,
              netto_second: d.netto_second || d.netto_first,
              id_delivery_order: pendingCustomRecord.id_delivery_order,
            }));
            customForm.setFieldsValue({ items });
            setCustomModal({ visible: true, record: pendingCustomRecord });
            setPendingCustomRecord(null);
          }
        }}
        okText="Lanjutkan"
        cancelText="Batal"
      >
        <Typography.Text>
          Ini bukan update Delivery Order. Apakah Anda yakin ingin melanjutkan?
        </Typography.Text>
      </Modal>

      {/* Custom DO Modal */}
      <Modal
        visible={customModal.visible}
        title="Custom Delivery Order"
        onCancel={() => setCustomModal({ visible: false, record: null })}
        onOk={() => customForm.submit()}
        okText="Kirim"
      >
        <Form form={customForm} onFinish={handleCustomSubmit} layout="vertical">
          <Form.List name="items">
            {(fields) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item
                      {...restField}
                      name={[name, 'nama_ikan']}
                      label="Nama Ikan"
                    >
                      <Input disabled />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'netto_first']}
                      label="Netto First"
                    >
                      <InputNumber disabled />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'netto_second']}
                      label="Netto Second"
                      rules={[{ required: true, message: 'Harap isi netto second' }]}
                    >
                      <InputNumber min={0} step={0.1} />
                    </Form.Item>
                  </Space>
                ))}
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Confirm Custom */}
      <Modal
        visible={confirmCustom.visible}
        title="Konfirmasi Custom DO"
        onOk={handleCustomSend}
        onCancel={() => setConfirmCustom({ visible: false })}
        okText="Kirim"
        cancelText="Batal"
      >
        <p>Warning: ini bukan update data. Lanjut kirim custom DO?</p>
      </Modal>

      {/* Detail SO */}
      <Modal
        visible={soDetailModal.visible}
        footer={null}
        onCancel={() => setSoDetailModal({ visible: false, record: null })}
        title={`Detail SO: ${soDetailModal.record?.nomor_so}`}
        width={700}
      >
        {soDetailModal.record?.detail_sales_order?.length ? (
          <Table
            dataSource={soDetailModal.record.detail_sales_order}
            rowKey="id_detail_sales_order"
            pagination={false}
            columns={[
              { title: 'Nama Ikan', dataIndex: 'nama_ikan', key: 'nama_ikan' },
              { title: 'Berat (kg)', dataIndex: 'berat', key: 'berat' },
              { title: 'Harga', dataIndex: 'harga', key: 'harga', render: v => `Rp ${v}` },
            ]}
            size="small"
          />
        ) : (
          <p>Tidak ada detail.</p>
        )}
      </Modal>
    </Layout>
  );
}
