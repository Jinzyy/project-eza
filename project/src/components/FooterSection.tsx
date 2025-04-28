import React from 'react';
import { Layout, Row, Col, Typography, Space, Divider } from 'antd';
import { GithubIcon, TwitterIcon, LinkedinIcon, MailIcon } from 'lucide-react';

const { Footer } = Layout;
const { Title, Paragraph, Link, Text } = Typography;

const FooterSection: React.FC = () => {
  return (
    <Footer className="bg-gray-50 pt-12 pb-6">
      <div className="container mx-auto px-4">
        <Row gutter={[48, 32]}>
          <Col xs={24} sm={24} md={8} lg={8}>
            <div className="mb-6">
              <Title level={4} className="mb-4">BusinessDashboard</Title>
              <Paragraph className="text-gray-500">
                Streamline your business operations with our comprehensive dashboard solution.
                Monitor performance, analyze data, and make informed decisions.
              </Paragraph>
            </div>
            <Space size="middle">
              <Link href="#" className="text-gray-500 hover:text-primary">
                <GithubIcon size={20} />
              </Link>
              <Link href="#" className="text-gray-500 hover:text-primary">
                <TwitterIcon size={20} />
              </Link>
              <Link href="#" className="text-gray-500 hover:text-primary">
                <LinkedinIcon size={20} />
              </Link>
            </Space>
          </Col>
          
          <Col xs={24} sm={12} md={5} lg={5}>
            <Title level={5} className="mb-4">Product</Title>
            <ul className="space-y-2 p-0 list-none">
              <li><Link href="#" className="text-gray-500 hover:text-primary">Overview</Link></li>
              <li><Link href="#" className="text-gray-500 hover:text-primary">Features</Link></li>
              <li><Link href="#" className="text-gray-500 hover:text-primary">Solutions</Link></li>
              <li><Link href="#" className="text-gray-500 hover:text-primary">Tutorials</Link></li>
              <li><Link href="#" className="text-gray-500 hover:text-primary">Pricing</Link></li>
            </ul>
          </Col>
          
          <Col xs={24} sm={12} md={5} lg={5}>
            <Title level={5} className="mb-4">Company</Title>
            <ul className="space-y-2 p-0 list-none">
              <li><Link href="#" className="text-gray-500 hover:text-primary">About us</Link></li>
              <li><Link href="#" className="text-gray-500 hover:text-primary">Careers</Link></li>
              <li><Link href="#" className="text-gray-500 hover:text-primary">Press</Link></li>
              <li><Link href="#" className="text-gray-500 hover:text-primary">News</Link></li>
              <li><Link href="#" className="text-gray-500 hover:text-primary">Contact</Link></li>
            </ul>
          </Col>
          
          <Col xs={24} sm={24} md={6} lg={6}>
            <Title level={5} className="mb-4">Stay up to date</Title>
            <Paragraph className="text-gray-500 mb-4">
              Subscribe to our newsletter for the latest updates
            </Paragraph>
            <div className="flex mb-4">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="px-4 py-2 border border-gray-300 rounded-l-md flex-1 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 transition-colors">
                Subscribe
              </button>
            </div>
          </Col>
        </Row>
        
        <Divider className="my-6" />
        
        <div className="flex flex-col md:flex-row justify-between items-center">
          <Text className="text-gray-500">
            © 2025 BusinessDashboard. All rights reserved.
          </Text>
          <div className="mt-4 md:mt-0">
            <Space split={<Divider type="vertical" />}>
              <Link href="#" className="text-gray-500 hover:text-primary">Terms</Link>
              <Link href="#" className="text-gray-500 hover:text-primary">Privacy</Link>
              <Link href="#" className="text-gray-500 hover:text-primary">Cookies</Link>
            </Space>
          </div>
        </div>
      </div>
    </Footer>
  );
};

export default FooterSection;