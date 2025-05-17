import React, { useState, useEffect } from 'react';
import {
  Layout,
  Typography,
  Button,
  Table,
  DatePicker,
  Space,
  Tag,
  message,
  InputNumber,
  Select,
  Modal,
} from 'antd';
import { ArrowLeftIcon, PrinterIcon } from 'lucide-react';
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
const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function PurchaseNote() {
  const navigate = useNavigate();
  const [penerimaanNotes, setPenerimaanNotes] = useState([]);
  const [purchaseNotes, setPurchaseNotes] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [date, setDate] = useState(dayjs());
  const [priceMap, setPriceMap] = useState({});
  const [dateRange, setDateRange] = useState([]);
  const [grpFilter, setGrpFilter] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [doneFilter, setDoneFilter] = useState(null);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);


  const token = sessionStorage.getItem('token');
  const headers = { Authorization: token };

  // Fetch penerimaan barang
useEffect(() => {
  const fetchPenerimaanBarang = async () => {
    try {
      const params = {
        sort: sortOrder,
      };

      if (dateRange.length === 2) {
        params.date_start = dateRange[0].format('YYYY-MM-DD');
        params.date_end = dateRange[1].format('YYYY-MM-DD');
      }

      if (grpFilter !== null) {
        params['pb.grp'] = grpFilter;
      }

      if (doneFilter !== null) {
        params.done = doneFilter;
      }

      const response = await axios.get(`${config.API_BASE_URL}/penerimaan_barang`, {
        headers,
        params,
      });

      const { data } = response;

      if (data.status && Array.isArray(data.data)) {
        const formattedNotes = data.data.map(item => ({
          key: item.id_penerimaan_barang,
          id: item.id_penerimaan_barang,
          code: item.nomor_penerimaan_barang,
          date: item.tanggal_terima,
          grp: item.grp,
          usedInPurchaseNote: item.done === 1,
          details: item.detail_penerimaan_barang?.map(detail => ({
            key: detail.id_detail_penerimaan_barang,
            id_ikan: detail.id_ikan,
            fishName: detail.nama_ikan,
            weight: detail.berat_awal,
            shrink: detail.potong_susut
          })) || []
        }));

        setPenerimaanNotes(formattedNotes);
      }
    } catch (error) {
      console.error(error);
      message.error('Gagal mengambil data penerimaan barang');
    }
  };

  fetchPenerimaanBarang();
}, [dateRange, grpFilter, sortOrder, doneFilter]);

  // Fetch nota pembelian and compute quantity & total
  useEffect(() => {
    axios
      .get(`${config.API_BASE_URL}/nota_pembelian`, { headers })
      .then(({ data }) => {
        if (data.status) {
          const notes = data.data.map(note => {
            const details = note.detail_nota_pembelian.map(d => {
              const netWeight = d.berat_awal - d.potong_susut;
              const subtotal = netWeight * d.harga;
              return {
                key: d.id_detail_nota_pembelian,
                nomorPenerimaan: d.nomor_penerimaan_barang,
                namaKapal: d.nama_kapal,
                namaGudang: d.nama_gudang,
                metodeKapal: d.metode_kapal,
                idIkan: d.id_ikan,
                namaIkan: d.nama_ikan,
                quantity: netWeight,
                harga: d.harga,
                jumlah: subtotal
              };
            });
            const totalQuantity = details.reduce((sum, d) => sum + d.quantity, 0);
            const totalJumlah   = details.reduce((sum, d) => sum + d.jumlah, 0);
            return {
              key: note.id_nota_pembelian,
              id: note.id_nota_pembelian,
              nomorNota: note.nomor_nota,
              tanggalNota: note.tanggal_nota,
              details,
              totalQuantity,
              totalJumlah
            };
          });
          setPurchaseNotes(notes);
        }
      })
      .catch(() => message.error('Gagal mengambil data nota pembelian'));
  }, []);

  // Summarize selected penerimaan
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
      render: (_, row) => `Rp ${(row.weight * (priceMap[row.id_ikan] || 0)).toLocaleString()}`
    }
  ];

  // Generate purchase note
  const handleGenerateNote = () => {
    if (!selectedRowKeys.length) return message.warning('Pilih minimal satu nota penerimaan');
    if (summaryRows.some(r => !priceMap[r.id_ikan])) return message.warning('Masukkan harga untuk semua ikan');

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
          const notes = data.data.map(note => {
            const details = note.detail_nota_pembelian.map(d => {
              const netWeight = d.berat_awal - d.potong_susut;
              const subtotal = netWeight * d.harga;
              return {
                key: d.id_detail_nota_pembelian,
                nomorPenerimaan: d.nomor_penerimaan_barang,
                namaKapal: d.nama_kapal,
                namaGudang: d.nama_gudang,
                metodeKapal: d.metode_kapal,
                idIkan: d.id_ikan,
                namaIkan: d.nama_ikan,
                quantity: netWeight,
                harga: d.harga,
                jumlah: subtotal
              };
            });
            const totalQuantity = details.reduce((sum, d) => sum + d.quantity, 0);
            const totalJumlah   = details.reduce((sum, d) => sum + d.jumlah, 0);
            return {
              key: note.id_nota_pembelian,
              id: note.id_nota_pembelian,
              nomorNota: note.nomor_nota,
              tanggalNota: note.tanggal_nota,
              details,
              totalQuantity,
              totalJumlah
            };
          });
          setPurchaseNotes(notes);
        }
      })
      .catch(() => message.error('Gagal membuat nota pembelian'));
  };

  const fetchPurchaseNotes = async () => {
    try {
      const { data } = await axios.get(`${config.API_BASE_URL}/nota_pembelian`, { headers });
      if (!data.status) throw new Error('Fetch failed');

      const activeNotes = data.data
        .filter(note => note.cancelled === 0)  // filter hanya yang cancelled = 0
        .map(note => {
          const details = note.detail_nota_pembelian.map(d => {
            const netWeight = d.berat_awal - d.potong_susut;
            return {
              key: d.id_detail_nota_pembelian,
              nomorPenerimaan: d.nomor_penerimaan_barang,
              namaKapal: d.nama_kapal,
              namaGudang: d.nama_gudang,
              metodeKapal: d.metode_kapal,
              idIkan: d.id_ikan,
              namaIkan: d.nama_ikan,
              quantity: netWeight,
              harga: d.harga,
              jumlah: netWeight * d.harga
            };
          });

          const totalQuantity = details.reduce((sum, d) => sum + d.quantity, 0);
          const totalJumlah = details.reduce((sum, d) => sum + d.jumlah, 0);

          return {
            key: note.id_nota_pembelian,
            id: note.id_nota_pembelian,
            nomorNota: note.nomor_nota,
            tanggalNota: note.tanggal_nota,
            details,
            totalQuantity,
            totalJumlah
          };
        });

      setPurchaseNotes(activeNotes);
    } catch (error) {
      message.error('Gagal mengambil data nota pembelian');
    }
  };

  const handleDelete = async (id) => {
    try {
      const headers = { Authorization: token };
      await axios.delete(`${config.API_BASE_URL}/nota_pembelian/${id}`, { headers });
      message.success('Invoice berhasil dihapus');
      fetchPurchaseNotes();
    } catch (error) {
      console.error('Gagal menghapus invoice:', error);
      message.error('Gagal menghapus invoice');
    } finally {
      setDeleteModalVisible(false);
    }
  };


  // Fungsi untuk memanggil endpoint printer dan mendownload PDF
  const printNota = (payload) => {
    message.loading({ content: 'Mempersiapkan dokumen...', key: 'print' });
    axios.post(
      `${config.API_BASE_URL}/nota_pembelian_printer`,
      payload,
      {
        headers: {
          ...headers,
          Accept: 'application/pdf'
        },
        responseType: 'blob'
      }
    )
    .then(({ data, headers: respHeaders }) => {
      if (respHeaders['content-type'] === 'application/pdf') {
        message.success({ content: 'PDF siap diunduh', key: 'print' });
        const blob = new Blob([data], { type: 'application/pdf' });
        const url  = window.URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${payload.nomor_nota}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        message.error({ content: 'Gagal mencetak: format bukan PDF', key: 'print' });
      }
    })
    .catch(() => {
      message.error({ content: 'Terjadi kesalahan saat mencetak', key: 'print' });
    });
  };

  // Wrapper dengan konfirmasi sebelum mencetak
  const handlePrint = (record) => {
    const { nomorNota, tanggalNota, totalQuantity, totalJumlah, details } = record;
    const nomor_penerimaan_barang = [...new Set(details.map(d => d.nomorPenerimaan))];
    const nama_kapal              = [...new Set(details.map(d => d.namaKapal))];
    const nama_gudang             = [...new Set(details.map(d => d.namaGudang))];
    const metode_kapal            = [...new Set(details.map(d => d.metodeKapal))];

    const payload = {
      nomor_nota: nomorNota,
      nomor_penerimaan_barang,
      nama_kapal,
      tanggal_nota: tanggalNota,
      nama_gudang,
      metode_kapal,
      quantity_total: totalQuantity,
      jumlah_total: totalJumlah,
      detail_nota_pembelian: details.map(d => ({
        nama_ikan: d.namaIkan,
        quantity:  d.quantity,
        harga:     d.harga,
        jumlah:    d.jumlah
      }))
    };

    Modal.confirm({
      title: 'Cetak Nota Pembelian',
      content: `Anda akan mencetak nota "${nomorNota}" tanggal ${tanggalNota}. Lanjutkan?`,
      okText: 'Cetak',
      cancelText: 'Batal',
      onOk: () => printNota(payload)
    });
  };

  const showDeleteModal = (invoice) => {
    console.log("Invoice untuk dihapus:", invoice); // Debug cek data
    setInvoiceToDelete(invoice);
    setDeleteModalVisible(true);
  };
  

  return (
    <Layout>
    <Header />
    <Content style={{ padding: 24 }}>
      <Button icon={<ArrowLeftIcon />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        Kembali
      </Button>

      <Title level={3}>Daftar Penerimaan Barang</Title>
      <Space style={{ marginBottom: 16 }}>
        <RangePicker value={dateRange} onChange={setDateRange} allowClear />
        <Select
          placeholder="Filter GRP"
          allowClear
          onChange={value => setGrpFilter(value ?? null)}
          style={{ width: 120 }}
        >
          <Select.Option value={1}>GRP</Select.Option>
          <Select.Option value={0}>Non-GRP</Select.Option>
        </Select>
        <Select value={sortOrder} onChange={setSortOrder} style={{ width: 160 }}>
          <Select.Option value="desc">Tanggal Terbaru</Select.Option>
          <Select.Option value="asc">Tanggal Terlama</Select.Option>
        </Select>
        <Select
          value={doneFilter}
          onChange={(val) => setDoneFilter(val ?? null)}
          style={{ width: 200}}
          allowClear
          placeholder="Filter status selesai"
        >
          <Select.Option value={0}>Belum Digunakan</Select.Option>
          <Select.Option value={1}>Sudah Digunakan</Select.Option>
        </Select>

      </Space>
      <Table
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        rowClassName={r => r.usedInPurchaseNote ? 'used-row' : ''}
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
        dataSource={penerimaanNotes}
        pagination={{ pageSize: 10 }}
        rowKey="id"
      />

        <Title level={4} style={{ marginTop: 24 }}>Ringkasan</Title>
        <Table dataSource={summaryRows} columns={summaryColumns} pagination={false} rowKey="id_ikan" />
        <Space style={{ marginTop: 16 }}>
          <DatePicker value={date} onChange={setDate} />
          <Button type="primary" onClick={handleGenerateNote}>Buat Nota Pembelian</Button>
        </Space>

        <Title level={3} style={{ marginTop: 48 }}>Nota Pembelian Tersimpan</Title>
        <Table
          columns={[
            { title: 'Nomor Nota', dataIndex: 'nomorNota', key: 'nomorNota' },
            { title: 'Tanggal', dataIndex: 'tanggalNota', key: 'tanggalNota' },
            {
              title: 'Total Berat (kg)',
              dataIndex: 'totalQuantity',
              key: 'totalQuantity',
              render: v => v.toLocaleString()
            },
            {
              title: 'Total Harga (Rp)',
              dataIndex: 'totalJumlah',
              key: 'totalJumlah',
              render: v => `Rp ${v.toLocaleString()}`
            },
            {
              title: 'Aksi',
              key: 'aksi',
              render: (_, r) => (
                <Space>
                  <Button icon={<PrinterIcon size={16} />} onClick={() => handlePrint(r)}>
                    Cetak PDF
                  </Button>
                  <Button danger onClick={() => showDeleteModal(r)}>
                    Delete
                  </Button>
                </Space>
              )
            }
          ]}
          expandable={{
            expandedRowRender: record => (
              <Table
                dataSource={record.details}
                columns={[
                  { title: 'Nomor Penerimaan', dataIndex: 'nomorPenerimaan', key: 'nomorPenerimaan' },
                  { title: 'Nama Ikan', dataIndex: 'namaIkan', key: 'namaIkan' },
                  { title: 'Kapal', dataIndex: 'namaKapal', key: 'namaKapal' },
                  { title: 'Gudang', dataIndex: 'namaGudang', key: 'namaGudang' },
                  { title: 'Metode Kapal', dataIndex: 'metodeKapal', key: 'metodeKapal' },
                  { title: 'Berat (kg)', dataIndex: 'quantity', key: 'quantity' },
                  {
                    title: 'Harga (Rp)',
                    dataIndex: 'harga',
                    key: 'harga',
                    render: v => `Rp ${v.toLocaleString()}`
                  },
                  {
                    title: 'Jumlah (Rp)',
                    dataIndex: 'jumlah',
                    key: 'jumlah',
                    render: v => `Rp ${v.toLocaleString()}`
                  }
                ]}
                pagination={false}
                rowKey="key"
              />
            )
          }}
          
          dataSource={purchaseNotes}
          pagination={{ pageSize: 25 }}
          rowKey="id"
        />
      </Content>
      <Modal
        title="Konfirmasi Hapus Invoice"
        open={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onOk={() => handleDelete(invoiceToDelete?.id)}
        okText="Hapus"
        okButtonProps={{ danger: true }}
        cancelText="Batal"
      >
        <p>Apakah Anda yakin ingin menghapus invoice <b>{invoiceToDelete?.nomor_invoice}</b>?</p>
      </Modal>

    </Layout>
  );
}
