import React from 'react';
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
  const categories = [...new Set(events.map(event => event.category))];
  const severities = [...new Set(events.map(event => event.severity))].sort();

  const handleCategoryChange = (category) => {
    const newCategories = (activeFilters.categories || []).includes(category)
      ? (activeFilters.categories || []).filter(c => c !== category)
      : [...(activeFilters.categories || []), category];
    
    onFilterChange({
      ...activeFilters,
      categories: newCategories
    });
  };

  const handleSeverityChange = (severity) => {
    const newSeverities = (activeFilters.severities || []).includes(severity)
      ? (activeFilters.severities || []).filter(s => s !== severity)
      : [...(activeFilters.severities || []), severity];
    
    onFilterChange({
      ...activeFilters,
      severities: newSeverities
    });
  };

  const handleVerificationChange = (status) => {
    onFilterChange({
      ...activeFilters,
      verified: status === 'verified'
    });
  };

  return (
    <div className="filter-panel">
      <h2>Filters</h2>
      
      <section className="filter-section">
        <h3>Categories</h3>
        <div className="filter-options">
          {categories.map(category => (
            <label key={category} className="filter-option">
              <input
                type="checkbox"
                checked={(activeFilters.categories || []).includes(category)}
                onChange={() => handleCategoryChange(category)}
              />
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </label>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Severity</h3>
        <div className="filter-options">
          {severities.map(level => (
            <label key={level} className="filter-option">
              <input
                type="checkbox"
                checked={(activeFilters.severities || []).includes(level)}
                onChange={() => handleSeverityChange(level)}
              />
              Level {level}
            </label>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Status</h3>
        <label className="filter-option">
          <input
            type="radio"
            name="verification"
            checked={!activeFilters.verified}
            onChange={() => handleVerificationChange('all')}
          />
          All
        </label>
        <label className="filter-option">
          <input
            type="radio"
            name="verification"
            checked={activeFilters.verified}
            onChange={() => handleVerificationChange('verified')}
          />
          Verified Only
        </label>
      </section>

      <section className="filter-section">
        <h3>Visible Events</h3>
        <div className="range-input">
          <input
            type="range"
            min="50"
            max="500"
            step="50"
            value={topVisibleCount}
            onChange={(e) => onTopVisibleCountChange(Number(e.target.value))}
          />
          <span>{topVisibleCount} events</span>
        </div>
      </section>
    </div>
  );
}

export default FilterPanel; 