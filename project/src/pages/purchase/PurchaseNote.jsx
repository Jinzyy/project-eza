import React, { useState, useEffect } from 'react';
import {
  Layout,
  Typography,
  Button,
  Table,
  Modal,
  DatePicker,
  Space,
  Tag,
  message,
  InputNumber,
  Select
} from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import axios from 'axios';
import config from '../../config';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';

// Extend dayjs for date range filtering
dayjs.extend(isBetween);

const { Content } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function PurchaseNote() {
  const navigate = useNavigate();
  const [penerimaanNotes, setPenerimaanNotes] = useState([]);
  const [purchaseNotes, setPurchaseNotes] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [date, setDate] = useState(dayjs());
  const [priceMap, setPriceMap] = useState({});
  const [dateRange, setDateRange] = useState([]);
  const [grpFilter, setGrpFilter] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  const token = sessionStorage.getItem('token');
  const headers = { Authorization: token };

  useEffect(() => {
    axios.get(`${config.API_BASE_URL}/penerimaan_barang`, { headers })
      .then(({ data }) => {
        if (data.status) {
          const notes = data.data.map(item => ({
            key: item.id_penerimaan_barang,
            id: item.id_penerimaan_barang,
            code: item.nomor_penerimaan_barang,
            date: item.tanggal_terima,
            grp: item.grp,
            usedInPurchaseNote: item.done === 1,
            details: item.detail_penerimaan_barang.map(d => ({
              key: d.id_detail_penerimaan_barang,
              id_ikan: d.id_ikan,
              fishName: d.nama_ikan,
              weight: d.berat_awal,
              shrink: d.potong_susut
            }))
          }));
          setPenerimaanNotes(notes);
        }
      })
      .catch(err => message.error('Gagal mengambil data penerimaan barang'));
  }, []);

  useEffect(() => {
    axios.get(`${config.API_BASE_URL}/nota_pembelian`, { headers })
      .then(({ data }) => {
        if (data.status) {
          const notes = data.data.map(note => ({
            key: note.id_nota_pembelian,
            id: note.id_nota_pembelian,
            nomorNota: note.nomor_nota,
            tanggalNota: note.tanggal_nota,
            details: note.detail_nota_pembelian.map(d => ({
              key: d.id_detail_nota_pembelian,
              nomorPenerimaan: d.nomor_penerimaan_barang,
              namaKapal: d.nama_kapal,
              namaGudang: d.nama_gudang,
              metodeKapal: d.metode_kapal,
              idIkan: d.id_ikan,
              namaIkan: d.nama_ikan,
              quantity: d.quantity,
              jumlah: d.jumlah
            })),
            totalQuantity: note.total_quantity,
            totalJumlah: note.total_jumlah
          }));
          setPurchaseNotes(notes);
        }
      });
  }, []);

  const filteredData = penerimaanNotes.filter(item => {
    const d = dayjs(item.date);
    const inRange = !dateRange.length || d.isBetween(dateRange[0].startOf('day'), dateRange[1].endOf('day'), null, '[]');
    const matchGrp = grpFilter !== null ? item.grp === grpFilter : true;
    return inRange && matchGrp;
  }).sort((a, b) => sortOrder === 'asc' ? dayjs(a.date).diff(dayjs(b.date)) : dayjs(b.date).diff(dayjs(a.date)));

  const summaryMap = selectedRowKeys.reduce((acc, key) => {
    const note = penerimaanNotes.find(n => n.id === key);
    if (note) {
      note.details.forEach(d => {
        if (!acc[d.id_ikan]) acc[d.id_ikan] = { id_ikan: d.id_ikan, fishName: d.fishName, netWeight: 0 };
        acc[d.id_ikan].netWeight += d.weight - d.shrink;
      });
    }
    return acc;
  }, {});

  const summaryRows = Object.values(summaryMap).map(({ id_ikan, fishName, netWeight }) => ({ id_ikan, fishName, weight: netWeight }));

  const summaryColumns = [
    { title: 'ID Ikan', dataIndex: 'id_ikan', key: 'id_ikan' },
    { title: 'Nama Ikan', dataIndex: 'fishName', key: 'fishName' },
    { title: 'Total Berat Bersih (kg)', dataIndex: 'weight', key: 'weight' },
    {
      title: 'Harga per kg (Rp)',
      dataIndex: 'id_ikan',
      key: 'harga',
      render: (_, row) => (
        <InputNumber
          min={0}
          step={1000}
          value={priceMap[row.id_ikan]}
          onChange={val => setPriceMap(prev => ({ ...prev, [row.id_ikan]: val }))}
          placeholder="Harga"
          style={{ width: 120 }}
        />
      )
    },
    {
      title: 'Total Harga (Rp)',
      key: 'totalPrice',
      render: (_, row) => ((row.weight * (priceMap[row.id_ikan] || 0)).toLocaleString())
    }
  ];

  const handleGenerateNote = () => {
    if (!selectedRowKeys.length) return message.warning('Pilih minimal satu nota penerimaan');
    if (summaryRows.some(r => !priceMap[r.id_ikan])) return message.warning('Masukkan harga untuk semua ikan');

    const payload = {
      tanggal_nota: date.format('YYYY-MM-DD'),
      id_penerimaan_barang: selectedRowKeys,
      'id_ikan=harga': priceMap
    };

    axios.post(`${config.API_BASE_URL}/nota_pembelian`, payload, { headers })
      .then(({ data }) => {
        if (data.status) {
          message.success('Nota pembelian berhasil dibuat');
          setSelectedRowKeys([]);
          setPriceMap({});
          return axios.get(`${config.API_BASE_URL}/nota_pembelian`, { headers });
        }
      })
      .then(({ data }) => {
        if (data && data.status) {
          const notes = data.data.map(note => ({
            key: note.id_nota_pembelian,
            id: note.id_nota_pembelian,
            nomorNota: note.nomor_nota,
            tanggalNota: note.tanggal_nota,
            details: note.detail_nota_pembelian.map(d => ({
              key: d.id_detail_nota_pembelian,
              nomorPenerimaan: d.nomor_penerimaan_barang,
              namaKapal: d.nama_kapal,
              namaGudang: d.nama_gudang,
              metodeKapal: d.metode_kapal,
              idIkan: d.id_ikan,
              namaIkan: d.nama_ikan,
              quantity: d.quantity,
              jumlah: d.jumlah
            })),
            totalQuantity: note.total_quantity,
            totalJumlah: note.total_jumlah
          }));
          setPurchaseNotes(notes);
        }
      });
  };

  return (
    <Layout>
      <Header />
      <Content style={{ padding: '24px' }}>
        <Button icon={<ArrowLeftIcon />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
          Kembali
        </Button>
  
        <Title level={3}>Daftar Penerimaan Barang</Title>
  
        <Space style={{ marginBottom: 16 }}>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            allowClear
          />
          <Select
            placeholder="Filter GRP"
            allowClear
            onChange={setGrpFilter}
            style={{ width: 120 }}
          >
            <Select.Option value={1}>GRP</Select.Option>
            <Select.Option value={0}>Non-GRP</Select.Option>
          </Select>
          <Select
            value={sortOrder}
            onChange={setSortOrder}
            style={{ width: 160 }}
          >
            <Select.Option value="asc">Urutkan: Tanggal Naik</Select.Option>
            <Select.Option value="desc">Urutkan: Tanggal Turun</Select.Option>
          </Select>
        </Space>
  
        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: record => ({
              disabled: record.usedInPurchaseNote
            })
          }}
          columns={[
            { title: 'Nomor Penerimaan', dataIndex: 'code', key: 'code' },
            { title: 'Tanggal', dataIndex: 'date', key: 'date' },
            {
              title: 'Status GRP',
              dataIndex: 'grp',
              key: 'grp',
              render: val => val ? <Tag color="green">GRP</Tag> : <Tag color="red">Non-GRP</Tag>
            },
            {
              title: 'Sudah Digunakan',
              dataIndex: 'usedInPurchaseNote',
              key: 'used',
              render: used => used ? <Tag color="blue">✓</Tag> : <Tag color="default">-</Tag>
            }
          ]}
          dataSource={filteredData}
          pagination={{ pageSize: 10 }}
          rowKey="id"
        />
  
        <Title level={4} style={{ marginTop: 24 }}>Ringkasan</Title>
        <Table
          dataSource={summaryRows}
          columns={summaryColumns}
          pagination={false}
          rowKey="id_ikan"
        />
  
        <Space direction="horizontal" style={{ marginTop: 16 }}>
          <DatePicker value={date} onChange={setDate} />
          <Button type="primary" onClick={handleGenerateNote}>
            Buat Nota Pembelian
          </Button>
        </Space>
  
        <Title level={3} style={{ marginTop: 48 }}>Nota Pembelian Tersimpan</Title>
        <Table
          columns={[
            { title: 'Nomor Nota', dataIndex: 'nomorNota', key: 'nomorNota' },
            { title: 'Tanggal', dataIndex: 'tanggalNota', key: 'tanggalNota' },
            {
              title: 'Total Berat (kg)', dataIndex: 'totalQuantity', key: 'totalQuantity',
              render: v => v?.toLocaleString()
            },
            {
              title: 'Total Harga (Rp)', dataIndex: 'totalJumlah', key: 'totalJumlah',
              render: v => `Rp ${v?.toLocaleString()}`
            }
          ]}
          expandable={{
            expandedRowRender: record => (
              <Table
                columns={[
                  { title: 'Ikan', dataIndex: 'namaIkan', key: 'namaIkan' },
                  { title: 'Jumlah (kg)', dataIndex: 'quantity', key: 'quantity' },
                  {
                    title: 'Jumlah (Rp)', dataIndex: 'jumlah', key: 'jumlah',
                    render: v => `Rp ${v?.toLocaleString()}`
                  },
                  { title: 'Kapal', dataIndex: 'namaKapal', key: 'namaKapal' },
                  { title: 'Gudang', dataIndex: 'namaGudang', key: 'namaGudang' },
                  { title: 'Metode', dataIndex: 'metodeKapal', key: 'metodeKapal' },
                  { title: 'Nomor Penerimaan', dataIndex: 'nomorPenerimaan', key: 'nomorPenerimaan' }
                ]}
                dataSource={record.details}
                pagination={false}
                rowKey="key"
              />
            )
          }}
          dataSource={purchaseNotes}
          pagination={{ pageSize: 5 }}
          rowKey="id"
        />
      </Content>
      <FooterSection />
    </Layout>
  );
  
}
