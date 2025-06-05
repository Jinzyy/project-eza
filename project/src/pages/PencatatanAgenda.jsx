import React, { useState, useEffect } from 'react';
import {
    Layout, Typography, Form, Radio, DatePicker, Input,
    Select, Button, Space, Modal, Table, Steps, message, Tag
} from 'antd';
import Header from '../components/Header';
import axios from 'axios';
import config from '../config';
import dayjs from 'dayjs';

const { Content } = Layout;
const { Title } = Typography;
const { Step } = Steps;

export default function PencatatanAgenda() {
    const [form] = Form.useForm();
    const [jenis, setJenis] = useState('penjualan');
    const [customers, setCustomers] = useState([]);
    const [loadingCust, setLoadingCust] = useState(false);

    // ––––– LoV data & pagination –––––
    const [lovData, setLovData] = useState({
        sales: [], delivery: [], invoice: [], penerimaan: [], nota: []
    });
    const [lovPag, setLovPag] = useState({
        sales: { page: 1, limit: 5, total: 0 },
        delivery: { page: 1, limit: 5, total: 0 },
        invoice: { page: 1, limit: 5, total: 0 },
        penerimaan: { page: 1, limit: 5, total: 0 },
        nota: { page: 1, limit: 5, total: 0 },
    });

    // ––––– modal visibility –––––
    const [modalVisible, setModalVisible] = useState({
        sales: false, delivery: false, invoice: false,
        penerimaan: false, nota: false
    });

    const [filterJenis, setFilterJenis] = useState(null);

    // ––––– status steps –––––
    const statusSteps = ['Dibuat', 'Dalam Perjalanan', 'Bongkar Muatan', 'Barang Sampai'];
    const [statusIndex, setStatusIndex] = useState(0);

    // ––––– saved agendas –––––
    const [agendas, setAgendas] = useState([]);
    const token = sessionStorage.getItem('token');

    // ––––– edit mode –––––
    const [editId, setEditId] = useState(null);

    // ===================== 1. FETCH FUNCTIONS =====================
    const fetchCustomers = async () => {
        setLoadingCust(true);
        try {
        const { data } = await axios.get(`${config.API_BASE_URL}/customer`, {
            headers: { Authorization: token }
        });
        if (data.status) setCustomers(data.data);
        } catch (e) {
        console.error(e);
        }
        setLoadingCust(false);
    };

    const fetchAgendas = async () => {
        try {
        const { data } = await axios.get(`${config.API_BASE_URL}/live_tracking`, {
            headers: { Authorization: token }
        });
        if (data.status) setAgendas(data.data);
        } catch (e) {
        console.error(e);
        }
    };

    // General fetch untuk semua tipe LOV:
    const fetchLov = async (type) => {
        const params = { page: lovPag[type].page, limit: lovPag[type].limit };
        if (type === 'invoice' || type === 'nota') {
        params.cancelled = 0;
        } else if (type === 'penerimaan') {
        params['pb.is_delete'] = 0;
        } else {
        params.is_delete = 0;
        }
        const urlMap = {
        sales: 'sales_order',
        delivery: 'delivery_order',
        invoice: 'invoice',
        penerimaan: 'penerimaan_barang',
        nota: 'nota_pembelian'
        };
        try {
        const { data } = await axios.get(
            `${config.API_BASE_URL}/${urlMap[type]}`,
            { headers: { Authorization: token }, params }
        );
        if (data.status) {
            setLovData(prev => ({ ...prev, [type]: data.data }));
            setLovPag(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                total: data.pagination?.total_items || 0
            }
            }));
        }
        } catch (e) {
        console.error(e);
        }
    };

    // ===================== 2. INITIAL USE‐EFFECT =====================
    // ⚠️ Di sini kita harus memanggil fetchLov untuk setiap tipe LOV
    useEffect(() => {
        fetchCustomers();
        fetchAgendas();

        // Pastikan LOV ter‐load sejak awal
        fetchLov('sales');
        fetchLov('delivery');
        fetchLov('invoice');
        fetchLov('penerimaan');
        fetchLov('nota');
    }, [token]);


    // ===================== 3. useEffect TERPUSAT untuk MODE UPDATE =====================
    useEffect(() => {
        if (editId === null) return;

        // Cari record yang mau di‐edit
        const record = agendas.find(a => a.id_live_tracking === editId);
        if (!record) return;

        const { sales, delivery, invoice, penerimaan, nota } = lovData;

        // Tunggu sampai LOV selesai di‐fetch jika record memerlukan tipe tertentu
        if (
        (record.id_sales_order && sales.length === 0) ||
        (record.id_delivery_order && delivery.length === 0) ||
        (record.id_invoice && invoice.length === 0) ||
        (record.id_penerimaan_barang && penerimaan.length === 0) ||
        (record.id_nota_pembelian && nota.length === 0)
        ) {
        return;
        }

        // Lookup "nomor_..." dari masing‐masing array LOV
        const nomor_sales_order =
        sales.find(item => item.id_sales_order === record.id_sales_order)?.nomor_so || '';
        const nomor_delivery_order =
        delivery.find(item => item.id_delivery_order === record.id_delivery_order)?.nomor_do || '';
        const nomor_invoice =
        invoice.find(item => item.id_invoice === record.id_invoice)?.nomor_invoice || '';
        const nomor_penerimaan_barang =
        penerimaan.find(item => item.id_penerimaan_barang === record.id_penerimaan_barang)
            ?.nomor_penerimaan_barang || '';
        const nomor_nota_pembelian =
        nota.find(item => item.id_nota_pembelian === record.id_nota_pembelian)?.nomor_nota || '';

        // Isi semua field form sekaligus
        form.setFieldsValue({
        jenis: record.jenis,
        waktu: record.waktu ? dayjs(record.waktu) : null,
        nomor_kendaraan: record.nomor_kendaraan,
        nama_sopir: record.nama_sopir,
        id_customer: record.id_customer,
        catatan: record.catatan,

        // ID dokumen:
        id_sales_order: record.id_sales_order,
        id_delivery_order: record.id_delivery_order,
        id_invoice: record.id_invoice,
        id_penerimaan_barang: record.id_penerimaan_barang,
        id_nota_pembelian: record.id_nota_pembelian,

        // Nomor dokumen (hasil lookup di atas):
        nomor_sales_order,
        nomor_delivery_order,
        nomor_invoice,
        nomor_penerimaan_barang,
        nomor_nota_pembelian,

        // Supaya kalau user submit ulang, status ter‐ikut
        status: record.status
        });

        setStatusIndex(statusSteps.indexOf(record.status));
    }, [
        editId,
        agendas,
        lovData.sales,
        lovData.delivery,
        lovData.invoice,
        lovData.penerimaan,
        lovData.nota,
        customers,
        form
    ]);


    // ===================== 4. FUNGSI–FUNGSI LAIN =====================
    const handleJenisChange = e => {
        setJenis(e.target.value);
        form.resetFields([
        'id_sales_order', 'nomor_sales_order',
        'id_delivery_order', 'nomor_delivery_order',
        'id_invoice', 'nomor_invoice',
        'id_penerimaan_barang', 'nomor_penerimaan_barang',
        'id_nota_pembelian', 'nomor_nota_pembelian'
        ]);
        setStatusIndex(0);
    };

    const openModal = (type) => {
        setModalVisible(prev => ({ ...prev, [type]: true }));
        fetchLov(type);
    };
    const closeModal = (type) => {
        setModalVisible(prev => ({ ...prev, [type]: false }));
    };

    const selectLov = (type, record) => {
        const idFields = {
        sales: 'id_sales_order',
        delivery: 'id_delivery_order',
        invoice: 'id_invoice',
        penerimaan: 'id_penerimaan_barang',
        nota: 'id_nota_pembelian'
        };
        const nomorFields = {
        sales: 'nomor_so',
        delivery: 'nomor_do',
        invoice: 'nomor_invoice',
        penerimaan: 'nomor_penerimaan_barang',
        nota: 'nomor_nota'
        };
        const formNomorKeys = {
        sales: 'nomor_sales_order',
        delivery: 'nomor_delivery_order',
        invoice: 'nomor_invoice',
        penerimaan: 'nomor_penerimaan_barang',
        nota: 'nomor_nota_pembelian'
        };
        const idKey = idFields[type];
        const nomorKey = formNomorKeys[type];
        const nomorValue = record[nomorFields[type]];

        form.setFieldsValue({
        [idKey]: record[idKey],
        [nomorKey]: nomorValue
        });
        closeModal(type);
    };

    const onLovTableChange = (type, pagination) => {
        setLovPag(prev => ({
        ...prev,
        [type]: {
            ...prev[type],
            page: pagination.current,
            limit: pagination.pageSize
        }
        }));
    };

    // ===================== 5. SUBMIT (POST/PUT) =====================
    const handleSubmit = async (values) => {
        const payload = {
        jenis: values.jenis,
        waktu: values.waktu.format(),
        nomor_kendaraan: values.nomor_kendaraan,
        nama_sopir: values.nama_sopir,
        id_customer: values.id_customer,
        catatan: values.catatan,
        id_sales_order: values.id_sales_order,
        id_delivery_order: values.id_delivery_order,
        id_invoice: values.id_invoice,
        id_penerimaan_barang: values.id_penerimaan_barang,
        id_nota_pembelian: values.id_nota_pembelian,
        status: statusSteps[statusIndex],
        };
        try {
        if (editId) {
            await axios.put(
            `${config.API_BASE_URL}/live_tracking/${editId}`,
            payload,
            { headers: { Authorization: token } }
            );
            message.success('Agenda berhasil diperbarui');
        } else {
            await axios.post(
            `${config.API_BASE_URL}/live_tracking`,
            payload,
            { headers: { Authorization: token } }
            );
            message.success('Agenda berhasil disimpan');
        }
        fetchAgendas();
        setEditId(null);
        setStatusIndex(0);
        form.resetFields();
        } catch (e) {
        message.error(editId ? 'Gagal memperbarui' : 'Gagal menyimpan');
        }
    };

    // ===================== 6. HANDLE UPDATE BUTTON & DELETE di TABEL =====================
    const handleUpdate = (record) => {
        setEditId(record.id_live_tracking);
        setJenis(record.jenis);
        setStatusIndex(statusSteps.indexOf(record.status));
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Isi field utama (kecuali nomor dokumen—nanti di‐fill oleh useEffect di atas)
        form.setFieldsValue({
        jenis: record.jenis,
        waktu: record.waktu ? dayjs(record.waktu) : null,
        nomor_kendaraan: record.nomor_kendaraan,
        nama_sopir: record.nama_sopir,
        id_customer: record.id_customer,
        catatan: record.catatan,
        id_sales_order: record.id_sales_order,
        id_delivery_order: record.id_delivery_order,
        id_invoice: record.id_invoice,
        id_penerimaan_barang: record.id_penerimaan_barang,
        id_nota_pembelian: record.id_nota_pembelian,
        });
    };

    const handleDelete = (id) => {
        Modal.confirm({
        title: 'Konfirmasi Hapus',
        content: 'Apakah Anda yakin ingin menghapus agenda ini?',
        okText: 'Ya, Hapus',
        cancelText: 'Batal',
        onOk: async () => {
            try {
            await axios.delete(`${config.API_BASE_URL}/live_tracking/${id}`, {
                headers: { Authorization: token }
            });
            message.success('Agenda berhasil dihapus');
            fetchAgendas(); // refresh daftar setelah delete
            } catch (e) {
            console.error(e);
            message.error('Gagal menghapus agenda');
            }
        }
        });
    };
    

    // ===================== 7. TABEL AGENDAS + FILTER =====================
    const enrichedData = agendas
        .filter(item => !filterJenis || item.jenis === filterJenis)
        .map((item, idx) => ({
        key: item.id_live_tracking,
        no: idx + 1,
        ...item,
        nama_customer: customers.find(c => c.id_customer === item.id_customer)?.nama_customer || '-',
        }));

    const columns = [
        { title: 'No', dataIndex: 'no', width: 60 },
        { title: 'Waktu', dataIndex: 'waktu' },
        {
            title: 'Jenis',
            dataIndex: 'jenis',
            filters: [
            { text: 'Penjualan', value: 'penjualan' },
            { text: 'Pembelian', value: 'pembelian' }
            ],
            onFilter: (value, record) => record.jenis === value,
            render: j => <Tag color={j === 'penjualan' ? 'blue' : 'green'}>{j}</Tag>
        },
        { title: 'Customer', dataIndex: 'nama_customer' },
        { title: 'Nomor Kendaraan', dataIndex: 'nomor_kendaraan' },
        { title: 'Nama Sopir', dataIndex: 'nama_sopir' },
        { title: 'Status', dataIndex: 'status' },
        {
            title: 'Aksi',
            dataIndex: 'aksi',
            render: (_, record) => (
            <Space size="small">
                {/* Tombol Update */}
                <Button color="primary" variant='solid' onClick={() => handleUpdate(record)}>
                Update
                </Button>
                {/* Tombol Delete */}
                <Button
                color="danger"
                danger
                onClick={() => handleDelete(record.id_live_tracking)}
                >
                Delete
                </Button>
            </Space>
            )
        }
        ];

    // ===================== 8. RENDER UI =====================
    return (
        <Layout>
        <Header/>
        <Content style={{ padding: 24 }}>
            <div className="container mx-auto px-6 py-12">
            <Title level={1}>Pencatatan Agenda</Title>
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{ jenis: 'penjualan' }}
            >
                <Form.Item name="jenis" label="Jenis">
                <Radio.Group onChange={handleJenisChange}>
                    <Radio value="penjualan">Penjualan</Radio>
                    <Radio value="pembelian">Pembelian</Radio>
                </Radio.Group>
                </Form.Item>
                <Form.Item name="waktu" label="Waktu">
                <DatePicker showTime style={{ width: '100%' }}/>
                </Form.Item>
                <Form.Item name="nomor_kendaraan" label="Nomor Kendaraan">
                <Input/>
                </Form.Item>
                <Form.Item name="nama_sopir" label="Nama Sopir">
                <Input/>
                </Form.Item>
                <Form.Item name="id_customer" label="Customer">
                <Select
                    showSearch
                    optionFilterProp="children"
                    loading={loadingCust}
                    placeholder="Pilih Customer"
                    filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                >
                    {customers.map(c => (
                    <Select.Option key={c.id_customer} value={c.id_customer}>
                        {c.nama_customer}
                    </Select.Option>
                    ))}
                </Select>
                </Form.Item>
                <Form.Item name="catatan" label="Catatan">
                <Input.TextArea rows={3}/>
                </Form.Item>

                {/* LoV Buttons */}
                {jenis === 'penjualan' && (
                <Space wrap style={{ marginBottom: 16 }}>
                    <Button onClick={() => openModal('sales')}>Pilih Sales Order</Button>
                    <Button onClick={() => openModal('delivery')}>Pilih Delivery Order</Button>
                    <Button onClick={() => openModal('invoice')}>Pilih Invoice</Button>
                </Space>
                )}
                {jenis === 'pembelian' && (
                <Space wrap style={{ marginBottom: 16 }}>
                    <Button onClick={() => openModal('penerimaan')}>Pilih Penerimaan</Button>
                    <Button onClick={() => openModal('nota')}>Pilih Nota Pembelian</Button>
                </Space>
                )}

                {/* Hidden ID fields & Visible Nomor fields */}
                {jenis === 'penjualan' && (
                <>
                    <Form.Item name="id_sales_order" hidden><Input/></Form.Item>
                    <Form.Item name="nomor_sales_order" label="Sales Order">
                    <Input readOnly placeholder="Belum dipilih"/>
                    </Form.Item>

                    <Form.Item name="id_delivery_order" hidden><Input/></Form.Item>
                    <Form.Item name="nomor_delivery_order" label="Delivery Order">
                    <Input readOnly placeholder="Belum dipilih"/>
                    </Form.Item>

                    <Form.Item name="id_invoice" hidden><Input/></Form.Item>
                    <Form.Item name="nomor_invoice" label="Invoice">
                    <Input readOnly placeholder="Belum dipilih"/>
                    </Form.Item>
                </>
                )}
                {jenis === 'pembelian' && (
                <>
                    <Form.Item name="id_penerimaan_barang" hidden><Input/></Form.Item>
                    <Form.Item name="nomor_penerimaan_barang" label="Penerimaan Barang">
                    <Input readOnly placeholder="Belum dipilih"/>
                    </Form.Item>

                    <Form.Item name="id_nota_pembelian" hidden><Input/></Form.Item>
                    <Form.Item name="nomor_nota_pembelian" label="Nota Pembelian">
                    <Input readOnly placeholder="Belum dipilih"/>
                    </Form.Item>
                </>
                )}

                {/* Status Timeline */}
                <Form.Item label="Status">
                <Steps
                    current={statusIndex}
                    onChange={idx => setStatusIndex(idx)}
                    size="small"
                    style={{ margin: '16px 0' }}
                >
                    {statusSteps.map(step => (
                    <Step key={step} title={step}/>
                    ))}
                </Steps>
                </Form.Item>

                <Form.Item>
                <Space>
                    {editId
                    ? <Button type="primary" htmlType="submit">Update</Button>
                    : <Button type="primary" htmlType="submit">Simpan</Button>
                    }
                    <Button
                    htmlType="reset"
                    onClick={() => {
                        form.resetFields();
                        setEditId(null);
                        setStatusIndex(0);
                    }}
                    >
                    Reset
                    </Button>
                </Space>
                </Form.Item>
            </Form>

            {/* Table of Recorded Agendas */}
            <Space style={{ margin: '16px 0' }}>
                <Select
                placeholder="Filter Jenis"
                allowClear
                onChange={value => setFilterJenis(value)}
                style={{ width: 200 }}
                >
                <Select.Option value="penjualan">Penjualan</Select.Option>
                <Select.Option value="pembelian">Pembelian</Select.Option>
                </Select>
            </Space>
            <Table
                dataSource={enrichedData}
                columns={columns}
                pagination={{
                showSizeChanger: true,
                pageSizeOptions: ['5','10','25','50','100'],
                showTotal: total => `Total ${total} items`
                }}
            />

            {/* Modals untuk memilih LoV */}
            {['sales','delivery','invoice','penerimaan','nota'].map(type => (
                <Modal
                key={type}
                title={`Pilih ${type}`}
                open={modalVisible[type]}
                onCancel={() => closeModal(type)}
                footer={null}
                width={800}
                >
                <Table
                    rowKey={record => record[`id_${type === 'sales' ? 'sales_order' : type}`]}
                    dataSource={lovData[type]}
                    pagination={{
                    current: lovPag[type].page,
                    pageSize: lovPag[type].limit,
                    total: lovPag[type].total,
                    showSizeChanger: true,
                    }}
                    onChange={pagination => onLovTableChange(type, pagination)}
                    onRow={record => ({ onClick: () => selectLov(type, record) })}
                    columns={[
                    {
                        title: 'Nomor',
                        dataIndex:
                        type === 'sales' ? 'nomor_so' :
                        type === 'delivery' ? 'nomor_do' :
                        type === 'invoice' ? 'nomor_invoice' :
                        type === 'penerimaan' ? 'nomor_penerimaan_barang' :
                        'nomor_nota'
                    },
                    {
                        title: (type === 'penerimaan' || type === 'nota') ? 'Employee' : 'Customer',
                        dataIndex:
                        (type === 'penerimaan' || type === 'nota') ? 'employee_name' : 'nama_customer'
                    }
                    ]}
                />
                </Modal>
            ))}
            </div>
        </Content>
        </Layout>
    );
}
