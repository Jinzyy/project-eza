import React, { useState } from 'react';
import dayjs from 'dayjs';
import {
  Layout,
  Typography,
  Button,
  Form,
  Select,
  Input,
  Row,
  Col,
  Card,
  Modal,
  Switch,
  Checkbox,
  DatePicker,
  Table
} from 'antd';
import InputNumber from 'antd/lib/input-number';
import { ArrowLeftIcon, PlusIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

// Placeholder weights for each pallet ID
const palletWeights = {
  P1: 10,
  P2: 15,
  P3: 20
};

export default function UnloadPallet() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [showFishModal, setShowFishModal] = useState(false);
  const [fishOptions] = useState([
    { id: 'I1', name: 'Ikan Kakap' },
    { id: 'I2', name: 'Ikan Tuna' },
    { id: 'I3', name: 'Ikan Salmon' },
    { id: 'I4', name: 'Ikan Lele' }
  ]);
  const [selectedFish, setSelectedFish] = useState([]);

  const handleAddFish = fishId => {
    const fish = fishOptions.find(f => f.id === fishId);
    if (fish && !selectedFish.some(f => f.id === fishId)) {
      setSelectedFish([...selectedFish, { ...fish, pallets: [] }]);
    }
    setShowFishModal(false);
  };

  const handleAddPallet = fishIdx => {
    const newFish = [...selectedFish];
    if (!newFish[fishIdx].pallets) newFish[fishIdx].pallets = [];
    newFish[fishIdx].pallets.push({ palletId: null, bruto: null, netto: null, freezerId: null, full: false });
    setSelectedFish(newFish);
  };

  const handlePalletChange = (fishIdx, palletIdx, field, value) => {
    const newFish = [...selectedFish];
    const pallet = newFish[fishIdx].pallets[palletIdx];
    pallet[field] = value;
    if (field === 'bruto' || field === 'palletId') {
      const bruto = field === 'bruto' ? value : pallet.bruto;
      const weight = palletWeights[pallet.palletId] || 0;
      pallet.netto = typeof bruto === 'number' ? bruto - weight : null;
    }
    setSelectedFish(newFish);
  };

  // Prepare items and summary data for payload and table
  const summaryData = selectedFish.map(fish => {
    const totalBruto = (fish.pallets || []).reduce((sum, p) => sum + (p.bruto || 0), 0);
    const totalNetto = (fish.pallets || []).reduce((sum, p) => sum + (p.netto || 0), 0);
    const susut = (fish.pallets || []).filter(p => p.full).length * 3;
    return { key: fish.id, fish: fish.name, totalBruto, susut, totalNetto };
  });
  const summaryColumns = [
    { title: 'Nama Ikan', dataIndex: 'fish', key: 'fish' },
    { title: 'Total Bruto', dataIndex: 'totalBruto', key: 'totalBruto'},
    { title: 'Susut', dataIndex: 'susut', key: 'susut' },
    { title: 'Netto Total', dataIndex: 'totalNetto', key: 'totalNetto' },
  ];

  const handleFinalSubmit = () => {
    const values = form.getFieldsValue();
    const payload = {
      id_kapal: values.kapal,
      id_gudang: values.namaGudang,
      metode_kapal: `${values.armadaType}-${values.armadaDetail}`,
      grp: values.grp || false,
      tanggal_terima: values.tanggal.format('YYYY-MM-DD'),
      items: {},
      stok_ikan: {}
    };
    selectedFish.forEach(fish => {
      const totalNetto = (fish.pallets || []).reduce((sum, p) => sum + (p.netto || 0), 0);
      const susut = (fish.pallets || []).filter(p => p.full).length * 3;
      payload.items[fish.id] = [totalNetto, susut];
      payload.stok_ikan[fish.id] = (fish.pallets || []).map(p => [
        p.palletId,
        p.netto,
        p.freezerId
      ]);
    });
    console.log('Payload JSON:', JSON.stringify(payload, null, 2));
  };

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content>
        <div className="container mx-auto px-6 py-12">
          <Button icon={<ArrowLeftIcon size={16} />} onClick={() => navigate('/purchase')} className="mb-6">
            Kembali
          </Button>

          <Title level={2}>Bongkar Pallet</Title>

          <Form form={form} layout="vertical" initialValues={{ tanggal: dayjs() }}>
            <Form.Item name="tanggal" label="Tanggal" rules={[{ required: true, message: 'Pilih tanggal' }]}>
              <DatePicker style={{ width: 240 }} />
            </Form.Item>

            <Form.Item name="kapal" label="Kapal" rules={[{ required: true, message: 'Pilih kapal' }]}>
              <Select placeholder="Pilih kapal">
                <Option value="1">Kapal Bahagia</Option>
                <Option value="2">Kapal Sentosa</Option>
                <Option value="3">Kapal Maju</Option>
              </Select>
            </Form.Item>

            <Form.Item name="namaGudang" label="Nama Gudang" rules={[{ required: true, message: 'Pilih gudang' }]}>
              <Select placeholder="Pilih gudang">
                <Option value="A">Gudang Pusat</Option>
                <Option value="B">Gudang Timur</Option>
                <Option value="C">Gudang Barat</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Armada Angkutan" required>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="armadaType" noStyle rules={[{ required: true, message: 'Pilih jenis armada' }]}>
                    <Select placeholder="Jenis armada">
                      <Option value="TRUK">Truk</Option>
                      <Option value="KERETA">Kereta</Option>
                      <Option value="KAPAL">Kapal Laut</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="armadaDetail" noStyle rules={[{ required: true, message: 'Masukkan detail armada' }]}>
                    <Input placeholder="Detail armada" />
                  </Form.Item>
                </Col>
              </Row>
            </Form.Item>

            <Form.Item name="grp" label="GRP" valuePropName="checked" rules={[{ required: true, message: 'Tentukan status GRP' }]}>
              <Switch />
            </Form.Item>
          </Form>

          {/* Fish cards and pallet inputs */}
          <div className="mt-6">
            <Button icon={<PlusIcon size={16} />} onClick={() => setShowFishModal(true)}>
              Tambah Ikan
            </Button>
            <Row gutter={[16, 16]} className="mt-4">
              {selectedFish.map((fish, fishIdx) => (
                <Col span={24} key={fish.id}>
                  <Card title={fish.name} className="mb-4">
                    {(fish.pallets || []).map((pallet, palletIdx) => (
                      <Row gutter={8} key={palletIdx} align="middle" className="mb-3">
                        <Col><Select placeholder="ID Pallet" style={{ width: 120 }} value={pallet.palletId} onChange={val => handlePalletChange(fishIdx, palletIdx, 'palletId', val)}>
                          <Option value="P1">P1</Option><Option value="P2">P2</Option><Option value="P3">P3</Option>
                        </Select></Col>
                        <Col><InputNumber placeholder="Bruto" style={{ width: 100 }} value={pallet.bruto} onChange={val => handlePalletChange(fishIdx, palletIdx, 'bruto', val)} /></Col>
                        <Col><InputNumber placeholder="Netto" style={{ width: 100 }} value={pallet.netto} disabled /></Col>
                        <Col><Select placeholder="ID Freezer" style={{ width: 120 }} value={pallet.freezerId} onChange={val => handlePalletChange(fishIdx, palletIdx, 'freezerId', val)}>
                          <Option value="F1">F1</Option><Option value="F2">F2</Option><Option value="F3">F3</Option>
                        </Select></Col>
                        <Col><Checkbox checked={pallet.full} onChange={e => handlePalletChange(fishIdx, palletIdx, 'full', e.target.checked)}>Full</Checkbox></Col>
                      </Row>
                    ))}
                    <Button icon={<PlusIcon size={14} />} onClick={() => handleAddPallet(fishIdx)}>Tambah Pallet</Button>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Summary Table */}
            {summaryData.length > 0 && (
              <div className="mt-8">
                <Title level={3}>Summary</Title>
                <Table columns={summaryColumns} dataSource={summaryData} pagination={false} bordered />
              </div>
            )}

            {/* Final Submit */}
            <div className="mt-6 text-right">
              <Button type="primary" onClick={handleFinalSubmit}>Submit</Button>
            </div>

            {/* Fish selection modal */}
            <Modal title="Pilih Jenis Ikan" visible={showFishModal} onCancel={() => setShowFishModal(false)} footer={null}>
              <Select placeholder="Pilih jenis ikan" style={{ width: '100%' }} onChange={handleAddFish}>
                {fishOptions.map(f => <Option key={f.id} value={f.id}>{f.name}</Option>)}
              </Select>
            </Modal>
          </div>
        </div>
      </Content>
      <FooterSection />
    </Layout>
  );
}
