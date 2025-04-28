import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Form, Input, Button, Typography, Divider, notification } from 'antd';
import { LockIcon, MailIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const success = await login(values.email, values.password);
      if (success) {
        notification.success({
          message: 'Login Successful',
          description: 'Welcome back! You have successfully logged in.',
          placement: 'top',
        });
        navigate('/dashboard');
      } else {
        notification.error({
          message: 'Login Failed',
          description: 'Invalid email or password. Please try again.',
          placement: 'top',
        });
      }
    } catch (error) {
      notification.error({
        message: 'Login Error',
        description: 'Something went wrong. Please try again later.',
        placement: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
        <Col xs={22} sm={20} md={16} lg={14} xl={12}>
          <Card className="login-card" bordered={false}>
            <Row>
              <Col xs={24} md={12}>
                <div className="p-8 sm:p-10">
                  <div className="mb-8">
                    <Title level={2} className="mb-2">Welcome back</Title>
                    <Text type="secondary">Please enter your details to sign in</Text>
                  </div>

                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    requiredMark={false}
                    size="large"
                  >
                    <Form.Item
                      name="email"
                      label="Email"
                      rules={[
                        { required: true, message: 'Please enter your email' },
                        { type: 'email', message: 'Please enter a valid email' }
                      ]}
                    >
                      <Input 
                        prefix={<MailIcon size={18} className="text-gray-400 mr-2" />} 
                        placeholder="name@company.com" 
                      />
                    </Form.Item>

                    <Form.Item
                      name="password"
                      label="Password"
                      rules={[
                        { required: true, message: 'Please enter your password' },
                        { min: 6, message: 'Password must be at least 6 characters' }
                      ]}
                    >
                      <Input.Password
                        prefix={<LockIcon size={18} className="text-gray-400 mr-2" />}
                        placeholder="Enter your password"
                        iconRender={(visible) => 
                          visible ? 
                            <EyeIcon size={18} className="text-gray-400" /> : 
                            <EyeOffIcon size={18} className="text-gray-400" />
                        }
                      />
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        className="login-form-button"
                        loading={loading}
                      >
                        Sign in
                      </Button>
                    </Form.Item>
                  </Form>

                  <Divider>
                    <Text type="secondary">Demo Account</Text>
                  </Divider>
                    
                  <Button 
                    block 
                    className="mb-4"
                    onClick={() => {
                      form.setFieldsValue({
                        email: 'demo@example.com',
                        password: 'password123'
                      });
                    }}
                  >
                    Use Demo Credentials
                  </Button>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div className="login-card-cover">
                  <div className="text-center">
                    <Title level={3} style={{ color: 'white', marginBottom: '1rem' }}>
                      Your Business Dashboard
                    </Title>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '16px' }}>
                      Access all your business analytics and data from one centralized platform
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Login;