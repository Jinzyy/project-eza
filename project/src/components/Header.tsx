import React, { useState, useEffect } from 'react';
import { Layout, Menu, Dropdown, Avatar, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon, LogOutIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const { Header: AntHeader } = Layout;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogOutIcon size={16} />,
      label: 'Sign out',
      onClick: () => {
        sessionStorage.removeItem('token');
        window.location.reload();
      },
    },
  ];

  return (
    <AntHeader className={`landing-header px-4 py-0 flex items-center justify-between ${scrolled ? 'scrolled' : ''}`}>
      <div className="flex items-center">
        {/* Logo navigasi */}
        <div
          className="text-xl font-bold flex items-center mr-6 cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          <span className="text-primary">Fish</span>
          <span>Market</span>
        </div>
      </div>

      <div className="flex items-center">
        <Space>
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <div className="avatar-dropdown cursor-pointer flex items-center gap-1">
              <Avatar src={user?.avatar} size="small" />
              <span className="hidden sm:inline">{user?.name}</span>
              <ChevronDownIcon size={16} />
            </div>
          </Dropdown>
        </Space>
      </div>
    </AntHeader>
  );
};

export default Header;
