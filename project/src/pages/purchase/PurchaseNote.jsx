import React, { useState, useEffect } from 'react';
import { Layout, Typography, Button, Table, Modal, DatePicker, Space, Tag, message, InputNumber } from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import axios from 'axios';
import config from '../../config';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Content } = Layout;
const { Title } = Typography;

function PurchaseNote() {
  const navigate = useNavigate();

  const [penerimaanNotes, setPenerimaanNotes] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [purchaseNotes, setPurchaseNotes] = useState([]);
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [date, setDate] = useState(dayjs());
  const [priceMap, setPriceMap] = useState({});

  const token = sessionStorage.getItem('token');
  const headers = { Authorization: token };

  // Fetch penerimaan barang
  useEffect(() => {
    axios.get(`${config.API_BASE_URL}/penerimaan_barang`, { headers })
      .then(({ data }) => {
        if (data.status) {
          const notes = data.data.map(item => ({
            key: item.nomor_penerimaan_barang,
            id: item.id_penerimaan_barang,
            code: item.nomor_penerimaan_barang,
            date: item.tanggal_terima,
            usedInPurchaseNote: item.done === 1,
            details: item.detail_penerimaan_barang.map(detail => ({
              key: detail.id_ikan,
              id_ikan: detail.id_ikan,
              fishName: detail.nama_ikan,
              weight: detail.berat_awal,
              shrink: detail.potong_susut,
            })),
          }));
          setPenerimaanNotes(notes);
        }
      })
      .catch(err => { console.error(err); message.error('Gagal mengambil data penerimaan barang'); });
  }, []);

  // Fetch nota pembelian
  useEffect(() => {
    axios.get(`${config.API_BASE_URL}/nota_pembelian`, { headers })
      .then(({ data }) => {
        if (data.status) {
          const formatted = data.data.map(note => ({
            key: note.id_nota,
            id: note.id_nota,
            date: note.tanggal_nota,
            items: Object.entries(note.items).map(([id, harga]) => ({ key: id, id_ikan: id, harga })),
          }));
          setPurchaseNotes(formatted);
        }
      })
      .catch(err => console.error(err));
  }, []);

  // Summary of selected receipts: map id_ikan to total weight
  const summaryMap = selectedRowKeys.reduce((acc, key) => {
    const note = penerimaanNotes.find(n => n.id === key);
    if (note) {
      note.details.forEach(d => {
        acc[d.id_ikan] = acc[d.id_ikan] || { id_ikan: d.id_ikan, fishName: d.fishName, weight: 0 };
        acc[d.id_ikan].weight += d.weight;
      });
    }
    return acc;
  }, {});
  const summaryRows = Object.entries(summaryMap).map(([_, { id_ikan, fishName, weight }]) => ({ id_ikan, fishName, weight }));

  const handlePriceChange = (value, id_ikan) => {
    setPriceMap(prev => ({ ...prev, [id_ikan]: value }));
  };

  const handleGenerateNote = () => {
    if (!selectedRowKeys.length) return message.warning('Pilih minimal satu nota penerimaan');
    // Ensure prices entered for all items
    const missing = summaryRows.filter(r => !priceMap[r.id_ikan]);
    if (missing.length) return message.warning('Masukkan harga untuk semua ikan');

    const payload = {
      tanggal_nota: date.format('YYYY-MM-DD'),
      id_penerimaan_barang: selectedRowKeys,
      'id_ikan=harga': priceMap,
    };

    axios.post(`${config.API_BASE_URL}/nota_pembelian`, payload, { headers })
      .then(({ data }) => {
        if (data.status) {
          message.success('Nota pembelian berhasil dibuat');
          // reset selection and prices
          setSelectedRowKeys([]);
          setPriceMap({});
          return axios.get(`${config.API_BASE_URL}/nota_pembelian`, { headers });
        }
      })
      .then(({ data }) => {
        if (data && data.status) {
          const formatted = data.data.map(note => ({ key: note.id_nota, id: note.id_nota, date: note.tanggal_nota }));
          setPurchaseNotes(formatted);
        }
      })
      .catch(err => { console.error(err); message.error('Gagal membuat nota pembelian'); });
  };

  // Columns for detail modal
  const detailColumns = [
    { title: 'Nama Ikan', dataIndex: 'fishName', key: 'fishName' },
    { title: 'Berat Awal (kg)', dataIndex: 'weight', key: 'weight' },
    { title: 'Potong Susut (kg)', dataIndex: 'shrink', key: 'shrink' },
  ];

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content>
        <div className="container mx-auto px-6 py-12">
          <div className="flex justify-between items-center mb-6">
            <Button icon={<ArrowLeftIcon size={16} />} onClick={() => navigate('/purchase')}>Kembali</Button>
            <Button type="primary" onClick={() => setIsNoteModalVisible(true)}>Lihat Nota</Button>
          </div>

          <Title level={2}>Buat Nota Pembelian</Title>
          <Table
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
            columns={[
              { title: 'ID', dataIndex: 'code', key: 'code' },
              { title: 'Tanggal', dataIndex: 'date', key: 'date' },
              { title: 'Status', key: 'used', render: (_, record) => (
                  <Tag color={record.usedInPurchaseNote ? 'orange' : 'green'}>
                    {record.usedInPurchaseNote ? 'Sudah Digunakan' : 'Baru'}
                  </Tag>
                )
              },
              { title: 'Detail', key: 'detail', render: (_, record) => (
                  <Button onClick={() => { setSelectedDetail(record); setIsDetailModalVisible(true); }}>Detail</Button>
                )
              },
            ]}
            dataSource={penerimaanNotes}
            pagination={false}
          />

          {selectedRowKeys.length > 0 && (
            <div className="mt-8 border-t pt-6">
              <Title level={4}>Ringkasan Nota</Title>
              <Space direction="vertical" size="middle" className="w-full">
                <div>
                  <strong>Tanggal Nota: </strong>
                  <DatePicker value={date} onChange={setDate} className="ml-2" />
                </div>
                <Table
                  columns={[
                    { title: 'ID Ikan', dataIndex: 'id_ikan', key: 'id_ikan' },
                    { title: 'Nama Ikan', dataIndex: 'fishName', key: 'fishName' },
                    { title: 'Total Berat (kg)', dataIndex: 'weight', key: 'weight' },
                    { title: 'Harga', dataIndex: 'id_ikan', key: 'harga', render: (_, row) => (
                        <InputNumber
                          min={0} step={1000}
                          value={priceMap[row.id_ikan]}
                          onChange={value => handlePriceChange(value, row.id_ikan)}
                          placeholder="Harga"
                          style={{ width: 120 }}
                        />
                      )
                    },
                  ]}
                  dataSource={summaryRows}
                  pagination={false}
                  size="small"
                />
                <Button type="primary" onClick={handleGenerateNote}>Simpan Nota</Button>
              </Space>
            </div>
          )}

          {/* Modal Daftar Nota Pembelian */}
          <Modal
            title="Daftar Nota Pembelian"
            open={isNoteModalVisible}
            onCancel={() => setIsNoteModalVisible(false)}
            footer={null}
            width={600}
          >
            <Table
              columns={[
                { title: 'ID Nota', dataIndex: 'id', key: 'id' },
                { title: 'Tanggal', dataIndex: 'date', key: 'date' },
                { title: 'Detail', key: 'detail', render: (_, record) => (
                    <Button onClick={() => { setSelectedDetail({ details: record.items, id: record.id }); setIsDetailModalVisible(true); }}>Detail</Button>
                  )
                },
              ]}
              dataSource={purchaseNotes}
              pagination={false}
            />
          </Modal>

          {/* Modal Detail Nota Penerimaan / Pembelian */}
          <Modal
            title={`Detail Nota - ${selectedDetail?.id}`}
            open={isDetailModalVisible}
            onCancel={() => setIsDetailModalVisible(false)}
            footer={null}
            width={600}
          >
            <Table
              columns={detailColumns}
              dataSource={selectedDetail?.details || selectedDetail?.items || []}
              pagination={false}
              size="small"
            />
          </Modal>
        </div>
      </Content>
      <FooterSection />
    </Layout>
  );
}

export default PurchaseNote;
