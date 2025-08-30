// helper per serializzare BigInt / BigNumber in JSON in modo sicuro
// toSafeObject converte ricorsivamente BigInt e oggetti "BigNumber-like" in stringhe
function isBigNumberLike(v) {
  if (!v || typeof v !== 'object') return false;
  // Ethers v5 BigNumber often has _hex or _isBigNumber; v6 returns bigint but not objects
  return (!!v._hex) || (!!v._isBigNumber) || (typeof v.toHexString === 'function' && typeof v.toString === 'function');
}

function toSafeObject(value) {
  if (value === null) return null;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'undefined') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(toSafeObject);
  }
  // handle BigNumber-like objects (ethers v5)
  if (isBigNumberLike(value)) {
    try {
      return value.toString();
    } catch (e) {
      // fallback
      return String(value);
    }
  }
  // If the object has a custom toString and is not a plain object, use it
  if (typeof value.toString === 'function' && Object.getPrototypeOf(value) !== Object.prototype) {
    try {
      return value.toString();
    } catch (e) {
      // continue to deep clone props
    }
  }
  // plain object: recurse
  const out = {};
  for (const k of Object.keys(value)) {
    try {
      out[k] = toSafeObject(value[k]);
    } catch (e) {
      out[k] = String(value[k]);
    }
  }
  return out;
}

function safeStringify(obj, space = 2) {
  return JSON.stringify(toSafeObject(obj), null, space);
}

module.exports = { toSafeObject, safeStringify };