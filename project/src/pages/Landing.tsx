import React from 'react';
import { Layout, Typography, Row, Col, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ShoppingCartIcon, StoreIcon, CalendarIcon } from 'lucide-react'; // CalendarIcon untuk agenda
import Header from '../components/Header';

const { Content } = Layout;
const { Title } = Typography;

const Landing = () => {
  const navigate = useNavigate();

  return (
    <Layout className="min-h-screen">
      <Header />
      <Content>
        <div className="container mx-auto px-6 py-12">
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card
                hoverable
                className="h-64 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg"
                onClick={() => navigate('/purchase')}
              >
                <ShoppingCartIcon size={48} className="text-blue-500 mb-4" />
                <Title level={2}>Pembelian</Title>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card
                hoverable
                className="h-64 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg"
                onClick={() => navigate('/sales')}
              >
                <StoreIcon size={48} className="text-green-500 mb-4" />
                <Title level={2}>Penjualan</Title>
              </Card>
            </Col>
          </Row>

          {/* Button Pencatatan Agenda di tengah */}
          <Row justify="center" style={{ marginTop: 24 }}>
            <Col xs={24} md={12}>
              <Card
                hoverable
                className="h-64 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg"
                onClick={() => navigate('/agenda')}
              >
                <CalendarIcon size={48} className="text-purple-500 mb-4" />
                <Title level={2}>Pencatatan Agenda</Title>
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
};

export default Landing;
