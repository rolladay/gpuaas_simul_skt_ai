import React, { useState, useMemo } from 'react';

interface GpuModel {
  name: string;
  powerPerNode: number;
  defaultSellingPrice: number;
  defaultCapexPerGpu: number;
  gpuPerNode: number;
}

const GPU_MODELS: Record<string, GpuModel> = {
  H100: {
    name: 'NVIDIA H100 (8-GPU)',
    powerPerNode: 10.2,
    defaultSellingPrice: 2.5,
    defaultCapexPerGpu: 45000,
    gpuPerNode: 8,
  },
  B200: {
    name: 'NVIDIA B200 (8-GPU)',
    powerPerNode: 15.0,
    defaultSellingPrice: 3.8,
    defaultCapexPerGpu: 65000,
    gpuPerNode: 8,
  },
  MI300X: {
    name: 'AMD MI300X (8-GPU)',
    powerPerNode: 12.0,
    defaultSellingPrice: 1.9,
    defaultCapexPerGpu: 35000,
    gpuPerNode: 8,
  },
};

const GpuAasInvestorSimulator: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<string>('B200');
  const [gpus, setGpus] = useState<number>(32768);
  const [utilization, setUtilization] = useState<number>(80);
  const [pue] = useState<number>(1.25);
  const [powerCost] = useState<number>(0.12);
  const [rackLimit] = useState<number>(100);

  const [dcModel, setDcModel] = useState<'Colocation' | 'Owned'>('Owned');
  const [coloRate, setColoRate] = useState<number>(3000);
  const [facilityCapexPerMw, setFacilityCapexPerMw] = useState<number>(10);
  const [interestRate, setInterestRate] = useState<number>(5.5);

  const [sellingPrice, setSellingPrice] = useState<number>(
    GPU_MODELS['B200'].defaultSellingPrice
  );
  const [capexPrice, setCapexPrice] = useState<number>(
    GPU_MODELS['B200'].defaultCapexPerGpu
  );
  // ✅ 업계 기준 초기값: Networking 20%, Storage & SW 12%
  const [networkRatio, setNetworkRatio] = useState<number>(20);
  const [storageSwRatio, setStorageSwRatio] = useState<number>(12);
  const [networkOpexPerRack] = useState<number>(800);

  const formatMegaBillion = (val: number) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const stats = useMemo(() => {
    const model = GPU_MODELS[selectedModel];
    const nodes = gpus / model.gpuPerNode;
    const itKw = nodes * model.powerPerNode;
    const totalKw = itKw * pue;
    const totalMw = totalKw / 1000;
    const racks = Math.ceil(totalKw / rackLimit);

    const serverCapex = gpus * capexPrice;
    const networkCapex = serverCapex * (networkRatio / 100);
    const storageSwCapex = serverCapex * (storageSwRatio / 100);
    const hwCapex = serverCapex + networkCapex + storageSwCapex;

    const facilityCapex =
      dcModel === 'Owned' ? totalMw * (facilityCapexPerMw * 1000000) : 0;
    const totalCapex = hwCapex + facilityCapex;

    const hwDepreciation = hwCapex / 48;
    const facilityDepreciation = facilityCapex > 0 ? facilityCapex / 180 : 0;
    const monthlyDepreciation = hwDepreciation + facilityDepreciation;

    const monthlyHours = 720;
    const opExPower = totalKw * monthlyHours * powerCost;
    const opExFacility =
      dcModel === 'Colocation' ? racks * coloRate : racks * 400;
    const opExNetwork = racks * networkOpexPerRack;
    const opExMaintenance = nodes * 200;
    const totalOpEx = opExPower + opExFacility + opExNetwork + opExMaintenance;

    const monthlyInterest = (totalCapex * (interestRate / 100)) / 12;

    const revenue = gpus * monthlyHours * (utilization / 100) * sellingPrice;
    const operatingProfit = revenue - totalOpEx - monthlyDepreciation;
    const netProfit = operatingProfit - monthlyInterest;

    const cashFlow = revenue - totalOpEx - monthlyInterest;
    const paybackMonths =
      cashFlow > 0 ? (totalCapex / cashFlow).toFixed(1) : '∞';
    const roi = (((netProfit * 12) / totalCapex) * 100).toFixed(1);

    return {
      model,
      nodes,
      itKw,
      totalKw,
      totalMw,
      racks,
      serverCapex,
      networkCapex,
      storageSwCapex,
      facilityCapex,
      totalCapex,
      monthlyDepreciation,
      monthlyInterest,
      revenue,
      opExPower,
      opExFacility,
      opExNetwork,
      opExMaintenance,
      totalOpEx,
      operatingProfit,
      netProfit,
      cashFlow,
      paybackMonths,
      roi,
    };
  }, [
    selectedModel,
    gpus,
    utilization,
    pue,
    powerCost,
    rackLimit,
    dcModel,
    coloRate,
    facilityCapexPerMw,
    interestRate,
    sellingPrice,
    capexPrice,
    networkRatio,
    storageSwRatio,
    networkOpexPerRack,
  ]);

  const handleModelChange = (m: string) => {
    setSelectedModel(m);
    setSellingPrice(GPU_MODELS[m].defaultSellingPrice);
    setCapexPrice(GPU_MODELS[m].defaultCapexPerGpu);
  };

  // ✅ 슬라이더 아래 금액 표시용 뱃지 스타일
  const capexBadgeStyle: React.CSSProperties = {
    display: 'inline-block',
    marginTop: '4px',
    padding: '3px 8px',
    borderRadius: '4px',
    background: '#eff6ff',
    color: '#0070f3',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.01em',
    border: '1px solid #bfdbfe',
  };

  // ✅ 모든 input 공통 스타일 — box-sizing: border-box 가 핵심
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    marginTop: '4px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    fontSize: '12px',
  };

  const inputCyanStyle: React.CSSProperties = {
    ...inputStyle,
    border: '1px solid #b2ebf2',
  };

  return (
    <div
      style={{
        padding: '40px',
        backgroundColor: '#f0f2f5',
        minHeight: '100vh',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <header style={{ marginBottom: '60px' }}>
          <div>
            <h1 style={{ color: '#1a1a1a', margin: '20px 0 10px 10px' }}>
              AIDC Mega-Scale Simulator{' '}
              <span
                style={{
                  fontSize: '12px',
                  color: '#666',
                  fontWeight: 'normal',
                }}
              >
                v 0.3
              </span>
            </h1>
            <p style={{ color: '#666', margin: 0 }}>
              AIDC_GPUaaSv 사업성 분석
            </p>
          </div>
        </header>

        {/* GPU Model Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
          {Object.keys(GPU_MODELS).map((m) => (
            <button
              key={m}
              onClick={() => handleModelChange(m)}
              style={{
                padding: '12px 24px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s',
                border: 'none',
                backgroundColor: selectedModel === m ? '#002060' : '#fff',
                color: selectedModel === m ? '#fff' : '#444',
              }}
            >
              {GPU_MODELS[m].name}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '380px 1fr',
            gap: '30px',
          }}
        >
          {/* Control Panel */}
          <section
            style={{
              background: '#fff',
              padding: '25px',
              borderRadius: '4px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              maxHeight: '900px',
              overflowY: 'auto',
              overflowX: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: '20px',
                fontSize: '18px',
                borderBottom: '1px solid #eee',
                paddingBottom: '10px',
              }}
            >
              Config Variables
            </h3>

            {/* GPU Count */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#555',
                }}
              >
                Total GPUs:{' '}
                <span style={{ color: '#0070f3', fontSize: '16px' }}>
                  {gpus.toLocaleString()}
                </span>{' '}
                (Racks: {stats.racks})
              </label>
              <div style={{ marginTop: '12px' }}>
                <input
                  type="range"
                  min="128"
                  max="320000"
                  step="1024"
                  value={gpus}
                  onChange={(e) => setGpus(Number(e.target.value))}
                  style={{ width: '100%', marginBottom: '8px' }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#888' }}>
                    Direct Input:
                  </span>
                  <input
                    type="number"
                    min="128"
                    max="320000"
                    step="128"
                    value={gpus}
                    onChange={(e) => setGpus(Number(e.target.value))}
                    style={{
                      width: '120px',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      textAlign: 'right',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
              {/* ✅ GPU 수량 기준 총 HW CapEx 뱃지 */}
              <div
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={capexBadgeStyle}>
                  GPU Server CapEx: {formatMegaBillion(stats.serverCapex)}
                </span>
                <span
                  style={{
                    ...capexBadgeStyle,
                    background: '#f0fdf4',
                    color: '#16a34a',
                    borderColor: '#bbf7d0',
                  }}
                >
                  Total HW CapEx:{' '}
                  {formatMegaBillion(
                    stats.serverCapex +
                      stats.networkCapex +
                      stats.storageSwCapex
                  )}
                </span>
              </div>
            </div>

            {/* Utilization */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#555',
                }}
              >
                Utilization:{' '}
                <span style={{ color: '#0070f3' }}>{utilization}%</span>
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={utilization}
                onChange={(e) => setUtilization(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* Interest Rate */}
            <div
              style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                marginBottom: '20px',
              }}
            >
              <label style={{ fontSize: '13px', color: '#666' }}>
                Cost of Capital / Interest Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            {/* Selling Price & CAPEX per GPU */}
            <div
              style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                marginBottom: '20px',
              }}
            >
              <label style={{ fontSize: '13px', color: '#666' }}>
                Selling Price ($/hr)
              </label>
              <input
                type="number"
                value={sellingPrice}
                step="0.1"
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                style={{ ...inputStyle, marginBottom: '10px' }}
              />
              <label style={{ fontSize: '13px', color: '#666' }}>
                Hardware CAPEX per GPU ($)
              </label>
              <input
                type="number"
                value={capexPrice}
                step="1000"
                onChange={(e) => setCapexPrice(Number(e.target.value))}
                style={inputStyle}
              />
              {/* ✅ GPU 서버 총액 표시 */}
              <div
                style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}
              >
                GPU Server Total:{' '}
                <span style={{ fontWeight: '700', color: '#1a1a1a' }}>
                  {formatMegaBillion(stats.serverCapex)}
                </span>
              </div>
            </div>

            {/* ✅ Networking Ratio — 슬라이더 아래 총액 표시 */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#555',
                }}
              >
                Networking Ratio:{' '}
                <span style={{ color: '#0070f3' }}>{networkRatio}%</span>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#aaa',
                    fontWeight: '400',
                    marginLeft: '6px',
                  }}
                >
                  of GPU Server cost
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={networkRatio}
                onChange={(e) => setNetworkRatio(Number(e.target.value))}
                style={{ width: '100%', marginTop: '6px' }}
              />
              {/* 총 금액 뱃지 */}
              <div>
                <span style={capexBadgeStyle}>
                  InfiniBand / Networking Total:{' '}
                  {formatMegaBillion(stats.networkCapex)}
                </span>
              </div>
              <div
                style={{ fontSize: '11px', color: '#bbb', marginTop: '4px' }}
              >
                Industry ref: ~15–25% for large-scale InfiniBand clusters
              </div>
            </div>

            {/* ✅ Storage & SW Ratio — 슬라이더 아래 총액 표시 */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#555',
                }}
              >
                Storage & SW Ratio:{' '}
                <span style={{ color: '#0070f3' }}>{storageSwRatio}%</span>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#aaa',
                    fontWeight: '400',
                    marginLeft: '6px',
                  }}
                >
                  of GPU Server cost
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={storageSwRatio}
                onChange={(e) => setStorageSwRatio(Number(e.target.value))}
                style={{ width: '100%', marginTop: '6px' }}
              />
              {/* 총 금액 뱃지 */}
              <div>
                <span style={capexBadgeStyle}>
                  NVMe Storage / SW License Total:{' '}
                  {formatMegaBillion(stats.storageSwCapex)}
                </span>
              </div>
              <div
                style={{ fontSize: '11px', color: '#bbb', marginTop: '4px' }}
              >
                Industry ref: ~10–15% (NVMe arrays + CUDA/software licensing)
              </div>
            </div>

            {/* DC Model Specific */}
            <div
              style={{
                padding: '15px',
                backgroundColor: '#e0f7fa',
                borderRadius: '4px',
                marginTop: '20px',
              }}
            >
              {dcModel === 'Colocation' ? (
                <>
                  <label
                    style={{
                      fontSize: '13px',
                      color: '#006064',
                      fontWeight: 'bold',
                    }}
                  >
                    Colo Lease Rate ($/Rack/mo)
                  </label>
                  <input
                    type="number"
                    value={coloRate}
                    step="100"
                    onChange={(e) => setColoRate(Number(e.target.value))}
                    style={inputCyanStyle}
                  />
                </>
              ) : (
                <>
                  <label
                    style={{
                      fontSize: '13px',
                      color: '#006064',
                      fontWeight: 'bold',
                    }}
                  >
                    Facility Build Cost ($M per MW)
                  </label>
                  <input
                    type="number"
                    value={facilityCapexPerMw}
                    step="0.5"
                    onChange={(e) =>
                      setFacilityCapexPerMw(Number(e.target.value))
                    }
                    style={inputCyanStyle}
                  />
                </>
              )}
            </div>

            {/* Business Model Toggle */}
            <div
              style={{
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '1px solid #eee',
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#555',
                  marginBottom: '10px',
                }}
              >
                DC Business Model
              </label>
              <div
                style={{
                  display: 'flex',
                  background: '#e4e4e7',
                  padding: '4px',
                  borderRadius: '4px',
                }}
              >
                <button
                  onClick={() => setDcModel('Colocation')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    background:
                      dcModel === 'Colocation' ? '#002060' : 'transparent',
                    color: dcModel === 'Colocation' ? '#fff' : '#444',
                    fontWeight: dcModel === 'Colocation' ? 'bold' : 'normal',
                    
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Colocation (Lease)
                </button>
                <button
                  onClick={() => setDcModel('Owned')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    background: dcModel === 'Owned' ? '#002060' : 'transparent',
                    color: dcModel === 'Owned' ? '#fff' : '#444',
                    fontWeight: dcModel === 'Owned' ? 'bold' : 'normal',
                    
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Owned (Build)
                </button>
              </div>
            </div>
          </section>

          {/* Main Dashboard */}
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '20px',
                marginBottom: '30px',
              }}
            >
              <div
                style={{
                  background: '#1a1a1a',
                  color: '#fff',
                  padding: '20px',
                  borderRadius: '4px',
                }}
              >
                <small style={{ color: '#aaa' }}>Total CAPEX</small>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    margin: '5px 0',
                  }}
                >
                  {formatMegaBillion(stats.totalCapex)}
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  Facility: {formatMegaBillion(stats.facilityCapex)} / HW:{' '}
                  {formatMegaBillion(
                    stats.serverCapex +
                      stats.networkCapex +
                      stats.storageSwCapex
                  )}
                </div>
              </div>
              <div
                style={{
                  background: '#fff',
                  padding: '20px',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                }}
              >
                <small style={{ color: '#666' }}>Payback Period</small>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    margin: '5px 0',
                    color: '#002060',
                  }}
                >
                  {stats.paybackMonths} Mo
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  ROI: {stats.roi}% / year
                </div>
              </div>
              <div
                style={{
                  background: '#fff',
                  padding: '20px',
                  borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                }}
              >
                <small style={{ color: '#666' }}>Power Required</small>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    margin: '5px 0',
                    color: '#002060',
                  }}
                >
                  {stats.totalMw.toFixed(1)} MW
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {stats.racks} Racks (@{rackLimit}kW/rack)
                </div>
              </div>
            </div>

            {/* P&L Detail */}
            <div
              style={{
                background: '#fff',
                padding: '30px',
                borderRadius: '4px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  borderBottom: '2px solid #f0f0f0',
                  paddingBottom: '15px',
                }}
              >
                Monthly P&L (Financial Forecast)
              </h3>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '15px',
                }}
              >
                <tbody>
                  <tr style={{ height: '40px' }}>
                    <td style={{ color: '#444' }}>Monthly Gross Revenue</td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 'bold',
                        color: '#0070f3',
                      }}
                    >
                      + {formatMegaBillion(stats.revenue)}
                    </td>
                  </tr>
                  <tr style={{ height: '40px' }}>
                    <td
                      style={{
                        color: '#666',
                        paddingLeft: '15px',
                        fontSize: '13px',
                      }}
                    >
                      ㄴ Potential @ 100% Util
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: '#999',
                        fontSize: '13px',
                      }}
                    >
                      {formatMegaBillion(stats.revenue * (100 / utilization))}
                    </td>
                  </tr>
                  <tr style={{ height: '40px', borderTop: '1px solid #eee' }}>
                    <td style={{ color: '#444' }}>
                      Total Operating Expenses (OPEX)
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 'bold',
                        color: '#e74c3c',
                      }}
                    >
                      - {formatMegaBillion(stats.totalOpEx)}
                    </td>
                  </tr>
                  <tr style={{ height: '30px' }}>
                    <td
                      style={{
                        color: '#888',
                        paddingLeft: '15px',
                        fontSize: '13px',
                      }}
                    >
                      ㄴ Power Cost
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: '#888',
                        fontSize: '13px',
                      }}
                    >
                      {formatMegaBillion(stats.opExPower)}
                    </td>
                  </tr>
                  <tr style={{ height: '30px' }}>
                    <td
                      style={{
                        color: '#888',
                        paddingLeft: '15px',
                        fontSize: '13px',
                      }}
                    >
                      ㄴ Facility & MEP
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: '#888',
                        fontSize: '13px',
                      }}
                    >
                      {formatMegaBillion(stats.opExFacility)}
                    </td>
                  </tr>
                  <tr style={{ height: '30px' }}>
                    <td
                      style={{
                        color: '#888',
                        paddingLeft: '15px',
                        fontSize: '13px',
                      }}
                    >
                      ㄴ Network Transit
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: '#888',
                        fontSize: '13px',
                      }}
                    >
                      {formatMegaBillion(stats.opExNetwork)}
                    </td>
                  </tr>
                  <tr style={{ height: '30px' }}>
                    <td
                      style={{
                        color: '#888',
                        paddingLeft: '15px',
                        fontSize: '13px',
                      }}
                    >
                      ㄴ Maintenance & SG&A
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: '#888',
                        fontSize: '13px',
                      }}
                    >
                      {formatMegaBillion(stats.opExMaintenance)}
                    </td>
                  </tr>
                  <tr style={{ height: '40px', borderTop: '1px solid #eee' }}>
                    <td style={{ color: '#444' }}>
                      Depreciation (HW & Facility)
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 'bold',
                        color: '#e74c3c',
                      }}
                    >
                      - {formatMegaBillion(stats.monthlyDepreciation)}
                    </td>
                  </tr>
                  <tr style={{ height: '40px' }}>
                    <td style={{ color: '#444' }}>
                      Interest Expense (Financing)
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 'bold',
                        color: '#e74c3c',
                      }}
                    >
                      - {formatMegaBillion(stats.monthlyInterest)}
                    </td>
                  </tr>
                  <tr
                    style={{ height: '60px', borderTop: '2px solid #1a1a1a' }}
                  >
                    <td style={{ fontWeight: 'bold', fontSize: '20px' }}>
                      Net Monthly Profit
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 'bold',
                        fontSize: '24px',
                        color: stats.netProfit > 0 ? '#0070f3' : '#c0392b',
                      }}
                    >
                      {formatMegaBillion(stats.netProfit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Audit Trail */}
        <div
          style={{
            marginTop: '30px',
            background: '#1e1e1e',
            color: '#d4d4d4',
            padding: '25px',
            borderRadius: '4px',
            fontFamily: '"Fira Code", monospace',
            fontSize: '13px',
          }}
        >
          <div
            style={{
              color: '#ffffff',
              marginBottom: '15px',
              fontSize: '15px',
              fontWeight: 'bold',
            }}
          >
            // CALCULATION_LOG: AIDC Infrastructure Audit
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '40px',
            }}
          >
            <div>
              <div style={{ color: '#ffffff', marginBottom: '8px' }}>
                [Power & Cooling]
              </div>
              • Power Strategy: IT Load {stats.itKw.toFixed(0)}kW / PUE {pue}{' '}
              <br />• Facility Load: {stats.totalMw.toFixed(2)} MW Total
              <br />• Rack Density: {rackLimit} kW/Rack → {stats.racks} Racks
            </div>
            <div>
              <div style={{ color: '#ffffff', marginBottom: '8px' }}>
                [CAPEX Master Breakdown]
              </div>
              • GPU Servers: {formatMegaBillion(stats.serverCapex)}
              <br />• Network/InfiniBand:{' '}
              {formatMegaBillion(stats.networkCapex)} ({networkRatio}% of GPU
              cost)
              <br />• Storage & SW: {formatMegaBillion(stats.storageSwCapex)} (
              {storageSwRatio}% of GPU cost)
              <br />• DC Facility Build:{' '}
              {formatMegaBillion(stats.facilityCapex)} (Model: {dcModel})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GpuAasInvestorSimulator;


