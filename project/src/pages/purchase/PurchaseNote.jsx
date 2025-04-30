import React, { useState } from 'react';
import { Layout, Typography, Button, Table, Modal, DatePicker, Space, Tag } from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Content } = Layout;
const { Title } = Typography;

// Contoh data nota penerimaan
const penerimaanNotes = [
  {
    id: 'PN-001',
    date: '2025-04-25',
    usedInPurchaseNote: false,
    items: [
      { fishName: 'Ikan Tuna', weight: 100 },
      { fishName: 'Ikan Tongkol', weight: 60 },
    ],
  },
  {
    id: 'PN-002',
    date: '2025-04-26',
    usedInPurchaseNote: true,
    items: [
      { fishName: 'Ikan Tuna', weight: 80 }, // Sama dengan PN-001
      { fishName: 'Ikan Kakap', weight: 50 },
    ],
  },
  {
    id: 'PN-003',
    date: '2025-04-27',
    usedInPurchaseNote: false,
    items: [
      { fishName: 'Ikan Tongkol', weight: 40 }, // Sama dengan PN-001
    ],
  },
];

function PurchaseNote() {
  const navigate = useNavigate();

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [purchaseNotes, setPurchaseNotes] = useState([]);
  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [date, setDate] = useState(dayjs());

  const selectedReceipts = penerimaanNotes.filter(note => selectedRowKeys.includes(note.id));

  const summary = selectedReceipts.reduce((acc, note) => {
    note.items.forEach(item => {
      acc[item.fishName] = (acc[item.fishName] || 0) + item.weight;
    });
    return acc;
  }, {});

  const handleGenerateNote = () => {
    const note = {
      id: `NP-${Date.now()}`,
      date: date.format('YYYY-MM-DD'),
      items: summary,
    };
    setPurchaseNotes([...purchaseNotes, note]);
    setSelectedRowKeys([]);
  };

  const handleShowDetail = (record) => {
    setSelectedDetail(record);
    setIsDetailModalVisible(true);
  };

  const handlePrintPDF = (note) => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(`Nota Pembelian: ${note.id}`, 14, 20);
    doc.text(`Tanggal: ${note.date}`, 14, 30);

    const tableData = Object.entries(note.items).map(([fish, weight]) => [
      fish,
      `${weight} kg`
    ]);

    autoTable(doc, {
      head: [['Nama Ikan', 'Total Berat']],
      body: tableData,
      startY: 40,
    });

    doc.save(`NotaPembelian-${note.id}.pdf`);
  };

  const columns = [
    {
      title: 'ID Nota Penerimaan',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Tanggal',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Status',
      key: 'used',
      render: (_, record) => (
        <Tag color={record.usedInPurchaseNote ? 'orange' : 'green'}>
          {record.usedInPurchaseNote ? 'Sudah Digunakan' : 'Baru'}
        </Tag>
      ),
    },
    {
      title: 'Detail',
      key: 'detail',
      render: (_, record) => (
        <Button onClick={() => handleShowDetail(record)}>Lihat</Button>
      ),
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content>
        <div className="container mx-auto px-6 py-12">
          <div className="flex justify-between items-center mb-6">
            <Button 
              icon={<ArrowLeftIcon size={16} />} 
              onClick={() => navigate('/purchase')}
            >
              Kembali
            </Button>
            <Button type="primary" onClick={() => setIsNoteModalVisible(true)}>
              Lihat Nota
            </Button>
          </div>

          <Title level={2}>Buat Nota Pembelian</Title>

          <Table
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              getCheckboxProps: (record) => ({
                disabled: false,
              }),
            }}
            rowKey="id"
            dataSource={penerimaanNotes}
            columns={columns}
            pagination={false}
            className="mt-4"
          />

          {selectedReceipts.length > 0 && (
            <div className="mt-8 border-t pt-6">
              <Title level={4}>Ringkasan Nota</Title>
              <Space direction="vertical" size="middle" className="w-full">
                <div>
                  <strong>Tanggal Nota: </strong>
                  <DatePicker
                    value={date}
                    onChange={(val) => setDate(val)}
                    className="ml-2"
                  />
                </div>
                <div>
                  <strong>Rincian Ikan:</strong>
                  <ul className="mt-2">
                    {Object.entries(summary).map(([fish, weight]) => (
                      <li key={fish}>{fish}: {weight} kg</li>
                    ))}
                  </ul>
                </div>
                <Button type="primary" onClick={handleGenerateNote}>
                  Simpan Nota
                </Button>
              </Space>
            </div>
          )}

          {/* Modal Daftar Nota */}
          <Modal
            title="Daftar Nota Pembelian"
            open={isNoteModalVisible}
            onCancel={() => setIsNoteModalVisible(false)}
            footer={null}
          >
            {purchaseNotes.length === 0 ? (
              <p>Belum ada nota yang dibuat.</p>
            ) : (
              <ul>
                {purchaseNotes.map(note => (
                  <li key={note.id}>
                    <strong>{note.id}</strong> - {note.date}
                    <ul>
                      {Object.entries(note.items).map(([fish, weight]) => (
                        <li key={fish}>{fish}: {weight} kg</li>
                      ))}
                    </ul>
                    <Button 
                      type="primary" 
                      onClick={() => handlePrintPDF(note)}
                      className="mt-2"
                    >
                      Cetak PDF
                    </Button>
                    <hr />
                  </li>
                ))}
              </ul>
            )}
          </Modal>

          {/* Modal Detail Nota Penerimaan */}
          <Modal
            title={`Detail Nota Penerimaan - ${selectedDetail?.id}`}
            open={isDetailModalVisible}
            onCancel={() => setIsDetailModalVisible(false)}
            footer={null}
          >
            {selectedDetail ? (
              <>
                <p><strong>Tanggal:</strong> {selectedDetail.date}</p>
                <p><strong>Daftar Ikan:</strong></p>
                <ul>
                  {selectedDetail.items.map((item, idx) => (
                    <li key={idx}>{item.fishName}: {item.weight} kg</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Memuat...</p>
            )}
          </Modal>
        </div>
      </Content>
      <FooterSection />
    </Layout>
  );
}

export default PurchaseNote;
