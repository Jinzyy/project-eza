import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, Table, Modal, message, DatePicker, Select, Spin, Tag } from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';
import config from '../../config';

const { Content } = Layout;
const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// helper untuk mengelompokkan ikan & total beratnya
const groupFishData = (items = []) => {
  const grouped = {};
  items.forEach(({ nama_ikan, berat_awal = 0, potong_susut = 0 }) => {
    const net = berat_awal - potong_susut;
    grouped[nama_ikan] = (grouped[nama_ikan] || 0) + net;
  });
  return Object.entries(grouped).map(([jenis_ikan, total_qty]) => ({ jenis_ikan, qty: total_qty }));
};

// helper untuk total semua berat
const getTotalWeight = (items = []) =>
  items.reduce((sum, { berat_awal = 0, potong_susut = 0 }) => sum + (berat_awal - potong_susut), 0);

// helper untuk mengelompokkan stok dan potongan
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

  // state
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ startDate: null, endDate: null, grp: null });
  const [sorter, setSorter] = useState({ field: null, order: null });
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // fetch all data once
  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${config.API_BASE_URL}/penerimaan_barang`, authHeader);
      if (res.data.status) {
        setAllData(res.data.data);
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

  // apply filters, sorting, and pagination client-side
  useEffect(() => {
    let data = [...allData];

    // filter by date
    if (filters.startDate && filters.endDate) {
      data = data.filter(item => {
        const d = new Date(item.tanggal_terima);
        return d >= new Date(filters.startDate) && d <= new Date(filters.endDate);
      });
    }

    // filter by GRP
    if (filters.grp !== null) {
      data = data.filter(item => item.grp === filters.grp);
    }

    // sort by tanggal if requested
    if (sorter.field === 'tanggal_terima') {
      data.sort((a, b) => {
        const diff = new Date(a.tanggal_terima) - new Date(b.tanggal_terima);
        return sorter.order === 'ascend' ? diff : -diff;
      });
    }

    // update total count for pagination
    const total = data.length;
    setPagination(prev => ({ ...prev, total }));

    // slice for current page
    const startIdx = (pagination.current - 1) * pagination.pageSize;
    const pageData = data.slice(startIdx, startIdx + pagination.pageSize);

    setFilteredData(pageData);
  }, [allData, filters, sorter, pagination.current, pagination.pageSize]);

  useEffect(() => { fetchAll(); }, []);

  const handleTableChange = ({ current, pageSize }, _filters, sorter) => {
    setPagination({ current, pageSize, total: pagination.total });
    setSorter({ field: sorter.field, order: sorter.order });
  };

  const onDateChange = (dates) => {
    setFilters(prev => ({
      ...prev,
      startDate: dates ? dates[0].format('YYYY-MM-DD') : null,
      endDate: dates ? dates[1].format('YYYY-MM-DD') : null,
    }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const onGrpChange = (value) => {
    // treat undefined (clear) as null
    const grpValue = typeof value === 'undefined' ? null : value;
    setFilters(prev => ({ ...prev, grp: grpValue }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const showDetail = async (record) => {
    try {
      const res = await axios.get(`${config.API_BASE_URL}/penerimaan_barang/${record.id_penerimaan_barang}`, authHeader);
      const data = res.data.data || res.data;
      setSelectedItem(data);
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
    { title: 'No', key: 'index', render: (_, __, idx) => (pagination.current - 1) * pagination.pageSize + idx + 1 },
    { title: 'Nomor Penerimaan', dataIndex: 'nomor_penerimaan_barang', key: 'nomor_penerimaan_barang' },
    { title: 'Tanggal', dataIndex: 'tanggal_terima', key: 'tanggal_terima', sorter: true },
    {
      title: 'GRP',
      dataIndex: 'grp',
      key: 'grp',
      render: val => val === 1
        ? <Tag color="green">GRP</Tag>
        : <Tag color="red">Non-GRP</Tag>
    },
    { key: 'detail', render: (_, record) => <Button onClick={() => showDetail(record)}>Lihat Detail</Button> },
    { key: 'actions', render: (_, record) => (
        <>
          <Button type="primary" onClick={() => handlePrint(record, 'penerimaan')} className="mr-2">Cetak Penerimaan</Button>
          <Button onClick={() => handlePrint(record, 'stock')}>Cetak Stok</Button>
        </>
    )},
  ];

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content>
        <div className="container mx-auto px-6 py-12">
          <Button icon={<ArrowLeftIcon size={16}/>} onClick={() => navigate('/purchase')} className="mb-4">Kembali</Button>
          <Title level={2}>Dokumen Penerimaan Barang</Title>
          <div className="flex items-center gap-4 my-4">
            <RangePicker onChange={onDateChange} />
            <Select placeholder="Filter GRP" allowClear onChange={onGrpChange} style={{ width: 150 }}>
              <Option value={1}>GRP</Option>
              <Option value={0}>Non-GRP</Option>
            </Select>
          </div>
          {loading ? (
            <Spin style={{ width: '100%', marginTop: 50 }}/> 
          ) : (
            <Table
              dataSource={filteredData}
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
                    { title: 'Jenis Ikan', dataIndex: 'jenis_ikan', key: 'jenis_ikan' },
                    { title: 'Total Berat (kg)', dataIndex: 'qty', key: 'qty' },
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
      <FooterSection />
    </Layout>
  );
}
