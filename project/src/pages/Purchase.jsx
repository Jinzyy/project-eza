import React from 'react';
import { Layout, Typography, Row, Col, Card } from 'antd';
import { 
  PackageIcon,
  BoxIcon,
  ClipboardIcon,
  FileTextIcon,
  ReceiptIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FooterSection from '../components/FooterSection';

const { Content } = Layout;
const { Title } = Typography;

function Purchase() {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Bongkar Pallet',
      icon: <PackageIcon size={32} className="text-blue-500 mb-3" />,
      path: '/purchase/unload-pallet'
    },
    {
      title: 'Bongkar Blong',
      icon: <BoxIcon size={32} className="text-orange-500 mb-3" />,
      path: '/purchase/unload-blong'
    },
    {
      title: 'Buat Pencatatan Stok',
      icon: <ClipboardIcon size={32} className="text-green-500 mb-3" />,
      path: '/purchase/stock-record'
    },
    {
      title: 'Buat Dokumen Penerimaan Barang',
      icon: <FileTextIcon size={32} className="text-purple-500 mb-3" />,
      path: '/purchase/goods-receipt'
    },
    {
      title: 'Buat Nota Pembelian',
      icon: <ReceiptIcon size={32} className="text-red-500 mb-3" />,
      path: '/purchase/purchase-note'
    }
  ];

  return (
    <Layout className="min-h-screen">
      <Header />
      
      <Content>
        <div className="container mx-auto px-6 py-12">
          <Title level={2} className="mb-8">Menu Pembelian</Title>
          <Row gutter={[24, 24]}>
            {menuItems.map((item, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <Card 
                  hoverable 
                  className="h-48 flex items-center justify-center cursor-pointer transition-all hover:shadow-lg"
                  onClick={() => navigate(item.path)}
                >
                  <div className="text-center">
                    {item.icon}
                    <Title level={4}>{item.title}</Title>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Content>
      
      <FooterSection />
    </Layout>
  );
}

export default Purchase;