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
import { ArrowLeftIcon, PrinterIcon, EyeIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import axios from 'axios';
import config from '../../config';
import Header from '../../components/Header';

const { Content } = Layout;
const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function PurchaseNote() {
  const navigate = useNavigate();

  // Penerimaan Barang states
  const [penerimaanNotes, setPenerimaanNotes] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [dateRange, setDateRange] = useState([]);
  const [grpFilter, setGrpFilter] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');
  const [doneFilter, setDoneFilter] = useState(null);
  const [priceMap, setPriceMap] = useState({});
  const [date, setDate] = useState(dayjs());

  // Pagination for penerimaan barang
  const [penerimaanCurrentPage, setPenerimaanCurrentPage] = useState(1);
  const [penerimaanPageSize, setPenerimaanPageSize] = useState(10);
  const [penerimaanTotalItems, setPenerimaanTotalItems] = useState(0);

  // Nota Pembelian Tersimpan states
  const [purchaseNotes, setPurchaseNotes] = useState([]);
  const [npDateRange, setNpDateRange] = useState([]);
  const [npGrpFilter, setNpGrpFilter] = useState(null);
  const [npSortOrder, setNpSortOrder] = useState('desc');

  // Pagination for nota pembelian
  const [npCurrentPage, setNpCurrentPage] = useState(1);
  const [npPageSize, setNpPageSize] = useState(25);
  const [npTotalItems, setNpTotalItems] = useState(0);

  // Modal for Nota Pembelian details
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailModalData, setDetailModalData] = useState(null);

  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);

  const [fishPriceMap, setFishPriceMap] = useState({});

  const token = sessionStorage.getItem('token');
  const headers = { Authorization: token };

  useEffect(() => {
    const fetchFishPrices = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const headers = { Authorization: token };
        const response = await axios.get(`${config.API_BASE_URL}/ikan`, { headers });
        if (response.data.status && Array.isArray(response.data.data)) {
          const priceMap = {};
          response.data.data.forEach(fish => {
            priceMap[fish.id_ikan] = Number(fish.harga_jual) || 0;
          });
          setFishPriceMap(priceMap);
        } else {
          message.error('Gagal mengambil data harga ikan');
        }
      } catch (error) {
        console.error(error);
        message.error('Gagal mengambil data harga ikan');
      }
    };

    fetchFishPrices();
  }, []);

  // Fetch penerimaan barang with filters and pagination
  const fetchPenerimaanBarang = async () => {
    try {
      const params = {
        sort: sortOrder,
        page: penerimaanCurrentPage,
        limit: penerimaanPageSize,
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
        const formattedNotes = data.data.map((item, index) => ({
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
            weight: Number(detail.berat_awal) || 0,
            shrink: Number(detail.potong_susut) || 0,
          })) || [],
          nomor: (penerimaanCurrentPage - 1) * penerimaanPageSize + index + 1,
        }));

        setPenerimaanNotes(formattedNotes);
        setPenerimaanTotalItems(data.pagination?.total_items || 0);
      } else {
        setPenerimaanNotes([]);
        setPenerimaanTotalItems(0);
      }
    } catch (error) {
      console.error(error);
      message.error('Gagal mengambil data penerimaan barang');
    }
  };

  // Fetch nota pembelian with filters and pagination
  const fetchPurchaseNotes = async () => {
    try {
      const params = {
        sort: npSortOrder,
        page: npCurrentPage,
        limit: npPageSize,
        cancelled: 0

      };

      if (npDateRange.length === 2) {
        params.date_start = npDateRange[0].format('YYYY-MM-DD');
        params.date_end = npDateRange[1].format('YYYY-MM-DD');
      }

      if (npGrpFilter !== null) {
        params['pb.grp'] = npGrpFilter;
      }

      const { data } = await axios.get(`${config.API_BASE_URL}/nota_pembelian`, {
        headers,
        params,
      });

      if (!data.status) throw new Error('Fetch failed');

      const activeNotes = (data.data || [])
        .map(note => {
          const details = (note.detail_nota_pembelian || []).map(d => {
            const quantity = Number(d.quantity) || 0; // Use quantity directly if available
            const harga = Number(d.harga) || 0;
            const jumlah = Number(d.jumlah) || 0; // Use jumlah directly if available
            return {
              key: d.id_detail_nota_pembelian,
              nomorPenerimaan: d.nomor_penerimaan_barang,
              namaKapal: d.nama_kapal,
              namaGudang: d.nama_gudang,
              metodeKapal: d.metode_kapal,
              idIkan: d.id_ikan,
              namaIkan: d.nama_ikan,
              quantity,
              harga,
              jumlah,
            };
          });

          const total_quantity = details.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
          const total_jumlah = details.reduce((sum, d) => sum + (Number(d.jumlah) || 0), 0);

          return {
            key: note.id_nota_pembelian,
            id: note.id_nota_pembelian,
            nomor_nota: note.nomor_nota,
            tanggal_nota: note.tanggal_nota,
            grp: note.grp,
            details,
            total_quantity,
            total_jumlah,
          };
        });

      setPurchaseNotes(activeNotes);
      setNpTotalItems(data.pagination?.total_items || 0);
    } catch (error) {
      message.error('Gagal mengambil data nota pembelian');
    }
  };

  // Initial and dependency-based fetches
  useEffect(() => {
    fetchPenerimaanBarang();
  }, [dateRange, grpFilter, sortOrder, doneFilter, penerimaanCurrentPage, penerimaanPageSize]);

  useEffect(() => {
    fetchPurchaseNotes();
  }, [npDateRange, npGrpFilter, npSortOrder, npCurrentPage, npPageSize]);

  // Summary of selected penerimaan
  const summaryMap = selectedRowKeys.reduce((acc, key) => {
    const note = penerimaanNotes.find(n => n.id === key);
    if (note) {
      note.details.forEach(d => {
        if (!acc[d.id_ikan]) acc[d.id_ikan] = { id_ikan: d.id_ikan, fishName: d.fishName, netWeight: 0 };
        acc[d.id_ikan].netWeight += (Number(d.weight) || 0) - (Number(d.shrink) || 0);
      });
    }
    return acc;
  }, {});

  const summaryRows = Object.values(summaryMap).map(({ id_ikan, fishName, netWeight }) => ({
    id_ikan,
    fishName,
    weight: netWeight,
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
          value={fishPriceMap[row.id_ikan] || 0}
          disabled // disable manual input to enforce automatic price
          style={{ width: 120 }}
        />
      ),
    },
    {
      title: 'Total Harga (Rp)',
      key: 'totalPrice',
      render: (_, row) => {
        const total = (Number(row.weight) || 0) * (Number(fishPriceMap[row.id_ikan]) || 0);
        return `Rp ${total.toLocaleString('id-ID')}`;
      },
    },
  ];

  // Generate purchase note
  const handleGenerateNote = async () => {
    if (!selectedRowKeys.length) {
      return message.warning('Pilih minimal satu penerimaan barang');
    }
  
    // Ambil semua ikan yang ada di summaryMap (atau data yang Anda gunakan)
    const summaryRows = Object.values(summaryMap);
  
    // Buat objek harga lengkap untuk semua ikan yang ada di summaryRows
    const priceMapPayload = {};
    summaryRows.forEach(row => {
      // Pastikan id_ikan dan harga ada dan valid
      if (row.id_ikan && fishPriceMap[row.id_ikan]) {
        priceMapPayload[row.id_ikan] = fishPriceMap[row.id_ikan];
      } else {
        priceMapPayload[row.id_ikan] = 0; // fallback jika harga tidak ada
      }
    });
  
    // Buat payload lengkap
    const payload = {
      tanggal_nota: date.format('YYYY-MM-DD'),
      id_penerimaan_barang: selectedRowKeys, // array id penerimaan barang yang dipilih
      'id_ikan=harga': priceMapPayload,
    };
  
    try {
      const response = await axios.post(`${config.API_BASE_URL}/nota_pembelian`, payload, { headers });
  
      if (response.data.status) {
        message.success('Nota pembelian berhasil dibuat');
        setSelectedRowKeys([]);
        setPriceMap({});
        fetchPenerimaanBarang();
        fetchPurchaseNotes();
      } else {
        message.error('Gagal membuat nota pembelian');
      }
    } catch (error) {
      console.error(error);
      message.error('Terjadi kesalahan saat membuat nota pembelian');
    }
  };

  // Delete invoice
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${config.API_BASE_URL}/nota_pembelian/${id}`, { headers });
      message.success('Invoice berhasil dihapus');
      // Refetch purchase notes and penerimaan barang after deletion
      fetchPurchaseNotes();
      fetchPenerimaanBarang();
    } catch (error) {
      console.error('Gagal menghapus invoice:', error);
      message.error('Gagal menghapus invoice');
    } finally {
      setDeleteModalVisible(false);
    }
  };

  // Print nota pembelian PDF
  const printNota = (payload) => {
    message.loading({ content: 'Mempersiapkan dokumen...', key: 'print' });
    axios
      .post(`${config.API_BASE_URL}/nota_pembelian_printer`, payload, {
        headers: {
          ...headers,
          Accept: 'application/pdf',
        },
        responseType: 'blob',
      })
      .then(({ data, headers: respHeaders }) => {
        if (respHeaders['content-type'] === 'application/pdf') {
          message.success({ content: 'PDF siap diunduh', key: 'print' });
          const blob = new Blob([data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
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

  // Show detail modal for Nota Pembelian
  const showDetailModal = (record) => {
    setDetailModalData(record);
    setDetailModalVisible(true);
  };

  // Confirm and handle print
  const handlePrint = (record) => {
    const { nomor_nota, tanggal_nota, total_quantity, total_jumlah, details } = record;
    const nomor_penerimaan_barang = [...new Set(details.map(d => d.nomorPenerimaan))];
    const nama_kapal = [...new Set(details.map(d => d.namaKapal))];
    const nama_gudang = [...new Set(details.map(d => d.namaGudang))];
    const metode_kapal = [...new Set(details.map(d => d.metodeKapal))];

    const payload = {
      nomor_nota,
      nomor_penerimaan_barang,
      nama_kapal,
      tanggal_nota,
      nama_gudang,
      metode_kapal,
      quantity_total: total_quantity,
      jumlah_total: total_jumlah,
      detail_nota_pembelian: details.map(d => ({
        nama_ikan: d.namaIkan,
        quantity: d.quantity,
        harga: d.harga,
        jumlah: d.jumlah,
      })),
    };

    Modal.confirm({
      title: 'Cetak Nota Pembelian',
      content: `Anda akan mencetak nota "${nomor_nota}" tanggal ${tanggal_nota}. Lanjutkan?`,
      okText: 'Cetak',
      cancelText: 'Batal',
      onOk: () => printNota(payload),
    });
  };

  // Reset filters for Nota Pembelian Tersimpan
  const resetNpFilters = () => {
    setNpDateRange([]);
    setNpGrpFilter(null);
    setNpSortOrder('desc');
    setNpCurrentPage(1);
  };

  // Handle pagination and sorting changes for penerimaan barang
  const handlePenerimaanTableChange = (pagination) => {
    if (pagination.current !== penerimaanCurrentPage) {
      setPenerimaanCurrentPage(pagination.current);
    }
    if (pagination.pageSize !== penerimaanPageSize) {
      setPenerimaanPageSize(pagination.pageSize);
      setPenerimaanCurrentPage(1);
    }
  };

  // Handle pagination and sorting changes for nota pembelian
  const handleNpTableChange = (pagination) => {
    if (pagination.current !== npCurrentPage) {
      setNpCurrentPage(pagination.current);
    }
    if (pagination.pageSize !== npPageSize) {
      setNpPageSize(pagination.pageSize);
      setNpCurrentPage(1);
    }
  };

  return (
    <Layout>
      <Header />
      <Content style={{ padding: 24 }}>
      <div className="container mx-auto px-6 py-12">
        <Button icon={<ArrowLeftIcon />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
          Kembali
        </Button>

        <Title level={3}>Daftar Penerimaan Barang</Title>
        <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <RangePicker
            value={dateRange}
            onChange={dates => {
              setDateRange(dates || []);
              setPenerimaanCurrentPage(1);
            }}
            allowClear
            style={{ minWidth: 220 }}
          />
          <Select
            placeholder="Filter GRP"
            allowClear
            onChange={value => {
              setGrpFilter(value ?? null);
              setPenerimaanCurrentPage(1);
            }}
            style={{ width: 120 }}
            value={grpFilter}
          >
            <Select.Option value={1}>GRP</Select.Option>
            <Select.Option value={0}>Non-GRP</Select.Option>
          </Select>
          <Select
            value={sortOrder}
            onChange={val => {
              setSortOrder(val);
              setPenerimaanCurrentPage(1);
            }}
            style={{ width: 160 }}
          >
            <Select.Option value="desc">Tanggal Terbaru</Select.Option>
            <Select.Option value="asc">Tanggal Terlama</Select.Option>
          </Select>
          <Select
            value={doneFilter}
            onChange={val => {
              setDoneFilter(val ?? null);
              setPenerimaanCurrentPage(1);
            }}
            style={{ width: 200 }}
            allowClear
            placeholder="Filter status selesai"
          >
            <Select.Option value={0}>Belum Digunakan</Select.Option>
            <Select.Option value={1}>Sudah Digunakan</Select.Option>
          </Select>
        </Space>
        <Table
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          rowClassName={r => (r.usedInPurchaseNote ? 'used-row' : '')}
          columns={[
            { title: 'No', dataIndex: 'nomor', key: 'nomor', width: 60 },
            { title: 'Nomor Penerimaan', dataIndex: 'code', key: 'code' },
            { title: 'Tanggal', dataIndex: 'date', key: 'date' },
            {
              title: 'Status GRP',
              dataIndex: 'grp',
              key: 'grp',
              render: val => (val ? <Tag color="green">GRP</Tag> : <Tag color="red">Non-GRP</Tag>),
            },
            {
              title: 'Sudah Digunakan',
              dataIndex: 'usedInPurchaseNote',
              key: 'used',
              render: used => (used ? <Tag color="blue">✓</Tag> : <Tag color="default">-</Tag>),
            },
          ]}
          dataSource={penerimaanNotes}
          pagination={{
            current: penerimaanCurrentPage,
            pageSize: penerimaanPageSize,
            total: penerimaanTotalItems,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '25', '50'],
          }}
          onChange={handlePenerimaanTableChange}
          rowKey="id"
        />

        <Title level={4} style={{ marginTop: 24 }}>
          Ringkasan
        </Title>
        <Table
          dataSource={summaryRows}
          columns={summaryColumns}
          pagination={false}
          rowKey="id_ikan"
          locale={{ emptyText: 'Pilih minimal satu nota penerimaan' }}
        />
        <Space style={{ marginTop: 16, flexWrap: 'wrap' }}>
          <DatePicker value={date} onChange={setDate} />
          <Button type="primary" onClick={handleGenerateNote}>
            Buat Nota Pembelian
          </Button>
        </Space>

        <Title level={3} style={{ marginTop: 48 }}>
          Nota Pembelian Tersimpan
        </Title>
        <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <RangePicker
            value={npDateRange}
            onChange={dates => {
              setNpDateRange(dates || []);
              setNpCurrentPage(1);
            }}
            allowClear
            placeholder={['Tanggal Mulai', 'Tanggal Akhir']}
            style={{ minWidth: 220 }}
          />
          <Select
            value={npSortOrder}
            onChange={val => {
              setNpSortOrder(val);
              setNpCurrentPage(1);
            }}
            style={{ width: 160 }}
          >
            <Select.Option value="desc">Tanggal Terbaru</Select.Option>
            <Select.Option value="asc">Tanggal Terlama</Select.Option>
          </Select>
          <Button onClick={resetNpFilters}>Reset Filters</Button>
        </Space>
        <Table
          columns={[
            { title: 'Nomor Nota', dataIndex: 'nomor_nota', key: 'nomor_nota' },
            {
              title: 'Tanggal',
              dataIndex: 'tanggal_nota',
              key: 'tanggal_nota',
              render: date => dayjs(date).format('YYYY-MM-DD'),
            },
            {
              title: 'Total Berat (kg)',
              dataIndex: 'total_quantity',
              key: 'total_quantity',
              render: v => (typeof v === 'number' ? v.toLocaleString() : '0'),
            },
            {
              title: 'Total Harga (Rp)',
              dataIndex: 'total_jumlah',
              key: 'total_jumlah',
              render: v => (typeof v === 'number' ? `Rp ${v.toLocaleString()}` : 'Rp 0'),
            },
            {
              title: 'Aksi',
              key: 'aksi',
              render: (_, r) => (
                <Space>
                  <Button icon={<PrinterIcon size={16} />} onClick={() => handlePrint(r)}>
                    Cetak PDF
                  </Button>
                  <Button icon={<EyeIcon size={16} />} onClick={() => showDetailModal(r)}>Lihat Detail</Button>
                  <Button danger onClick={() => {
                    setInvoiceToDelete(r);
                    setDeleteModalVisible(true);
                  }}>
                    Delete
                  </Button>
                </Space>
              ),
            },
          ]}
          dataSource={purchaseNotes}
          pagination={{
            current: npCurrentPage,
            pageSize: npPageSize,
            total: npTotalItems,
            showSizeChanger: true,
            pageSizeOptions: ['10', '25', '50', '100'],
          }}
          onChange={handleNpTableChange}
          rowKey="key"
        />

        {/* Detail Modal */}
        <Modal
          title={`Detail Nota Pembelian: ${detailModalData?.nomor_nota || ''}`}
          visible={detailModalVisible}
          onCancel={() => setDetailModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setDetailModalVisible(false)}>
              Tutup
            </Button>,
          ]}
          width={900}
        >
          {detailModalData ? (
            <Table
              dataSource={detailModalData.details}
              columns={[
                { title: 'Nomor Penerimaan', dataIndex: 'nomorPenerimaan', key: 'nomorPenerimaan' },
                { title: 'Nama Ikan', dataIndex: 'namaIkan', key: 'namaIkan' },
                { title: 'Kapal', dataIndex: 'namaKapal', key: 'namaKapal' },
                { title: 'Gudang', dataIndex: 'namaGudang', key: 'namaGudang' },
                { title: 'Metode Kapal', dataIndex: 'metodeKapal', key: 'metodeKapal' },
                {
                  title: 'Berat (kg)',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  render: v => (typeof v === 'number' ? v.toLocaleString() : '0'),
                },
                {
                  title: 'Harga (Rp)',
                  dataIndex: 'harga',
                  key: 'harga',
                  render: v => (typeof v === 'number' ? `Rp ${v.toLocaleString()}` : 'Rp 0'),
                },
                {
                  title: 'Jumlah (Rp)',
                  dataIndex: 'jumlah',
                  key: 'jumlah',
                  render: v => (typeof v === 'number' ? `Rp ${v.toLocaleString()}` : 'Rp 0'),
                },
              ]}
              pagination={false}
              rowKey="key"
              size="small"
            />
          ) : (
            <p>Loading...</p>
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          title="Konfirmasi Hapus Invoice"
          visible={deleteModalVisible}
          onCancel={() => setDeleteModalVisible(false)}
          onOk={() => handleDelete(invoiceToDelete?.id)}
          okText="Hapus"
          okButtonProps={{ danger: true }}
          cancelText="Batal"
        >
          <p>
            Apakah Anda yakin ingin menghapus invoice <b>{invoiceToDelete?.nomor_nota}</b>?
          </p>
        </Modal>
        </div>
      </Content>
    </Layout>
  );
}