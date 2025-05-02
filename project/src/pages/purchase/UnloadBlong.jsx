import React, { useState, useEffect } from 'react';
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
  DatePicker,
  Table,
  Switch,
  message,
} from 'antd';
import InputNumber from 'antd/lib/input-number';
import { ArrowLeftIcon, PlusIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import config from '../../config';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

export default function UnloadBlong() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // State for dropdown data
  const [fishOptions, setFishOptions] = useState([]);
  const [kapalOptions, setKapalOptions] = useState([]);
  const [gudangOptions, setGudangOptions] = useState([]);
  const [freezerOptions, setFreezerOptions] = useState([]);
  const [palletOptions, setPalletOptions] = useState([]);
  const [palletWeights, setPalletWeights] = useState({});

  // Selected fish items
  const [selectedFish, setSelectedFish] = useState([]);
  const [showFishModal, setShowFishModal] = useState(false);

  const token = sessionStorage.getItem('token');
  const authHeader = { headers: { Authorization: token } };

  // Fetch all dropdown data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ikanRes, kapalRes, gudangRes, freezerRes, palletRes] = await Promise.all([
          axios.get(`${config.API_BASE_URL}/ikan`, authHeader),
          axios.get(`${config.API_BASE_URL}/kapal`, authHeader),
          axios.get(`${config.API_BASE_URL}/gudang`, authHeader),
          axios.get(`${config.API_BASE_URL}/freezer`, authHeader),
          axios.get(`${config.API_BASE_URL}/pallet`, authHeader),
        ]);

        // Map response data
        setFishOptions(
          ikanRes.data.data.map(i => ({ id: i.id_ikan, name: i.nama_ikan }))
        );
        setKapalOptions(
          kapalRes.data.data.map(k => ({ id: k.id_kapal, nama: k.nama_kapal }))
        );
        setGudangOptions(
          gudangRes.data.data.map(g => ({ id: g.id_gudang, nama: g.nama_gudang }))
        );
        setFreezerOptions(
          freezerRes.data.data.map(f => ({ id: f.id_freezer, nama: f.nama_freezer }))
        );
        setPalletOptions(
          palletRes.data.data.map(p => ({ id: p.id_pallet, nomor: p.nomor_pallet, berat: p.berat_pallet }))
        );

        // Build weight lookup by id_pallet
        const weights = {};
        palletRes.data.data.forEach(p => {
          weights[p.id_pallet] = p.berat_pallet;
        });
        setPalletWeights(weights);
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Gagal memuat data dari server.');
      }
    };
    fetchData();
  }, []);

  // Add fish to selected list
  const handleAddFish = fishId => {
    const fish = fishOptions.find(f => f.id === fishId);
    if (fish && !selectedFish.some(f => f.id === fishId)) {
      setSelectedFish([...selectedFish, { ...fish, pallets: [], susut: 0 }]);
    }
    setShowFishModal(false);
  };

  // Add a pallet entry under a fish
  const handleAddPallet = fishIdx => {
    const newFish = [...selectedFish];
    newFish[fishIdx].pallets.push({ palletId: null, bruto: null, netto: null, freezerId: null });
    setSelectedFish(newFish);
  };

  // Handle changes in pallet fields
  const handlePalletChange = (fishIdx, palletIdx, field, value) => {
    const newFish = [...selectedFish];
    const pallet = newFish[fishIdx].pallets[palletIdx];
    pallet[field] = value;

    // Recalculate netto if bruto or palletId changes
    if (field === 'bruto' || field === 'palletId') {
      const bruto = pallet.bruto;
      const weight = palletWeights[pallet.palletId] || 0;
      pallet.netto = typeof bruto === 'number' ? bruto - weight : null;
    }

    setSelectedFish(newFish);
  };

  // Handle susut change
  const handleSusutChange = (fishIdx, value) => {
    const newFish = [...selectedFish];
    newFish[fishIdx].susut = value;
    setSelectedFish(newFish);
  };

  // Remove a pallet entry
  const handleRemovePallet = (fishIdx, palletIdx) => {
    const newFish = [...selectedFish];
    newFish[fishIdx].pallets.splice(palletIdx, 1); // Remove pallet at given index
    setSelectedFish(newFish); // Update the state
  };

  // Prepare summary table data
  const summaryData = selectedFish.map((fish, index) => {
    const totalBruto = fish.pallets.reduce((sum, p) => sum + (p.bruto || 0), 0);
    const totalNetto = fish.pallets.reduce((sum, p) => sum + (p.netto || 0), 0);
    return {
      key: fish.id,
      fish: fish.name,
      totalBruto,
      susut: (
        <InputNumber
          min={0}
          value={fish.susut}
          onChange={val => handleSusutChange(index, val)}
        />
      ),
      totalNetto,
    };
  });

  const summaryColumns = [
    { title: 'Nama Ikan', dataIndex: 'fish', key: 'fish' },
    { title: 'Total Bruto', dataIndex: 'totalBruto', key: 'totalBruto' },
    { title: 'Susut', dataIndex: 'susut', key: 'susut' },
    { title: 'Netto Total', dataIndex: 'totalNetto', key: 'totalNetto' },
  ];

  // Submit final payload
  const handleFinalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        id_kapal: values.kapal,
        id_gudang: values.namaGudang,
        metode_kapal: `${values.armadaType} - ${values.armadaDetail}`,
        grp: values.grp || false,
        tanggal_terima: values.tanggal.format('YYYY-MM-DD'),
        items: {},
        stok_ikan: {},
      };

      selectedFish.forEach(fish => {
        const totalNetto = fish.pallets.reduce((sum, p) => sum + (p.netto || 0), 0);
        payload.items[fish.id] = [totalNetto, fish.susut];
        payload.stok_ikan[fish.id] = fish.pallets.map(p => [p.palletId, p.netto, p.freezerId]);
      });

      await axios.post(
        `${config.API_BASE_URL}/penerimaan_barang`,
        payload,
        authHeader
      );

      message.success('Data berhasil dikirim!');
      navigate('/purchase');
    } catch (error) {
      console.error('Submission error:', error);
      message.error('Gagal mengirim data. Periksa kembali input Anda.');
    }
  };

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content>
        <div className="container mx-auto px-6 py-12">
          <Button
            icon={<ArrowLeftIcon size={16} />}
            onClick={() => navigate('/purchase')}
            className="mb-6"
          >
            Kembali
          </Button>

          <Title level={2}>Bongkar Blong</Title>

          <Form form={form} layout="vertical" initialValues={{ tanggal: dayjs() }}>
            <Form.Item
              name="tanggal"
              label="Tanggal"
              rules={[{ required: true, message: 'Pilih tanggal' }]}
            >
              <DatePicker style={{ width: 240 }} />
            </Form.Item>

            <Form.Item
              name="kapal"
              label="Kapal"
              rules={[{ required: true, message: 'Pilih kapal' }]}
            >
              <Select placeholder="Pilih kapal">
                {kapalOptions.map(k => (
                  <Option key={k.id} value={k.id}>
                    {k.nama}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="namaGudang"
              label="Nama Gudang"
              rules={[{ required: true, message: 'Pilih gudang' }]}
            >
              <Select placeholder="Pilih gudang">
                {gudangOptions.map(g => (
                  <Option key={g.id} value={g.id}>
                    {g.nama}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Armada Angkutan" required>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="armadaType"
                    noStyle
                    rules={[{ required: true, message: 'Pilih jenis armada' }]}
                  >
                    <Select placeholder="Jenis armada">
                      <Option value="Container">Container</Option>
                      <Option value="TRUK">Truk</Option>
                      <Option value="KERETA">Kereta</Option>
                      <Option value="KAPAL">Kapal Laut</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="armadaDetail"
                    noStyle
                    rules={[{ required: true, message: 'Masukkan detail armada' }]}
                  >
                    <Input placeholder="Detail armada" />
                  </Form.Item>
                </Col>
              </Row>
            </Form.Item>

            <Form.Item name="grp" label="GRP" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>

          <div className="mt-6">
            <Button
              icon={<PlusIcon size={16} />}
              onClick={() => setShowFishModal(true)}
            >
              Tambah Ikan
            </Button>

            <Row gutter={[16, 16]} className="mt-4">
              {selectedFish.map((fish, fishIdx) => (
                <Col span={24} key={fish.id}>
                  <Card title={fish.name} className="mb-4">
                    {fish.pallets.map((pallet, palletIdx) => (
                      <Row
                        gutter={8}
                        key={palletIdx}
                        align="middle"
                        className="mb-3"
                      >
                        <Col>
                          <Select
                            placeholder="Nomor Pallet"
                            style={{ width: 120 }}
                            value={pallet.palletId}
                            onChange={val =>
                              handlePalletChange(fishIdx, palletIdx, 'palletId', val)
                            }
                          >
                            {palletOptions.map(p => (
                              <Option key={p.id} value={p.id}>
                                {p.nomor}
                              </Option>
                            ))}
                          </Select>
                        </Col>
                        <Col>
                          <InputNumber
                            placeholder="Bruto"
                            style={{ width: 100 }}
                            value={pallet.bruto}
                            onChange={val =>
                              handlePalletChange(fishIdx, palletIdx, 'bruto', val)
                            }
                          />
                        </Col>
                        <Col>
                          <InputNumber
                            placeholder="Netto"
                            style={{ width: 100 }}
                            value={pallet.netto}
                            disabled
                          />
                        </Col>
                        <Col>
                          <Select
                            placeholder="Freezer"
                            style={{ width: 120 }}
                            value={pallet.freezerId}
                            onChange={val =>
                              handlePalletChange(fishIdx, palletIdx, 'freezerId', val)
                            }
                          >
                            {freezerOptions.map(fz => (
                              <Option key={fz.id} value={fz.id}>
                                {fz.nama}
                              </Option>
                            ))}
                          </Select>
                        </Col>
                        <Col>
                          <Button
                            danger
                            size="small"
                            onClick={() => handleRemovePallet(fishIdx, palletIdx)} // Call remove function
                          >
                            Hapus
                          </Button>
                        </Col>
                      </Row>
                    ))}
                    <Button
                      icon={<PlusIcon size={14} />}
                      onClick={() => handleAddPallet(fishIdx)}
                    >
                      Tambah Pallet
                    </Button>
                  </Card>
                </Col>
              ))}
            </Row>

            {summaryData.length > 0 && (
              <div className="mt-8">
                <Title level={3}>Summary</Title>
                <Table
                  columns={summaryColumns}
                  dataSource={summaryData}
                  pagination={false}
                  bordered
                />
              </div>
            )}

            <div className="mt-6 text-right">
              <Button type="primary" onClick={handleFinalSubmit}>
                Submit
              </Button>
            </div>

            <Modal
              title="Pilih Jenis Ikan"
              open={showFishModal}
              onCancel={() => setShowFishModal(false)}
              footer={null}
            >
              <Select
                placeholder="Pilih jenis ikan"
                style={{ width: '100%' }}
                onChange={handleAddFish}
              >
                {fishOptions.map(f => (
                  <Option key={f.id} value={f.id}>
                    {f.name}
                  </Option>
            ))}
          </Select>
        </Modal>
      </div>
    </div>
  </Content>
  <FooterSection />
</Layout>
);
}