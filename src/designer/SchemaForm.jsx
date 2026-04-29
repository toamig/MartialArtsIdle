/**
 * SchemaForm — one recursive component that renders any schema tree.
 *
 * A schema is an array of field descriptors:
 *   { key, label?, type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object',
 *     options?: [] | () => [],      // enum options
 *     itemSchema?: [ ... ],         // array of objects → nested SchemaForm
 *     itemType?: 'string'|'number', // array of primitives
 *     min?, max?, step?,            // number constraints
 *     help?,                        // inline help text
 *   }
 *
 * Unknown fields on the value object are PRESERVED via spread — they're not
 * shown in the UI but survive round-trips, so schema drift doesn't eat data.
 */

export default function SchemaForm({ schema, value, onChange, path = '', compact = false }) {
  const v = value || {};
  const update = (key, newVal) => {
    if (newVal === undefined) {
      // delete the key (user cleared an optional field)
      const next = { ...v };
      delete next[key];
      onChange(next);
    } else {
      onChange({ ...v, [key]: newVal });
    }
  };

  return (
    <div className={`dz-form${compact ? ' dz-form--compact' : ''}`}>
      {schema.map((f) => (
        <Field
          key={f.key}
          field={f}
          value={v[f.key]}
          onChange={(nv) => update(f.key, nv)}
          path={`${path}.${f.key}`}
          compact={compact}
        />
      ))}
    </div>
  );
}

function Field({ field, value, onChange, path, compact }) {
  const label = field.label || field.key;

  switch (field.type) {
    case 'string':
      return (
        <label className="dz-form-row">
          <span className="dz-form-label" title={label}>{label}</span>
          <input
            type="text"
            className="dz-input"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
          {field.help && <span className="dz-form-help">{field.help}</span>}
        </label>
      );

    case 'textarea':
      return (
        <label className={`dz-form-row${compact ? ' dz-form-row--wide' : ''}`}>
          <span className="dz-form-label" title={label}>{label}</span>
          <textarea
            className="dz-input dz-textarea"
            rows={field.rows ?? 3}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
          {field.help && <span className="dz-form-help">{field.help}</span>}
        </label>
      );

    case 'number':
      return (
        <label className="dz-form-row">
          <span className="dz-form-label" title={label}>{label}</span>
          <input
            type="number"
            className="dz-input"
            value={value ?? ''}
            min={field.min}
            max={field.max}
            step={field.step ?? 'any'}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') onChange(undefined);
              else onChange(Number(raw));
            }}
          />
          {field.help && <span className="dz-form-help">{field.help}</span>}
        </label>
      );

    case 'boolean':
      return (
        <label className="dz-form-row dz-form-row-inline">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="dz-form-label" title={label}>{label}</span>
          {field.help && <span className="dz-form-help">{field.help}</span>}
        </label>
      );

    case 'enum': {
      const opts = typeof field.options === 'function' ? field.options() : field.options;
      return (
        <label className="dz-form-row">
          <span className="dz-form-label" title={label}>{label}</span>
          <select
            className="dz-input"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || undefined)}
          >
            <option value="">— unset —</option>
            {opts.map((opt) => {
              const val = typeof opt === 'string' ? opt : opt.value;
              const lab = typeof opt === 'string' ? opt : (opt.label ?? opt.value);
              return <option key={val} value={val}>{lab}</option>;
            })}
          </select>
          {field.help && <span className="dz-form-help">{field.help}</span>}
        </label>
      );
    }

    case 'array': {
      if (compact) {
        const arr = Array.isArray(value) ? value : [];
        return (
          <details className="dz-form-section">
            <summary className="dz-form-section-summary">
              {label}
              <span className="dz-form-section-count">({arr.length})</span>
            </summary>
            <div className="dz-form-section-body">
              {/* noLegend suppresses the redundant fieldset/legend inside the <details> */}
              <ArrayField field={field} value={value} onChange={onChange} path={path} compact={compact} noLegend={true} />
            </div>
          </details>
        );
      }
      return <ArrayField field={field} value={value} onChange={onChange} path={path} />;
    }

    case 'object':
      if (compact) {
        return (
          <details className="dz-form-section">
            <summary className="dz-form-section-summary">{label}</summary>
            <div className="dz-form-section-body">
              <SchemaForm schema={field.fields} value={value || {}} onChange={onChange} path={path} compact={compact} />
            </div>
          </details>
        );
      }
      return (
        <fieldset className="dz-form-group">
          <legend>{label}</legend>
          <SchemaForm schema={field.fields} value={value || {}} onChange={onChange} path={path} />
        </fieldset>
      );

    default:
      return (
        <div className="dz-form-row">
          <span className="dz-form-label" title={label}>{label}</span>
          <span className="dz-form-help">unsupported field type: {field.type}</span>
        </div>
      );
  }
}

function ArrayField({ field, value, onChange, compact, noLegend }) {
  const arr = Array.isArray(value) ? value : [];
  const label = field.label || field.key;
  const update = (i, nv) => {
    const next = [...arr];
    if (nv === undefined) next.splice(i, 1);
    else next[i] = nv;
    onChange(next);
  };
  const add = () => {
    const blank = field.itemType === 'string' ? ''
                : field.itemType === 'number' ? 0
                : {};
    onChange([...arr, blank]);
  };

  const items = arr.map((item, i) => (
    <ArrayItem
      key={i}
      index={i}
      item={item}
      field={field}
      onChange={(nv) => update(i, nv)}
      onRemove={() => update(i, undefined)}
      compact={compact}
    />
  ));
  const addBtn = (
    <button type="button" className="dz-btn dz-btn-ghost dz-add-btn" onClick={add}>
      + Add {label}
    </button>
  );

  // When rendered inside a compact <details>, skip the redundant fieldset wrapper.
  if (noLegend) {
    return <>{items}{addBtn}</>;
  }

  return (
    <fieldset className="dz-form-group">
      <legend>{label} <span className="dz-form-count">({arr.length})</span></legend>
      {items}
      {addBtn}
    </fieldset>
  );
}

function ArrayItem({ index, item, field, onChange, onRemove, compact }) {
  if (field.itemSchema) {
    return (
      <div className="dz-array-item">
        <div className="dz-array-item-header">
          <span className="dz-array-item-index">#{index}</span>
          <button type="button" className="dz-btn-icon" onClick={onRemove} title="Remove">×</button>
        </div>
        <SchemaForm schema={field.itemSchema} value={item || {}} onChange={onChange} compact={compact} />
      </div>
    );
  }

  // Primitive array items
  const isNumber = field.itemType === 'number';
  return (
    <div className="dz-array-item dz-array-item-inline">
      <input
        type={isNumber ? 'number' : 'text'}
        className="dz-input"
        value={item ?? ''}
        step={isNumber ? 'any' : undefined}
        onChange={(e) => onChange(isNumber ? Number(e.target.value) : e.target.value)}
      />
      <button type="button" className="dz-btn-icon" onClick={onRemove} title="Remove">×</button>
    </div>
  );
}
