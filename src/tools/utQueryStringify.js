import encodeCp1251 from "./encodeCp1251";

function queryStringify(query, fixCyrillicDownloadPath) {
  if (query === null) {
    query = undefined;
  }

  const result = [];
  if (typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(value => result.push(prepKeyValue(key, value)));
      } else {
        result.push(prepKeyValue(key, value));
      }
    });
  }
  return result.join('&');

  function prepKeyValue(key, value) {
    const encodedKey = encodeURIComponent(key);
    const valueStr = stringifyPrimitive(value);

    let encodedValue = null;
    if (fixCyrillicDownloadPath && key === 'path' && query.download_dir !== undefined) {
      encodedValue = encodeCp1251(valueStr);
    } else {
      encodedValue = encodeURIComponent(valueStr);
    }

    return [encodedKey, encodedValue].join('=');
  }

  function stringifyPrimitive(v) {
    switch (typeof v) {
      case 'string':
        return v;

      case 'boolean':
        return v ? 'true' : 'false';

      case 'number':
        return isFinite(v) ? v : '';

      default:
        return '';
    }
  }
}

export default queryStringify;