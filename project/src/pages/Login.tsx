import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Form, Input, Button, Typography, Divider, notification } from 'antd';
import { FishIcon, LockIcon, MailIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import config from '../config.jsx';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // Cek token di sessionStorage, jika ada langsung ke dashboard
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
      });

      if (!response.ok) {
        notification.error({
          message: 'Login Gagal',
          description: 'Username atau kata sandi salah. Silakan coba lagi.',
          placement: 'top',
        });
        return;
      }

      const data = await response.json();
      // Bisa coba cek di data.token atau data.accessToken sesuai response
      const token = data.token || data.accessToken;
      if (token) {
        sessionStorage.setItem('token', token);
        notification.success({
          message: 'Login Berhasil',
          description: 'Selamat datang! Anda berhasil masuk.',
          placement: 'top',
        });
        navigate('/dashboard');
        window.location.reload();
      } else {
        notification.error({
          message: 'Login Gagal',
          description: 'Tidak ada token diterima.',
          placement: 'top',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      notification.error({
        message: 'Error',
        description: 'Terjadi kesalahan, silakan coba lagi nanti.',
        placement: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-teal-500">
      <Row className="w-full max-w-4xl mx-4 shadow-2xl rounded-2xl overflow-hidden">
        {/* Sidebar ilustrasi */}
        <Col xs={0} lg={10} className="hidden lg:flex flex-col items-center justify-center p-10 bg-blue-700">
          <FishIcon size={80} className="text-white mb-4" />
          <Title level={2} className="text-white mb-2">PT. Fortun Maritim Indonesia</Title>
        </Col>

        {/* Form login */}
        <Col xs={24} lg={14} className="bg-white p-8 sm:p-10">
          <Title level={3} className="mb-6 text-blue-700 text-center">
            Masuk ke Akun Anda
          </Title>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            requiredMark={false}
            size="large"
          >
            <Form.Item
              name="username"
              label="Username"
              rules={[
                { required: true, message: 'Harap masukkan username Anda' },
              ]}
            >
              <Input
                prefix={<MailIcon size={18} className="text-blue-400 mr-2" />}
                className="rounded-lg"
                placeholder="Username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Kata Sandi"
              rules={[
                { required: true, message: 'Harap masukkan kata sandi Anda' },
                { message: 'Minimal 6 karakter' },
              ]}
            >
              <Input.Password
                prefix={<LockIcon size={18} className="text-blue-400 mr-2" />}
                className="rounded-lg"
                placeholder="Masukkan kata sandi"
                iconRender={(visible) =>
                  visible ? <EyeIcon size={18} className="text-blue-400" /> : <EyeOffIcon size={18} className="text-blue-400" />
                }
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700"
                loading={loading}
              >
                Masuk
              </Button>
            </Form.Item>
          </Form>
        </Col>
      </Row>
    </div>
  );
};

export default Login;
