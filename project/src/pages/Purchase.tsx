import React from 'react';
import { Layout, Typography, Row, Col, Card } from 'antd';
import { 
  PackageIcon,
  BoxIcon,
  ClipboardIcon,
  FileTextIcon,
  ReceiptIcon
} from 'lucide-react';
import Header from '../components/Header';
import FooterSection from '../components/FooterSection';

const { Content } = Layout;
const { Title } = Typography;

const Purchase: React.FC = () => {
  return (
    <Layout className="min-h-screen">
      <Header />
      
      <Content>
        <div className="container mx-auto px-6 py-12">
          <Title level={2} className="mb-8">Menu Pembelian</Title>
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={12} lg={8}>
              <Card 
                hoverable 
                className="h-48 flex items-center justify-center cursor-pointer transition-all hover:shadow-lg"
                onClick={() => console.log('Bongkar Pallet clicked')}
              >
                <div className="text-center">
                  <PackageIcon size={32} className="text-blue-500 mb-3" />
                  <Title level={4}>Bongkar Pallet</Title>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card 
                hoverable 
                className="h-48 flex items-center justify-center cursor-pointer transition-all hover:shadow-lg"
                onClick={() => console.log('Bongkar Blong clicked')}
              >
                <div className="text-center">
                  <BoxIcon size={32} className="text-orange-500 mb-3" />
                  <Title level={4}>Bongkar Blong</Title>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card 
                hoverable 
                className="h-48 flex items-center justify-center cursor-pointer transition-all hover:shadow-lg"
                onClick={() => console.log('Buat Pencatatan Stok clicked')}
              >
                <div className="text-center">
                  <ClipboardIcon size={32} className="text-green-500 mb-3" />
                  <Title level={4}>Buat Pencatatan Stok</Title>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card 
                hoverable 
                className="h-48 flex items-center justify-center cursor-pointer transition-all hover:shadow-lg"
                onClick={() => console.log('Buat Dokumen Penerimaan Barang clicked')}
              >
                <div className="text-center">
                  <FileTextIcon size={32} className="text-purple-500 mb-3" />
                  <Title level={4}>Buat Dokumen Penerimaan Barang</Title>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card 
                hoverable 
                className="h-48 flex items-center justify-center cursor-pointer transition-all hover:shadow-lg"
                onClick={() => console.log('Buat Nota Pembelian clicked')}
              >
                <div className="text-center">
                  <ReceiptIcon size={32} className="text-red-500 mb-3" />
                  <Title level={4}>Buat Nota Pembelian</Title>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
      
      <FooterSection />
    </Layout>
  );
};

export default Purchase;