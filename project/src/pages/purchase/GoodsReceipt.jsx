import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, Table, Modal, message, DatePicker, Select, Spin, Tag } from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/Header';
import config from '../../config';

const { Content } = Layout;
const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Helper untuk mengelompokkan ikan & total beratnya
const groupFishData = (items = []) => {
  const grouped = {};
  items.forEach(({ nama_ikan, berat_awal = 0, potong_susut = 0 }) => {
    const net = berat_awal - potong_susut;
    grouped[nama_ikan] = (grouped[nama_ikan] || 0) + net;
  });
  return Object.entries(grouped).map(([jenis_ikan, qty]) => ({ jenis_ikan, qty }));
};

const getTotalWeight = (items = []) =>
  items.reduce((sum, { berat_awal = 0, potong_susut = 0 }) => sum + (berat_awal - potong_susut), 0);

const groupStockData = (items = []) => {
  const grouped = {};
  items.forEach(({ nama_ikan, berat_awal = 0, potong_susut = 0 }) => {
    const net = berat_awal - potong_susut;
    if (!grouped[nama_ikan]) grouped[nama_ikan] = { total_stok: 0, potong_3_container: 0, potong_collecting: 0 };
    grouped[nama_ikan].total_stok += net;
    grouped[nama_ikan].potong_3_container += potong_susut;
    grouped[nama_ikan].potong_collecting += potong_susut;
  });
  return Object.entries(grouped).map(([jenis_ikan, vals]) => ({ jenis_ikan, ...vals }));
};

export default function GoodsReceipt() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('token');
  const authHeader = { headers: { Authorization: token } };

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [filters, setFilters] = useState({ startDate: null, endDate: null, grp: null, done: null });
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchData = async (page = 1, pageSize = 50) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        ...(filters.startDate && { date_start: filters.startDate }),
        ...(filters.endDate && { date_end: filters.endDate }),
        ...(filters.grp !== null && { 'pb.grp': filters.grp }),
        ...(filters.done !== null && { done: filters.done }),
      };

      const res = await axios.get(`${config.API_BASE_URL}/penerimaan_barang`, {
        ...authHeader,
        params,
      });

      if (res.data.status) {
        setData(res.data.data);
        setPagination(prev => ({
          ...prev,
          current: page,
          total: res.data.total || res.data.data.length, // fallback jika tidak ada total
        }));
      } else {
        message.error('Format data tidak sesuai.');
      }
    } catch (err) {
      message.error('Gagal memuat data penerimaan barang');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    fetchData(pagination.current, pagination.pageSize);
  }, [filters]);

  const handleTableChange = ({ current, pageSize }) => {
    setPagination(prev => ({ ...prev, current, pageSize }));
    fetchData(current, pageSize);
  };

  const onDateChange = (dates) => {
    setFilters(prev => ({
      ...prev,
      startDate: dates ? dates[0].format('YYYY-MM-DD') : null,
      endDate: dates ? dates[1].format('YYYY-MM-DD') : null,
    }));
  };

  const onGrpChange = value => setFilters(prev => ({ ...prev, grp: value }));
  const onDoneChange = value => setFilters(prev => ({ ...prev, done: value }));

  const showDetail = async (record) => {
    try {
      const res = await axios.get(`${config.API_BASE_URL}/penerimaan_barang/${record.id_penerimaan_barang}`, authHeader);
      setSelectedItem(res.data.data || res.data);
      setIsModalVisible(true);
    } catch (err) {
      message.error('Gagal memuat detail penerimaan');
      console.error(err);
    }
  };

  const handlePrint = (record, type) => {
    const endpoint = type === 'stock' ? 'pencatatan_stok_printer' : 'penerimaan_barang_printer';
    Modal.confirm({
      title: `Konfirmasi Cetak ${type === 'stock' ? 'Stok' : 'Penerimaan'}`,
      content: `Anda yakin ingin mencetak ${type === 'stock' ? 'stok' : 'penerimaan'} ${record.nomor_penerimaan_barang}?`,
      onOk: async () => {
        try {
          const resDetail = await axios.get(`${config.API_BASE_URL}/penerimaan_barang/${record.id_penerimaan_barang}`, authHeader);
          const dataDetail = resDetail.data.data || resDetail.data;
          const items = dataDetail.detail_penerimaan_barang;
          const payloadBase = {
            nomor_pb: dataDetail.nomor_penerimaan_barang,
            nama_kapal: dataDetail.nama_kapal,
            tanggal: dataDetail.tanggal_terima,
            nama_gudang: dataDetail.nama_gudang,
            collecting: [dataDetail.metode_kapal],
          };
          let payload;
          if (type === 'stock') {
            const detail_stok = groupStockData(items);
            const total_potong = items.reduce((s, i) => s + i.potong_susut, 0);
            payload = { ...payloadBase, total_stok: getTotalWeight(items), total_potong_3_container: total_potong, total_potong_collecting: total_potong, detail_stok };
          } else {
            const detail_penerimaan = groupFishData(items);
            payload = { ...payloadBase, total_qty: getTotalWeight(items), detail_penerimaan };
          }

          const resPdf = await axios.post(
            `${config.API_BASE_URL}/${endpoint}`,
            payload,
            { ...authHeader, headers: { ...authHeader.headers, Accept: 'application/pdf' }, responseType: 'blob' }
          );
          const blob = new Blob([resPdf.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `${type}_${record.nomor_penerimaan_barang}.pdf`);
          document.body.appendChild(link);
          link.click();
          link.remove();
        } catch (err) {
          message.error(`Gagal mencetak PDF ${type}`);
          console.error(err);
        }
      },
    });
  };

  const columns = [
    { title: 'No', render: (_, __, idx) => (pagination.current - 1) * pagination.pageSize + idx + 1 },
    { title: 'Nomor Penerimaan', dataIndex: 'nomor_penerimaan_barang' },
    { title: 'Tanggal', dataIndex: 'tanggal_terima' },
    {
      title: 'GRP',
      dataIndex: 'grp',
      render: val => val === 1 ? <Tag color="green">GRP</Tag> : <Tag color="red">Non-GRP</Tag>
    },
    {
      title: 'Status',
      dataIndex: 'done',
      render: val => val === 1 ? <Tag color="green">Done</Tag> : <Tag color="orange">Belum</Tag>
    },
    { render: (_, record) => <Button onClick={() => showDetail(record)}>Lihat Detail</Button> },
    {
      render: (_, record) => (
        <>
          <Button type="primary" onClick={() => handlePrint(record, 'penerimaan')} className="mr-2">Cetak Penerimaan</Button>
          <Button onClick={() => handlePrint(record, 'stock')}>Cetak Stok</Button>
        </>
      )
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content>
        <div className="container mx-auto px-6 py-12">
          <Button icon={<ArrowLeftIcon size={16} />} onClick={() => navigate('/purchase')} className="mb-4">Kembali</Button>
          <Title level={2}>Dokumen Penerimaan Barang</Title>
          <div className="flex items-center gap-4 my-4">
            <RangePicker onChange={onDateChange} />
            <Select placeholder="Filter GRP" allowClear onChange={onGrpChange} style={{ width: 150 }}>
              <Option value={1}>GRP</Option>
              <Option value={0}>Non-GRP</Option>
            </Select>
            <Select placeholder="Filter Status" allowClear onChange={onDoneChange} style={{ width: 180 }}>
              <Option value={1}>Done</Option>
              <Option value={0}>Belum</Option>
            </Select>
          </div>
          {loading ? (
            <Spin style={{ width: '100%', marginTop: 50 }} />
          ) : (
            <Table
              dataSource={data}
              columns={columns}
              rowKey="id_penerimaan_barang"
              pagination={pagination}
              onChange={handleTableChange}
            />
          )}
          <Modal
            title={`Detail - ${selectedItem?.nomor_penerimaan_barang}`}
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            footer={null}
            width={700}
          >
            {selectedItem && (
              <div>
                <p><strong>No:</strong> {selectedItem.nomor_penerimaan_barang}</p>
                <p><strong>Nama Kapal:</strong> {selectedItem.nama_kapal}</p>
                <p><strong>Tanggal:</strong> {selectedItem.tanggal_terima}</p>
                <p><strong>Nama Gudang:</strong> {selectedItem.nama_gudang}</p>
                <p><strong>Container:</strong> {selectedItem.metode_kapal}</p>

                <Title level={5} className="mt-4">Ringkasan Ikan</Title>
                <Table
                  dataSource={groupFishData(selectedItem.detail_penerimaan_barang)}
                  columns={[
                    { title: 'Jenis Ikan', dataIndex: 'jenis_ikan' },
                    { title: 'Total Berat (kg)', dataIndex: 'qty' },
                  ]}
                  rowKey="jenis_ikan"
                  pagination={false}
                  size="small"
                />

                <p className="mt-4 font-semibold">Total Berat Semua Ikan: {getTotalWeight(selectedItem.detail_penerimaan_barang).toLocaleString()} kg</p>
              </div>
            )}
          </Modal>
        </div>
      </Content>
    </Layout>
  );
}
