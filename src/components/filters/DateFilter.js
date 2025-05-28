import React, { useState } from 'react';

const TIME_PRESETS = {
  '24h': {
    label: 'Last 24 hours',
    getRange: () => {
      const end = new Date();
      const start = new Date(end - 24 * 60 * 60 * 1000);
      return { start, end };
    }
  },
  '7d': {
    label: 'Last 7 days',
    getRange: () => {
      const end = new Date();
      const start = new Date(end - 7 * 24 * 60 * 60 * 1000);
      return { start, end };
    }
  },
  'month': {
    label: 'This month',
    getRange: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return { start, end };
    }
  }
};

function DateFilter({ activeTimeRange, onTimeRangeChange }) {
  const [customRange, setCustomRange] = useState({
    start: '',
    end: ''
  });

  const handlePresetClick = (presetKey) => {
    const range = TIME_PRESETS[presetKey].getRange();
    onTimeRangeChange({
      preset: presetKey,
      ...range
    });
  };

  const handleCustomRangeChange = (type, value) => {
    const newRange = {
      ...customRange,
      [type]: value
    };
    setCustomRange(newRange);

    if (newRange.start && newRange.end) {
      onTimeRangeChange({
        preset: null,
        start: new Date(newRange.start),
        end: new Date(newRange.end)
      });
    }
  };

  return (
    <div className="filter-section">
      <h3>Time Range</h3>
      <div className="time-presets">
        {Object.entries(TIME_PRESETS).map(([key, { label }]) => (
          <button
            key={key}
            className={`preset-button ${activeTimeRange?.preset === key ? 'active' : ''}`}
            onClick={() => handlePresetClick(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="custom-range">
        <h4>Custom Range</h4>
        <div className="date-inputs">
          <input
            type="date"
            value={customRange.start}
            onChange={(e) => handleCustomRangeChange('start', e.target.value)}
            disabled={activeTimeRange?.preset !== null}
          />
          <span>to</span>
          <input
            type="date"
            value={customRange.end}
            onChange={(e) => handleCustomRangeChange('end', e.target.value)}
            disabled={activeTimeRange?.preset !== null}
          />
        </div>
      </div>
    </div>
  );
}

export default DateFilter; 