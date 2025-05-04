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
  InputNumber
} from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import axios from 'axios';
import config from '../../config';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function PurchaseNote() {
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

  useEffect(() => {
    axios
      .get(`${config.API_BASE_URL}/penerimaan_barang`, { headers })
      .then(({ data }) => {
        if (data.status) {
          const notes = data.data.map(item => ({
            key: item.id_penerimaan_barang,
            id: item.id_penerimaan_barang,
            code: item.nomor_penerimaan_barang,
            date: item.tanggal_terima,
            usedInPurchaseNote: item.done === 1,
            details: item.detail_penerimaan_barang.map(detail => ({
              key: detail.id_detail_penerimaan_barang || detail.id_ikan,
              id_ikan: detail.id_ikan,
              fishName: detail.nama_ikan,
              weight: detail.berat_awal,
              shrink: detail.potong_susut
            }))
          }));
          setPenerimaanNotes(notes);
        }
      })
      .catch(err => {
        console.error(err);
        message.error('Gagal mengambil data penerimaan barang');
      });
  }, []);

  useEffect(() => {
    axios
      .get(`${config.API_BASE_URL}/nota_pembelian`, { headers })
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
      })
      .catch(err => console.error(err));
  }, []);

  // Build summary of selected penerimaan
  const summaryMap = selectedRowKeys.reduce((acc, key) => {
    const note = penerimaanNotes.find(n => n.id === key);
    if (note) {
      note.details.forEach(d => {
        if (!acc[d.id_ikan]) {
          acc[d.id_ikan] = { id_ikan: d.id_ikan, fishName: d.fishName, netWeight: 0 };
        }
        acc[d.id_ikan].netWeight += d.weight - d.shrink;
      });
    }
    return acc;
  }, {});
  const summaryRows = Object.values(summaryMap).map(({ id_ikan, fishName, netWeight }) => ({
    id_ikan,
    fishName,
    weight: netWeight
  }));

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
    if (selectedRowKeys.length === 0) {
      return message.warning('Pilih minimal satu nota penerimaan');
    }
    if (summaryRows.some(r => !priceMap[r.id_ikan])) {
      return message.warning('Masukkan harga untuk semua ikan');
    }
    const payload = {
      tanggal_nota: date.format('YYYY-MM-DD'),
      id_penerimaan_barang: selectedRowKeys,
      'id_ikan=harga': priceMap
    };
    axios
      .post(`${config.API_BASE_URL}/nota_pembelian`, payload, { headers })
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
      })
      .catch(err => {
        console.error(err);
        message.error('Gagal membuat nota pembelian');
      });
  };

  const openDetail = record => {
    setSelectedDetail(record);
    setIsDetailModalVisible(true);
  };

  const detailColumns = [
    { title: 'No Penerimaan', dataIndex: 'nomorPenerimaan', key: 'nomorPenerimaan' },
    { title: 'Nama Kapal', dataIndex: 'namaKapal', key: 'namaKapal' },
    { title: 'Nama Gudang', dataIndex: 'namaGudang', key: 'namaGudang' },
    { title: 'Metode Kapal', dataIndex: 'metodeKapal', key: 'metodeKapal' },
    { title: 'Nama Ikan', dataIndex: 'namaIkan', key: 'namaIkan' },
    { title: 'Quantity (kg)', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Jumlah (Rp)', dataIndex: 'jumlah', key: 'jumlah', render: val => val.toLocaleString() }
  ];
  

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content>
        <div className="container mx-auto px-6 py-12">
          <div className="flex justify-between items-center mb-6">
            <Button icon={<ArrowLeftIcon size={16} />} onClick={() => navigate('/purchase')}>
              Kembali
            </Button>
            <Button type="primary" onClick={() => setIsNoteModalVisible(true)}>
              Lihat Nota
            </Button>
          </div>

          <Title level={2}>Buat Nota Pembelian</Title>
          <Table
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
            columns={[
              { title: 'ID', dataIndex: 'code', key: 'code' },
              { title: 'Tanggal', dataIndex: 'date', key: 'date' },
              {
                title: 'Status',
                key: 'used',
                render: (_, record) => (
                  <Tag color={record.usedInPurchaseNote ? 'orange' : 'green'}>
                    {record.usedInPurchaseNote ? 'Sudah Digunakan' : 'Baru'}
                  </Tag>
                )
              },
              {
                title: 'Detail',
                key: 'detail',
                render: (_, record) => (
                  <Button onClick={() => openDetail(record)}>Detail</Button>
                )
              }
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
                  columns={summaryColumns}
                  dataSource={summaryRows}
                  pagination={false}
                  size="small"
                  summary={() => {
                    const totalWeight = summaryRows.reduce((sum, r) => sum + r.weight, 0);
                    const totalPrice = summaryRows.reduce((sum, r) => sum + r.weight * (priceMap[r.id_ikan] || 0), 0);
                    return (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0}>Total</Table.Summary.Cell>
                        <Table.Summary.Cell index={1} />
                        <Table.Summary.Cell index={2}>{totalWeight}</Table.Summary.Cell>
                        <Table.Summary.Cell index={3} />
                        <Table.Summary.Cell index={4}>{totalPrice.toLocaleString()}</Table.Summary.Cell>
                      </Table.Summary.Row>
                    );
                  }}
                />
                <Button type="primary" onClick={handleGenerateNote}>
                  Simpan Nota
                </Button>
              </Space>
            </div>
          )}

          {/* Daftar Nota Pembelian Modal */}
          <Modal
            title="Daftar Nota Pembelian"
            visible={isNoteModalVisible}
            onCancel={() => setIsNoteModalVisible(false)}
            footer={null}
            width={700}
          >
            <Table
              columns={[
                { title: 'No Nota', dataIndex: 'nomorNota', key: 'nomorNota' },
                { title: 'Tanggal', dataIndex: 'tanggalNota', key: 'tanggalNota' },
                {
                  title: 'Detail',
                  key: 'detail',
                  render: (_, record) => <Button onClick={() => openDetail(record)}>Detail</Button>
                }
              ]}
              dataSource={purchaseNotes}
              pagination={false}
            />
          </Modal>

          {/* Detail Nota Pembelian Modal */}
          <Modal
            title={`Detail Nota - ${selectedDetail?.nomorNota}`}
            visible={isDetailModalVisible}
            onCancel={() => setIsDetailModalVisible(false)}
            footer={null}
            width={800}
          >
            <Space direction="vertical" size="small" style={{ marginBottom: 16 }}>
              <Text>
                <strong>No Nota:</strong> {selectedDetail?.nomorNota}
              </Text>
              <Text>
                <strong>Tanggal:</strong> {selectedDetail?.tanggalNota}
              </Text>
            </Space>
            <Table
              columns={detailColumns}
              dataSource={selectedDetail?.details || []}
              pagination={false}
              size="small"
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={5}>
                    Total
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>
                    {selectedDetail?.totalQuantity}
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6}>
                    {selectedDetail?.totalJumlah.toLocaleString()}
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Modal>
        </div>
      </Content>
      <FooterSection />
    </Layout>
  );
}
