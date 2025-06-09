import React, { useEffect, useState } from 'react';
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
  Table,
  Spin,
  message
} from 'antd';
import InputNumber from 'antd/lib/input-number';
import { ArrowLeftIcon, PlusIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import config from '../../config';
import axios from 'axios';

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

export default function UnloadPallet() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);

  // Master data states
  const [fishOptions, setFishOptions] = useState([]);
  const [kapalOptions, setKapalOptions] = useState([]);
  const [gudangOptions, setGudangOptions] = useState([]);
  const [freezerOptions, setFreezerOptions] = useState([]);
  const [palletOptions, setPalletOptions] = useState([]);

  // Selected fish & pallets
  const [showFishModal, setShowFishModal] = useState(false);
  const [selectedFish, setSelectedFish] = useState([]);

  // Fetch and map master data
  useEffect(() => {
    const fetchMasters = async () => {
      setLoading(true);
      try {
        const token = sessionStorage.getItem('token');
        const headers = { Authorization: token };
  
        // semua request sekaligus
        const requests = [
          axios.get(`${config.API_BASE_URL}/ikan`, { headers }),
          axios.get(`${config.API_BASE_URL}/kapal`, { headers }),
          axios.get(`${config.API_BASE_URL}/gudang`, { headers }),
          axios.get(`${config.API_BASE_URL}/freezer`, { headers }),
          axios.get(`${config.API_BASE_URL}/pallet`, { headers }),
        ];
  
        const results = await Promise.allSettled(requests);
  
        // Ikan
        if (results[0].status === 'fulfilled' && Array.isArray(results[0].value.data.data)) {
          setFishOptions(
            results[0].value.data.data.map(i => ({ id: i.id_ikan, name: i.nama_ikan }))
          );
        } else {
          setFishOptions([]); 
          console.warn('Ikan kosong atau gagal');
        }
  
        // Kapal
        if (results[1].status === 'fulfilled' && Array.isArray(results[1].value.data.data)) {
          setKapalOptions(
            results[1].value.data.data.map(k => ({ id: k.id_kapal, name: k.nama_kapal }))
          );
        } else {
          setKapalOptions([]);
          console.warn('Kapal kosong atau gagal');
        }
  
        // Gudang
        if (results[2].status === 'fulfilled' && Array.isArray(results[2].value.data.data)) {
          setGudangOptions(
            results[2].value.data.data.map(g => ({ id: g.id_gudang, name: g.nama_gudang }))
          );
        } else {
          setGudangOptions([]);
          console.warn('Gudang kosong atau gagal');
        }
  
        // Freezer
        if (results[3].status === 'fulfilled' && Array.isArray(results[3].value.data.data)) {
          setFreezerOptions(
            results[3].value.data.data.map(f => ({ id: f.id_freezer, name: f.nama_freezer }))
          );
        } else {
          setFreezerOptions([]);
          console.warn('Freezer kosong atau gagal');
        }
  
        // Pallet + lookup berat
        if (results[4].status === 'fulfilled' && Array.isArray(results[4].value.data.data)) {
          const pallets = results[4].value.data.data;
          setPalletOptions(
            pallets.map(p => ({
              id: p.id_pallet,
              name: p.kode_pallet ?? p.nomor_pallet,
              weight: p.berat_pallet,
              nomor: p.nomor_pallet,
            }))
          );
          const weights = {};
          pallets.forEach(p => { weights[p.id_pallet] = p.berat_pallet; });
          setPalletWeights(weights);
        } else {
          setPalletOptions([]);
          setPalletWeights({});
          console.warn('Pallet kosong atau gagal');
        }
  
      } catch (err) {
        console.error('Error unexpected:', err);
        // uniform warning style
        message.warning('Ada data yang kosong, mohon cek Database atau koneksi');
      } finally {
        setLoading(false);
      }
    };
  
    fetchMasters();
  }, []);
  
  

  // Add fish to list
  const handleAddFish = fishId => {
    const fish = fishOptions.find(f => f.id === fishId);
    if (fish && !selectedFish.some(f => f.id === fishId)) {
      setSelectedFish(prev => [...prev, { ...fish, pallets: [] }]);
    }
    setShowFishModal(false);
  };

  // Add empty pallet entry
  const handleAddPallet = fishIdx => {
    setSelectedFish(prev => {
      const copy = [...prev];
      copy[fishIdx].pallets.push({ palletId: '', bruto: null, netto: null, freezerId: '', full: false });
      return copy;
    });
  };

  // Update pallet and recalc netto
  const handlePalletChange = (fishIdx, palletIdx, field, value) => {
    setSelectedFish(prev => {
      const copy = [...prev];
      const entry = copy[fishIdx].pallets[palletIdx];
      entry[field] = value;

      if (['bruto', 'palletId'].includes(field)) {
        const bruto = entry.bruto;
        const selected = palletOptions.find(p => p.id === entry.palletId);
        const weight = selected ? selected.weight : 0;
        entry.netto = typeof bruto === 'number' ? bruto - weight : null;
      }

      return copy;
    });
  };

  // Prepare summary
  const summaryData = selectedFish.map(fish => {
    const totalBruto = fish.pallets.reduce((sum, p) => sum + (p.bruto || 0), 0);
    const totalNetto = fish.pallets.reduce((sum, p) => sum + (p.netto || 0), 0);
    const susut = fish.pallets.filter(p => p.full).length * 3;
    return { key: fish.id, fish: fish.name, totalBruto, susut, totalNetto };
  });

  const summaryColumns = [
    { title: 'Nama Ikan', dataIndex: 'fish', key: 'fish' },
    { title: 'Total Bruto', dataIndex: 'totalBruto', key: 'totalBruto' },
    { title: 'Susut', dataIndex: 'susut', key: 'susut' },
    { title: 'Netto Total', dataIndex: 'totalNetto', key: 'totalNetto' },
  ];

  // Submit
  // Submit to /penerimaan_barang with JSON payload
  const handleFinalSubmit = async () => {
    const values = form.getFieldsValue();
    const items = {};
    const stok_ikan = {};

    selectedFish.forEach(fish => {
      const totalNetto = fish.pallets.reduce((sum, p) => sum + (p.netto || 0), 0);
      const susut = fish.pallets.filter(p => p.full).length * 3;
      items[fish.id] = [totalNetto, susut];
      stok_ikan[fish.id] = fish.pallets.map(p => [p.palletId, p.netto, p.freezerId]);
    });

    const payload = {
      id_kapal: values.kapal,
      id_gudang: values.namaGudang,
      metode_kapal: `${values.armadaType}-${values.armadaDetail}`,
      grp: values.grp,
      tanggal_terima: values.tanggal.format('YYYY-MM-DD'),
      items,
      stok_ikan
    };

    try {
      const token = sessionStorage.getItem('token');
      await axios.post(
        `${config.API_BASE_URL}/penerimaan_barang`,
        payload,
        { headers: { Authorization: token } }
      );

      notification.success({ message: 'Sukses', description: 'Data berhasil disimpan.', placement: 'top' });
      navigate('/purchase');
    } catch (err) {
      console.error(err);
      notification.error({ message: 'Error', description: 'Gagal menyimpan data.', placement: 'top' });
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  // Tambahkan fungsi ini di bagian atas (sebelum return)
  const handleRemovePallet = (fishIdx, palletIdx) => {
    setSelectedFish(prev => {
      const copy = [...prev];
      copy[fishIdx].pallets.splice(palletIdx, 1);
      return copy;
    });
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
                {kapalOptions.map(k => <Option key={k.id} value={k.id}>{k.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="namaGudang" label="Nama Gudang" rules={[{ required: true, message: 'Pilih gudang' }]}>
              <Select placeholder="Pilih gudang">
                {gudangOptions.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item label="Armada Angkutan" required>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="armadaType" noStyle rules={[{ required: true, message: 'Pilih jenis armada' }]}>
                    <Select placeholder="Jenis armada">
                      <Option value="CONTAINER">Container</Option>
                      <Option value="COLLECTING">Collecting</Option>
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
            <Form.Item name="grp" label="GRP" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>

          <div className="mt-6">
            <Button icon={<PlusIcon size={16} />} onClick={() => setShowFishModal(true)}>Tambah Ikan</Button>
            <Row gutter={[16, 16]} className="mt-4">
              {selectedFish.map((fish, fishIdx) => (
                <Col span={24} key={fish.id}>
                  <Card title={fish.name} className="mb-4">
                    {fish.pallets.map((pallet, palletIdx) => (
                      <Row gutter={8} align="middle" className="mb-3" key={palletIdx}>
                        <Col>
                        <Select
                          showSearch
                          placeholder="Nomor Pallet"
                          style={{ width: 120 }}
                          value={pallet.palletId}
                          onChange={val =>
                            handlePalletChange(fishIdx, palletIdx, 'palletId', val)
                          }
                          filterOption={(input, option) =>
                            option?.children?.toLowerCase().includes(input.toLowerCase())
                          }
                        >
                          {palletOptions
                            .filter(p => p.id != null && p.nomor) // hindari duplikat/null
                            .map(p => (
                              <Select.Option key={p.id} value={p.id}>
                                {p.nomor}
                              </Select.Option>
                            ))}
                        </Select>
                        </Col>
                        <Col>
                          <InputNumber
                            placeholder="Bruto"
                            style={{ width: 100 }}
                            value={pallet.bruto}
                            onChange={val => handlePalletChange(fishIdx, palletIdx, 'bruto', val)}
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
                            onChange={val => handlePalletChange(fishIdx, palletIdx, 'freezerId', val)}
                          >
                            {freezerOptions.map(f => <Option key={f.id} value={f.id}>{f.name}</Option>)}
                          </Select>
                        </Col>
                        <Col>
                          <Checkbox
                            checked={pallet.full}
                            onChange={e => handlePalletChange(fishIdx, palletIdx, 'full', e.target.checked)}
                          >
                            Full
                          </Checkbox>
                        </Col>
                        <Col>
                          <Button danger onClick={() => handleRemovePallet(fishIdx, palletIdx)}>
                            Hapus
                          </Button>
                        </Col>
                      </Row>

                    ))}
                    <Button icon={<PlusIcon size={14} />} onClick={() => handleAddPallet(fishIdx)}>Tambah Pallet</Button>
                  </Card>
                </Col>
              ))}
            </Row>

            {summaryData.length > 0 && (
              <div className="mt-8">
                <Title level={3}>Summary</Title>
                <Table columns={summaryColumns} dataSource={summaryData} pagination={false} bordered />
              </div>
            )}

            <div className="mt-6 text-right">
              <Button type="primary" onClick={handleFinalSubmit}>Submit</Button>
            </div>

            <Modal title="Pilih Ikan" visible={showFishModal} onCancel={() => setShowFishModal(false)} footer={null}>
            <Select
              showSearch
              placeholder="Pilih ikan"
              style={{ width: '100%' }}
              onChange={handleAddFish}
              filterOption={(input, option) =>
                option?.children?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {fishOptions
                .filter(f => !selectedFish.some(sf => sf.id === f.id))
                .map(f => (
                  <Option key={f.id} value={f.id}>
                    {f.name}
                  </Option>
                ))}
            </Select>
            </Modal>
          </div>
        </div>
      </Content>
    </Layout>
  );
}
