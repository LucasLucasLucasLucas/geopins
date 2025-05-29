import React, { useMemo, useCallback } from 'react';
import DateFilter from './DateFilter.jsx';
import './FilterPanel.css';

function FilterPanel({
  events = [],
  activeFilters = { categories: [], severities: [], verified: false },
  onFilterChange = () => {},
  activeTimeRange = null,
  onTimeRangeChange = () => {},
  topVisibleCount = 300,
  onTopVisibleCountChange = () => {}
}) {
  // Memoize unique categories and severities
  const { categories, severities } = useMemo(() => {
    return {
      categories: [...new Set(events.map(event => event.category))],
      severities: [...new Set(events.map(event => event.severity))].sort()
    };
  }, [events]);

  // Memoize event handlers
  const handleCategoryChange = useCallback((category) => {
    const newCategories = activeFilters.categories.includes(category)
      ? activeFilters.categories.filter(c => c !== category)
      : [...activeFilters.categories, category];
    
    onFilterChange({
      ...activeFilters,
      categories: newCategories
    });
  }, [activeFilters, onFilterChange]);

  const handleSeverityChange = useCallback((severity) => {
    const newSeverities = activeFilters.severities.includes(severity)
      ? activeFilters.severities.filter(s => s !== severity)
      : [...activeFilters.severities, severity];
    
    onFilterChange({
      ...activeFilters,
      severities: newSeverities
    });
  }, [activeFilters, onFilterChange]);

  const handleVerifiedChange = useCallback((e) => {
    onFilterChange({
      ...activeFilters,
      verified: e.target.checked
    });
  }, [activeFilters, onFilterChange]);

  const handleTopVisibleCountChange = useCallback((e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 5 && value <= 300) {
      onTopVisibleCountChange(value);
    }
  }, [onTopVisibleCountChange]);

  // Memoize filter sections
  const categoryFilters = useMemo(() => (
    <div className="filter-section">
      <h3>Categories</h3>
      {categories.map(category => (
        <label key={category} className="filter-option">
          <input
            type="checkbox"
            checked={activeFilters.categories.includes(category)}
            onChange={() => handleCategoryChange(category)}
          />
          {category}
        </label>
      ))}
    </div>
  ), [categories, activeFilters.categories, handleCategoryChange]);

  const severityFilters = useMemo(() => (
    <div className="filter-section">
      <h3>Severity</h3>
      {severities.map(severity => (
        <label key={severity} className="filter-option">
          <input
            type="checkbox"
            checked={activeFilters.severities.includes(severity)}
            onChange={() => handleSeverityChange(severity)}
          />
          {severity}
        </label>
      ))}
    </div>
  ), [severities, activeFilters.severities, handleSeverityChange]);

  const verifiedFilter = useMemo(() => (
    <div className="filter-section">
      <h3>Verification</h3>
      <label className="filter-option">
        <input
          type="checkbox"
          checked={activeFilters.verified}
          onChange={handleVerifiedChange}
        />
        Show only verified events
      </label>
    </div>
  ), [activeFilters.verified, handleVerifiedChange]);

  const visibilityControl = useMemo(() => (
    <div className="filter-section">
      <h3>Visibility Control</h3>
      <div className="visibility-slider">
        <label>
          Maximum visible events: {topVisibleCount}
          <input
            type="range"
            min="5"
            max="300"
            value={topVisibleCount}
            onChange={handleTopVisibleCountChange}
          />
        </label>
      </div>
    </div>
  ), [topVisibleCount, handleTopVisibleCountChange]);

  return (
    <div className="filter-panel">
      {categoryFilters}
      {severityFilters}
      {verifiedFilter}
      {visibilityControl}
      <DateFilter
        activeTimeRange={activeTimeRange}
        onTimeRangeChange={onTimeRangeChange}
      />
    </div>
  );
}

export default React.memo(FilterPanel); 