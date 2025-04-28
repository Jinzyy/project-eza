import React from 'react';
import { Layout, Typography, Button } from 'antd';
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import FooterSection from '../../components/FooterSection';

const { Content } = Layout;
const { Title } = Typography;

function UnloadPallet() {
  const navigate = useNavigate();

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
          <Title level={2}>Bongkar Pallet</Title>
        </div>
      </Content>
      <FooterSection />
    </Layout>
  );
}

export default UnloadPallet;