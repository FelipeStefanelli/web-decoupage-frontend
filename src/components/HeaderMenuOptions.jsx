import React, { useEffect, useState } from 'react';
import Image from '@/components/Image';

const HeaderMenuOptions = ({
  showPreview,
  handleExportClick,
  setshowPreview,
}) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (showPreview) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isDesktop ? 'row' : 'column',
        width: '100%',
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
       className="fade-in"
    >
      {/* Coluna 1 */}
      <div
        style={{
          flex: 1,
          paddingRight: 0,
          borderRight: 'none',
          boxSizing: 'border-box',
        }}
      >
        {/* Roteiro e Decupagem */}
        <div style={styles.sectionTitle}>
          <p className="section-title" style={styles.sectionText}>Previews</p>
        </div>
        {["script", "decoupage"].map((type) => (
          <div key={type} style={styles.item}>
            <p style={styles.label}>
              <span style={styles.title}>{type === 'script' ? 'Roteiro' : 'Decupagem'}</span>
              <span style={styles.subtitle}>PDF</span>
            </p>
            <Image src="/send.svg" alt="Send icon" width={24} height={24} style={styles.icon} onClick={() => setshowPreview(type)} />
          </div>
        ))}

        {/* Exportar / Importar */}
        <div style={styles.sectionTitle}>
          <p className="section-title" style={styles.sectionText}>Exportar</p>
        </div>
        {[{
          label: 'Exportar projeto', icon: '/export.svg', action: handleExportClick
        }].map((item, idx) => (
          <div key={idx} style={styles.item}>
            <p style={styles.label}>
              <span style={styles.title}>{item.label}</span>
              <span style={styles.subtitle}>ZIP</span>
            </p>
            <Image src={item.icon} alt="Icon" width={24} height={24} style={styles.icon} onClick={item.action} />
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  item: {
    width: 'calc(100% - 16px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 4px',
    borderBottom: '1px solid #eee',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    color: 'rgb(43, 35, 79)',
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: '22px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'rgb(43, 35, 79)',
  },
  subtitle: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'rgb(75, 71, 93)',
    lineHeight: '20px'
  },
  icon: {
    width: '24px',
    height: '24px',
    cursor: 'pointer',
  },
  sectionTitle: {
    padding: '32px 0px 12px 0',
  },
  sectionText: {
    color: 'rgb(196, 48, 43)',
    fontSize: '16px',
    letterSpacing: '0.2px',
    fontWeight: 800,
    margin: 0,
  },
};

export default HeaderMenuOptions;
