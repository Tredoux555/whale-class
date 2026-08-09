import { createRequire as __makeRequire } from 'module';
const require = __makeRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/qrcode/lib/can-promise.js
var require_can_promise = __commonJS({
  "node_modules/qrcode/lib/can-promise.js"(exports, module) {
    module.exports = function() {
      return typeof Promise === "function" && Promise.prototype && Promise.prototype.then;
    };
  }
});

// node_modules/qrcode/lib/core/utils.js
var require_utils = __commonJS({
  "node_modules/qrcode/lib/core/utils.js"(exports) {
    var toSJISFunction;
    var CODEWORDS_COUNT = [
      0,
      // Not used
      26,
      44,
      70,
      100,
      134,
      172,
      196,
      242,
      292,
      346,
      404,
      466,
      532,
      581,
      655,
      733,
      815,
      901,
      991,
      1085,
      1156,
      1258,
      1364,
      1474,
      1588,
      1706,
      1828,
      1921,
      2051,
      2185,
      2323,
      2465,
      2611,
      2761,
      2876,
      3034,
      3196,
      3362,
      3532,
      3706
    ];
    exports.getSymbolSize = function getSymbolSize(version) {
      if (!version) throw new Error('"version" cannot be null or undefined');
      if (version < 1 || version > 40) throw new Error('"version" should be in range from 1 to 40');
      return version * 4 + 17;
    };
    exports.getSymbolTotalCodewords = function getSymbolTotalCodewords(version) {
      return CODEWORDS_COUNT[version];
    };
    exports.getBCHDigit = function(data) {
      let digit = 0;
      while (data !== 0) {
        digit++;
        data >>>= 1;
      }
      return digit;
    };
    exports.setToSJISFunction = function setToSJISFunction(f) {
      if (typeof f !== "function") {
        throw new Error('"toSJISFunc" is not a valid function.');
      }
      toSJISFunction = f;
    };
    exports.isKanjiModeEnabled = function() {
      return typeof toSJISFunction !== "undefined";
    };
    exports.toSJIS = function toSJIS(kanji) {
      return toSJISFunction(kanji);
    };
  }
});

// node_modules/qrcode/lib/core/error-correction-level.js
var require_error_correction_level = __commonJS({
  "node_modules/qrcode/lib/core/error-correction-level.js"(exports) {
    exports.L = { bit: 1 };
    exports.M = { bit: 0 };
    exports.Q = { bit: 3 };
    exports.H = { bit: 2 };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "l":
        case "low":
          return exports.L;
        case "m":
        case "medium":
          return exports.M;
        case "q":
        case "quartile":
          return exports.Q;
        case "h":
        case "high":
          return exports.H;
        default:
          throw new Error("Unknown EC Level: " + string);
      }
    }
    exports.isValid = function isValid(level) {
      return level && typeof level.bit !== "undefined" && level.bit >= 0 && level.bit < 4;
    };
    exports.from = function from(value, defaultValue) {
      if (exports.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/qrcode/lib/core/bit-buffer.js
var require_bit_buffer = __commonJS({
  "node_modules/qrcode/lib/core/bit-buffer.js"(exports, module) {
    function BitBuffer() {
      this.buffer = [];
      this.length = 0;
    }
    BitBuffer.prototype = {
      get: function(index) {
        const bufIndex = Math.floor(index / 8);
        return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) === 1;
      },
      put: function(num, length) {
        for (let i = 0; i < length; i++) {
          this.putBit((num >>> length - i - 1 & 1) === 1);
        }
      },
      getLengthInBits: function() {
        return this.length;
      },
      putBit: function(bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) {
          this.buffer.push(0);
        }
        if (bit) {
          this.buffer[bufIndex] |= 128 >>> this.length % 8;
        }
        this.length++;
      }
    };
    module.exports = BitBuffer;
  }
});

// node_modules/qrcode/lib/core/bit-matrix.js
var require_bit_matrix = __commonJS({
  "node_modules/qrcode/lib/core/bit-matrix.js"(exports, module) {
    function BitMatrix(size) {
      if (!size || size < 1) {
        throw new Error("BitMatrix size must be defined and greater than 0");
      }
      this.size = size;
      this.data = new Uint8Array(size * size);
      this.reservedBit = new Uint8Array(size * size);
    }
    BitMatrix.prototype.set = function(row, col, value, reserved) {
      const index = row * this.size + col;
      this.data[index] = value;
      if (reserved) this.reservedBit[index] = true;
    };
    BitMatrix.prototype.get = function(row, col) {
      return this.data[row * this.size + col];
    };
    BitMatrix.prototype.xor = function(row, col, value) {
      this.data[row * this.size + col] ^= value;
    };
    BitMatrix.prototype.isReserved = function(row, col) {
      return this.reservedBit[row * this.size + col];
    };
    module.exports = BitMatrix;
  }
});

// node_modules/qrcode/lib/core/alignment-pattern.js
var require_alignment_pattern = __commonJS({
  "node_modules/qrcode/lib/core/alignment-pattern.js"(exports) {
    var getSymbolSize = require_utils().getSymbolSize;
    exports.getRowColCoords = function getRowColCoords(version) {
      if (version === 1) return [];
      const posCount = Math.floor(version / 7) + 2;
      const size = getSymbolSize(version);
      const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
      const positions = [size - 7];
      for (let i = 1; i < posCount - 1; i++) {
        positions[i] = positions[i - 1] - intervals;
      }
      positions.push(6);
      return positions.reverse();
    };
    exports.getPositions = function getPositions(version) {
      const coords = [];
      const pos = exports.getRowColCoords(version);
      const posLength = pos.length;
      for (let i = 0; i < posLength; i++) {
        for (let j = 0; j < posLength; j++) {
          if (i === 0 && j === 0 || // top-left
          i === 0 && j === posLength - 1 || // bottom-left
          i === posLength - 1 && j === 0) {
            continue;
          }
          coords.push([pos[i], pos[j]]);
        }
      }
      return coords;
    };
  }
});

// node_modules/qrcode/lib/core/finder-pattern.js
var require_finder_pattern = __commonJS({
  "node_modules/qrcode/lib/core/finder-pattern.js"(exports) {
    var getSymbolSize = require_utils().getSymbolSize;
    var FINDER_PATTERN_SIZE = 7;
    exports.getPositions = function getPositions(version) {
      const size = getSymbolSize(version);
      return [
        // top-left
        [0, 0],
        // top-right
        [size - FINDER_PATTERN_SIZE, 0],
        // bottom-left
        [0, size - FINDER_PATTERN_SIZE]
      ];
    };
  }
});

// node_modules/qrcode/lib/core/mask-pattern.js
var require_mask_pattern = __commonJS({
  "node_modules/qrcode/lib/core/mask-pattern.js"(exports) {
    exports.Patterns = {
      PATTERN000: 0,
      PATTERN001: 1,
      PATTERN010: 2,
      PATTERN011: 3,
      PATTERN100: 4,
      PATTERN101: 5,
      PATTERN110: 6,
      PATTERN111: 7
    };
    var PenaltyScores = {
      N1: 3,
      N2: 3,
      N3: 40,
      N4: 10
    };
    exports.isValid = function isValid(mask) {
      return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
    };
    exports.from = function from(value) {
      return exports.isValid(value) ? parseInt(value, 10) : void 0;
    };
    exports.getPenaltyN1 = function getPenaltyN1(data) {
      const size = data.size;
      let points = 0;
      let sameCountCol = 0;
      let sameCountRow = 0;
      let lastCol = null;
      let lastRow = null;
      for (let row = 0; row < size; row++) {
        sameCountCol = sameCountRow = 0;
        lastCol = lastRow = null;
        for (let col = 0; col < size; col++) {
          let module2 = data.get(row, col);
          if (module2 === lastCol) {
            sameCountCol++;
          } else {
            if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
            lastCol = module2;
            sameCountCol = 1;
          }
          module2 = data.get(col, row);
          if (module2 === lastRow) {
            sameCountRow++;
          } else {
            if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
            lastRow = module2;
            sameCountRow = 1;
          }
        }
        if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
        if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
      }
      return points;
    };
    exports.getPenaltyN2 = function getPenaltyN2(data) {
      const size = data.size;
      let points = 0;
      for (let row = 0; row < size - 1; row++) {
        for (let col = 0; col < size - 1; col++) {
          const last = data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
          if (last === 4 || last === 0) points++;
        }
      }
      return points * PenaltyScores.N2;
    };
    exports.getPenaltyN3 = function getPenaltyN3(data) {
      const size = data.size;
      let points = 0;
      let bitsCol = 0;
      let bitsRow = 0;
      for (let row = 0; row < size; row++) {
        bitsCol = bitsRow = 0;
        for (let col = 0; col < size; col++) {
          bitsCol = bitsCol << 1 & 2047 | data.get(row, col);
          if (col >= 10 && (bitsCol === 1488 || bitsCol === 93)) points++;
          bitsRow = bitsRow << 1 & 2047 | data.get(col, row);
          if (col >= 10 && (bitsRow === 1488 || bitsRow === 93)) points++;
        }
      }
      return points * PenaltyScores.N3;
    };
    exports.getPenaltyN4 = function getPenaltyN4(data) {
      let darkCount = 0;
      const modulesCount = data.data.length;
      for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];
      const k = Math.abs(Math.ceil(darkCount * 100 / modulesCount / 5) - 10);
      return k * PenaltyScores.N4;
    };
    function getMaskAt(maskPattern, i, j) {
      switch (maskPattern) {
        case exports.Patterns.PATTERN000:
          return (i + j) % 2 === 0;
        case exports.Patterns.PATTERN001:
          return i % 2 === 0;
        case exports.Patterns.PATTERN010:
          return j % 3 === 0;
        case exports.Patterns.PATTERN011:
          return (i + j) % 3 === 0;
        case exports.Patterns.PATTERN100:
          return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
        case exports.Patterns.PATTERN101:
          return i * j % 2 + i * j % 3 === 0;
        case exports.Patterns.PATTERN110:
          return (i * j % 2 + i * j % 3) % 2 === 0;
        case exports.Patterns.PATTERN111:
          return (i * j % 3 + (i + j) % 2) % 2 === 0;
        default:
          throw new Error("bad maskPattern:" + maskPattern);
      }
    }
    exports.applyMask = function applyMask(pattern, data) {
      const size = data.size;
      for (let col = 0; col < size; col++) {
        for (let row = 0; row < size; row++) {
          if (data.isReserved(row, col)) continue;
          data.xor(row, col, getMaskAt(pattern, row, col));
        }
      }
    };
    exports.getBestMask = function getBestMask(data, setupFormatFunc) {
      const numPatterns = Object.keys(exports.Patterns).length;
      let bestPattern = 0;
      let lowerPenalty = Infinity;
      for (let p = 0; p < numPatterns; p++) {
        setupFormatFunc(p);
        exports.applyMask(p, data);
        const penalty = exports.getPenaltyN1(data) + exports.getPenaltyN2(data) + exports.getPenaltyN3(data) + exports.getPenaltyN4(data);
        exports.applyMask(p, data);
        if (penalty < lowerPenalty) {
          lowerPenalty = penalty;
          bestPattern = p;
        }
      }
      return bestPattern;
    };
  }
});

// node_modules/qrcode/lib/core/error-correction-code.js
var require_error_correction_code = __commonJS({
  "node_modules/qrcode/lib/core/error-correction-code.js"(exports) {
    var ECLevel = require_error_correction_level();
    var EC_BLOCKS_TABLE = [
      // L  M  Q  H
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      2,
      2,
      1,
      2,
      2,
      4,
      1,
      2,
      4,
      4,
      2,
      4,
      4,
      4,
      2,
      4,
      6,
      5,
      2,
      4,
      6,
      6,
      2,
      5,
      8,
      8,
      4,
      5,
      8,
      8,
      4,
      5,
      8,
      11,
      4,
      8,
      10,
      11,
      4,
      9,
      12,
      16,
      4,
      9,
      16,
      16,
      6,
      10,
      12,
      18,
      6,
      10,
      17,
      16,
      6,
      11,
      16,
      19,
      6,
      13,
      18,
      21,
      7,
      14,
      21,
      25,
      8,
      16,
      20,
      25,
      8,
      17,
      23,
      25,
      9,
      17,
      23,
      34,
      9,
      18,
      25,
      30,
      10,
      20,
      27,
      32,
      12,
      21,
      29,
      35,
      12,
      23,
      34,
      37,
      12,
      25,
      34,
      40,
      13,
      26,
      35,
      42,
      14,
      28,
      38,
      45,
      15,
      29,
      40,
      48,
      16,
      31,
      43,
      51,
      17,
      33,
      45,
      54,
      18,
      35,
      48,
      57,
      19,
      37,
      51,
      60,
      19,
      38,
      53,
      63,
      20,
      40,
      56,
      66,
      21,
      43,
      59,
      70,
      22,
      45,
      62,
      74,
      24,
      47,
      65,
      77,
      25,
      49,
      68,
      81
    ];
    var EC_CODEWORDS_TABLE = [
      // L  M  Q  H
      7,
      10,
      13,
      17,
      10,
      16,
      22,
      28,
      15,
      26,
      36,
      44,
      20,
      36,
      52,
      64,
      26,
      48,
      72,
      88,
      36,
      64,
      96,
      112,
      40,
      72,
      108,
      130,
      48,
      88,
      132,
      156,
      60,
      110,
      160,
      192,
      72,
      130,
      192,
      224,
      80,
      150,
      224,
      264,
      96,
      176,
      260,
      308,
      104,
      198,
      288,
      352,
      120,
      216,
      320,
      384,
      132,
      240,
      360,
      432,
      144,
      280,
      408,
      480,
      168,
      308,
      448,
      532,
      180,
      338,
      504,
      588,
      196,
      364,
      546,
      650,
      224,
      416,
      600,
      700,
      224,
      442,
      644,
      750,
      252,
      476,
      690,
      816,
      270,
      504,
      750,
      900,
      300,
      560,
      810,
      960,
      312,
      588,
      870,
      1050,
      336,
      644,
      952,
      1110,
      360,
      700,
      1020,
      1200,
      390,
      728,
      1050,
      1260,
      420,
      784,
      1140,
      1350,
      450,
      812,
      1200,
      1440,
      480,
      868,
      1290,
      1530,
      510,
      924,
      1350,
      1620,
      540,
      980,
      1440,
      1710,
      570,
      1036,
      1530,
      1800,
      570,
      1064,
      1590,
      1890,
      600,
      1120,
      1680,
      1980,
      630,
      1204,
      1770,
      2100,
      660,
      1260,
      1860,
      2220,
      720,
      1316,
      1950,
      2310,
      750,
      1372,
      2040,
      2430
    ];
    exports.getBlocksCount = function getBlocksCount(version, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 0];
        case ECLevel.M:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 2];
        case ECLevel.H:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
    exports.getTotalCodewordsCount = function getTotalCodewordsCount(version, errorCorrectionLevel) {
      switch (errorCorrectionLevel) {
        case ECLevel.L:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0];
        case ECLevel.M:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1];
        case ECLevel.Q:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2];
        case ECLevel.H:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3];
        default:
          return void 0;
      }
    };
  }
});

// node_modules/qrcode/lib/core/galois-field.js
var require_galois_field = __commonJS({
  "node_modules/qrcode/lib/core/galois-field.js"(exports) {
    var EXP_TABLE = new Uint8Array(512);
    var LOG_TABLE = new Uint8Array(256);
    (function initTables() {
      let x = 1;
      for (let i = 0; i < 255; i++) {
        EXP_TABLE[i] = x;
        LOG_TABLE[x] = i;
        x <<= 1;
        if (x & 256) {
          x ^= 285;
        }
      }
      for (let i = 255; i < 512; i++) {
        EXP_TABLE[i] = EXP_TABLE[i - 255];
      }
    })();
    exports.log = function log(n) {
      if (n < 1) throw new Error("log(" + n + ")");
      return LOG_TABLE[n];
    };
    exports.exp = function exp(n) {
      return EXP_TABLE[n];
    };
    exports.mul = function mul(x, y) {
      if (x === 0 || y === 0) return 0;
      return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
    };
  }
});

// node_modules/qrcode/lib/core/polynomial.js
var require_polynomial = __commonJS({
  "node_modules/qrcode/lib/core/polynomial.js"(exports) {
    var GF = require_galois_field();
    exports.mul = function mul(p1, p2) {
      const coeff = new Uint8Array(p1.length + p2.length - 1);
      for (let i = 0; i < p1.length; i++) {
        for (let j = 0; j < p2.length; j++) {
          coeff[i + j] ^= GF.mul(p1[i], p2[j]);
        }
      }
      return coeff;
    };
    exports.mod = function mod(divident, divisor) {
      let result = new Uint8Array(divident);
      while (result.length - divisor.length >= 0) {
        const coeff = result[0];
        for (let i = 0; i < divisor.length; i++) {
          result[i] ^= GF.mul(divisor[i], coeff);
        }
        let offset = 0;
        while (offset < result.length && result[offset] === 0) offset++;
        result = result.slice(offset);
      }
      return result;
    };
    exports.generateECPolynomial = function generateECPolynomial(degree) {
      let poly = new Uint8Array([1]);
      for (let i = 0; i < degree; i++) {
        poly = exports.mul(poly, new Uint8Array([1, GF.exp(i)]));
      }
      return poly;
    };
  }
});

// node_modules/qrcode/lib/core/reed-solomon-encoder.js
var require_reed_solomon_encoder = __commonJS({
  "node_modules/qrcode/lib/core/reed-solomon-encoder.js"(exports, module) {
    var Polynomial = require_polynomial();
    function ReedSolomonEncoder(degree) {
      this.genPoly = void 0;
      this.degree = degree;
      if (this.degree) this.initialize(this.degree);
    }
    ReedSolomonEncoder.prototype.initialize = function initialize(degree) {
      this.degree = degree;
      this.genPoly = Polynomial.generateECPolynomial(this.degree);
    };
    ReedSolomonEncoder.prototype.encode = function encode(data) {
      if (!this.genPoly) {
        throw new Error("Encoder not initialized");
      }
      const paddedData = new Uint8Array(data.length + this.degree);
      paddedData.set(data);
      const remainder = Polynomial.mod(paddedData, this.genPoly);
      const start = this.degree - remainder.length;
      if (start > 0) {
        const buff = new Uint8Array(this.degree);
        buff.set(remainder, start);
        return buff;
      }
      return remainder;
    };
    module.exports = ReedSolomonEncoder;
  }
});

// node_modules/qrcode/lib/core/version-check.js
var require_version_check = __commonJS({
  "node_modules/qrcode/lib/core/version-check.js"(exports) {
    exports.isValid = function isValid(version) {
      return !isNaN(version) && version >= 1 && version <= 40;
    };
  }
});

// node_modules/qrcode/lib/core/regex.js
var require_regex = __commonJS({
  "node_modules/qrcode/lib/core/regex.js"(exports) {
    var numeric = "[0-9]+";
    var alphanumeric = "[A-Z $%*+\\-./:]+";
    var kanji = "(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+";
    kanji = kanji.replace(/u/g, "\\u");
    var byte = "(?:(?![A-Z0-9 $%*+\\-./:]|" + kanji + ")(?:.|[\r\n]))+";
    exports.KANJI = new RegExp(kanji, "g");
    exports.BYTE_KANJI = new RegExp("[^A-Z0-9 $%*+\\-./:]+", "g");
    exports.BYTE = new RegExp(byte, "g");
    exports.NUMERIC = new RegExp(numeric, "g");
    exports.ALPHANUMERIC = new RegExp(alphanumeric, "g");
    var TEST_KANJI = new RegExp("^" + kanji + "$");
    var TEST_NUMERIC = new RegExp("^" + numeric + "$");
    var TEST_ALPHANUMERIC = new RegExp("^[A-Z0-9 $%*+\\-./:]+$");
    exports.testKanji = function testKanji(str) {
      return TEST_KANJI.test(str);
    };
    exports.testNumeric = function testNumeric(str) {
      return TEST_NUMERIC.test(str);
    };
    exports.testAlphanumeric = function testAlphanumeric(str) {
      return TEST_ALPHANUMERIC.test(str);
    };
  }
});

// node_modules/qrcode/lib/core/mode.js
var require_mode = __commonJS({
  "node_modules/qrcode/lib/core/mode.js"(exports) {
    var VersionCheck = require_version_check();
    var Regex = require_regex();
    exports.NUMERIC = {
      id: "Numeric",
      bit: 1 << 0,
      ccBits: [10, 12, 14]
    };
    exports.ALPHANUMERIC = {
      id: "Alphanumeric",
      bit: 1 << 1,
      ccBits: [9, 11, 13]
    };
    exports.BYTE = {
      id: "Byte",
      bit: 1 << 2,
      ccBits: [8, 16, 16]
    };
    exports.KANJI = {
      id: "Kanji",
      bit: 1 << 3,
      ccBits: [8, 10, 12]
    };
    exports.MIXED = {
      bit: -1
    };
    exports.getCharCountIndicator = function getCharCountIndicator(mode, version) {
      if (!mode.ccBits) throw new Error("Invalid mode: " + mode);
      if (!VersionCheck.isValid(version)) {
        throw new Error("Invalid version: " + version);
      }
      if (version >= 1 && version < 10) return mode.ccBits[0];
      else if (version < 27) return mode.ccBits[1];
      return mode.ccBits[2];
    };
    exports.getBestModeForData = function getBestModeForData(dataStr) {
      if (Regex.testNumeric(dataStr)) return exports.NUMERIC;
      else if (Regex.testAlphanumeric(dataStr)) return exports.ALPHANUMERIC;
      else if (Regex.testKanji(dataStr)) return exports.KANJI;
      else return exports.BYTE;
    };
    exports.toString = function toString(mode) {
      if (mode && mode.id) return mode.id;
      throw new Error("Invalid mode");
    };
    exports.isValid = function isValid(mode) {
      return mode && mode.bit && mode.ccBits;
    };
    function fromString(string) {
      if (typeof string !== "string") {
        throw new Error("Param is not a string");
      }
      const lcStr = string.toLowerCase();
      switch (lcStr) {
        case "numeric":
          return exports.NUMERIC;
        case "alphanumeric":
          return exports.ALPHANUMERIC;
        case "kanji":
          return exports.KANJI;
        case "byte":
          return exports.BYTE;
        default:
          throw new Error("Unknown mode: " + string);
      }
    }
    exports.from = function from(value, defaultValue) {
      if (exports.isValid(value)) {
        return value;
      }
      try {
        return fromString(value);
      } catch (e) {
        return defaultValue;
      }
    };
  }
});

// node_modules/qrcode/lib/core/version.js
var require_version = __commonJS({
  "node_modules/qrcode/lib/core/version.js"(exports) {
    var Utils = require_utils();
    var ECCode = require_error_correction_code();
    var ECLevel = require_error_correction_level();
    var Mode = require_mode();
    var VersionCheck = require_version_check();
    var G18 = 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0;
    var G18_BCH = Utils.getBCHDigit(G18);
    function getBestVersionForDataLength(mode, length, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    function getReservedBitsCount(mode, version) {
      return Mode.getCharCountIndicator(mode, version) + 4;
    }
    function getTotalBitsFromDataArray(segments, version) {
      let totalBits = 0;
      segments.forEach(function(data) {
        const reservedBits = getReservedBitsCount(data.mode, version);
        totalBits += reservedBits + data.getBitsLength();
      });
      return totalBits;
    }
    function getBestVersionForMixedData(segments, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        const length = getTotalBitsFromDataArray(segments, currentVersion);
        if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, Mode.MIXED)) {
          return currentVersion;
        }
      }
      return void 0;
    }
    exports.from = function from(value, defaultValue) {
      if (VersionCheck.isValid(value)) {
        return parseInt(value, 10);
      }
      return defaultValue;
    };
    exports.getCapacity = function getCapacity(version, errorCorrectionLevel, mode) {
      if (!VersionCheck.isValid(version)) {
        throw new Error("Invalid QR Code version");
      }
      if (typeof mode === "undefined") mode = Mode.BYTE;
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (mode === Mode.MIXED) return dataTotalCodewordsBits;
      const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode, version);
      switch (mode) {
        case Mode.NUMERIC:
          return Math.floor(usableBits / 10 * 3);
        case Mode.ALPHANUMERIC:
          return Math.floor(usableBits / 11 * 2);
        case Mode.KANJI:
          return Math.floor(usableBits / 13);
        case Mode.BYTE:
        default:
          return Math.floor(usableBits / 8);
      }
    };
    exports.getBestVersionForData = function getBestVersionForData(data, errorCorrectionLevel) {
      let seg;
      const ecl = ECLevel.from(errorCorrectionLevel, ECLevel.M);
      if (Array.isArray(data)) {
        if (data.length > 1) {
          return getBestVersionForMixedData(data, ecl);
        }
        if (data.length === 0) {
          return 1;
        }
        seg = data[0];
      } else {
        seg = data;
      }
      return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl);
    };
    exports.getEncodedBits = function getEncodedBits(version) {
      if (!VersionCheck.isValid(version) || version < 7) {
        throw new Error("Invalid QR Code version");
      }
      let d = version << 12;
      while (Utils.getBCHDigit(d) - G18_BCH >= 0) {
        d ^= G18 << Utils.getBCHDigit(d) - G18_BCH;
      }
      return version << 12 | d;
    };
  }
});

// node_modules/qrcode/lib/core/format-info.js
var require_format_info = __commonJS({
  "node_modules/qrcode/lib/core/format-info.js"(exports) {
    var Utils = require_utils();
    var G15 = 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0;
    var G15_MASK = 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1;
    var G15_BCH = Utils.getBCHDigit(G15);
    exports.getEncodedBits = function getEncodedBits(errorCorrectionLevel, mask) {
      const data = errorCorrectionLevel.bit << 3 | mask;
      let d = data << 10;
      while (Utils.getBCHDigit(d) - G15_BCH >= 0) {
        d ^= G15 << Utils.getBCHDigit(d) - G15_BCH;
      }
      return (data << 10 | d) ^ G15_MASK;
    };
  }
});

// node_modules/qrcode/lib/core/numeric-data.js
var require_numeric_data = __commonJS({
  "node_modules/qrcode/lib/core/numeric-data.js"(exports, module) {
    var Mode = require_mode();
    function NumericData(data) {
      this.mode = Mode.NUMERIC;
      this.data = data.toString();
    }
    NumericData.getBitsLength = function getBitsLength(length) {
      return 10 * Math.floor(length / 3) + (length % 3 ? length % 3 * 3 + 1 : 0);
    };
    NumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    NumericData.prototype.getBitsLength = function getBitsLength() {
      return NumericData.getBitsLength(this.data.length);
    };
    NumericData.prototype.write = function write(bitBuffer) {
      let i, group, value;
      for (i = 0; i + 3 <= this.data.length; i += 3) {
        group = this.data.substr(i, 3);
        value = parseInt(group, 10);
        bitBuffer.put(value, 10);
      }
      const remainingNum = this.data.length - i;
      if (remainingNum > 0) {
        group = this.data.substr(i);
        value = parseInt(group, 10);
        bitBuffer.put(value, remainingNum * 3 + 1);
      }
    };
    module.exports = NumericData;
  }
});

// node_modules/qrcode/lib/core/alphanumeric-data.js
var require_alphanumeric_data = __commonJS({
  "node_modules/qrcode/lib/core/alphanumeric-data.js"(exports, module) {
    var Mode = require_mode();
    var ALPHA_NUM_CHARS = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z",
      " ",
      "$",
      "%",
      "*",
      "+",
      "-",
      ".",
      "/",
      ":"
    ];
    function AlphanumericData(data) {
      this.mode = Mode.ALPHANUMERIC;
      this.data = data;
    }
    AlphanumericData.getBitsLength = function getBitsLength(length) {
      return 11 * Math.floor(length / 2) + 6 * (length % 2);
    };
    AlphanumericData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    AlphanumericData.prototype.getBitsLength = function getBitsLength() {
      return AlphanumericData.getBitsLength(this.data.length);
    };
    AlphanumericData.prototype.write = function write(bitBuffer) {
      let i;
      for (i = 0; i + 2 <= this.data.length; i += 2) {
        let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;
        value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);
        bitBuffer.put(value, 11);
      }
      if (this.data.length % 2) {
        bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
      }
    };
    module.exports = AlphanumericData;
  }
});

// node_modules/qrcode/lib/core/byte-data.js
var require_byte_data = __commonJS({
  "node_modules/qrcode/lib/core/byte-data.js"(exports, module) {
    var Mode = require_mode();
    function ByteData(data) {
      this.mode = Mode.BYTE;
      if (typeof data === "string") {
        this.data = new TextEncoder().encode(data);
      } else {
        this.data = new Uint8Array(data);
      }
    }
    ByteData.getBitsLength = function getBitsLength(length) {
      return length * 8;
    };
    ByteData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    ByteData.prototype.getBitsLength = function getBitsLength() {
      return ByteData.getBitsLength(this.data.length);
    };
    ByteData.prototype.write = function(bitBuffer) {
      for (let i = 0, l = this.data.length; i < l; i++) {
        bitBuffer.put(this.data[i], 8);
      }
    };
    module.exports = ByteData;
  }
});

// node_modules/qrcode/lib/core/kanji-data.js
var require_kanji_data = __commonJS({
  "node_modules/qrcode/lib/core/kanji-data.js"(exports, module) {
    var Mode = require_mode();
    var Utils = require_utils();
    function KanjiData(data) {
      this.mode = Mode.KANJI;
      this.data = data;
    }
    KanjiData.getBitsLength = function getBitsLength(length) {
      return length * 13;
    };
    KanjiData.prototype.getLength = function getLength() {
      return this.data.length;
    };
    KanjiData.prototype.getBitsLength = function getBitsLength() {
      return KanjiData.getBitsLength(this.data.length);
    };
    KanjiData.prototype.write = function(bitBuffer) {
      let i;
      for (i = 0; i < this.data.length; i++) {
        let value = Utils.toSJIS(this.data[i]);
        if (value >= 33088 && value <= 40956) {
          value -= 33088;
        } else if (value >= 57408 && value <= 60351) {
          value -= 49472;
        } else {
          throw new Error(
            "Invalid SJIS character: " + this.data[i] + "\nMake sure your charset is UTF-8"
          );
        }
        value = (value >>> 8 & 255) * 192 + (value & 255);
        bitBuffer.put(value, 13);
      }
    };
    module.exports = KanjiData;
  }
});

// node_modules/dijkstrajs/dijkstra.js
var require_dijkstra = __commonJS({
  "node_modules/dijkstrajs/dijkstra.js"(exports, module) {
    "use strict";
    var dijkstra = {
      single_source_shortest_paths: function(graph, s, d) {
        var predecessors = {};
        var costs = {};
        costs[s] = 0;
        var open = dijkstra.PriorityQueue.make();
        open.push(s, 0);
        var closest, u, v, cost_of_s_to_u, adjacent_nodes, cost_of_e, cost_of_s_to_u_plus_cost_of_e, cost_of_s_to_v, first_visit;
        while (!open.empty()) {
          closest = open.pop();
          u = closest.value;
          cost_of_s_to_u = closest.cost;
          adjacent_nodes = graph[u] || {};
          for (v in adjacent_nodes) {
            if (adjacent_nodes.hasOwnProperty(v)) {
              cost_of_e = adjacent_nodes[v];
              cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;
              cost_of_s_to_v = costs[v];
              first_visit = typeof costs[v] === "undefined";
              if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
                costs[v] = cost_of_s_to_u_plus_cost_of_e;
                open.push(v, cost_of_s_to_u_plus_cost_of_e);
                predecessors[v] = u;
              }
            }
          }
        }
        if (typeof d !== "undefined" && typeof costs[d] === "undefined") {
          var msg = ["Could not find a path from ", s, " to ", d, "."].join("");
          throw new Error(msg);
        }
        return predecessors;
      },
      extract_shortest_path_from_predecessor_list: function(predecessors, d) {
        var nodes = [];
        var u = d;
        var predecessor;
        while (u) {
          nodes.push(u);
          predecessor = predecessors[u];
          u = predecessors[u];
        }
        nodes.reverse();
        return nodes;
      },
      find_path: function(graph, s, d) {
        var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
        return dijkstra.extract_shortest_path_from_predecessor_list(
          predecessors,
          d
        );
      },
      /**
       * A very naive priority queue implementation.
       */
      PriorityQueue: {
        make: function(opts) {
          var T = dijkstra.PriorityQueue, t = {}, key;
          opts = opts || {};
          for (key in T) {
            if (T.hasOwnProperty(key)) {
              t[key] = T[key];
            }
          }
          t.queue = [];
          t.sorter = opts.sorter || T.default_sorter;
          return t;
        },
        default_sorter: function(a, b) {
          return a.cost - b.cost;
        },
        /**
         * Add a new item to the queue and ensure the highest priority element
         * is at the front of the queue.
         */
        push: function(value, cost) {
          var item = { value, cost };
          this.queue.push(item);
          this.queue.sort(this.sorter);
        },
        /**
         * Return the highest priority element in the queue.
         */
        pop: function() {
          return this.queue.shift();
        },
        empty: function() {
          return this.queue.length === 0;
        }
      }
    };
    if (typeof module !== "undefined") {
      module.exports = dijkstra;
    }
  }
});

// node_modules/qrcode/lib/core/segments.js
var require_segments = __commonJS({
  "node_modules/qrcode/lib/core/segments.js"(exports) {
    var Mode = require_mode();
    var NumericData = require_numeric_data();
    var AlphanumericData = require_alphanumeric_data();
    var ByteData = require_byte_data();
    var KanjiData = require_kanji_data();
    var Regex = require_regex();
    var Utils = require_utils();
    var dijkstra = require_dijkstra();
    function getStringByteLength(str) {
      return unescape(encodeURIComponent(str)).length;
    }
    function getSegments(regex, mode, str) {
      const segments = [];
      let result;
      while ((result = regex.exec(str)) !== null) {
        segments.push({
          data: result[0],
          index: result.index,
          mode,
          length: result[0].length
        });
      }
      return segments;
    }
    function getSegmentsFromString(dataStr) {
      const numSegs = getSegments(Regex.NUMERIC, Mode.NUMERIC, dataStr);
      const alphaNumSegs = getSegments(Regex.ALPHANUMERIC, Mode.ALPHANUMERIC, dataStr);
      let byteSegs;
      let kanjiSegs;
      if (Utils.isKanjiModeEnabled()) {
        byteSegs = getSegments(Regex.BYTE, Mode.BYTE, dataStr);
        kanjiSegs = getSegments(Regex.KANJI, Mode.KANJI, dataStr);
      } else {
        byteSegs = getSegments(Regex.BYTE_KANJI, Mode.BYTE, dataStr);
        kanjiSegs = [];
      }
      const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);
      return segs.sort(function(s1, s2) {
        return s1.index - s2.index;
      }).map(function(obj) {
        return {
          data: obj.data,
          mode: obj.mode,
          length: obj.length
        };
      });
    }
    function getSegmentBitsLength(length, mode) {
      switch (mode) {
        case Mode.NUMERIC:
          return NumericData.getBitsLength(length);
        case Mode.ALPHANUMERIC:
          return AlphanumericData.getBitsLength(length);
        case Mode.KANJI:
          return KanjiData.getBitsLength(length);
        case Mode.BYTE:
          return ByteData.getBitsLength(length);
      }
    }
    function mergeSegments(segs) {
      return segs.reduce(function(acc, curr) {
        const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
        if (prevSeg && prevSeg.mode === curr.mode) {
          acc[acc.length - 1].data += curr.data;
          return acc;
        }
        acc.push(curr);
        return acc;
      }, []);
    }
    function buildNodes(segs) {
      const nodes = [];
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        switch (seg.mode) {
          case Mode.NUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.ALPHANUMERIC, length: seg.length },
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.ALPHANUMERIC:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: seg.length }
            ]);
            break;
          case Mode.KANJI:
            nodes.push([
              seg,
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
            break;
          case Mode.BYTE:
            nodes.push([
              { data: seg.data, mode: Mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
        }
      }
      return nodes;
    }
    function buildGraph(nodes, version) {
      const table = {};
      const graph = { start: {} };
      let prevNodeIds = ["start"];
      for (let i = 0; i < nodes.length; i++) {
        const nodeGroup = nodes[i];
        const currentNodeIds = [];
        for (let j = 0; j < nodeGroup.length; j++) {
          const node = nodeGroup[j];
          const key = "" + i + j;
          currentNodeIds.push(key);
          table[key] = { node, lastCount: 0 };
          graph[key] = {};
          for (let n = 0; n < prevNodeIds.length; n++) {
            const prevNodeId = prevNodeIds[n];
            if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
              graph[prevNodeId][key] = getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) - getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);
              table[prevNodeId].lastCount += node.length;
            } else {
              if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;
              graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) + 4 + Mode.getCharCountIndicator(node.mode, version);
            }
          }
        }
        prevNodeIds = currentNodeIds;
      }
      for (let n = 0; n < prevNodeIds.length; n++) {
        graph[prevNodeIds[n]].end = 0;
      }
      return { map: graph, table };
    }
    function buildSingleSegment(data, modesHint) {
      let mode;
      const bestMode = Mode.getBestModeForData(data);
      mode = Mode.from(modesHint, bestMode);
      if (mode !== Mode.BYTE && mode.bit < bestMode.bit) {
        throw new Error('"' + data + '" cannot be encoded with mode ' + Mode.toString(mode) + ".\n Suggested mode is: " + Mode.toString(bestMode));
      }
      if (mode === Mode.KANJI && !Utils.isKanjiModeEnabled()) {
        mode = Mode.BYTE;
      }
      switch (mode) {
        case Mode.NUMERIC:
          return new NumericData(data);
        case Mode.ALPHANUMERIC:
          return new AlphanumericData(data);
        case Mode.KANJI:
          return new KanjiData(data);
        case Mode.BYTE:
          return new ByteData(data);
      }
    }
    exports.fromArray = function fromArray(array) {
      return array.reduce(function(acc, seg) {
        if (typeof seg === "string") {
          acc.push(buildSingleSegment(seg, null));
        } else if (seg.data) {
          acc.push(buildSingleSegment(seg.data, seg.mode));
        }
        return acc;
      }, []);
    };
    exports.fromString = function fromString(data, version) {
      const segs = getSegmentsFromString(data, Utils.isKanjiModeEnabled());
      const nodes = buildNodes(segs);
      const graph = buildGraph(nodes, version);
      const path = dijkstra.find_path(graph.map, "start", "end");
      const optimizedSegs = [];
      for (let i = 1; i < path.length - 1; i++) {
        optimizedSegs.push(graph.table[path[i]].node);
      }
      return exports.fromArray(mergeSegments(optimizedSegs));
    };
    exports.rawSplit = function rawSplit(data) {
      return exports.fromArray(
        getSegmentsFromString(data, Utils.isKanjiModeEnabled())
      );
    };
  }
});

// node_modules/qrcode/lib/core/qrcode.js
var require_qrcode = __commonJS({
  "node_modules/qrcode/lib/core/qrcode.js"(exports) {
    var Utils = require_utils();
    var ECLevel = require_error_correction_level();
    var BitBuffer = require_bit_buffer();
    var BitMatrix = require_bit_matrix();
    var AlignmentPattern = require_alignment_pattern();
    var FinderPattern = require_finder_pattern();
    var MaskPattern = require_mask_pattern();
    var ECCode = require_error_correction_code();
    var ReedSolomonEncoder = require_reed_solomon_encoder();
    var Version = require_version();
    var FormatInfo = require_format_info();
    var Mode = require_mode();
    var Segments = require_segments();
    function setupFinderPattern(matrix, version) {
      const size = matrix.size;
      const pos = FinderPattern.getPositions(version);
      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];
        for (let r = -1; r <= 7; r++) {
          if (row + r <= -1 || size <= row + r) continue;
          for (let c = -1; c <= 7; c++) {
            if (col + c <= -1 || size <= col + c) continue;
            if (r >= 0 && r <= 6 && (c === 0 || c === 6) || c >= 0 && c <= 6 && (r === 0 || r === 6) || r >= 2 && r <= 4 && c >= 2 && c <= 4) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupTimingPattern(matrix) {
      const size = matrix.size;
      for (let r = 8; r < size - 8; r++) {
        const value = r % 2 === 0;
        matrix.set(r, 6, value, true);
        matrix.set(6, r, value, true);
      }
    }
    function setupAlignmentPattern(matrix, version) {
      const pos = AlignmentPattern.getPositions(version);
      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 || r === 0 && c === 0) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }
    function setupVersionInfo(matrix, version) {
      const size = matrix.size;
      const bits = Version.getEncodedBits(version);
      let row, col, mod;
      for (let i = 0; i < 18; i++) {
        row = Math.floor(i / 3);
        col = i % 3 + size - 8 - 3;
        mod = (bits >> i & 1) === 1;
        matrix.set(row, col, mod, true);
        matrix.set(col, row, mod, true);
      }
    }
    function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
      const size = matrix.size;
      const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
      let i, mod;
      for (i = 0; i < 15; i++) {
        mod = (bits >> i & 1) === 1;
        if (i < 6) {
          matrix.set(i, 8, mod, true);
        } else if (i < 8) {
          matrix.set(i + 1, 8, mod, true);
        } else {
          matrix.set(size - 15 + i, 8, mod, true);
        }
        if (i < 8) {
          matrix.set(8, size - i - 1, mod, true);
        } else if (i < 9) {
          matrix.set(8, 15 - i - 1 + 1, mod, true);
        } else {
          matrix.set(8, 15 - i - 1, mod, true);
        }
      }
      matrix.set(size - 8, 8, 1, true);
    }
    function setupData(matrix, data) {
      const size = matrix.size;
      let inc = -1;
      let row = size - 1;
      let bitIndex = 7;
      let byteIndex = 0;
      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--;
        while (true) {
          for (let c = 0; c < 2; c++) {
            if (!matrix.isReserved(row, col - c)) {
              let dark = false;
              if (byteIndex < data.length) {
                dark = (data[byteIndex] >>> bitIndex & 1) === 1;
              }
              matrix.set(row, col - c, dark);
              bitIndex--;
              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }
          row += inc;
          if (row < 0 || size <= row) {
            row -= inc;
            inc = -inc;
            break;
          }
        }
      }
    }
    function createData(version, errorCorrectionLevel, segments) {
      const buffer = new BitBuffer();
      segments.forEach(function(data) {
        buffer.put(data.mode.bit, 4);
        buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version));
        data.write(buffer);
      });
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
      if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
        buffer.put(0, 4);
      }
      while (buffer.getLengthInBits() % 8 !== 0) {
        buffer.putBit(0);
      }
      const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
      for (let i = 0; i < remainingByte; i++) {
        buffer.put(i % 2 ? 17 : 236, 8);
      }
      return createCodewords(buffer, version, errorCorrectionLevel);
    }
    function createCodewords(bitBuffer, version, errorCorrectionLevel) {
      const totalCodewords = Utils.getSymbolTotalCodewords(version);
      const ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewords = totalCodewords - ecTotalCodewords;
      const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);
      const blocksInGroup2 = totalCodewords % ecTotalBlocks;
      const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;
      const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
      const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
      const rs = new ReedSolomonEncoder(ecCount);
      let offset = 0;
      const dcData = new Array(ecTotalBlocks);
      const ecData = new Array(ecTotalBlocks);
      let maxDataSize = 0;
      const buffer = new Uint8Array(bitBuffer.buffer);
      for (let b = 0; b < ecTotalBlocks; b++) {
        const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
        dcData[b] = buffer.slice(offset, offset + dataSize);
        ecData[b] = rs.encode(dcData[b]);
        offset += dataSize;
        maxDataSize = Math.max(maxDataSize, dataSize);
      }
      const data = new Uint8Array(totalCodewords);
      let index = 0;
      let i, r;
      for (i = 0; i < maxDataSize; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          if (i < dcData[r].length) {
            data[index++] = dcData[r][i];
          }
        }
      }
      for (i = 0; i < ecCount; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          data[index++] = ecData[r][i];
        }
      }
      return data;
    }
    function createSymbol(data, version, errorCorrectionLevel, maskPattern) {
      let segments;
      if (Array.isArray(data)) {
        segments = Segments.fromArray(data);
      } else if (typeof data === "string") {
        let estimatedVersion = version;
        if (!estimatedVersion) {
          const rawSegments = Segments.rawSplit(data);
          estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
        }
        segments = Segments.fromString(data, estimatedVersion || 40);
      } else {
        throw new Error("Invalid data");
      }
      const bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);
      if (!bestVersion) {
        throw new Error("The amount of data is too big to be stored in a QR Code");
      }
      if (!version) {
        version = bestVersion;
      } else if (version < bestVersion) {
        throw new Error(
          "\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: " + bestVersion + ".\n"
        );
      }
      const dataBits = createData(version, errorCorrectionLevel, segments);
      const moduleCount = Utils.getSymbolSize(version);
      const modules = new BitMatrix(moduleCount);
      setupFinderPattern(modules, version);
      setupTimingPattern(modules);
      setupAlignmentPattern(modules, version);
      setupFormatInfo(modules, errorCorrectionLevel, 0);
      if (version >= 7) {
        setupVersionInfo(modules, version);
      }
      setupData(modules, dataBits);
      if (isNaN(maskPattern)) {
        maskPattern = MaskPattern.getBestMask(
          modules,
          setupFormatInfo.bind(null, modules, errorCorrectionLevel)
        );
      }
      MaskPattern.applyMask(maskPattern, modules);
      setupFormatInfo(modules, errorCorrectionLevel, maskPattern);
      return {
        modules,
        version,
        errorCorrectionLevel,
        maskPattern,
        segments
      };
    }
    exports.create = function create(data, options) {
      if (typeof data === "undefined" || data === "") {
        throw new Error("No input text");
      }
      let errorCorrectionLevel = ECLevel.M;
      let version;
      let mask;
      if (typeof options !== "undefined") {
        errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M);
        version = Version.from(options.version);
        mask = MaskPattern.from(options.maskPattern);
        if (options.toSJISFunc) {
          Utils.setToSJISFunction(options.toSJISFunc);
        }
      }
      return createSymbol(data, version, errorCorrectionLevel, mask);
    };
  }
});

// node_modules/pngjs/lib/chunkstream.js
var require_chunkstream = __commonJS({
  "node_modules/pngjs/lib/chunkstream.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var ChunkStream = module.exports = function() {
      Stream.call(this);
      this._buffers = [];
      this._buffered = 0;
      this._reads = [];
      this._paused = false;
      this._encoding = "utf8";
      this.writable = true;
    };
    util.inherits(ChunkStream, Stream);
    ChunkStream.prototype.read = function(length, callback) {
      this._reads.push({
        length: Math.abs(length),
        // if length < 0 then at most this length
        allowLess: length < 0,
        func: callback
      });
      process.nextTick(
        function() {
          this._process();
          if (this._paused && this._reads && this._reads.length > 0) {
            this._paused = false;
            this.emit("drain");
          }
        }.bind(this)
      );
    };
    ChunkStream.prototype.write = function(data, encoding) {
      if (!this.writable) {
        this.emit("error", new Error("Stream not writable"));
        return false;
      }
      let dataBuffer;
      if (Buffer.isBuffer(data)) {
        dataBuffer = data;
      } else {
        dataBuffer = Buffer.from(data, encoding || this._encoding);
      }
      this._buffers.push(dataBuffer);
      this._buffered += dataBuffer.length;
      this._process();
      if (this._reads && this._reads.length === 0) {
        this._paused = true;
      }
      return this.writable && !this._paused;
    };
    ChunkStream.prototype.end = function(data, encoding) {
      if (data) {
        this.write(data, encoding);
      }
      this.writable = false;
      if (!this._buffers) {
        return;
      }
      if (this._buffers.length === 0) {
        this._end();
      } else {
        this._buffers.push(null);
        this._process();
      }
    };
    ChunkStream.prototype.destroySoon = ChunkStream.prototype.end;
    ChunkStream.prototype._end = function() {
      if (this._reads.length > 0) {
        this.emit("error", new Error("Unexpected end of input"));
      }
      this.destroy();
    };
    ChunkStream.prototype.destroy = function() {
      if (!this._buffers) {
        return;
      }
      this.writable = false;
      this._reads = null;
      this._buffers = null;
      this.emit("close");
    };
    ChunkStream.prototype._processReadAllowingLess = function(read) {
      this._reads.shift();
      let smallerBuf = this._buffers[0];
      if (smallerBuf.length > read.length) {
        this._buffered -= read.length;
        this._buffers[0] = smallerBuf.slice(read.length);
        read.func.call(this, smallerBuf.slice(0, read.length));
      } else {
        this._buffered -= smallerBuf.length;
        this._buffers.shift();
        read.func.call(this, smallerBuf);
      }
    };
    ChunkStream.prototype._processRead = function(read) {
      this._reads.shift();
      let pos = 0;
      let count = 0;
      let data = Buffer.alloc(read.length);
      while (pos < read.length) {
        let buf = this._buffers[count++];
        let len = Math.min(buf.length, read.length - pos);
        buf.copy(data, pos, 0, len);
        pos += len;
        if (len !== buf.length) {
          this._buffers[--count] = buf.slice(len);
        }
      }
      if (count > 0) {
        this._buffers.splice(0, count);
      }
      this._buffered -= read.length;
      read.func.call(this, data);
    };
    ChunkStream.prototype._process = function() {
      try {
        while (this._buffered > 0 && this._reads && this._reads.length > 0) {
          let read = this._reads[0];
          if (read.allowLess) {
            this._processReadAllowingLess(read);
          } else if (this._buffered >= read.length) {
            this._processRead(read);
          } else {
            break;
          }
        }
        if (this._buffers && !this.writable) {
          this._end();
        }
      } catch (ex) {
        this.emit("error", ex);
      }
    };
  }
});

// node_modules/pngjs/lib/interlace.js
var require_interlace = __commonJS({
  "node_modules/pngjs/lib/interlace.js"(exports) {
    "use strict";
    var imagePasses = [
      {
        // pass 1 - 1px
        x: [0],
        y: [0]
      },
      {
        // pass 2 - 1px
        x: [4],
        y: [0]
      },
      {
        // pass 3 - 2px
        x: [0, 4],
        y: [4]
      },
      {
        // pass 4 - 4px
        x: [2, 6],
        y: [0, 4]
      },
      {
        // pass 5 - 8px
        x: [0, 2, 4, 6],
        y: [2, 6]
      },
      {
        // pass 6 - 16px
        x: [1, 3, 5, 7],
        y: [0, 2, 4, 6]
      },
      {
        // pass 7 - 32px
        x: [0, 1, 2, 3, 4, 5, 6, 7],
        y: [1, 3, 5, 7]
      }
    ];
    exports.getImagePasses = function(width, height) {
      let images = [];
      let xLeftOver = width % 8;
      let yLeftOver = height % 8;
      let xRepeats = (width - xLeftOver) / 8;
      let yRepeats = (height - yLeftOver) / 8;
      for (let i = 0; i < imagePasses.length; i++) {
        let pass = imagePasses[i];
        let passWidth = xRepeats * pass.x.length;
        let passHeight = yRepeats * pass.y.length;
        for (let j = 0; j < pass.x.length; j++) {
          if (pass.x[j] < xLeftOver) {
            passWidth++;
          } else {
            break;
          }
        }
        for (let j = 0; j < pass.y.length; j++) {
          if (pass.y[j] < yLeftOver) {
            passHeight++;
          } else {
            break;
          }
        }
        if (passWidth > 0 && passHeight > 0) {
          images.push({ width: passWidth, height: passHeight, index: i });
        }
      }
      return images;
    };
    exports.getInterlaceIterator = function(width) {
      return function(x, y, pass) {
        let outerXLeftOver = x % imagePasses[pass].x.length;
        let outerX = (x - outerXLeftOver) / imagePasses[pass].x.length * 8 + imagePasses[pass].x[outerXLeftOver];
        let outerYLeftOver = y % imagePasses[pass].y.length;
        let outerY = (y - outerYLeftOver) / imagePasses[pass].y.length * 8 + imagePasses[pass].y[outerYLeftOver];
        return outerX * 4 + outerY * width * 4;
      };
    };
  }
});

// node_modules/pngjs/lib/paeth-predictor.js
var require_paeth_predictor = __commonJS({
  "node_modules/pngjs/lib/paeth-predictor.js"(exports, module) {
    "use strict";
    module.exports = function paethPredictor(left, above, upLeft) {
      let paeth = left + above - upLeft;
      let pLeft = Math.abs(paeth - left);
      let pAbove = Math.abs(paeth - above);
      let pUpLeft = Math.abs(paeth - upLeft);
      if (pLeft <= pAbove && pLeft <= pUpLeft) {
        return left;
      }
      if (pAbove <= pUpLeft) {
        return above;
      }
      return upLeft;
    };
  }
});

// node_modules/pngjs/lib/filter-parse.js
var require_filter_parse = __commonJS({
  "node_modules/pngjs/lib/filter-parse.js"(exports, module) {
    "use strict";
    var interlaceUtils = require_interlace();
    var paethPredictor = require_paeth_predictor();
    function getByteWidth(width, bpp, depth) {
      let byteWidth = width * bpp;
      if (depth !== 8) {
        byteWidth = Math.ceil(byteWidth / (8 / depth));
      }
      return byteWidth;
    }
    var Filter = module.exports = function(bitmapInfo, dependencies) {
      let width = bitmapInfo.width;
      let height = bitmapInfo.height;
      let interlace = bitmapInfo.interlace;
      let bpp = bitmapInfo.bpp;
      let depth = bitmapInfo.depth;
      this.read = dependencies.read;
      this.write = dependencies.write;
      this.complete = dependencies.complete;
      this._imageIndex = 0;
      this._images = [];
      if (interlace) {
        let passes = interlaceUtils.getImagePasses(width, height);
        for (let i = 0; i < passes.length; i++) {
          this._images.push({
            byteWidth: getByteWidth(passes[i].width, bpp, depth),
            height: passes[i].height,
            lineIndex: 0
          });
        }
      } else {
        this._images.push({
          byteWidth: getByteWidth(width, bpp, depth),
          height,
          lineIndex: 0
        });
      }
      if (depth === 8) {
        this._xComparison = bpp;
      } else if (depth === 16) {
        this._xComparison = bpp * 2;
      } else {
        this._xComparison = 1;
      }
    };
    Filter.prototype.start = function() {
      this.read(
        this._images[this._imageIndex].byteWidth + 1,
        this._reverseFilterLine.bind(this)
      );
    };
    Filter.prototype._unFilterType1 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f1Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        unfilteredLine[x] = rawByte + f1Left;
      }
    };
    Filter.prototype._unFilterType2 = function(rawData, unfilteredLine, byteWidth) {
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f2Up = lastLine ? lastLine[x] : 0;
        unfilteredLine[x] = rawByte + f2Up;
      }
    };
    Filter.prototype._unFilterType3 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f3Up = lastLine ? lastLine[x] : 0;
        let f3Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        let f3Add = Math.floor((f3Left + f3Up) / 2);
        unfilteredLine[x] = rawByte + f3Add;
      }
    };
    Filter.prototype._unFilterType4 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f4Up = lastLine ? lastLine[x] : 0;
        let f4Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        let f4UpLeft = x > xBiggerThan && lastLine ? lastLine[x - xComparison] : 0;
        let f4Add = paethPredictor(f4Left, f4Up, f4UpLeft);
        unfilteredLine[x] = rawByte + f4Add;
      }
    };
    Filter.prototype._reverseFilterLine = function(rawData) {
      let filter = rawData[0];
      let unfilteredLine;
      let currentImage = this._images[this._imageIndex];
      let byteWidth = currentImage.byteWidth;
      if (filter === 0) {
        unfilteredLine = rawData.slice(1, byteWidth + 1);
      } else {
        unfilteredLine = Buffer.alloc(byteWidth);
        switch (filter) {
          case 1:
            this._unFilterType1(rawData, unfilteredLine, byteWidth);
            break;
          case 2:
            this._unFilterType2(rawData, unfilteredLine, byteWidth);
            break;
          case 3:
            this._unFilterType3(rawData, unfilteredLine, byteWidth);
            break;
          case 4:
            this._unFilterType4(rawData, unfilteredLine, byteWidth);
            break;
          default:
            throw new Error("Unrecognised filter type - " + filter);
        }
      }
      this.write(unfilteredLine);
      currentImage.lineIndex++;
      if (currentImage.lineIndex >= currentImage.height) {
        this._lastLine = null;
        this._imageIndex++;
        currentImage = this._images[this._imageIndex];
      } else {
        this._lastLine = unfilteredLine;
      }
      if (currentImage) {
        this.read(currentImage.byteWidth + 1, this._reverseFilterLine.bind(this));
      } else {
        this._lastLine = null;
        this.complete();
      }
    };
  }
});

// node_modules/pngjs/lib/filter-parse-async.js
var require_filter_parse_async = __commonJS({
  "node_modules/pngjs/lib/filter-parse-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var ChunkStream = require_chunkstream();
    var Filter = require_filter_parse();
    var FilterAsync = module.exports = function(bitmapInfo) {
      ChunkStream.call(this);
      let buffers = [];
      let that = this;
      this._filter = new Filter(bitmapInfo, {
        read: this.read.bind(this),
        write: function(buffer) {
          buffers.push(buffer);
        },
        complete: function() {
          that.emit("complete", Buffer.concat(buffers));
        }
      });
      this._filter.start();
    };
    util.inherits(FilterAsync, ChunkStream);
  }
});

// node_modules/pngjs/lib/constants.js
var require_constants = __commonJS({
  "node_modules/pngjs/lib/constants.js"(exports, module) {
    "use strict";
    module.exports = {
      PNG_SIGNATURE: [137, 80, 78, 71, 13, 10, 26, 10],
      TYPE_IHDR: 1229472850,
      TYPE_IEND: 1229278788,
      TYPE_IDAT: 1229209940,
      TYPE_PLTE: 1347179589,
      TYPE_tRNS: 1951551059,
      // eslint-disable-line camelcase
      TYPE_gAMA: 1732332865,
      // eslint-disable-line camelcase
      // color-type bits
      COLORTYPE_GRAYSCALE: 0,
      COLORTYPE_PALETTE: 1,
      COLORTYPE_COLOR: 2,
      COLORTYPE_ALPHA: 4,
      // e.g. grayscale and alpha
      // color-type combinations
      COLORTYPE_PALETTE_COLOR: 3,
      COLORTYPE_COLOR_ALPHA: 6,
      COLORTYPE_TO_BPP_MAP: {
        0: 1,
        2: 3,
        3: 1,
        4: 2,
        6: 4
      },
      GAMMA_DIVISION: 1e5
    };
  }
});

// node_modules/pngjs/lib/crc.js
var require_crc = __commonJS({
  "node_modules/pngjs/lib/crc.js"(exports, module) {
    "use strict";
    var crcTable = [];
    (function() {
      for (let i = 0; i < 256; i++) {
        let currentCrc = i;
        for (let j = 0; j < 8; j++) {
          if (currentCrc & 1) {
            currentCrc = 3988292384 ^ currentCrc >>> 1;
          } else {
            currentCrc = currentCrc >>> 1;
          }
        }
        crcTable[i] = currentCrc;
      }
    })();
    var CrcCalculator = module.exports = function() {
      this._crc = -1;
    };
    CrcCalculator.prototype.write = function(data) {
      for (let i = 0; i < data.length; i++) {
        this._crc = crcTable[(this._crc ^ data[i]) & 255] ^ this._crc >>> 8;
      }
      return true;
    };
    CrcCalculator.prototype.crc32 = function() {
      return this._crc ^ -1;
    };
    CrcCalculator.crc32 = function(buf) {
      let crc = -1;
      for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 255] ^ crc >>> 8;
      }
      return crc ^ -1;
    };
  }
});

// node_modules/pngjs/lib/parser.js
var require_parser = __commonJS({
  "node_modules/pngjs/lib/parser.js"(exports, module) {
    "use strict";
    var constants = require_constants();
    var CrcCalculator = require_crc();
    var Parser = module.exports = function(options, dependencies) {
      this._options = options;
      options.checkCRC = options.checkCRC !== false;
      this._hasIHDR = false;
      this._hasIEND = false;
      this._emittedHeadersFinished = false;
      this._palette = [];
      this._colorType = 0;
      this._chunks = {};
      this._chunks[constants.TYPE_IHDR] = this._handleIHDR.bind(this);
      this._chunks[constants.TYPE_IEND] = this._handleIEND.bind(this);
      this._chunks[constants.TYPE_IDAT] = this._handleIDAT.bind(this);
      this._chunks[constants.TYPE_PLTE] = this._handlePLTE.bind(this);
      this._chunks[constants.TYPE_tRNS] = this._handleTRNS.bind(this);
      this._chunks[constants.TYPE_gAMA] = this._handleGAMA.bind(this);
      this.read = dependencies.read;
      this.error = dependencies.error;
      this.metadata = dependencies.metadata;
      this.gamma = dependencies.gamma;
      this.transColor = dependencies.transColor;
      this.palette = dependencies.palette;
      this.parsed = dependencies.parsed;
      this.inflateData = dependencies.inflateData;
      this.finished = dependencies.finished;
      this.simpleTransparency = dependencies.simpleTransparency;
      this.headersFinished = dependencies.headersFinished || function() {
      };
    };
    Parser.prototype.start = function() {
      this.read(constants.PNG_SIGNATURE.length, this._parseSignature.bind(this));
    };
    Parser.prototype._parseSignature = function(data) {
      let signature = constants.PNG_SIGNATURE;
      for (let i = 0; i < signature.length; i++) {
        if (data[i] !== signature[i]) {
          this.error(new Error("Invalid file signature"));
          return;
        }
      }
      this.read(8, this._parseChunkBegin.bind(this));
    };
    Parser.prototype._parseChunkBegin = function(data) {
      let length = data.readUInt32BE(0);
      let type = data.readUInt32BE(4);
      let name = "";
      for (let i = 4; i < 8; i++) {
        name += String.fromCharCode(data[i]);
      }
      let ancillary = Boolean(data[4] & 32);
      if (!this._hasIHDR && type !== constants.TYPE_IHDR) {
        this.error(new Error("Expected IHDR on beggining"));
        return;
      }
      this._crc = new CrcCalculator();
      this._crc.write(Buffer.from(name));
      if (this._chunks[type]) {
        return this._chunks[type](length);
      }
      if (!ancillary) {
        this.error(new Error("Unsupported critical chunk type " + name));
        return;
      }
      this.read(length + 4, this._skipChunk.bind(this));
    };
    Parser.prototype._skipChunk = function() {
      this.read(8, this._parseChunkBegin.bind(this));
    };
    Parser.prototype._handleChunkEnd = function() {
      this.read(4, this._parseChunkEnd.bind(this));
    };
    Parser.prototype._parseChunkEnd = function(data) {
      let fileCrc = data.readInt32BE(0);
      let calcCrc = this._crc.crc32();
      if (this._options.checkCRC && calcCrc !== fileCrc) {
        this.error(new Error("Crc error - " + fileCrc + " - " + calcCrc));
        return;
      }
      if (!this._hasIEND) {
        this.read(8, this._parseChunkBegin.bind(this));
      }
    };
    Parser.prototype._handleIHDR = function(length) {
      this.read(length, this._parseIHDR.bind(this));
    };
    Parser.prototype._parseIHDR = function(data) {
      this._crc.write(data);
      let width = data.readUInt32BE(0);
      let height = data.readUInt32BE(4);
      let depth = data[8];
      let colorType = data[9];
      let compr = data[10];
      let filter = data[11];
      let interlace = data[12];
      if (depth !== 8 && depth !== 4 && depth !== 2 && depth !== 1 && depth !== 16) {
        this.error(new Error("Unsupported bit depth " + depth));
        return;
      }
      if (!(colorType in constants.COLORTYPE_TO_BPP_MAP)) {
        this.error(new Error("Unsupported color type"));
        return;
      }
      if (compr !== 0) {
        this.error(new Error("Unsupported compression method"));
        return;
      }
      if (filter !== 0) {
        this.error(new Error("Unsupported filter method"));
        return;
      }
      if (interlace !== 0 && interlace !== 1) {
        this.error(new Error("Unsupported interlace method"));
        return;
      }
      this._colorType = colorType;
      let bpp = constants.COLORTYPE_TO_BPP_MAP[this._colorType];
      this._hasIHDR = true;
      this.metadata({
        width,
        height,
        depth,
        interlace: Boolean(interlace),
        palette: Boolean(colorType & constants.COLORTYPE_PALETTE),
        color: Boolean(colorType & constants.COLORTYPE_COLOR),
        alpha: Boolean(colorType & constants.COLORTYPE_ALPHA),
        bpp,
        colorType
      });
      this._handleChunkEnd();
    };
    Parser.prototype._handlePLTE = function(length) {
      this.read(length, this._parsePLTE.bind(this));
    };
    Parser.prototype._parsePLTE = function(data) {
      this._crc.write(data);
      let entries = Math.floor(data.length / 3);
      for (let i = 0; i < entries; i++) {
        this._palette.push([data[i * 3], data[i * 3 + 1], data[i * 3 + 2], 255]);
      }
      this.palette(this._palette);
      this._handleChunkEnd();
    };
    Parser.prototype._handleTRNS = function(length) {
      this.simpleTransparency();
      this.read(length, this._parseTRNS.bind(this));
    };
    Parser.prototype._parseTRNS = function(data) {
      this._crc.write(data);
      if (this._colorType === constants.COLORTYPE_PALETTE_COLOR) {
        if (this._palette.length === 0) {
          this.error(new Error("Transparency chunk must be after palette"));
          return;
        }
        if (data.length > this._palette.length) {
          this.error(new Error("More transparent colors than palette size"));
          return;
        }
        for (let i = 0; i < data.length; i++) {
          this._palette[i][3] = data[i];
        }
        this.palette(this._palette);
      }
      if (this._colorType === constants.COLORTYPE_GRAYSCALE) {
        this.transColor([data.readUInt16BE(0)]);
      }
      if (this._colorType === constants.COLORTYPE_COLOR) {
        this.transColor([
          data.readUInt16BE(0),
          data.readUInt16BE(2),
          data.readUInt16BE(4)
        ]);
      }
      this._handleChunkEnd();
    };
    Parser.prototype._handleGAMA = function(length) {
      this.read(length, this._parseGAMA.bind(this));
    };
    Parser.prototype._parseGAMA = function(data) {
      this._crc.write(data);
      this.gamma(data.readUInt32BE(0) / constants.GAMMA_DIVISION);
      this._handleChunkEnd();
    };
    Parser.prototype._handleIDAT = function(length) {
      if (!this._emittedHeadersFinished) {
        this._emittedHeadersFinished = true;
        this.headersFinished();
      }
      this.read(-length, this._parseIDAT.bind(this, length));
    };
    Parser.prototype._parseIDAT = function(length, data) {
      this._crc.write(data);
      if (this._colorType === constants.COLORTYPE_PALETTE_COLOR && this._palette.length === 0) {
        throw new Error("Expected palette not found");
      }
      this.inflateData(data);
      let leftOverLength = length - data.length;
      if (leftOverLength > 0) {
        this._handleIDAT(leftOverLength);
      } else {
        this._handleChunkEnd();
      }
    };
    Parser.prototype._handleIEND = function(length) {
      this.read(length, this._parseIEND.bind(this));
    };
    Parser.prototype._parseIEND = function(data) {
      this._crc.write(data);
      this._hasIEND = true;
      this._handleChunkEnd();
      if (this.finished) {
        this.finished();
      }
    };
  }
});

// node_modules/pngjs/lib/bitmapper.js
var require_bitmapper = __commonJS({
  "node_modules/pngjs/lib/bitmapper.js"(exports) {
    "use strict";
    var interlaceUtils = require_interlace();
    var pixelBppMapper = [
      // 0 - dummy entry
      function() {
      },
      // 1 - L
      // 0: 0, 1: 0, 2: 0, 3: 0xff
      function(pxData, data, pxPos, rawPos) {
        if (rawPos === data.length) {
          throw new Error("Ran out of data");
        }
        let pixel = data[rawPos];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = 255;
      },
      // 2 - LA
      // 0: 0, 1: 0, 2: 0, 3: 1
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 1 >= data.length) {
          throw new Error("Ran out of data");
        }
        let pixel = data[rawPos];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = data[rawPos + 1];
      },
      // 3 - RGB
      // 0: 0, 1: 1, 2: 2, 3: 0xff
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 2 >= data.length) {
          throw new Error("Ran out of data");
        }
        pxData[pxPos] = data[rawPos];
        pxData[pxPos + 1] = data[rawPos + 1];
        pxData[pxPos + 2] = data[rawPos + 2];
        pxData[pxPos + 3] = 255;
      },
      // 4 - RGBA
      // 0: 0, 1: 1, 2: 2, 3: 3
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 3 >= data.length) {
          throw new Error("Ran out of data");
        }
        pxData[pxPos] = data[rawPos];
        pxData[pxPos + 1] = data[rawPos + 1];
        pxData[pxPos + 2] = data[rawPos + 2];
        pxData[pxPos + 3] = data[rawPos + 3];
      }
    ];
    var pixelBppCustomMapper = [
      // 0 - dummy entry
      function() {
      },
      // 1 - L
      // 0: 0, 1: 0, 2: 0, 3: 0xff
      function(pxData, pixelData, pxPos, maxBit) {
        let pixel = pixelData[0];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = maxBit;
      },
      // 2 - LA
      // 0: 0, 1: 0, 2: 0, 3: 1
      function(pxData, pixelData, pxPos) {
        let pixel = pixelData[0];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = pixelData[1];
      },
      // 3 - RGB
      // 0: 0, 1: 1, 2: 2, 3: 0xff
      function(pxData, pixelData, pxPos, maxBit) {
        pxData[pxPos] = pixelData[0];
        pxData[pxPos + 1] = pixelData[1];
        pxData[pxPos + 2] = pixelData[2];
        pxData[pxPos + 3] = maxBit;
      },
      // 4 - RGBA
      // 0: 0, 1: 1, 2: 2, 3: 3
      function(pxData, pixelData, pxPos) {
        pxData[pxPos] = pixelData[0];
        pxData[pxPos + 1] = pixelData[1];
        pxData[pxPos + 2] = pixelData[2];
        pxData[pxPos + 3] = pixelData[3];
      }
    ];
    function bitRetriever(data, depth) {
      let leftOver = [];
      let i = 0;
      function split() {
        if (i === data.length) {
          throw new Error("Ran out of data");
        }
        let byte = data[i];
        i++;
        let byte8, byte7, byte6, byte5, byte4, byte3, byte2, byte1;
        switch (depth) {
          default:
            throw new Error("unrecognised depth");
          case 16:
            byte2 = data[i];
            i++;
            leftOver.push((byte << 8) + byte2);
            break;
          case 4:
            byte2 = byte & 15;
            byte1 = byte >> 4;
            leftOver.push(byte1, byte2);
            break;
          case 2:
            byte4 = byte & 3;
            byte3 = byte >> 2 & 3;
            byte2 = byte >> 4 & 3;
            byte1 = byte >> 6 & 3;
            leftOver.push(byte1, byte2, byte3, byte4);
            break;
          case 1:
            byte8 = byte & 1;
            byte7 = byte >> 1 & 1;
            byte6 = byte >> 2 & 1;
            byte5 = byte >> 3 & 1;
            byte4 = byte >> 4 & 1;
            byte3 = byte >> 5 & 1;
            byte2 = byte >> 6 & 1;
            byte1 = byte >> 7 & 1;
            leftOver.push(byte1, byte2, byte3, byte4, byte5, byte6, byte7, byte8);
            break;
        }
      }
      return {
        get: function(count) {
          while (leftOver.length < count) {
            split();
          }
          let returner = leftOver.slice(0, count);
          leftOver = leftOver.slice(count);
          return returner;
        },
        resetAfterLine: function() {
          leftOver.length = 0;
        },
        end: function() {
          if (i !== data.length) {
            throw new Error("extra data found");
          }
        }
      };
    }
    function mapImage8Bit(image, pxData, getPxPos, bpp, data, rawPos) {
      let imageWidth = image.width;
      let imageHeight = image.height;
      let imagePass = image.index;
      for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
          let pxPos = getPxPos(x, y, imagePass);
          pixelBppMapper[bpp](pxData, data, pxPos, rawPos);
          rawPos += bpp;
        }
      }
      return rawPos;
    }
    function mapImageCustomBit(image, pxData, getPxPos, bpp, bits, maxBit) {
      let imageWidth = image.width;
      let imageHeight = image.height;
      let imagePass = image.index;
      for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
          let pixelData = bits.get(bpp);
          let pxPos = getPxPos(x, y, imagePass);
          pixelBppCustomMapper[bpp](pxData, pixelData, pxPos, maxBit);
        }
        bits.resetAfterLine();
      }
    }
    exports.dataToBitMap = function(data, bitmapInfo) {
      let width = bitmapInfo.width;
      let height = bitmapInfo.height;
      let depth = bitmapInfo.depth;
      let bpp = bitmapInfo.bpp;
      let interlace = bitmapInfo.interlace;
      let bits;
      if (depth !== 8) {
        bits = bitRetriever(data, depth);
      }
      let pxData;
      if (depth <= 8) {
        pxData = Buffer.alloc(width * height * 4);
      } else {
        pxData = new Uint16Array(width * height * 4);
      }
      let maxBit = Math.pow(2, depth) - 1;
      let rawPos = 0;
      let images;
      let getPxPos;
      if (interlace) {
        images = interlaceUtils.getImagePasses(width, height);
        getPxPos = interlaceUtils.getInterlaceIterator(width, height);
      } else {
        let nonInterlacedPxPos = 0;
        getPxPos = function() {
          let returner = nonInterlacedPxPos;
          nonInterlacedPxPos += 4;
          return returner;
        };
        images = [{ width, height }];
      }
      for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
        if (depth === 8) {
          rawPos = mapImage8Bit(
            images[imageIndex],
            pxData,
            getPxPos,
            bpp,
            data,
            rawPos
          );
        } else {
          mapImageCustomBit(
            images[imageIndex],
            pxData,
            getPxPos,
            bpp,
            bits,
            maxBit
          );
        }
      }
      if (depth === 8) {
        if (rawPos !== data.length) {
          throw new Error("extra data found");
        }
      } else {
        bits.end();
      }
      return pxData;
    };
  }
});

// node_modules/pngjs/lib/format-normaliser.js
var require_format_normaliser = __commonJS({
  "node_modules/pngjs/lib/format-normaliser.js"(exports, module) {
    "use strict";
    function dePalette(indata, outdata, width, height, palette) {
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let color = palette[indata[pxPos]];
          if (!color) {
            throw new Error("index " + indata[pxPos] + " not in palette");
          }
          for (let i = 0; i < 4; i++) {
            outdata[pxPos + i] = color[i];
          }
          pxPos += 4;
        }
      }
    }
    function replaceTransparentColor(indata, outdata, width, height, transColor) {
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let makeTrans = false;
          if (transColor.length === 1) {
            if (transColor[0] === indata[pxPos]) {
              makeTrans = true;
            }
          } else if (transColor[0] === indata[pxPos] && transColor[1] === indata[pxPos + 1] && transColor[2] === indata[pxPos + 2]) {
            makeTrans = true;
          }
          if (makeTrans) {
            for (let i = 0; i < 4; i++) {
              outdata[pxPos + i] = 0;
            }
          }
          pxPos += 4;
        }
      }
    }
    function scaleDepth(indata, outdata, width, height, depth) {
      let maxOutSample = 255;
      let maxInSample = Math.pow(2, depth) - 1;
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          for (let i = 0; i < 4; i++) {
            outdata[pxPos + i] = Math.floor(
              indata[pxPos + i] * maxOutSample / maxInSample + 0.5
            );
          }
          pxPos += 4;
        }
      }
    }
    module.exports = function(indata, imageData) {
      let depth = imageData.depth;
      let width = imageData.width;
      let height = imageData.height;
      let colorType = imageData.colorType;
      let transColor = imageData.transColor;
      let palette = imageData.palette;
      let outdata = indata;
      if (colorType === 3) {
        dePalette(indata, outdata, width, height, palette);
      } else {
        if (transColor) {
          replaceTransparentColor(indata, outdata, width, height, transColor);
        }
        if (depth !== 8) {
          if (depth === 16) {
            outdata = Buffer.alloc(width * height * 4);
          }
          scaleDepth(indata, outdata, width, height, depth);
        }
      }
      return outdata;
    };
  }
});

// node_modules/pngjs/lib/parser-async.js
var require_parser_async = __commonJS({
  "node_modules/pngjs/lib/parser-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var zlib = __require("zlib");
    var ChunkStream = require_chunkstream();
    var FilterAsync = require_filter_parse_async();
    var Parser = require_parser();
    var bitmapper = require_bitmapper();
    var formatNormaliser = require_format_normaliser();
    var ParserAsync = module.exports = function(options) {
      ChunkStream.call(this);
      this._parser = new Parser(options, {
        read: this.read.bind(this),
        error: this._handleError.bind(this),
        metadata: this._handleMetaData.bind(this),
        gamma: this.emit.bind(this, "gamma"),
        palette: this._handlePalette.bind(this),
        transColor: this._handleTransColor.bind(this),
        finished: this._finished.bind(this),
        inflateData: this._inflateData.bind(this),
        simpleTransparency: this._simpleTransparency.bind(this),
        headersFinished: this._headersFinished.bind(this)
      });
      this._options = options;
      this.writable = true;
      this._parser.start();
    };
    util.inherits(ParserAsync, ChunkStream);
    ParserAsync.prototype._handleError = function(err) {
      this.emit("error", err);
      this.writable = false;
      this.destroy();
      if (this._inflate && this._inflate.destroy) {
        this._inflate.destroy();
      }
      if (this._filter) {
        this._filter.destroy();
        this._filter.on("error", function() {
        });
      }
      this.errord = true;
    };
    ParserAsync.prototype._inflateData = function(data) {
      if (!this._inflate) {
        if (this._bitmapInfo.interlace) {
          this._inflate = zlib.createInflate();
          this._inflate.on("error", this.emit.bind(this, "error"));
          this._filter.on("complete", this._complete.bind(this));
          this._inflate.pipe(this._filter);
        } else {
          let rowSize = (this._bitmapInfo.width * this._bitmapInfo.bpp * this._bitmapInfo.depth + 7 >> 3) + 1;
          let imageSize = rowSize * this._bitmapInfo.height;
          let chunkSize = Math.max(imageSize, zlib.Z_MIN_CHUNK);
          this._inflate = zlib.createInflate({ chunkSize });
          let leftToInflate = imageSize;
          let emitError = this.emit.bind(this, "error");
          this._inflate.on("error", function(err) {
            if (!leftToInflate) {
              return;
            }
            emitError(err);
          });
          this._filter.on("complete", this._complete.bind(this));
          let filterWrite = this._filter.write.bind(this._filter);
          this._inflate.on("data", function(chunk) {
            if (!leftToInflate) {
              return;
            }
            if (chunk.length > leftToInflate) {
              chunk = chunk.slice(0, leftToInflate);
            }
            leftToInflate -= chunk.length;
            filterWrite(chunk);
          });
          this._inflate.on("end", this._filter.end.bind(this._filter));
        }
      }
      this._inflate.write(data);
    };
    ParserAsync.prototype._handleMetaData = function(metaData) {
      this._metaData = metaData;
      this._bitmapInfo = Object.create(metaData);
      this._filter = new FilterAsync(this._bitmapInfo);
    };
    ParserAsync.prototype._handleTransColor = function(transColor) {
      this._bitmapInfo.transColor = transColor;
    };
    ParserAsync.prototype._handlePalette = function(palette) {
      this._bitmapInfo.palette = palette;
    };
    ParserAsync.prototype._simpleTransparency = function() {
      this._metaData.alpha = true;
    };
    ParserAsync.prototype._headersFinished = function() {
      this.emit("metadata", this._metaData);
    };
    ParserAsync.prototype._finished = function() {
      if (this.errord) {
        return;
      }
      if (!this._inflate) {
        this.emit("error", "No Inflate block");
      } else {
        this._inflate.end();
      }
    };
    ParserAsync.prototype._complete = function(filteredData) {
      if (this.errord) {
        return;
      }
      let normalisedBitmapData;
      try {
        let bitmapData = bitmapper.dataToBitMap(filteredData, this._bitmapInfo);
        normalisedBitmapData = formatNormaliser(bitmapData, this._bitmapInfo);
        bitmapData = null;
      } catch (ex) {
        this._handleError(ex);
        return;
      }
      this.emit("parsed", normalisedBitmapData);
    };
  }
});

// node_modules/pngjs/lib/bitpacker.js
var require_bitpacker = __commonJS({
  "node_modules/pngjs/lib/bitpacker.js"(exports, module) {
    "use strict";
    var constants = require_constants();
    module.exports = function(dataIn, width, height, options) {
      let outHasAlpha = [constants.COLORTYPE_COLOR_ALPHA, constants.COLORTYPE_ALPHA].indexOf(
        options.colorType
      ) !== -1;
      if (options.colorType === options.inputColorType) {
        let bigEndian = (function() {
          let buffer = new ArrayBuffer(2);
          new DataView(buffer).setInt16(
            0,
            256,
            true
            /* littleEndian */
          );
          return new Int16Array(buffer)[0] !== 256;
        })();
        if (options.bitDepth === 8 || options.bitDepth === 16 && bigEndian) {
          return dataIn;
        }
      }
      let data = options.bitDepth !== 16 ? dataIn : new Uint16Array(dataIn.buffer);
      let maxValue = 255;
      let inBpp = constants.COLORTYPE_TO_BPP_MAP[options.inputColorType];
      if (inBpp === 4 && !options.inputHasAlpha) {
        inBpp = 3;
      }
      let outBpp = constants.COLORTYPE_TO_BPP_MAP[options.colorType];
      if (options.bitDepth === 16) {
        maxValue = 65535;
        outBpp *= 2;
      }
      let outData = Buffer.alloc(width * height * outBpp);
      let inIndex = 0;
      let outIndex = 0;
      let bgColor = options.bgColor || {};
      if (bgColor.red === void 0) {
        bgColor.red = maxValue;
      }
      if (bgColor.green === void 0) {
        bgColor.green = maxValue;
      }
      if (bgColor.blue === void 0) {
        bgColor.blue = maxValue;
      }
      function getRGBA() {
        let red;
        let green;
        let blue;
        let alpha = maxValue;
        switch (options.inputColorType) {
          case constants.COLORTYPE_COLOR_ALPHA:
            alpha = data[inIndex + 3];
            red = data[inIndex];
            green = data[inIndex + 1];
            blue = data[inIndex + 2];
            break;
          case constants.COLORTYPE_COLOR:
            red = data[inIndex];
            green = data[inIndex + 1];
            blue = data[inIndex + 2];
            break;
          case constants.COLORTYPE_ALPHA:
            alpha = data[inIndex + 1];
            red = data[inIndex];
            green = red;
            blue = red;
            break;
          case constants.COLORTYPE_GRAYSCALE:
            red = data[inIndex];
            green = red;
            blue = red;
            break;
          default:
            throw new Error(
              "input color type:" + options.inputColorType + " is not supported at present"
            );
        }
        if (options.inputHasAlpha) {
          if (!outHasAlpha) {
            alpha /= maxValue;
            red = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.red + alpha * red), 0),
              maxValue
            );
            green = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.green + alpha * green), 0),
              maxValue
            );
            blue = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.blue + alpha * blue), 0),
              maxValue
            );
          }
        }
        return { red, green, blue, alpha };
      }
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let rgba = getRGBA(data, inIndex);
          switch (options.colorType) {
            case constants.COLORTYPE_COLOR_ALPHA:
            case constants.COLORTYPE_COLOR:
              if (options.bitDepth === 8) {
                outData[outIndex] = rgba.red;
                outData[outIndex + 1] = rgba.green;
                outData[outIndex + 2] = rgba.blue;
                if (outHasAlpha) {
                  outData[outIndex + 3] = rgba.alpha;
                }
              } else {
                outData.writeUInt16BE(rgba.red, outIndex);
                outData.writeUInt16BE(rgba.green, outIndex + 2);
                outData.writeUInt16BE(rgba.blue, outIndex + 4);
                if (outHasAlpha) {
                  outData.writeUInt16BE(rgba.alpha, outIndex + 6);
                }
              }
              break;
            case constants.COLORTYPE_ALPHA:
            case constants.COLORTYPE_GRAYSCALE: {
              let grayscale = (rgba.red + rgba.green + rgba.blue) / 3;
              if (options.bitDepth === 8) {
                outData[outIndex] = grayscale;
                if (outHasAlpha) {
                  outData[outIndex + 1] = rgba.alpha;
                }
              } else {
                outData.writeUInt16BE(grayscale, outIndex);
                if (outHasAlpha) {
                  outData.writeUInt16BE(rgba.alpha, outIndex + 2);
                }
              }
              break;
            }
            default:
              throw new Error("unrecognised color Type " + options.colorType);
          }
          inIndex += inBpp;
          outIndex += outBpp;
        }
      }
      return outData;
    };
  }
});

// node_modules/pngjs/lib/filter-pack.js
var require_filter_pack = __commonJS({
  "node_modules/pngjs/lib/filter-pack.js"(exports, module) {
    "use strict";
    var paethPredictor = require_paeth_predictor();
    function filterNone(pxData, pxPos, byteWidth, rawData, rawPos) {
      for (let x = 0; x < byteWidth; x++) {
        rawData[rawPos + x] = pxData[pxPos + x];
      }
    }
    function filterSumNone(pxData, pxPos, byteWidth) {
      let sum = 0;
      let length = pxPos + byteWidth;
      for (let i = pxPos; i < length; i++) {
        sum += Math.abs(pxData[i]);
      }
      return sum;
    }
    function filterSub(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let val = pxData[pxPos + x] - left;
        rawData[rawPos + x] = val;
      }
    }
    function filterSumSub(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let val = pxData[pxPos + x] - left;
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterUp(pxData, pxPos, byteWidth, rawData, rawPos) {
      for (let x = 0; x < byteWidth; x++) {
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - up;
        rawData[rawPos + x] = val;
      }
    }
    function filterSumUp(pxData, pxPos, byteWidth) {
      let sum = 0;
      let length = pxPos + byteWidth;
      for (let x = pxPos; x < length; x++) {
        let up = pxPos > 0 ? pxData[x - byteWidth] : 0;
        let val = pxData[x] - up;
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterAvg(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - (left + up >> 1);
        rawData[rawPos + x] = val;
      }
    }
    function filterSumAvg(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - (left + up >> 1);
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterPaeth(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        rawData[rawPos + x] = val;
      }
    }
    function filterSumPaeth(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        sum += Math.abs(val);
      }
      return sum;
    }
    var filters = {
      0: filterNone,
      1: filterSub,
      2: filterUp,
      3: filterAvg,
      4: filterPaeth
    };
    var filterSums = {
      0: filterSumNone,
      1: filterSumSub,
      2: filterSumUp,
      3: filterSumAvg,
      4: filterSumPaeth
    };
    module.exports = function(pxData, width, height, options, bpp) {
      let filterTypes;
      if (!("filterType" in options) || options.filterType === -1) {
        filterTypes = [0, 1, 2, 3, 4];
      } else if (typeof options.filterType === "number") {
        filterTypes = [options.filterType];
      } else {
        throw new Error("unrecognised filter types");
      }
      if (options.bitDepth === 16) {
        bpp *= 2;
      }
      let byteWidth = width * bpp;
      let rawPos = 0;
      let pxPos = 0;
      let rawData = Buffer.alloc((byteWidth + 1) * height);
      let sel = filterTypes[0];
      for (let y = 0; y < height; y++) {
        if (filterTypes.length > 1) {
          let min = Infinity;
          for (let i = 0; i < filterTypes.length; i++) {
            let sum = filterSums[filterTypes[i]](pxData, pxPos, byteWidth, bpp);
            if (sum < min) {
              sel = filterTypes[i];
              min = sum;
            }
          }
        }
        rawData[rawPos] = sel;
        rawPos++;
        filters[sel](pxData, pxPos, byteWidth, rawData, rawPos, bpp);
        rawPos += byteWidth;
        pxPos += byteWidth;
      }
      return rawData;
    };
  }
});

// node_modules/pngjs/lib/packer.js
var require_packer = __commonJS({
  "node_modules/pngjs/lib/packer.js"(exports, module) {
    "use strict";
    var constants = require_constants();
    var CrcStream = require_crc();
    var bitPacker = require_bitpacker();
    var filter = require_filter_pack();
    var zlib = __require("zlib");
    var Packer = module.exports = function(options) {
      this._options = options;
      options.deflateChunkSize = options.deflateChunkSize || 32 * 1024;
      options.deflateLevel = options.deflateLevel != null ? options.deflateLevel : 9;
      options.deflateStrategy = options.deflateStrategy != null ? options.deflateStrategy : 3;
      options.inputHasAlpha = options.inputHasAlpha != null ? options.inputHasAlpha : true;
      options.deflateFactory = options.deflateFactory || zlib.createDeflate;
      options.bitDepth = options.bitDepth || 8;
      options.colorType = typeof options.colorType === "number" ? options.colorType : constants.COLORTYPE_COLOR_ALPHA;
      options.inputColorType = typeof options.inputColorType === "number" ? options.inputColorType : constants.COLORTYPE_COLOR_ALPHA;
      if ([
        constants.COLORTYPE_GRAYSCALE,
        constants.COLORTYPE_COLOR,
        constants.COLORTYPE_COLOR_ALPHA,
        constants.COLORTYPE_ALPHA
      ].indexOf(options.colorType) === -1) {
        throw new Error(
          "option color type:" + options.colorType + " is not supported at present"
        );
      }
      if ([
        constants.COLORTYPE_GRAYSCALE,
        constants.COLORTYPE_COLOR,
        constants.COLORTYPE_COLOR_ALPHA,
        constants.COLORTYPE_ALPHA
      ].indexOf(options.inputColorType) === -1) {
        throw new Error(
          "option input color type:" + options.inputColorType + " is not supported at present"
        );
      }
      if (options.bitDepth !== 8 && options.bitDepth !== 16) {
        throw new Error(
          "option bit depth:" + options.bitDepth + " is not supported at present"
        );
      }
    };
    Packer.prototype.getDeflateOptions = function() {
      return {
        chunkSize: this._options.deflateChunkSize,
        level: this._options.deflateLevel,
        strategy: this._options.deflateStrategy
      };
    };
    Packer.prototype.createDeflate = function() {
      return this._options.deflateFactory(this.getDeflateOptions());
    };
    Packer.prototype.filterData = function(data, width, height) {
      let packedData = bitPacker(data, width, height, this._options);
      let bpp = constants.COLORTYPE_TO_BPP_MAP[this._options.colorType];
      let filteredData = filter(packedData, width, height, this._options, bpp);
      return filteredData;
    };
    Packer.prototype._packChunk = function(type, data) {
      let len = data ? data.length : 0;
      let buf = Buffer.alloc(len + 12);
      buf.writeUInt32BE(len, 0);
      buf.writeUInt32BE(type, 4);
      if (data) {
        data.copy(buf, 8);
      }
      buf.writeInt32BE(
        CrcStream.crc32(buf.slice(4, buf.length - 4)),
        buf.length - 4
      );
      return buf;
    };
    Packer.prototype.packGAMA = function(gamma) {
      let buf = Buffer.alloc(4);
      buf.writeUInt32BE(Math.floor(gamma * constants.GAMMA_DIVISION), 0);
      return this._packChunk(constants.TYPE_gAMA, buf);
    };
    Packer.prototype.packIHDR = function(width, height) {
      let buf = Buffer.alloc(13);
      buf.writeUInt32BE(width, 0);
      buf.writeUInt32BE(height, 4);
      buf[8] = this._options.bitDepth;
      buf[9] = this._options.colorType;
      buf[10] = 0;
      buf[11] = 0;
      buf[12] = 0;
      return this._packChunk(constants.TYPE_IHDR, buf);
    };
    Packer.prototype.packIDAT = function(data) {
      return this._packChunk(constants.TYPE_IDAT, data);
    };
    Packer.prototype.packIEND = function() {
      return this._packChunk(constants.TYPE_IEND, null);
    };
  }
});

// node_modules/pngjs/lib/packer-async.js
var require_packer_async = __commonJS({
  "node_modules/pngjs/lib/packer-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var constants = require_constants();
    var Packer = require_packer();
    var PackerAsync = module.exports = function(opt) {
      Stream.call(this);
      let options = opt || {};
      this._packer = new Packer(options);
      this._deflate = this._packer.createDeflate();
      this.readable = true;
    };
    util.inherits(PackerAsync, Stream);
    PackerAsync.prototype.pack = function(data, width, height, gamma) {
      this.emit("data", Buffer.from(constants.PNG_SIGNATURE));
      this.emit("data", this._packer.packIHDR(width, height));
      if (gamma) {
        this.emit("data", this._packer.packGAMA(gamma));
      }
      let filteredData = this._packer.filterData(data, width, height);
      this._deflate.on("error", this.emit.bind(this, "error"));
      this._deflate.on(
        "data",
        function(compressedData) {
          this.emit("data", this._packer.packIDAT(compressedData));
        }.bind(this)
      );
      this._deflate.on(
        "end",
        function() {
          this.emit("data", this._packer.packIEND());
          this.emit("end");
        }.bind(this)
      );
      this._deflate.end(filteredData);
    };
  }
});

// node_modules/pngjs/lib/sync-inflate.js
var require_sync_inflate = __commonJS({
  "node_modules/pngjs/lib/sync-inflate.js"(exports, module) {
    "use strict";
    var assert = __require("assert").ok;
    var zlib = __require("zlib");
    var util = __require("util");
    var kMaxLength = __require("buffer").kMaxLength;
    function Inflate(opts) {
      if (!(this instanceof Inflate)) {
        return new Inflate(opts);
      }
      if (opts && opts.chunkSize < zlib.Z_MIN_CHUNK) {
        opts.chunkSize = zlib.Z_MIN_CHUNK;
      }
      zlib.Inflate.call(this, opts);
      this._offset = this._offset === void 0 ? this._outOffset : this._offset;
      this._buffer = this._buffer || this._outBuffer;
      if (opts && opts.maxLength != null) {
        this._maxLength = opts.maxLength;
      }
    }
    function createInflate(opts) {
      return new Inflate(opts);
    }
    function _close(engine, callback) {
      if (callback) {
        process.nextTick(callback);
      }
      if (!engine._handle) {
        return;
      }
      engine._handle.close();
      engine._handle = null;
    }
    Inflate.prototype._processChunk = function(chunk, flushFlag, asyncCb) {
      if (typeof asyncCb === "function") {
        return zlib.Inflate._processChunk.call(this, chunk, flushFlag, asyncCb);
      }
      let self = this;
      let availInBefore = chunk && chunk.length;
      let availOutBefore = this._chunkSize - this._offset;
      let leftToInflate = this._maxLength;
      let inOff = 0;
      let buffers = [];
      let nread = 0;
      let error;
      this.on("error", function(err) {
        error = err;
      });
      function handleChunk(availInAfter, availOutAfter) {
        if (self._hadError) {
          return;
        }
        let have = availOutBefore - availOutAfter;
        assert(have >= 0, "have should not go down");
        if (have > 0) {
          let out = self._buffer.slice(self._offset, self._offset + have);
          self._offset += have;
          if (out.length > leftToInflate) {
            out = out.slice(0, leftToInflate);
          }
          buffers.push(out);
          nread += out.length;
          leftToInflate -= out.length;
          if (leftToInflate === 0) {
            return false;
          }
        }
        if (availOutAfter === 0 || self._offset >= self._chunkSize) {
          availOutBefore = self._chunkSize;
          self._offset = 0;
          self._buffer = Buffer.allocUnsafe(self._chunkSize);
        }
        if (availOutAfter === 0) {
          inOff += availInBefore - availInAfter;
          availInBefore = availInAfter;
          return true;
        }
        return false;
      }
      assert(this._handle, "zlib binding closed");
      let res;
      do {
        res = this._handle.writeSync(
          flushFlag,
          chunk,
          // in
          inOff,
          // in_off
          availInBefore,
          // in_len
          this._buffer,
          // out
          this._offset,
          //out_off
          availOutBefore
        );
        res = res || this._writeState;
      } while (!this._hadError && handleChunk(res[0], res[1]));
      if (this._hadError) {
        throw error;
      }
      if (nread >= kMaxLength) {
        _close(this);
        throw new RangeError(
          "Cannot create final Buffer. It would be larger than 0x" + kMaxLength.toString(16) + " bytes"
        );
      }
      let buf = Buffer.concat(buffers, nread);
      _close(this);
      return buf;
    };
    util.inherits(Inflate, zlib.Inflate);
    function zlibBufferSync(engine, buffer) {
      if (typeof buffer === "string") {
        buffer = Buffer.from(buffer);
      }
      if (!(buffer instanceof Buffer)) {
        throw new TypeError("Not a string or buffer");
      }
      let flushFlag = engine._finishFlushFlag;
      if (flushFlag == null) {
        flushFlag = zlib.Z_FINISH;
      }
      return engine._processChunk(buffer, flushFlag);
    }
    function inflateSync(buffer, opts) {
      return zlibBufferSync(new Inflate(opts), buffer);
    }
    module.exports = exports = inflateSync;
    exports.Inflate = Inflate;
    exports.createInflate = createInflate;
    exports.inflateSync = inflateSync;
  }
});

// node_modules/pngjs/lib/sync-reader.js
var require_sync_reader = __commonJS({
  "node_modules/pngjs/lib/sync-reader.js"(exports, module) {
    "use strict";
    var SyncReader = module.exports = function(buffer) {
      this._buffer = buffer;
      this._reads = [];
    };
    SyncReader.prototype.read = function(length, callback) {
      this._reads.push({
        length: Math.abs(length),
        // if length < 0 then at most this length
        allowLess: length < 0,
        func: callback
      });
    };
    SyncReader.prototype.process = function() {
      while (this._reads.length > 0 && this._buffer.length) {
        let read = this._reads[0];
        if (this._buffer.length && (this._buffer.length >= read.length || read.allowLess)) {
          this._reads.shift();
          let buf = this._buffer;
          this._buffer = buf.slice(read.length);
          read.func.call(this, buf.slice(0, read.length));
        } else {
          break;
        }
      }
      if (this._reads.length > 0) {
        return new Error("There are some read requests waitng on finished stream");
      }
      if (this._buffer.length > 0) {
        return new Error("unrecognised content at end of stream");
      }
    };
  }
});

// node_modules/pngjs/lib/filter-parse-sync.js
var require_filter_parse_sync = __commonJS({
  "node_modules/pngjs/lib/filter-parse-sync.js"(exports) {
    "use strict";
    var SyncReader = require_sync_reader();
    var Filter = require_filter_parse();
    exports.process = function(inBuffer, bitmapInfo) {
      let outBuffers = [];
      let reader = new SyncReader(inBuffer);
      let filter = new Filter(bitmapInfo, {
        read: reader.read.bind(reader),
        write: function(bufferPart) {
          outBuffers.push(bufferPart);
        },
        complete: function() {
        }
      });
      filter.start();
      reader.process();
      return Buffer.concat(outBuffers);
    };
  }
});

// node_modules/pngjs/lib/parser-sync.js
var require_parser_sync = __commonJS({
  "node_modules/pngjs/lib/parser-sync.js"(exports, module) {
    "use strict";
    var hasSyncZlib = true;
    var zlib = __require("zlib");
    var inflateSync = require_sync_inflate();
    if (!zlib.deflateSync) {
      hasSyncZlib = false;
    }
    var SyncReader = require_sync_reader();
    var FilterSync = require_filter_parse_sync();
    var Parser = require_parser();
    var bitmapper = require_bitmapper();
    var formatNormaliser = require_format_normaliser();
    module.exports = function(buffer, options) {
      if (!hasSyncZlib) {
        throw new Error(
          "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
        );
      }
      let err;
      function handleError(_err_) {
        err = _err_;
      }
      let metaData;
      function handleMetaData(_metaData_) {
        metaData = _metaData_;
      }
      function handleTransColor(transColor) {
        metaData.transColor = transColor;
      }
      function handlePalette(palette) {
        metaData.palette = palette;
      }
      function handleSimpleTransparency() {
        metaData.alpha = true;
      }
      let gamma;
      function handleGamma(_gamma_) {
        gamma = _gamma_;
      }
      let inflateDataList = [];
      function handleInflateData(inflatedData2) {
        inflateDataList.push(inflatedData2);
      }
      let reader = new SyncReader(buffer);
      let parser = new Parser(options, {
        read: reader.read.bind(reader),
        error: handleError,
        metadata: handleMetaData,
        gamma: handleGamma,
        palette: handlePalette,
        transColor: handleTransColor,
        inflateData: handleInflateData,
        simpleTransparency: handleSimpleTransparency
      });
      parser.start();
      reader.process();
      if (err) {
        throw err;
      }
      let inflateData = Buffer.concat(inflateDataList);
      inflateDataList.length = 0;
      let inflatedData;
      if (metaData.interlace) {
        inflatedData = zlib.inflateSync(inflateData);
      } else {
        let rowSize = (metaData.width * metaData.bpp * metaData.depth + 7 >> 3) + 1;
        let imageSize = rowSize * metaData.height;
        inflatedData = inflateSync(inflateData, {
          chunkSize: imageSize,
          maxLength: imageSize
        });
      }
      inflateData = null;
      if (!inflatedData || !inflatedData.length) {
        throw new Error("bad png - invalid inflate data response");
      }
      let unfilteredData = FilterSync.process(inflatedData, metaData);
      inflateData = null;
      let bitmapData = bitmapper.dataToBitMap(unfilteredData, metaData);
      unfilteredData = null;
      let normalisedBitmapData = formatNormaliser(bitmapData, metaData);
      metaData.data = normalisedBitmapData;
      metaData.gamma = gamma || 0;
      return metaData;
    };
  }
});

// node_modules/pngjs/lib/packer-sync.js
var require_packer_sync = __commonJS({
  "node_modules/pngjs/lib/packer-sync.js"(exports, module) {
    "use strict";
    var hasSyncZlib = true;
    var zlib = __require("zlib");
    if (!zlib.deflateSync) {
      hasSyncZlib = false;
    }
    var constants = require_constants();
    var Packer = require_packer();
    module.exports = function(metaData, opt) {
      if (!hasSyncZlib) {
        throw new Error(
          "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
        );
      }
      let options = opt || {};
      let packer = new Packer(options);
      let chunks = [];
      chunks.push(Buffer.from(constants.PNG_SIGNATURE));
      chunks.push(packer.packIHDR(metaData.width, metaData.height));
      if (metaData.gamma) {
        chunks.push(packer.packGAMA(metaData.gamma));
      }
      let filteredData = packer.filterData(
        metaData.data,
        metaData.width,
        metaData.height
      );
      let compressedData = zlib.deflateSync(
        filteredData,
        packer.getDeflateOptions()
      );
      filteredData = null;
      if (!compressedData || !compressedData.length) {
        throw new Error("bad png - invalid compressed data response");
      }
      chunks.push(packer.packIDAT(compressedData));
      chunks.push(packer.packIEND());
      return Buffer.concat(chunks);
    };
  }
});

// node_modules/pngjs/lib/png-sync.js
var require_png_sync = __commonJS({
  "node_modules/pngjs/lib/png-sync.js"(exports) {
    "use strict";
    var parse = require_parser_sync();
    var pack = require_packer_sync();
    exports.read = function(buffer, options) {
      return parse(buffer, options || {});
    };
    exports.write = function(png, options) {
      return pack(png, options);
    };
  }
});

// node_modules/pngjs/lib/png.js
var require_png = __commonJS({
  "node_modules/pngjs/lib/png.js"(exports) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var Parser = require_parser_async();
    var Packer = require_packer_async();
    var PNGSync = require_png_sync();
    var PNG = exports.PNG = function(options) {
      Stream.call(this);
      options = options || {};
      this.width = options.width | 0;
      this.height = options.height | 0;
      this.data = this.width > 0 && this.height > 0 ? Buffer.alloc(4 * this.width * this.height) : null;
      if (options.fill && this.data) {
        this.data.fill(0);
      }
      this.gamma = 0;
      this.readable = this.writable = true;
      this._parser = new Parser(options);
      this._parser.on("error", this.emit.bind(this, "error"));
      this._parser.on("close", this._handleClose.bind(this));
      this._parser.on("metadata", this._metadata.bind(this));
      this._parser.on("gamma", this._gamma.bind(this));
      this._parser.on(
        "parsed",
        function(data) {
          this.data = data;
          this.emit("parsed", data);
        }.bind(this)
      );
      this._packer = new Packer(options);
      this._packer.on("data", this.emit.bind(this, "data"));
      this._packer.on("end", this.emit.bind(this, "end"));
      this._parser.on("close", this._handleClose.bind(this));
      this._packer.on("error", this.emit.bind(this, "error"));
    };
    util.inherits(PNG, Stream);
    PNG.sync = PNGSync;
    PNG.prototype.pack = function() {
      if (!this.data || !this.data.length) {
        this.emit("error", "No data provided");
        return this;
      }
      process.nextTick(
        function() {
          this._packer.pack(this.data, this.width, this.height, this.gamma);
        }.bind(this)
      );
      return this;
    };
    PNG.prototype.parse = function(data, callback) {
      if (callback) {
        let onParsed, onError;
        onParsed = function(parsedData) {
          this.removeListener("error", onError);
          this.data = parsedData;
          callback(null, this);
        }.bind(this);
        onError = function(err) {
          this.removeListener("parsed", onParsed);
          callback(err, null);
        }.bind(this);
        this.once("parsed", onParsed);
        this.once("error", onError);
      }
      this.end(data);
      return this;
    };
    PNG.prototype.write = function(data) {
      this._parser.write(data);
      return true;
    };
    PNG.prototype.end = function(data) {
      this._parser.end(data);
    };
    PNG.prototype._metadata = function(metadata) {
      this.width = metadata.width;
      this.height = metadata.height;
      this.emit("metadata", metadata);
    };
    PNG.prototype._gamma = function(gamma) {
      this.gamma = gamma;
    };
    PNG.prototype._handleClose = function() {
      if (!this._parser.writable && !this._packer.readable) {
        this.emit("close");
      }
    };
    PNG.bitblt = function(src, dst, srcX, srcY, width, height, deltaX, deltaY) {
      srcX |= 0;
      srcY |= 0;
      width |= 0;
      height |= 0;
      deltaX |= 0;
      deltaY |= 0;
      if (srcX > src.width || srcY > src.height || srcX + width > src.width || srcY + height > src.height) {
        throw new Error("bitblt reading outside image");
      }
      if (deltaX > dst.width || deltaY > dst.height || deltaX + width > dst.width || deltaY + height > dst.height) {
        throw new Error("bitblt writing outside image");
      }
      for (let y = 0; y < height; y++) {
        src.data.copy(
          dst.data,
          (deltaY + y) * dst.width + deltaX << 2,
          (srcY + y) * src.width + srcX << 2,
          (srcY + y) * src.width + srcX + width << 2
        );
      }
    };
    PNG.prototype.bitblt = function(dst, srcX, srcY, width, height, deltaX, deltaY) {
      PNG.bitblt(this, dst, srcX, srcY, width, height, deltaX, deltaY);
      return this;
    };
    PNG.adjustGamma = function(src) {
      if (src.gamma) {
        for (let y = 0; y < src.height; y++) {
          for (let x = 0; x < src.width; x++) {
            let idx = src.width * y + x << 2;
            for (let i = 0; i < 3; i++) {
              let sample = src.data[idx + i] / 255;
              sample = Math.pow(sample, 1 / 2.2 / src.gamma);
              src.data[idx + i] = Math.round(sample * 255);
            }
          }
        }
        src.gamma = 0;
      }
    };
    PNG.prototype.adjustGamma = function() {
      PNG.adjustGamma(this);
    };
  }
});

// node_modules/qrcode/lib/renderer/utils.js
var require_utils2 = __commonJS({
  "node_modules/qrcode/lib/renderer/utils.js"(exports) {
    function hex2rgba(hex) {
      if (typeof hex === "number") {
        hex = hex.toString();
      }
      if (typeof hex !== "string") {
        throw new Error("Color should be defined as hex string");
      }
      let hexCode = hex.slice().replace("#", "").split("");
      if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
        throw new Error("Invalid hex color: " + hex);
      }
      if (hexCode.length === 3 || hexCode.length === 4) {
        hexCode = Array.prototype.concat.apply([], hexCode.map(function(c) {
          return [c, c];
        }));
      }
      if (hexCode.length === 6) hexCode.push("F", "F");
      const hexValue = parseInt(hexCode.join(""), 16);
      return {
        r: hexValue >> 24 & 255,
        g: hexValue >> 16 & 255,
        b: hexValue >> 8 & 255,
        a: hexValue & 255,
        hex: "#" + hexCode.slice(0, 6).join("")
      };
    }
    exports.getOptions = function getOptions(options) {
      if (!options) options = {};
      if (!options.color) options.color = {};
      const margin = typeof options.margin === "undefined" || options.margin === null || options.margin < 0 ? 4 : options.margin;
      const width = options.width && options.width >= 21 ? options.width : void 0;
      const scale = options.scale || 4;
      return {
        width,
        scale: width ? 4 : scale,
        margin,
        color: {
          dark: hex2rgba(options.color.dark || "#000000ff"),
          light: hex2rgba(options.color.light || "#ffffffff")
        },
        type: options.type,
        rendererOpts: options.rendererOpts || {}
      };
    };
    exports.getScale = function getScale(qrSize, opts) {
      return opts.width && opts.width >= qrSize + opts.margin * 2 ? opts.width / (qrSize + opts.margin * 2) : opts.scale;
    };
    exports.getImageWidth = function getImageWidth(qrSize, opts) {
      const scale = exports.getScale(qrSize, opts);
      return Math.floor((qrSize + opts.margin * 2) * scale);
    };
    exports.qrToImageData = function qrToImageData(imgData, qr, opts) {
      const size = qr.modules.size;
      const data = qr.modules.data;
      const scale = exports.getScale(size, opts);
      const symbolSize = Math.floor((size + opts.margin * 2) * scale);
      const scaledMargin = opts.margin * scale;
      const palette = [opts.color.light, opts.color.dark];
      for (let i = 0; i < symbolSize; i++) {
        for (let j = 0; j < symbolSize; j++) {
          let posDst = (i * symbolSize + j) * 4;
          let pxColor = opts.color.light;
          if (i >= scaledMargin && j >= scaledMargin && i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
            const iSrc = Math.floor((i - scaledMargin) / scale);
            const jSrc = Math.floor((j - scaledMargin) / scale);
            pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
          }
          imgData[posDst++] = pxColor.r;
          imgData[posDst++] = pxColor.g;
          imgData[posDst++] = pxColor.b;
          imgData[posDst] = pxColor.a;
        }
      }
    };
  }
});

// node_modules/qrcode/lib/renderer/png.js
var require_png2 = __commonJS({
  "node_modules/qrcode/lib/renderer/png.js"(exports) {
    var fs = __require("fs");
    var PNG = require_png().PNG;
    var Utils = require_utils2();
    exports.render = function render(qrData, options) {
      const opts = Utils.getOptions(options);
      const pngOpts = opts.rendererOpts;
      const size = Utils.getImageWidth(qrData.modules.size, opts);
      pngOpts.width = size;
      pngOpts.height = size;
      const pngImage = new PNG(pngOpts);
      Utils.qrToImageData(pngImage.data, qrData, opts);
      return pngImage;
    };
    exports.renderToDataURL = function renderToDataURL(qrData, options, cb) {
      if (typeof cb === "undefined") {
        cb = options;
        options = void 0;
      }
      exports.renderToBuffer(qrData, options, function(err, output) {
        if (err) cb(err);
        let url = "data:image/png;base64,";
        url += output.toString("base64");
        cb(null, url);
      });
    };
    exports.renderToBuffer = function renderToBuffer(qrData, options, cb) {
      if (typeof cb === "undefined") {
        cb = options;
        options = void 0;
      }
      const png = exports.render(qrData, options);
      const buffer = [];
      png.on("error", cb);
      png.on("data", function(data) {
        buffer.push(data);
      });
      png.on("end", function() {
        cb(null, Buffer.concat(buffer));
      });
      png.pack();
    };
    exports.renderToFile = function renderToFile(path, qrData, options, cb) {
      if (typeof cb === "undefined") {
        cb = options;
        options = void 0;
      }
      let called = false;
      const done = (...args) => {
        if (called) return;
        called = true;
        cb.apply(null, args);
      };
      const stream = fs.createWriteStream(path);
      stream.on("error", done);
      stream.on("close", done);
      exports.renderToFileStream(stream, qrData, options);
    };
    exports.renderToFileStream = function renderToFileStream(stream, qrData, options) {
      const png = exports.render(qrData, options);
      png.pack().pipe(stream);
    };
  }
});

// node_modules/qrcode/lib/renderer/utf8.js
var require_utf8 = __commonJS({
  "node_modules/qrcode/lib/renderer/utf8.js"(exports) {
    var Utils = require_utils2();
    var BLOCK_CHAR = {
      WW: " ",
      WB: "\u2584",
      BB: "\u2588",
      BW: "\u2580"
    };
    var INVERTED_BLOCK_CHAR = {
      BB: " ",
      BW: "\u2584",
      WW: "\u2588",
      WB: "\u2580"
    };
    function getBlockChar(top, bottom, blocks) {
      if (top && bottom) return blocks.BB;
      if (top && !bottom) return blocks.BW;
      if (!top && bottom) return blocks.WB;
      return blocks.WW;
    }
    exports.render = function(qrData, options, cb) {
      const opts = Utils.getOptions(options);
      let blocks = BLOCK_CHAR;
      if (opts.color.dark.hex === "#ffffff" || opts.color.light.hex === "#000000") {
        blocks = INVERTED_BLOCK_CHAR;
      }
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      let output = "";
      let hMargin = Array(size + opts.margin * 2 + 1).join(blocks.WW);
      hMargin = Array(opts.margin / 2 + 1).join(hMargin + "\n");
      const vMargin = Array(opts.margin + 1).join(blocks.WW);
      output += hMargin;
      for (let i = 0; i < size; i += 2) {
        output += vMargin;
        for (let j = 0; j < size; j++) {
          const topModule = data[i * size + j];
          const bottomModule = data[(i + 1) * size + j];
          output += getBlockChar(topModule, bottomModule, blocks);
        }
        output += vMargin + "\n";
      }
      output += hMargin.slice(0, -1);
      if (typeof cb === "function") {
        cb(null, output);
      }
      return output;
    };
    exports.renderToFile = function renderToFile(path, qrData, options, cb) {
      if (typeof cb === "undefined") {
        cb = options;
        options = void 0;
      }
      const fs = __require("fs");
      const utf8 = exports.render(qrData, options);
      fs.writeFile(path, utf8, cb);
    };
  }
});

// node_modules/qrcode/lib/renderer/terminal/terminal.js
var require_terminal = __commonJS({
  "node_modules/qrcode/lib/renderer/terminal/terminal.js"(exports) {
    exports.render = function(qrData, options, cb) {
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      const black = "\x1B[40m  \x1B[0m";
      const white = "\x1B[47m  \x1B[0m";
      let output = "";
      const hMargin = Array(size + 3).join(white);
      const vMargin = Array(2).join(white);
      output += hMargin + "\n";
      for (let i = 0; i < size; ++i) {
        output += white;
        for (let j = 0; j < size; j++) {
          output += data[i * size + j] ? black : white;
        }
        output += vMargin + "\n";
      }
      output += hMargin + "\n";
      if (typeof cb === "function") {
        cb(null, output);
      }
      return output;
    };
  }
});

// node_modules/qrcode/lib/renderer/terminal/terminal-small.js
var require_terminal_small = __commonJS({
  "node_modules/qrcode/lib/renderer/terminal/terminal-small.js"(exports) {
    var backgroundWhite = "\x1B[47m";
    var backgroundBlack = "\x1B[40m";
    var foregroundWhite = "\x1B[37m";
    var foregroundBlack = "\x1B[30m";
    var reset = "\x1B[0m";
    var lineSetupNormal = backgroundWhite + foregroundBlack;
    var lineSetupInverse = backgroundBlack + foregroundWhite;
    var createPalette = function(lineSetup, foregroundWhite2, foregroundBlack2) {
      return {
        // 1 ... white, 2 ... black, 0 ... transparent (default)
        "00": reset + " " + lineSetup,
        "01": reset + foregroundWhite2 + "\u2584" + lineSetup,
        "02": reset + foregroundBlack2 + "\u2584" + lineSetup,
        10: reset + foregroundWhite2 + "\u2580" + lineSetup,
        11: " ",
        12: "\u2584",
        20: reset + foregroundBlack2 + "\u2580" + lineSetup,
        21: "\u2580",
        22: "\u2588"
      };
    };
    var mkCodePixel = function(modules, size, x, y) {
      const sizePlus = size + 1;
      if (x >= sizePlus || y >= sizePlus || y < -1 || x < -1) return "0";
      if (x >= size || y >= size || y < 0 || x < 0) return "1";
      const idx = y * size + x;
      return modules[idx] ? "2" : "1";
    };
    var mkCode = function(modules, size, x, y) {
      return mkCodePixel(modules, size, x, y) + mkCodePixel(modules, size, x, y + 1);
    };
    exports.render = function(qrData, options, cb) {
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      const inverse = !!(options && options.inverse);
      const lineSetup = options && options.inverse ? lineSetupInverse : lineSetupNormal;
      const white = inverse ? foregroundBlack : foregroundWhite;
      const black = inverse ? foregroundWhite : foregroundBlack;
      const palette = createPalette(lineSetup, white, black);
      const newLine = reset + "\n" + lineSetup;
      let output = lineSetup;
      for (let y = -1; y < size + 1; y += 2) {
        for (let x = -1; x < size; x++) {
          output += palette[mkCode(data, size, x, y)];
        }
        output += palette[mkCode(data, size, size, y)] + newLine;
      }
      output += reset;
      if (typeof cb === "function") {
        cb(null, output);
      }
      return output;
    };
  }
});

// node_modules/qrcode/lib/renderer/terminal.js
var require_terminal2 = __commonJS({
  "node_modules/qrcode/lib/renderer/terminal.js"(exports) {
    var big = require_terminal();
    var small = require_terminal_small();
    exports.render = function(qrData, options, cb) {
      if (options && options.small) {
        return small.render(qrData, options, cb);
      }
      return big.render(qrData, options, cb);
    };
  }
});

// node_modules/qrcode/lib/renderer/svg-tag.js
var require_svg_tag = __commonJS({
  "node_modules/qrcode/lib/renderer/svg-tag.js"(exports) {
    var Utils = require_utils2();
    function getColorAttrib(color, attrib) {
      const alpha = color.a / 255;
      const str = attrib + '="' + color.hex + '"';
      return alpha < 1 ? str + " " + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"' : str;
    }
    function svgCmd(cmd, x, y) {
      let str = cmd + x;
      if (typeof y !== "undefined") str += " " + y;
      return str;
    }
    function qrToPath(data, size, margin) {
      let path = "";
      let moveBy = 0;
      let newRow = false;
      let lineLength = 0;
      for (let i = 0; i < data.length; i++) {
        const col = Math.floor(i % size);
        const row = Math.floor(i / size);
        if (!col && !newRow) newRow = true;
        if (data[i]) {
          lineLength++;
          if (!(i > 0 && col > 0 && data[i - 1])) {
            path += newRow ? svgCmd("M", col + margin, 0.5 + row + margin) : svgCmd("m", moveBy, 0);
            moveBy = 0;
            newRow = false;
          }
          if (!(col + 1 < size && data[i + 1])) {
            path += svgCmd("h", lineLength);
            lineLength = 0;
          }
        } else {
          moveBy++;
        }
      }
      return path;
    }
    exports.render = function render(qrData, options, cb) {
      const opts = Utils.getOptions(options);
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      const qrcodesize = size + opts.margin * 2;
      const bg = !opts.color.light.a ? "" : "<path " + getColorAttrib(opts.color.light, "fill") + ' d="M0 0h' + qrcodesize + "v" + qrcodesize + 'H0z"/>';
      const path = "<path " + getColorAttrib(opts.color.dark, "stroke") + ' d="' + qrToPath(data, size, opts.margin) + '"/>';
      const viewBox = 'viewBox="0 0 ' + qrcodesize + " " + qrcodesize + '"';
      const width = !opts.width ? "" : 'width="' + opts.width + '" height="' + opts.width + '" ';
      const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path + "</svg>\n";
      if (typeof cb === "function") {
        cb(null, svgTag);
      }
      return svgTag;
    };
  }
});

// node_modules/qrcode/lib/renderer/svg.js
var require_svg = __commonJS({
  "node_modules/qrcode/lib/renderer/svg.js"(exports) {
    var svgTagRenderer = require_svg_tag();
    exports.render = svgTagRenderer.render;
    exports.renderToFile = function renderToFile(path, qrData, options, cb) {
      if (typeof cb === "undefined") {
        cb = options;
        options = void 0;
      }
      const fs = __require("fs");
      const svgTag = exports.render(qrData, options);
      const xmlStr = '<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' + svgTag;
      fs.writeFile(path, xmlStr, cb);
    };
  }
});

// node_modules/qrcode/lib/renderer/canvas.js
var require_canvas = __commonJS({
  "node_modules/qrcode/lib/renderer/canvas.js"(exports) {
    var Utils = require_utils2();
    function clearCanvas(ctx, canvas, size) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!canvas.style) canvas.style = {};
      canvas.height = size;
      canvas.width = size;
      canvas.style.height = size + "px";
      canvas.style.width = size + "px";
    }
    function getCanvasElement() {
      try {
        return document.createElement("canvas");
      } catch (e) {
        throw new Error("You need to specify a canvas element");
      }
    }
    exports.render = function render(qrData, canvas, options) {
      let opts = options;
      let canvasEl = canvas;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!canvas) {
        canvasEl = getCanvasElement();
      }
      opts = Utils.getOptions(opts);
      const size = Utils.getImageWidth(qrData.modules.size, opts);
      const ctx = canvasEl.getContext("2d");
      const image = ctx.createImageData(size, size);
      Utils.qrToImageData(image.data, qrData, opts);
      clearCanvas(ctx, canvasEl, size);
      ctx.putImageData(image, 0, 0);
      return canvasEl;
    };
    exports.renderToDataURL = function renderToDataURL(qrData, canvas, options) {
      let opts = options;
      if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = void 0;
      }
      if (!opts) opts = {};
      const canvasEl = exports.render(qrData, canvas, opts);
      const type = opts.type || "image/png";
      const rendererOpts = opts.rendererOpts || {};
      return canvasEl.toDataURL(type, rendererOpts.quality);
    };
  }
});

// node_modules/qrcode/lib/browser.js
var require_browser = __commonJS({
  "node_modules/qrcode/lib/browser.js"(exports) {
    var canPromise = require_can_promise();
    var QRCode2 = require_qrcode();
    var CanvasRenderer = require_canvas();
    var SvgRenderer = require_svg_tag();
    function renderCanvas(renderFunc, canvas, text, opts, cb) {
      const args = [].slice.call(arguments, 1);
      const argsNum = args.length;
      const isLastArgCb = typeof args[argsNum - 1] === "function";
      if (!isLastArgCb && !canPromise()) {
        throw new Error("Callback required as last argument");
      }
      if (isLastArgCb) {
        if (argsNum < 2) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 2) {
          cb = text;
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 3) {
          if (canvas.getContext && typeof cb === "undefined") {
            cb = opts;
            opts = void 0;
          } else {
            cb = opts;
            opts = text;
            text = canvas;
            canvas = void 0;
          }
        }
      } else {
        if (argsNum < 1) {
          throw new Error("Too few arguments provided");
        }
        if (argsNum === 1) {
          text = canvas;
          canvas = opts = void 0;
        } else if (argsNum === 2 && !canvas.getContext) {
          opts = text;
          text = canvas;
          canvas = void 0;
        }
        return new Promise(function(resolve, reject) {
          try {
            const data = QRCode2.create(text, opts);
            resolve(renderFunc(data, canvas, opts));
          } catch (e) {
            reject(e);
          }
        });
      }
      try {
        const data = QRCode2.create(text, opts);
        cb(null, renderFunc(data, canvas, opts));
      } catch (e) {
        cb(e);
      }
    }
    exports.create = QRCode2.create;
    exports.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
    exports.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);
    exports.toString = renderCanvas.bind(null, function(data, _, opts) {
      return SvgRenderer.render(data, opts);
    });
  }
});

// node_modules/qrcode/lib/server.js
var require_server = __commonJS({
  "node_modules/qrcode/lib/server.js"(exports) {
    var canPromise = require_can_promise();
    var QRCode2 = require_qrcode();
    var PngRenderer = require_png2();
    var Utf8Renderer = require_utf8();
    var TerminalRenderer = require_terminal2();
    var SvgRenderer = require_svg();
    function checkParams(text, opts, cb) {
      if (typeof text === "undefined") {
        throw new Error("String required as first argument");
      }
      if (typeof cb === "undefined") {
        cb = opts;
        opts = {};
      }
      if (typeof cb !== "function") {
        if (!canPromise()) {
          throw new Error("Callback required as last argument");
        } else {
          opts = cb || {};
          cb = null;
        }
      }
      return {
        opts,
        cb
      };
    }
    function getTypeFromFilename(path) {
      return path.slice((path.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    }
    function getRendererFromType(type) {
      switch (type) {
        case "svg":
          return SvgRenderer;
        case "txt":
        case "utf8":
          return Utf8Renderer;
        case "png":
        case "image/png":
        default:
          return PngRenderer;
      }
    }
    function getStringRendererFromType(type) {
      switch (type) {
        case "svg":
          return SvgRenderer;
        case "terminal":
          return TerminalRenderer;
        case "utf8":
        default:
          return Utf8Renderer;
      }
    }
    function render(renderFunc, text, params) {
      if (!params.cb) {
        return new Promise(function(resolve, reject) {
          try {
            const data = QRCode2.create(text, params.opts);
            return renderFunc(data, params.opts, function(err, data2) {
              return err ? reject(err) : resolve(data2);
            });
          } catch (e) {
            reject(e);
          }
        });
      }
      try {
        const data = QRCode2.create(text, params.opts);
        return renderFunc(data, params.opts, params.cb);
      } catch (e) {
        params.cb(e);
      }
    }
    exports.create = QRCode2.create;
    exports.toCanvas = require_browser().toCanvas;
    exports.toString = function toString(text, opts, cb) {
      const params = checkParams(text, opts, cb);
      const type = params.opts ? params.opts.type : void 0;
      const renderer = getStringRendererFromType(type);
      return render(renderer.render, text, params);
    };
    exports.toDataURL = function toDataURL(text, opts, cb) {
      const params = checkParams(text, opts, cb);
      const renderer = getRendererFromType(params.opts.type);
      return render(renderer.renderToDataURL, text, params);
    };
    exports.toBuffer = function toBuffer(text, opts, cb) {
      const params = checkParams(text, opts, cb);
      const renderer = getRendererFromType(params.opts.type);
      return render(renderer.renderToBuffer, text, params);
    };
    exports.toFile = function toFile(path, text, opts, cb) {
      if (typeof path !== "string" || !(typeof text === "string" || typeof text === "object")) {
        throw new Error("Invalid argument");
      }
      if (arguments.length < 3 && !canPromise()) {
        throw new Error("Too few arguments provided");
      }
      const params = checkParams(text, opts, cb);
      const type = params.opts.type || getTypeFromFilename(path);
      const renderer = getRendererFromType(type);
      const renderToFile = renderer.renderToFile.bind(null, path);
      return render(renderToFile, text, params);
    };
    exports.toFileStream = function toFileStream(stream, text, opts) {
      if (arguments.length < 2) {
        throw new Error("Too few arguments provided");
      }
      const params = checkParams(text, opts, stream.emit.bind(stream, "error"));
      const renderer = getRendererFromType("png");
      const renderToFileStream = renderer.renderToFileStream.bind(null, stream);
      render(renderToFileStream, text, params);
    };
  }
});

// node_modules/qrcode/lib/index.js
var require_lib = __commonJS({
  "node_modules/qrcode/lib/index.js"(exports, module) {
    module.exports = require_server();
  }
});

// lib/montree/english-curriculum/render/assets.ts
var IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"];
function normalizeAssetKey(word) {
  return String(word).toLowerCase().replace(/[-_\s]+/g, " ").trim();
}
function parseAssetFilename(filename) {
  const clean = filename.split(/[\\/]/).pop() ?? filename;
  const lower = clean.toLowerCase();
  const dot = lower.lastIndexOf(".");
  const ext = dot >= 0 ? lower.slice(dot) : "";
  if (dot >= 0 && !IMAGE_EXTS.includes(ext)) return null;
  let stem = dot >= 0 ? lower.slice(0, dot) : lower;
  stem = stem.replace(/^\d+[-_\s]+/, "");
  const coloring = /[-_\s]coloring$/.test(stem);
  stem = stem.replace(/[-_\s]coloring$/, "");
  const word = normalizeAssetKey(stem);
  if (!word) return null;
  return { word, coloring };
}
function buildAssetMap(files) {
  const images = {};
  const coloring = {};
  for (const f of files) {
    const parsed = parseAssetFilename(f.name);
    if (!parsed) continue;
    if (parsed.coloring) coloring[parsed.word] = f.url;
    else images[parsed.word] = f.url;
  }
  return { images, coloring };
}
function resolveImage(assets, word, opts) {
  const key = normalizeAssetKey(word);
  if (opts?.coloring) return assets.coloring[key] ?? null;
  return assets.images[key] ?? null;
}
function assetGapReport(spec, assets, priorSpecs = []) {
  const priorByKey = /* @__PURE__ */ new Map();
  for (const ps of priorSpecs) {
    if (!ps || ps.week >= spec.week) continue;
    for (const a of ps.assets ?? []) {
      const p = parseAssetFilename(a.file);
      if (!p) continue;
      const k = `${p.coloring ? "c" : "i"}|${p.word}`;
      const prev = priorByKey.get(k);
      if (prev === void 0 || ps.week < prev) priorByKey.set(k, ps.week);
    }
  }
  const missing = [];
  const seen = /* @__PURE__ */ new Set();
  for (const a of spec.assets ?? []) {
    if (seen.has(a.file)) continue;
    seen.add(a.file);
    const parsed = parseAssetFilename(a.file);
    if (!parsed) continue;
    const have = parsed.coloring ? assets.coloring[parsed.word] : assets.images[parsed.word];
    if (!have) {
      const fromEarlierWeek = priorByKey.get(`${parsed.coloring ? "c" : "i"}|${parsed.word}`);
      missing.push({
        file: a.file,
        usedBy: a.usedBy ?? [],
        mjPrompt: a.mjPrompt ?? "",
        ...fromEarlierWeek !== void 0 ? { fromEarlierWeek } : {}
      });
    }
  }
  return { missing };
}

// lib/montree/english-curriculum/render/geometry.ts
var A4_WIDTH_CM = 21;
var A4_HEIGHT_CM = 29.7;
var WHITE_BORDER_CM = 0.5;
var CARD_BORDER_RADIUS_CM = 0.4;
var FRAME_COLOR = "#2D5A27";
var INK = "#000000";
var VOWEL_BLUE = "#2456c7";
var BOOK_FOREST = "#0a1a0f";
var BOOK_FOREST_DEEP = "#070f0a";
var BOOK_GOLD = "#E8C96A";
var BOOK_EMERALD = "#34d399";
var KIDS_FONT = "'Andika', 'Comic Sans MS', 'Comic Sans', cursive";
var HEADING_FONT = "'Nunito', system-ui, sans-serif";
var BOOK_FONT = "'Andika', 'Comic Sans MS', sans-serif";
var VOWELS = ["a", "e", "i", "o", "u"];
var DEFAULT_CARD_SIZE_CM = 7.5;
function computeSquareLayout(cardSizeCm = DEFAULT_CARD_SIZE_CM) {
  const s = cardSizeCm;
  const cols = Math.max(1, Math.floor(A4_WIDTH_CM / s));
  const pictureRows = Math.max(1, Math.floor(A4_HEIGHT_CM / s));
  const labelHeight = Math.max(2, Math.round(s * 0.32 * 10) / 10);
  const labelInternal = Math.max(1.4, labelHeight - 0.6);
  const controlHeight = s + labelHeight;
  const controlRows = Math.max(1, Math.floor(A4_HEIGHT_CM / controlHeight));
  const picturePerPage = cols * pictureRows;
  const controlPerPage = cols * controlRows;
  const labelRows = Math.max(1, Math.floor(A4_HEIGHT_CM / labelHeight));
  const labelPerPage = cols * labelRows;
  const fontSize = Math.max(12, Math.min(36, Math.round(s * 3.2)));
  return {
    cols,
    pictureRows,
    controlRows,
    labelRows,
    picturePerPage,
    controlPerPage,
    labelPerPage,
    labelHeight,
    labelInternal,
    controlHeight,
    cardSize: s,
    fontSize
  };
}
var DEFAULT_STRIP_SIZE_CM = 6.5;
function computeStripLayout(cardSizeCm = DEFAULT_STRIP_SIZE_CM) {
  const stripHeight = cardSizeCm;
  const stripWidth = A4_WIDTH_CM;
  const pictureSize = stripHeight;
  const sentenceWidth = stripWidth - pictureSize;
  const internalGap = WHITE_BORDER_CM * 2;
  const stripsPerPage = Math.max(1, Math.floor(A4_HEIGHT_CM / stripHeight));
  const picCols = Math.max(1, Math.floor(A4_WIDTH_CM / pictureSize));
  const picRows = Math.max(1, Math.floor(A4_HEIGHT_CM / pictureSize));
  const picPerPage = picCols * picRows;
  const fontSize = Math.max(28, Math.min(72, Math.round(stripHeight * 12)));
  return {
    stripHeight,
    stripWidth,
    sentenceWidth,
    pictureSize,
    internalGap,
    stripsPerPage,
    picCols,
    picRows,
    picPerPage,
    fontSize
  };
}
var MATCHING_ROW_CONTENT_CM = 3.2;
var MATCHING_PIC_SIZE_CM = 3;
var MATCHING_DOT_CM = 0.45;
var MATCHING_WORD_COL_CM = 5.2;
var MATCHING_DOT_INNER_GAP_CM = 0.6;
var MATCHING_HEADER_CM = 3.4;
var MATCHING_SHEET_PAD_V_CM = 1.4;
var MATCHING_SHEET_PAD_H_CM = 1.2;
var MATCHING_MAX_ROWS_PER_PAGE = 6;
function computeMatchingLayout() {
  const usableWidthCm = A4_WIDTH_CM - MATCHING_SHEET_PAD_H_CM * 2;
  const usableHeightCm = A4_HEIGHT_CM - MATCHING_SHEET_PAD_V_CM * 2 - MATCHING_HEADER_CM;
  const rowsPerPage = Math.min(
    MATCHING_MAX_ROWS_PER_PAGE,
    Math.max(1, Math.floor(usableHeightCm / MATCHING_ROW_CONTENT_CM))
  );
  const wordColCm = MATCHING_WORD_COL_CM;
  const picColCm = MATCHING_DOT_CM + MATCHING_DOT_INNER_GAP_CM + MATCHING_PIC_SIZE_CM;
  const colGapCm = Math.max(3, usableWidthCm - wordColCm - picColCm);
  return {
    rowsPerPage,
    rowContentCm: MATCHING_ROW_CONTENT_CM,
    wordColCm,
    picColCm,
    picSizeCm: MATCHING_PIC_SIZE_CM,
    colGapCm,
    usableHeightCm,
    padHCm: MATCHING_SHEET_PAD_H_CM,
    padVCm: MATCHING_SHEET_PAD_V_CM
  };
}
var BINGO_GRID_SIZE = 4;
var BINGO_BOARD_BORDER_MM = 6;
var BINGO_CARD_BORDER_MM = 5.6;
var BINGO_CALLING_COLS = 3;
var BINGO_HEADER_MM = 18;
var BINGO_GRID_WIDTH_MM = 190;
var BINGO_RADIUS_PX = 8;
var BOOK_WIDTH_MM = 210;
var BOOK_HEIGHT_MM = 148;
var LETTER_BAND_WIDTH = 11;
var LETTER_GUIDE_WIDTH = 2.6;
var LETTER_START_DOT_R = 4.6;
var LETTER_BAND_TINT = "#000000";
var LETTER_TRACE_TINT = "#000000";

// lib/montree/english-curriculum/render/adaptive-font.ts
function adaptiveLabelFontSize(label, basePt, cardWidthCm, labelHeightCm) {
  const internalWidthPt = (cardWidthCm - WHITE_BORDER_CM * 2 - 0.6) * 28.35;
  const internalHeightPt = (labelHeightCm - WHITE_BORDER_CM * 2 - 0.4) * 28.35;
  const lineHeight = 1.2;
  const CHAR_W = 0.62;
  const MIN_PT = 8;
  const words = label.split(/\s+/).filter(Boolean);
  const longestWordLen = words.reduce((m, w) => Math.max(m, w.length), 1);
  let fontSize = basePt;
  while (fontSize > MIN_PT) {
    const charWidth = fontSize * CHAR_W;
    const charsPerLine = Math.max(1, Math.floor(internalWidthPt / charWidth));
    const longestWordFits = longestWordLen <= charsPerLine;
    let lines = 1;
    let currentLineLen = 0;
    for (const w of words) {
      if (currentLineLen > 0 && currentLineLen + 1 + w.length > charsPerLine) {
        lines++;
        currentLineLen = w.length;
      } else {
        currentLineLen += (currentLineLen > 0 ? 1 : 0) + w.length;
      }
      if (w.length > charsPerLine) {
        lines += Math.ceil(w.length / charsPerLine) - 1;
      }
    }
    const totalHeightPt = lines * fontSize * lineHeight;
    if (longestWordFits && totalHeightPt <= internalHeightPt) break;
    fontSize -= 1;
  }
  return Math.max(MIN_PT, fontSize);
}
function adaptiveStripFontSize(sentence, basePt, textWidthCm, textHeightCm) {
  const internalWidthPt = (textWidthCm - 0.4) * 28.35;
  const internalHeightPt = (textHeightCm - 0.3) * 28.35;
  const lineHeight = 1.2;
  const CHAR_W = 0.52;
  const MIN_PT = 14;
  const totalChars = sentence.length;
  for (let fontSize2 = basePt; fontSize2 >= MIN_PT; fontSize2--) {
    const lineWidth = totalChars * fontSize2 * CHAR_W;
    const lineHeightPt = fontSize2 * lineHeight;
    if (lineWidth <= internalWidthPt && lineHeightPt <= internalHeightPt) {
      return fontSize2;
    }
  }
  const words = sentence.split(/\s+/).filter(Boolean);
  const longestWordLen = words.reduce((m, w) => Math.max(m, w.length), 1);
  let fontSize = basePt;
  while (fontSize > MIN_PT) {
    const charWidth = fontSize * CHAR_W;
    const charsPerLine = Math.max(1, Math.floor(internalWidthPt / charWidth));
    const longestWordFits = longestWordLen <= charsPerLine;
    let lines = 1;
    let cur = 0;
    for (const w of words) {
      if (cur > 0 && cur + 1 + w.length > charsPerLine) {
        lines++;
        cur = w.length;
      } else {
        cur += (cur > 0 ? 1 : 0) + w.length;
      }
      if (w.length > charsPerLine) {
        lines += Math.ceil(w.length / charsPerLine) - 1;
      }
    }
    const totalHeightPt = lines * fontSize * lineHeight;
    if (longestWordFits && totalHeightPt <= internalHeightPt) break;
    fontSize -= 1;
  }
  return Math.max(MIN_PT, fontSize);
}
function computeUniformStripFontSize(sentences, basePt, textWidthCm, textHeightCm) {
  if (sentences.length === 0) return basePt;
  let uniform = basePt;
  for (const s of sentences) {
    const fit = adaptiveStripFontSize(s, basePt, textWidthCm, textHeightCm);
    if (fit < uniform) uniform = fit;
  }
  return uniform;
}

// lib/montree/english-curriculum/render/html-shell.ts
function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function sanitizeImageUrl(url) {
  if (!url) return "";
  const u = String(url).trim();
  if (/["'<>\s]/.test(u) && !u.startsWith("data:")) {
    if (!/^data:image\//.test(u)) return "";
  }
  const ALLOWED = [
    "blob:",
    // Studio in-memory object URLs
    "file:",
    // CLI local asset paths
    "data:image/png",
    // canvas / reader exports
    "data:image/jpeg",
    "data:image/jpg",
    "data:image/webp",
    "data:image/gif",
    "data:image/svg+xml",
    "http://",
    "https://",
    "/"
    // repo-root relative (/images, /fonts, /brand)
  ];
  return ALLOWED.some((p) => u.startsWith(p)) ? u : "";
}
function hexColor(c, fallback = "#000000") {
  if (!c) return fallback;
  const v = String(c).trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) ? v : fallback;
}
function fontFaceCss(fontBaseUrl) {
  const base = fontBaseUrl.replace(/\/$/, "");
  return `
@font-face{font-family:'Andika';src:url('${base}/Andika-Regular.ttf') format('truetype');font-weight:400;font-style:normal;font-display:swap;}
@font-face{font-family:'Andika';src:url('${base}/Andika-Bold.ttf') format('truetype');font-weight:700;font-style:normal;font-display:swap;}
`;
}
function baseResetCss() {
  return `
*{margin:0;padding:0;box-sizing:border-box;}
@page{size:A4;margin:0;}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:${KIDS_FONT};background:white;position:relative;}
.page{page-break-after:always;width:${A4_WIDTH_CM}cm;height:${A4_HEIGHT_CM}cm;position:relative;overflow:hidden;}
.page:last-child{page-break-after:auto;}
.page-title{font-size:10pt;color:#000000;margin-bottom:0.4cm;text-align:center;}
@media print{.page-title{display:none;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}}
@media screen{body{padding:20px;background:#f0f0f0;}.page{background:white;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.12);}}
`;
}
function docShell(opts) {
  const fontBaseUrl = opts.fontBaseUrl ?? "/fonts";
  const reset = opts.ownReset ? "" : baseResetCss();
  const printScript = opts.autoPrint ? `<script>window.onload=function(){setTimeout(function(){window.print();},500);};</script>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(opts.title)}</title>
<style>${fontFaceCss(fontBaseUrl)}${reset}${opts.css}</style>
</head>
<body>
${opts.body}
${printScript}
</body>
</html>`;
}
var PLACEHOLDER_EMOJI = {
  apple: "\u{1F34E}",
  egg: "\u{1F95A}",
  ant: "\u{1F41C}",
  cat: "\u{1F408}",
  dog: "\u{1F415}",
  pig: "\u{1F416}",
  hen: "\u{1F414}",
  rat: "\u{1F400}",
  bug: "\u{1F41B}",
  duck: "\u{1F986}",
  fox: "\u{1F98A}",
  sun: "\u2600\uFE0F",
  cup: "\u{1F964}",
  bus: "\u{1F68C}",
  hat: "\u{1F3A9}",
  bag: "\u{1F392}",
  box: "\u{1F4E6}",
  jam: "\u{1F353}",
  jug: "\u{1FAD7}",
  map: "\u{1F5FA}\uFE0F",
  pot: "\u{1F372}",
  bed: "\u{1F6CF}\uFE0F",
  net: "\u{1F945}",
  pen: "\u{1F58A}\uFE0F",
  web: "\u{1F578}\uFE0F",
  log: "\u{1FAB5}",
  leg: "\u{1F9B5}",
  fig: "\u{1FAD0}",
  fan: "\u{1FAAD}",
  van: "\u{1F690}",
  vet: "\u{1FA7A}",
  yam: "\u{1F360}",
  zip: "\u{1F910}",
  potato: "\u{1F954}",
  book: "\u{1F4D6}",
  chair: "\u{1FA91}",
  table: "\u{1FA91}",
  mat: "\u{1F7EB}",
  pencil: "\u270F\uFE0F",
  man: "\u{1F9D1}",
  pin: "\u{1F4CC}",
  top: "\u{1F51D}"
};
function placeholderTile(word) {
  const emoji = PLACEHOLDER_EMOJI[word.toLowerCase()] ?? "\u{1F5BC}\uFE0F";
  return `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f3f4f6;color:#000000;text-align:center;gap:4px;"><div style="font-size:min(40%,48px);line-height:1;">${emoji}</div><div style="font-size:11pt;font-family:${KIDS_FONT};">${escapeHtml(word)}</div></div>`;
}

// lib/montree/english-curriculum/render/builders/three-part-cards.ts
function imageArea(word, assets, warnings) {
  const url = resolveImage(assets, word);
  const safe = url ? sanitizeImageUrl(url) : "";
  if (safe) return `<img src="${safe}" alt="${escapeHtml(word)}">`;
  warnings.push(`three_part_cards: missing image for "${word}"`);
  return placeholderTile(word);
}
function buildThreePartCards(spec, assets, opts = {}) {
  const warnings = [];
  const words = (spec.materials?.threePartCards ?? []).map((w) => w.toLowerCase());
  const L = computeSquareLayout(opts.cardSizeCm ?? DEFAULT_CARD_SIZE_CM);
  const marginLeft = (A4_WIDTH_CM - L.cardSize * L.cols) / 2;
  const picTop = (A4_HEIGHT_CM - L.cardSize * L.pictureRows) / 2;
  const ctrlTop = (A4_HEIGHT_CM - L.controlHeight * L.controlRows) / 2;
  const labTop = (A4_HEIGHT_CM - L.labelHeight * L.labelRows) / 2;
  const css = `
.grid{display:grid;grid-template-columns:repeat(${L.cols},${L.cardSize}cm);gap:0;}
.grid-ctrl{grid-auto-rows:${L.controlHeight}cm;margin-left:${marginLeft}cm;margin-top:${ctrlTop}cm;}
.grid-pic{grid-auto-rows:${L.cardSize}cm;margin-left:${marginLeft}cm;margin-top:${picTop}cm;}
.grid-lab{grid-auto-rows:${L.labelHeight}cm;margin-left:${marginLeft}cm;margin-top:${labTop}cm;}
.card{background:${FRAME_COLOR};padding:${WHITE_BORDER_CM}cm;display:flex;flex-direction:column;gap:${WHITE_BORDER_CM}cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;overflow:hidden;}
.card-ctrl{height:${L.controlHeight}cm;width:${L.cardSize}cm;}
.card-pic{height:${L.cardSize}cm;width:${L.cardSize}cm;}
.card-lab{height:${L.labelHeight}cm;width:${L.cardSize}cm;}
.img{background:white;flex:1;overflow:hidden;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;}
.img img{width:100%;height:100%;object-fit:cover;display:block;}
.lab{background:white;height:${L.labelInternal}cm;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:bold;color:${INK};text-align:center;padding:0.2cm 0.3cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;line-height:1.2;overflow:hidden;word-break:break-word;overflow-wrap:anywhere;}
.card-lab .lab{flex:1;height:auto;}
`;
  const labelPt = (w) => adaptiveLabelFontSize(w, L.fontSize, L.cardSize, L.labelHeight);
  const ctrl = (w) => `<div class="card card-ctrl"><div class="img">${imageArea(w, assets, warnings)}</div><div class="lab" style="font-size:${labelPt(w)}pt;">${escapeHtml(w)}</div></div>`;
  const pic3 = (w) => `<div class="card card-pic"><div class="img">${imageArea(w, assets, warnings)}</div></div>`;
  const lab = (w) => `<div class="card card-lab"><div class="lab" style="font-size:${labelPt(w)}pt;">${escapeHtml(w)}</div></div>`;
  const pages = [];
  const paginate = (cards, per, gridClass) => {
    for (let i = 0; i < cards.length; i += per) {
      pages.push(`<div class="page"><div class="grid ${gridClass}">${cards.slice(i, i + per).join("")}</div></div>`);
    }
  };
  if (words.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No three-part-card words for this week.</div></div>`);
  } else {
    paginate(words.map(ctrl), L.controlPerPage, "grid-ctrl");
    paginate(words.map(pic3), L.picturePerPage, "grid-pic");
    paginate(words.map(lab), L.labelPerPage, "grid-lab");
  }
  return {
    html: docShell({ title: `Week ${spec.week} \u2014 Three-Part Cards`, css, body: pages.join(""), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings
  };
}

// lib/montree/english-curriculum/render/builders/flashcards.ts
var CARD_H_MM = 279;
function picture(word, assets, warnings) {
  const url = resolveImage(assets, word);
  const safe = url ? sanitizeImageUrl(url) : "";
  if (safe) return `<img src="${safe}" alt="${escapeHtml(word)}">`;
  warnings.push(`flashcards: missing image for "${word}"`);
  return placeholderTile(word);
}
function cardCss() {
  return `
.fsheet{height:100%;box-sizing:border-box;padding:9mm;display:flex;flex-direction:column;}
.fcard{height:${CARD_H_MM}mm;background:${FRAME_COLOR};padding:${WHITE_BORDER_CM}cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;flex-direction:column;gap:${WHITE_BORDER_CM}cm;overflow:hidden;}
.fc-img{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.fc-img img{width:100%;height:100%;object-fit:cover;display:block;}
/* Text face (the card BACK) \u2014 one white panel filling the card. */
.fc-back{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:bold;color:${INK};text-align:center;padding:0.4cm 1cm;line-height:1.1;word-break:break-word;overflow-wrap:anywhere;}
/* Letter / pattern card front \u2014 the glyph fills the white panel. */
.fc-glyph{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:bold;color:${FRAME_COLOR};line-height:1;}
`;
}
var page = (inner) => `<div class="page fsheet"><div class="fcard">${inner}</div></div>`;
function buildFlashcards(spec, assets, opts = {}) {
  const ruleCards = spec.materials?.ruleCards;
  if (ruleCards && ruleCards.length) return buildRuleFlashcards(spec, assets, ruleCards, opts);
  const warnings = [];
  const words = (spec.materials?.threePartCards ?? []).map((w) => w.toLowerCase());
  const wordWidthCm = A4_WIDTH_CM - 1.8 - WHITE_BORDER_CM * 2 - 2;
  const labelPt = (w) => adaptiveLabelFontSize(w, 130, wordWidthCm, 10);
  const glyph = escapeHtml(spec.letterDisplay || spec.patternDisplay || spec.sound);
  const glyphPt = glyph.replace(/&[a-z]+;/g, "x").length <= 3 ? 260 : 150;
  const kicker = escapeHtml(spec.patternDisplay || `/${spec.sound}/`);
  const pages = [];
  pages.push(page(`<div class="fc-glyph" style="font-size:${glyphPt}pt;">${glyph}</div>`));
  pages.push(page(`<div class="fc-back" style="font-size:120pt;color:${FRAME_COLOR};">${kicker}</div>`));
  for (const w of words) {
    pages.push(page(`<div class="fc-img">${picture(w, assets, warnings)}</div>`));
    pages.push(page(`<div class="fc-back" style="font-size:${labelPt(w)}pt;">${escapeHtml(w)}</div>`));
  }
  if (pages.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No flashcard words for this week.</div></div>`);
  }
  return {
    html: docShell({ title: `Week ${spec.week} \u2014 Flashcards`, css: cardCss(), body: pages.join(""), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings
  };
}
function buildRuleFlashcards(spec, assets, ruleCards, opts = {}) {
  const warnings = [];
  const wordWidthCm = A4_WIDTH_CM - 1.8 - WHITE_BORDER_CM * 2 - 2;
  const labelPt = (phrase) => adaptiveLabelFontSize(phrase, 90, wordWidthCm, 14);
  const pages = [];
  for (const rc of ruleCards) {
    pages.push(page(`<div class="fc-img">${picture(rc.image.toLowerCase(), assets, warnings)}</div>`));
    pages.push(page(`<div class="fc-back" style="font-size:${labelPt(rc.phrase)}pt;line-height:1.2;">${escapeHtml(rc.phrase)}</div>`));
  }
  if (pages.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No rule cards for this week.</div></div>`);
  }
  return {
    html: docShell({ title: `${spec.displayName || `Week ${spec.week}`} \u2014 Rule Flashcards`, css: cardCss(), body: pages.join(""), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings
  };
}

// lib/montree/english-curriculum/render/builders/sentence-strips.ts
function pickSentenceWord(sentence, spec, assets) {
  const tokens = sentence.toLowerCase().match(/[a-z']+/g) ?? [];
  let hit = null;
  for (const t of tokens) {
    const w = t.replace(/'/g, "");
    if (assets.images[w]) hit = w;
  }
  if (hit) return hit;
  const anchor = spec.anchorWord?.toLowerCase();
  if (anchor && assets.images[anchor]) return anchor;
  return anchor ?? (tokens.length ? tokens[tokens.length - 1] : null);
}
function pic(word, assets, warnings) {
  if (!word) return placeholderTile("?");
  const safe = sanitizeImageUrl(resolveImage(assets, word) ?? "");
  if (safe) return `<img src="${safe}" alt="${escapeHtml(word)}">`;
  warnings.push(`sentence_strips: missing image for "${word}"`);
  return placeholderTile(word);
}
function buildSentenceStrips(spec, assets, opts = {}) {
  const warnings = [];
  const sentences = spec.materials?.sentences ?? [];
  const L = computeStripLayout(opts.cardSizeCm ?? DEFAULT_STRIP_SIZE_CM);
  const textWidthCm = L.stripWidth - WHITE_BORDER_CM * 2 - L.internalGap - L.pictureSize;
  const textHeightCm = L.stripHeight - WHITE_BORDER_CM * 2;
  const fpt = computeUniformStripFontSize(sentences, L.fontSize, textWidthCm, textHeightCm);
  const marginCtrlTop = (A4_HEIGHT_CM - L.stripHeight * L.stripsPerPage) / 2;
  const marginSentLeft = (A4_WIDTH_CM - L.sentenceWidth) / 2;
  const marginPicLeft = (A4_WIDTH_CM - L.pictureSize * L.picCols) / 2;
  const marginPicTop = (A4_HEIGHT_CM - L.pictureSize * L.picRows) / 2;
  const css = `
.gridc{display:grid;grid-template-columns:${L.stripWidth}cm;grid-auto-rows:${L.stripHeight}cm;gap:0;margin-top:${marginCtrlTop}cm;}
.grids{display:grid;grid-template-columns:${L.sentenceWidth}cm;grid-auto-rows:${L.stripHeight}cm;gap:0;margin-left:${marginSentLeft}cm;margin-top:${marginCtrlTop}cm;}
.gridp{display:grid;grid-template-columns:repeat(${L.picCols},${L.pictureSize}cm);grid-auto-rows:${L.pictureSize}cm;gap:0;margin-left:${marginPicLeft}cm;margin-top:${marginPicTop}cm;}
.sc{background:${FRAME_COLOR};width:${L.stripWidth}cm;height:${L.stripHeight}cm;padding:${WHITE_BORDER_CM}cm;display:flex;gap:${L.internalGap}cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;overflow:hidden;}
.ss{background:${FRAME_COLOR};width:${L.sentenceWidth}cm;height:${L.stripHeight}cm;padding:${WHITE_BORDER_CM}cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;overflow:hidden;}
.txt{flex:1;width:100%;height:100%;background:white;display:flex;align-items:center;justify-content:center;padding:0.2cm 0.5cm;font-family:${KIDS_FONT};font-weight:bold;font-size:${fpt}pt;text-align:center;line-height:1.25;color:${INK};border-radius:${CARD_BORDER_RADIUS_CM}cm;overflow:hidden;word-break:break-word;}
.pimg{width:${L.pictureSize - WHITE_BORDER_CM * 2}cm;height:${L.pictureSize - WHITE_BORDER_CM * 2}cm;background:white;overflow:hidden;flex-shrink:0;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;}
.pimg img{width:100%;height:100%;object-fit:cover;display:block;}
.pc{background:${FRAME_COLOR};width:${L.pictureSize}cm;height:${L.pictureSize}cm;padding:${WHITE_BORDER_CM}cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;overflow:hidden;}
.pci{width:100%;height:100%;background:white;overflow:hidden;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;}
.pci img{width:100%;height:100%;object-fit:cover;display:block;}
`;
  const wordFor = sentences.map((s) => pickSentenceWord(s, spec, assets));
  const controls = sentences.map((s, i) => `<div class="sc"><div class="txt">${escapeHtml(s)}</div><div class="pimg">${pic(wordFor[i], assets, warnings)}</div></div>`);
  const pics = wordFor.map((w) => `<div class="pc"><div class="pci">${pic(w, assets, warnings)}</div></div>`);
  const sents = sentences.map((s) => `<div class="ss"><div class="txt">${escapeHtml(s)}</div></div>`);
  const pages = [];
  if (sentences.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No sentences for this week.</div></div>`);
  } else {
    for (let i = 0; i < controls.length; i += L.stripsPerPage) {
      pages.push(`<div class="page"><div class="gridc">${controls.slice(i, i + L.stripsPerPage).join("")}</div></div>`);
    }
    for (let i = 0; i < pics.length; i += L.picPerPage) {
      pages.push(`<div class="page"><div class="gridp">${pics.slice(i, i + L.picPerPage).join("")}</div></div>`);
    }
    for (let i = 0; i < sents.length; i += L.stripsPerPage) {
      pages.push(`<div class="page"><div class="grids">${sents.slice(i, i + L.stripsPerPage).join("")}</div></div>`);
    }
  }
  return {
    html: docShell({ title: `Week ${spec.week} \u2014 Sentence Strips`, css, body: pages.join(""), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings
  };
}

// lib/montree/english-curriculum/render/builders/matching.ts
function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = (seed || 1) >>> 0;
  const rnd = () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pic2(word, assets, warnings, sizeCm) {
  const safe = sanitizeImageUrl(resolveImage(assets, word) ?? "");
  if (safe) return `<img src="${safe}" alt="${escapeHtml(word)}" style="width:${sizeCm}cm;height:${sizeCm}cm;object-fit:contain;">`;
  warnings.push(`matching: missing image for "${word}"`);
  return `<div style="width:${sizeCm}cm;height:${sizeCm}cm;">${placeholderTile(word)}</div>`;
}
function buildMatching(spec, assets, opts = {}) {
  const warnings = [];
  const all = (spec.materials?.matching ?? []).map((w) => w.toLowerCase());
  const seed = opts.seed ?? spec.week * 101 + 7;
  const L = computeMatchingLayout();
  const dotAndGapCm = 0.45 + 0.6;
  const fpt = all.length ? computeUniformStripFontSize(all, 26, L.wordColCm - dotAndGapCm, L.rowContentCm - 0.4) : 26;
  const css = `
.sheet{padding:${L.padVCm}cm ${L.padHCm}cm;}
.top{height:1.6cm;margin-bottom:0.4cm;display:flex;justify-content:space-between;align-items:center;}
.top .aa{font-size:24pt;font-weight:700;font-family:${KIDS_FONT};color:${FRAME_COLOR};}
.top .nm{font-size:12pt;color:#000000;font-family:${KIDS_FONT};}
.instr{height:0.8cm;margin-bottom:0.6cm;display:flex;align-items:center;font-size:12pt;color:#000000;font-family:${KIDS_FONT};}
.match{display:grid;grid-template-columns:${L.wordColCm}cm ${L.colGapCm}cm ${L.picColCm}cm;justify-content:center;height:${L.usableHeightCm}cm;}
.wcell{display:flex;align-items:center;justify-content:space-between;gap:6mm;font-family:${KIDS_FONT};font-weight:700;font-size:${fpt}pt;color:${INK};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;height:100%;}
.pcell{display:flex;align-items:center;justify-content:space-between;gap:6mm;height:100%;}
.dot{width:4.5mm;height:4.5mm;border-radius:50%;background:${FRAME_COLOR};flex-shrink:0;}
`;
  const pages = [];
  const perPage = L.rowsPerPage;
  const chunks = [];
  for (let i = 0; i < all.length; i += perPage) chunks.push(all.slice(i, i + perPage));
  if (chunks.length === 0) chunks.push([]);
  chunks.forEach((words, pi) => {
    const pics = seededShuffle(words, seed + pi * 17);
    const n = words.length;
    const rowGapCm = n > 1 ? (L.usableHeightCm - n * L.rowContentCm) / (n - 1) : 0;
    const wcells = words.map((w, i) => `<div class="wcell" style="grid-column:1;grid-row:${i + 1};">${escapeHtml(w)}<div class="dot"></div></div>`).join("");
    const pcells = pics.map((p, i) => `<div class="pcell" style="grid-column:3;grid-row:${i + 1};"><div class="dot"></div>${pic2(p, assets, warnings, L.picSizeCm)}</div>`).join("");
    const matchBlock = n > 0 ? `<div class="match" style="grid-template-rows:repeat(${n},${L.rowContentCm}cm);row-gap:${rowGapCm}cm;align-content:center;">${wcells}${pcells}</div>` : `<div class="instr">No words this week.</div>`;
    pages.push(
      `<div class="page sheet"><div class="top"><div class="aa">${escapeHtml(spec.letterDisplay || spec.sound)} \xB7 Match</div><div class="nm">name ______________________</div></div><div class="instr">Draw a line from the word to the picture.</div>` + matchBlock + `</div>`
    );
  });
  return {
    html: docShell({ title: `Week ${spec.week} \u2014 Matching`, css, body: pages.join(""), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings
  };
}

// lib/montree/english-curriculum/render/builders/bingo.ts
function seededSample(pool, count, seed) {
  const a = [...pool];
  let s = (seed || 1) >>> 0;
  const rnd = () => (s = s * 1664525 + 1013904223 >>> 0) / 4294967296;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  const out = [];
  let idx = 0;
  while (out.length < count) {
    out.push(a[idx % a.length]);
    idx++;
  }
  return out.slice(0, count);
}
var SPACER = "__spacer__";
function buildBingo(spec, assets, opts = {}) {
  const warnings = [];
  const pool = (spec.materials?.bingoPool ?? []).map((w) => w.toLowerCase());
  const size = BINGO_GRID_SIZE;
  const cells = size * size;
  const boardCount = 6;
  const seed = opts.seed ?? spec.week * 911 + 3;
  const title = `${spec.letterDisplay || spec.sound}`;
  if (pool.length < cells) {
    warnings.push(`bingo: pool has ${pool.length} words but a ${size}\xD7${size} board needs ${cells}; cells were cycled to fill.`);
  }
  const cell = (word) => {
    if (word === SPACER) return `<div class="bcell" style="visibility:hidden"></div>`;
    const safe = sanitizeImageUrl(resolveImage(assets, word) ?? "");
    if (safe) {
      return `<div class="bcell"><img src="${safe}" alt="${escapeHtml(word)}"><div class="w">${escapeHtml(word)}</div></div>`;
    }
    warnings.push(`bingo: missing image for "${word}"`);
    return `<div class="bcell"><div class="phw">${escapeHtml(word)}</div><div class="w">${escapeHtml(word)}</div></div>`;
  };
  const css = `
.hdr{text-align:center;height:${BINGO_HEADER_MM}mm;margin:8mm 0 4mm;overflow:hidden;box-sizing:border-box;}
.hdr h2{font-size:26px;color:${INK};font-family:${HEADING_FONT};font-weight:700;line-height:1.1;white-space:nowrap;}
.hdr p{font-size:12px;color:#000000;margin-top:3px;line-height:1.2;white-space:nowrap;}
.bgrid{display:grid;grid-template-columns:repeat(${size},1fr);width:${BINGO_GRID_WIDTH_MM}mm;margin:0 auto;background:${FRAME_COLOR};padding:${BINGO_BOARD_BORDER_MM}mm;gap:${BINGO_BOARD_BORDER_MM}mm;border-radius:${BINGO_RADIUS_PX}px;}
.bcell{aspect-ratio:1;display:flex;flex-direction:column;overflow:hidden;background:white;border-radius:${Math.max(0, BINGO_RADIUS_PX - 2)}px;}
.bcell img{width:100%;flex:1;object-fit:cover;display:block;min-height:0;}
.bcell .w{font-size:14pt;font-weight:700;font-family:${KIDS_FONT};color:${INK};padding:2px 0;text-align:center;flex-shrink:0;line-height:1.2;}
.bcell .phw{flex:1;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:700;font-size:17pt;color:#000000;}
.cgrid{display:grid;grid-template-columns:repeat(${BINGO_CALLING_COLS},1fr);width:${BINGO_GRID_WIDTH_MM}mm;margin:0 auto;gap:0;}
.ccard{aspect-ratio:1;background:${FRAME_COLOR};padding:${BINGO_CARD_BORDER_MM}mm;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;flex-direction:column;}
.cin{background:white;flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:${CARD_BORDER_RADIUS_CM}cm;}
.cin img{width:100%;height:100%;object-fit:cover;display:block;}
.cw{font-size:30pt;font-weight:700;font-family:${KIDS_FONT};color:${INK};}
.cphw{font-size:19pt;font-weight:700;font-family:${KIDS_FONT};color:#000000;}
`;
  const pages = [];
  if (pool.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No bingo pool for this week.</div></div>`);
    return { html: docShell({ title: `Week ${spec.week} \u2014 Bingo`, css, body: pages.join(""), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }), warnings };
  }
  for (let b = 0; b < boardCount; b++) {
    const picks = seededSample(pool, cells, seed + b * 31);
    pages.push(
      `<div class="page"><div class="hdr"><h2>${escapeHtml(title)} &middot; BINGO</h2><p>Board #${b + 1} &middot; single-sided &middot; name ____________________</p></div><div class="bgrid">${picks.map(cell).join("")}</div></div>`
    );
  }
  const cols = BINGO_CALLING_COLS;
  const perPage = cols * cols;
  const uniquePool = Array.from(new Set(pool));
  const front = (w) => {
    if (w === SPACER) return `<div class="ccard" style="visibility:hidden"></div>`;
    const safe = sanitizeImageUrl(resolveImage(assets, w) ?? "");
    const inner = safe ? `<img src="${safe}" alt="${escapeHtml(w)}">` : `<span class="cphw">${escapeHtml(w)}</span>`;
    return `<div class="ccard"><div class="cin">${inner}</div></div>`;
  };
  const back = (w) => {
    if (w === SPACER) return `<div class="ccard" style="visibility:hidden"></div>`;
    return `<div class="ccard"><div class="cin"><span class="cw">${escapeHtml(w)}</span></div></div>`;
  };
  const totalPages = Math.max(1, Math.ceil(uniquePool.length / perPage));
  for (let p = 0; p < totalPages; p++) {
    const slice = uniquePool.slice(p * perPage, (p + 1) * perPage);
    while (slice.length < perPage) slice.push(SPACER);
    const rows = [];
    for (let r = 0; r < cols; r++) rows.push(slice.slice(r * cols, (r + 1) * cols));
    const fronts = rows.flat().map(front).join("");
    const backs = rows.map((r) => [...r].reverse().map(back).join("")).join("");
    pages.push(
      `<div class="page"><div class="hdr"><h2>${escapeHtml(title)} &middot; Calling Cards</h2><p>Picture Side &middot; Page ${p + 1} of ${totalPages} &middot; Print duplex, flip on SHORT edge</p></div><div class="cgrid">${fronts}</div></div>`
    );
    pages.push(
      `<div class="page"><div class="hdr"><h2>${escapeHtml(title)} &middot; Calling Cards</h2><p>Word Side (mirrored for duplex) &middot; Page ${p + 1} of ${totalPages}</p></div><div class="cgrid">${backs}</div></div>`
    );
  }
  return {
    html: docShell({ title: `Week ${spec.week} \u2014 Bingo`, css, body: pages.join(""), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings
  };
}

// lib/montree/english-curriculum/render/letter-strokes.ts
var oFull = "M64.8 49.2 A21 21 0 1 0 35.2 78.8 A21 21 0 1 0 64.8 49.2";
var LETTERS = {
  a: {
    strokes: [
      { d: "M57.4 52.6 A19 19 0 1 0 30.6 79.4 A19 19 0 1 0 57.4 52.6", num: [30, 40], arrow: [44, 47, 180] },
      { d: "M64 44 L64 88", num: [70, 40] }
    ]
  },
  b: {
    strokes: [
      { d: "M32 15 L32 88", num: [22, 20] },
      // Bowl STARTS on the stem (upper-left of bowl) and travels CLOCKWISE
      // (sweep 1) up over the top, around the right, ending back on the stem
      // below bowl-middle — an open ~330° arc, not a closed circle.
      { d: "M35 62 A18 18 0 1 1 35 74", num: [72, 50], arrow: [52, 50, 0] }
    ]
  },
  c: { strokes: [{ d: "M66 50 A21 21 0 1 0 66 78", num: [70, 42] }] },
  d: {
    strokes: [
      { d: "M60.7 55.3 A18 18 0 1 0 35.3 80.7 A18 18 0 1 0 60.7 55.3", num: [30, 44], arrow: [48, 50, 180] },
      { d: "M66 15 L66 88", num: [72, 20] }
    ]
  },
  e: {
    strokes: [
      { d: "M31 64 L69 64", num: [24, 60] },
      // From the bar's RIGHT end, UP OVER THE TOP (counter-clockwise, sweep 0),
      // around the left and under, finishing at ~4:30 like a 'c' ending.
      { d: "M69 64 A19 19 0 1 0 64 77", num: [74, 48] }
    ]
  },
  f: {
    strokes: [
      { d: "M62 26 C58 18 46 18 46 30 L46 88", num: [66, 20] },
      { d: "M34 44 L60 44", num: [28, 40] }
    ]
  },
  g: {
    strokes: [
      { d: "M58 46 A17 17 0 1 0 34 70 A17 17 0 1 0 58 46", num: [30, 38], arrow: [46, 41, 180] },
      { d: "M63 42 L63 104 Q63 112 52 110", num: [70, 40] }
    ]
  },
  h: {
    strokes: [
      { d: "M34 15 L34 88", num: [24, 20] },
      { d: "M34 55 C34 44 66 44 66 58 L66 88", num: [70, 46] }
    ]
  },
  i: { strokes: [{ d: "M50 40 L50 88", num: [40, 44] }], dots: [[50, 27, 3.4]] },
  j: {
    strokes: [{ d: "M56 40 L56 104 Q56 112 44 108", num: [64, 44] }],
    dots: [[56, 27, 3.4]]
  },
  k: {
    strokes: [
      { d: "M34 15 L34 88", num: [24, 20] },
      { d: "M64 44 L38 66", num: [70, 42] },
      { d: "M46 60 L66 88", num: [70, 84] }
    ]
  },
  l: { strokes: [{ d: "M50 15 L50 88", num: [40, 20] }] },
  m: {
    strokes: [
      { d: "M28 40 L28 88", num: [20, 44] },
      { d: "M28 52 C28 42 50 42 50 56 L50 88", num: [42, 46] },
      { d: "M50 52 C50 42 72 42 72 56 L72 88", num: [66, 46] }
    ]
  },
  n: {
    strokes: [
      { d: "M32 40 L32 88", num: [22, 44] },
      { d: "M32 52 C32 42 68 42 68 56 L68 88", num: [70, 46] }
    ]
  },
  o: { strokes: [{ d: oFull, num: [36, 40], arrow: [50, 43, 180] }] },
  p: {
    strokes: [
      { d: "M32 40 L32 110", num: [22, 44] },
      // Bowl STARTS on the stem, CLOCKWISE (sweep 1) up over the top, around the
      // right, ending back on the stem below bowl-middle — open ~330° arc.
      { d: "M37 50 A17 17 0 1 1 37 66", num: [70, 42], arrow: [52, 41, 0] }
    ]
  },
  q: {
    strokes: [
      { d: "M60 46 A17 17 0 1 0 36 70 A17 17 0 1 0 60 46", num: [30, 38], arrow: [48, 41, 180] },
      { d: "M66 40 L66 106 Q66 112 74 108", num: [72, 44] }
    ]
  },
  r: {
    strokes: [
      { d: "M36 40 L36 88", num: [26, 44] },
      { d: "M36 52 C36 44 52 42 64 48", num: [64, 42] }
    ]
  },
  s: { strokes: [{ d: "M64 48 C64 40 40 40 40 52 C40 62 64 66 64 78 C64 90 40 90 38 80", num: [68, 44] }] },
  t: {
    strokes: [
      { d: "M50 24 L50 82 Q50 88 58 86", num: [40, 28] },
      { d: "M36 42 L64 42", num: [30, 38] }
    ]
  },
  u: {
    strokes: [
      { d: "M32 40 L32 78 C32 86 42 88 50 88 C58 88 68 86 68 78 L68 40", num: [22, 44] },
      { d: "M68 40 L68 88", num: [74, 46] }
    ]
  },
  v: { strokes: [{ d: "M32 40 L50 88 L68 40", num: [26, 44] }] },
  w: { strokes: [{ d: "M26 40 L38 88 L50 54 L62 88 L74 40", num: [20, 44] }] },
  x: {
    strokes: [
      { d: "M32 40 L68 88", num: [26, 44] },
      { d: "M68 40 L32 88", num: [72, 44] }
    ]
  },
  y: {
    strokes: [
      { d: "M32 40 L50 78", num: [24, 44] },
      { d: "M68 40 L50 78 L40 110", num: [74, 44] }
    ]
  },
  z: { strokes: [{ d: "M32 42 L68 42 L32 86 L68 86", num: [26, 38] }] }
};
function firstPoint(d) {
  const m = d.match(/M\s*(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)/i);
  if (!m) return [50, 40];
  return [parseFloat(m[1]), parseFloat(m[2])];
}
function renderGlyph(letter, opts) {
  const def = LETTERS[letter];
  const band = opts.bandColor ?? LETTER_BAND_TINT;
  const guide = opts.guideColor ?? FRAME_COLOR;
  if (!def) {
    return {
      inner: `<text x="50" y="82" font-size="70" font-family="'Andika','Comic Sans MS',cursive" font-weight="700" fill="${band}" text-anchor="middle">${letter}</text>`
    };
  }
  let inner = def.strokes.map(
    (s) => `<path d="${s.d}" fill="none" stroke="${band}" stroke-width="${LETTER_BAND_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>`
  ).join("");
  for (const [cx, cy, r] of def.dots ?? []) {
    inner += `<circle cx="${cx}" cy="${cy}" r="${r + 2.5}" fill="${band}"/>`;
  }
  if (opts.guides) {
    inner += `<defs><marker id="lsah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.6" markerHeight="4.6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${guide}"/></marker></defs>`;
    def.strokes.forEach((s, i) => {
      const marker = s.arrow ? "" : ` marker-end="url(#lsah)"`;
      inner += `<path d="${s.d}" fill="none" stroke="${guide}" stroke-width="${LETTER_GUIDE_WIDTH}" stroke-linecap="round"${marker}/>`;
      if (s.arrow) {
        const [ax, ay, deg] = s.arrow;
        inner += `<g transform="translate(${ax} ${ay}) rotate(${deg})"><path d="M-6 -4.5 L5 0 L-6 4.5 z" fill="${guide}"/></g>`;
      }
      inner += `<text x="${s.num[0]}" y="${s.num[1]}" font-size="11" font-weight="bold" fill="${guide}" font-family="system-ui">${i + 1}</text>`;
    });
    const [sx, sy] = firstPoint(def.strokes[0].d);
    inner += `<circle cx="${sx}" cy="${sy}" r="${LETTER_START_DOT_R}" fill="${guide}"/>`;
    for (const [cx, cy] of def.dots ?? []) {
      inner += `<circle cx="${cx}" cy="${cy}" r="3.2" fill="${guide}"/>`;
    }
  }
  return { inner };
}
function letterStrokeSVG(letterRaw, opts = {}) {
  const letter = (letterRaw || "").toLowerCase();
  const chars = letter.split("").filter((c) => /[a-z]/.test(c));
  const n = Math.max(1, chars.length);
  const vbW = 100 * n;
  const sizeAttr = opts.widthMm != null ? `width="${opts.widthMm * n}mm"` : opts.widthPx != null ? `width="${opts.widthPx * n}"` : `width="100%"`;
  const glyphs = (chars.length ? chars : [letter]).map((c, i) => {
    const { inner } = renderGlyph(c, opts);
    return `<g transform="translate(${i * 100},0)">${inner}</g>`;
  });
  return `<svg ${sizeAttr} viewBox="0 0 ${vbW} 120" xmlns="http://www.w3.org/2000/svg">` + glyphs.join("") + `</svg>`;
}
var KNOWN_STROKE_LETTERS = Object.keys(LETTERS);

// lib/montree/english-curriculum/render/builders/tracing.ts
var PATTERN_RED = "#c0392b";
var FRAME_INK = "#000000";
var SILENT_GREY = "#000000";
function buildTracing(spec, _assets, opts = {}) {
  const mode = spec.materials?.tracing?.mode ?? "letters";
  if (mode === "pattern") return buildPatternTracing(spec, opts);
  const warnings = [];
  const letter = (spec.materials?.tracing?.letter ?? spec.sound ?? "a").toLowerCase();
  const words = spec.materials?.tracing?.words ?? [];
  const display = spec.letterDisplay || letter;
  const css = `
.sheet{padding:12mm;}
.top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4mm;}
.top .aa{font-size:26pt;font-weight:700;font-family:${KIDS_FONT};color:${FRAME_COLOR};}
.top .nm{font-size:12pt;color:#000000;font-family:${KIDS_FONT};}
.instr{font-size:12pt;color:#000000;font-family:${KIDS_FONT};margin:5mm 0 2mm;}
.bigletter{text-align:center;margin:2mm 0;}
.trrow{display:flex;align-items:flex-end;gap:10mm;padding:0 6mm;height:26mm;border-top:0.3mm solid #000000;border-bottom:0.5mm solid #000000;margin-bottom:4mm;}
.wordrow{display:flex;flex-wrap:wrap;gap:8mm 14mm;margin-top:3mm;}
.wtrace{position:relative;font-family:${KIDS_FONT};font-weight:700;font-size:30pt;color:${LETTER_TRACE_TINT};letter-spacing:2mm;border-bottom:0.5mm solid #000000;padding:0 4mm 1mm;line-height:1.1;}
`;
  const faint = letterStrokeSVG(letter, { widthMm: 24, guides: false, bandColor: LETTER_TRACE_TINT });
  const modelSmall = letterStrokeSVG(letter, { widthMm: 24, guides: false, bandColor: LETTER_BAND_TINT });
  const traceRow = modelSmall + faint.repeat(5);
  const wordSection = words.length ? `<div class="instr">Trace the words.</div><div class="wordrow">` + words.map((w) => `<div class="wtrace">${escapeHtml(w)}</div>`).join("") + `</div>` : "";
  const body = `<div class="page sheet"><div class="top"><div class="aa">${escapeHtml(display)}</div><div class="nm">name ______________________</div></div><div class="instr">Start at the green dot. Follow the numbered arrows.</div><div class="bigletter">${letterStrokeSVG(letter, { widthMm: 66, guides: true })}</div><div class="instr">Trace.</div><div class="trrow">${traceRow}</div><div class="trrow">${traceRow}</div>` + wordSection + `</div>`;
  return {
    html: docShell({ title: `Week ${spec.week} \u2014 Tracing ${display}`, css, body, fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings
  };
}
var SILENT_IN_PATTERN = { kn: "k", wr: "w", mb: "b" };
var colorFor = (role) => role === "pattern" ? PATTERN_RED : role === "silent" ? SILENT_GREY : FRAME_INK;
function classifyWord(pattern, word) {
  const w = word.toLowerCase();
  const roles = new Array(w.length).fill("frame");
  if (pattern.includes("_")) {
    const [head, tail] = pattern.split("_");
    const tailIdx = tail ? w.lastIndexOf(tail) : -1;
    if (tailIdx >= 0) {
      for (let k = 0; k < tail.length; k++) roles[tailIdx + k] = "silent";
      const headIdx = head ? w.lastIndexOf(head, tailIdx - 1) : -1;
      if (headIdx >= 0) for (let k = 0; k < head.length; k++) roles[headIdx + k] = "pattern";
    }
    return roles;
  }
  const idx = w.indexOf(pattern);
  if (idx >= 0) {
    for (let k = 0; k < pattern.length; k++) roles[idx + k] = "pattern";
    const silentChar = SILENT_IN_PATTERN[pattern];
    if (silentChar) {
      const sIdx = w.indexOf(silentChar, idx);
      if (sIdx >= 0 && sIdx < idx + pattern.length) roles[sIdx] = "silent";
    }
  }
  return roles;
}
function classifyPatternGlyphs(pattern) {
  if (pattern.includes("_")) {
    const [head, tail] = pattern.split("_");
    const out = [];
    for (const c of head) out.push({ char: c, role: "pattern" });
    out.push({ char: "", role: "frame", slot: true });
    for (const c of tail) out.push({ char: c, role: "silent" });
    return out;
  }
  const silentChar = SILENT_IN_PATTERN[pattern];
  return pattern.split("").map((c) => ({ char: c, role: silentChar === c ? "silent" : "pattern" }));
}
function colorWord(pattern, word) {
  const roles = classifyWord(pattern, word);
  return word.split("").map((ch, i) => {
    const role = roles[i] ?? "frame";
    const cls = role === "silent" ? " silent" : "";
    return `<span class="pl${cls}" style="color:${colorFor(role)};">${escapeHtml(ch)}</span>`;
  }).join("");
}
function buildPatternTracing(spec, opts = {}) {
  const warnings = [];
  const pattern = (spec.materials?.tracing?.letter ?? spec.patternDisplay ?? spec.sound ?? "").toLowerCase();
  const words = spec.materials?.tracing?.words ?? [];
  const display = spec.patternDisplay ?? spec.letterDisplay ?? pattern;
  const css = `
.sheet{padding:12mm;}
.top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4mm;}
.top .aa{font-size:26pt;font-weight:700;font-family:${KIDS_FONT};color:${PATTERN_RED};}
.top .nm{font-size:12pt;color:#000000;font-family:${KIDS_FONT};}
.instr{font-size:12pt;color:#000000;font-family:${KIDS_FONT};margin:5mm 0 2mm;}
.pcard{display:flex;justify-content:center;align-items:flex-end;gap:2mm;margin:2mm 0 4mm;}
.pg{display:inline-block;}
.pg.silent{filter:drop-shadow(0 0 1.4mm rgba(156,163,175,0.85));}
.slot{width:22mm;height:2mm;border-bottom:0.8mm dashed ${SILENT_GREY};margin:0 2mm 8mm;}
.legend{display:flex;justify-content:center;gap:10mm;font-size:11pt;font-family:${KIDS_FONT};color:#000000;margin-bottom:4mm;}
.legend b{font-weight:700;}
.wordrow{display:flex;flex-wrap:wrap;gap:8mm 14mm;margin-top:3mm;}
.wtrace{position:relative;font-family:${KIDS_FONT};font-weight:700;font-size:30pt;letter-spacing:2mm;border-bottom:0.5mm solid #000000;padding:0 4mm 1mm;line-height:1.1;}
.pl{}
.pl.silent{text-shadow:0 0 1.4mm rgba(156,163,175,0.9);}
`;
  const glyphCells = classifyPatternGlyphs(pattern).map((g) => {
    if (g.slot) return `<span class="slot"></span>`;
    const color = colorFor(g.role);
    const svg = letterStrokeSVG(g.char, { widthMm: 30, guides: true, bandColor: color, guideColor: color });
    return `<span class="pg${g.role === "silent" ? " silent" : ""}">${svg}</span>`;
  }).join("");
  const wordSection = words.length ? `<div class="instr">Trace the words. The red sound is the pattern.</div><div class="wordrow">` + words.map((w) => `<div class="wtrace">${colorWord(pattern, w)}</div>`).join("") + `</div>` : "";
  const body = `<div class="page sheet"><div class="top"><div class="aa">${escapeHtml(display)}</div><div class="nm">name ______________________</div></div><div class="instr">This week's pattern. Start each letter at the green dot; follow the arrows.</div><div class="pcard">${glyphCells}</div><div class="legend"><span><b style="color:${PATTERN_RED};">red</b> = the pattern</span><span><b style="color:${FRAME_INK};">black</b> = the word</span><span><b>soft halo</b> = silent</span></div>` + wordSection + `</div>`;
  return {
    html: docShell({ title: `Week ${spec.week} \u2014 Pattern ${display}`, css, body, fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings
  };
}

// lib/montree/english-curriculum/render/builders/coloring.ts
var CELL_H_MM = 122;
function art(word, assets, warnings, hero) {
  const safe = sanitizeImageUrl(resolveImage(assets, word, { coloring: true }) ?? "");
  if (safe) return `<img class="ci-img" src="${safe}" alt="${escapeHtml(word)}">`;
  warnings.push(`coloring: missing ${word}-coloring.png`);
  const box = hero ? 150 : 80;
  return `<div class="ci-ph" style="width:${box}mm;height:${box}mm;">${placeholderTile(word)}</div>`;
}
function buildColoring(spec, assets, opts = {}) {
  const warnings = [];
  const words = (spec.materials?.coloring ?? []).map((w) => w.toLowerCase());
  const anchor = (spec.anchorWord || "").toLowerCase();
  const hero = (words.includes(anchor) ? anchor : words[words.length - 1] || spec.sound).toLowerCase();
  const css = `
.sheet{box-sizing:border-box;padding:10mm;}
.top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5mm;}
.top .aa{font-size:24pt;font-weight:700;font-family:${KIDS_FONT};color:${FRAME_COLOR};}
.top .nm{font-size:12pt;color:#000000;font-family:${KIDS_FONT};}
.cgrid{display:grid;grid-template-columns:1fr 1fr;gap:7mm;}
.citem{height:${CELL_H_MM}mm;border:0.4mm dashed #000000;border-radius:3mm;padding:4mm;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;}
.ci-imgwrap{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.ci-img{max-width:100%;max-height:100%;object-fit:contain;}
.ci-ph{flex:0 1 auto;}
.cap{flex:0 0 auto;font-size:16pt;font-weight:700;font-family:${KIDS_FONT};color:${INK};margin-top:3mm;}
.hero-sheet{box-sizing:border-box;padding:10mm;}
.hero{height:255mm;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.hero .ci-imgwrap{flex:1;min-height:0;width:100%;}
.hero .cap{font-size:26pt;margin-top:5mm;}
`;
  const cell = (w, hero2) => `<div class="ci-imgwrap">${art(w, assets, warnings, hero2)}</div><div class="cap">${escapeHtml(w)}</div>`;
  const pages = [];
  const gridWords = words.filter((w) => w !== hero);
  for (let i = 0; i < gridWords.length; i += 4) {
    const cells = gridWords.slice(i, i + 4).map((w) => `<div class="citem">${cell(w, false)}</div>`).join("");
    pages.push(
      `<div class="page sheet"><div class="top"><div class="aa">${escapeHtml(spec.letterDisplay || spec.sound)} &middot; Color</div><div class="nm">name ______________________</div></div><div class="cgrid">${cells}</div></div>`
    );
  }
  pages.push(`<div class="page hero-sheet"><div class="hero">${cell(hero, true)}</div></div>`);
  if (pages.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No colouring words for this week.</div></div>`);
  }
  return {
    html: docShell({ title: `${spec.displayName || `Week ${spec.week}`} \u2014 Colouring`, css, body: pages.join(""), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings
  };
}

// lib/montree/english-curriculum/render/builders/dictionary-journal.ts
function art2(word, assets, warnings) {
  const safe = sanitizeImageUrl(
    resolveImage(assets, word, { coloring: true }) ?? resolveImage(assets, word) ?? ""
  );
  if (safe) return `<img src="${safe}" alt="${escapeHtml(word)}" style="max-height:34mm;max-width:34mm;object-fit:contain;">`;
  warnings.push(`dictionary_journal: missing art for "${word}"`);
  return `<div style="width:34mm;height:34mm;">${placeholderTile(word)}</div>`;
}
function buildDictionaryJournal(spec, assets, opts = {}) {
  const warnings = [];
  const words = (spec.materials?.dictionary ?? []).map((w) => w.toLowerCase());
  const css = `
.sheet{padding:12mm 14mm;}
.top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3mm;}
.top .aa{font-size:24pt;font-weight:700;font-family:${KIDS_FONT};color:${FRAME_COLOR};}
.top .t{font-size:11pt;color:#000000;letter-spacing:3px;font-family:system-ui;}
.top .nm{font-size:11pt;color:#000000;font-family:${KIDS_FONT};}
.drow{display:flex;align-items:center;gap:8mm;height:48mm;border-bottom:0.3mm dashed #000000;}
.dpic{width:38mm;flex-shrink:0;text-align:center;}
.dpic .cap{font-size:11pt;font-family:${KIDS_FONT};font-weight:700;color:${INK};margin-top:1mm;}
.lines{position:relative;flex:1;height:24mm;}
.l-top{position:absolute;left:0;right:0;top:0;border-top:0.35mm solid #000000;}
.l-mid{position:absolute;left:0;right:0;top:8mm;border-top:0.35mm dashed #000000;}
.l-base{position:absolute;left:0;right:0;top:16mm;border-top:0.45mm solid #000000;}
.trace{position:absolute;left:4mm;top:16mm;transform:translateY(-84%);font-family:${KIDS_FONT};font-weight:700;font-size:15mm;line-height:1;color:#000000;letter-spacing:1mm;}
`;
  const header = () => `<div class="top"><div class="aa">${escapeHtml(spec.letterDisplay || spec.sound)}</div><div class="t">MY DICTIONARY &middot; WEEK ${spec.week}</div><div class="nm">name ____________________</div></div>`;
  const row = (w) => `<div class="drow"><div class="dpic">${art2(w, assets, warnings)}<div class="cap">${escapeHtml(w)}</div></div><div class="lines"><div class="l-top"></div><div class="l-mid"></div><div class="l-base"></div><div class="trace">${escapeHtml(w)}</div></div></div>`;
  const pages = [];
  if (words.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No dictionary words for this week.</div></div>`);
  } else {
    for (let i = 0; i < words.length; i += 5) {
      pages.push(`<div class="page sheet">${header()}${words.slice(i, i + 5).map(row).join("")}</div>`);
    }
  }
  return {
    html: docShell({ title: `Week ${spec.week} \u2014 Dictionary Journal`, css, body: pages.join(""), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings
  };
}

// lib/montree/english-curriculum/render/builders/book.ts
function buildBook(spec, assets, opts = {}) {
  const warnings = [];
  const book = spec.book;
  const mark = escapeHtml(spec.sound || "a");
  const css = `
@page{size:${BOOK_WIDTH_MM}mm ${BOOK_HEIGHT_MM}mm;margin:0;}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:${BOOK_FONT};}
.page{width:${BOOK_WIDTH_MM}mm;height:${BOOK_HEIGHT_MM}mm;page-break-after:always;position:relative;overflow:hidden;background:${BOOK_FOREST};}
.page:last-child{page-break-after:auto;}
.qpage{display:flex;align-items:center;justify-content:center;padding:10mm;background:radial-gradient(circle at 30% 20%,rgba(52,211,153,0.13),transparent 55%),${BOOK_FOREST};}
.q{color:#fff;font-size:44pt;font-weight:700;text-align:center;line-height:1.25;}
.suspense{background:radial-gradient(circle at 50% 60%,rgba(232,201,106,0.08),transparent 60%),${BOOK_FOREST_DEEP};}
.suspense .q{color:${BOOK_GOLD};letter-spacing:3px;}
.mark{position:absolute;bottom:7mm;right:11mm;color:rgba(232,201,106,0.45);font-size:24pt;font-weight:700;}
.apage img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;}
.aplace{position:absolute;inset:0;}
.bar{position:absolute;top:8mm;left:50%;transform:translateX(-50%);z-index:2;background:rgba(6,14,9,0.78);color:#fff;font-size:26pt;font-weight:700;padding:4mm 12mm;border-radius:6mm;white-space:nowrap;max-width:190mm;overflow:hidden;text-overflow:ellipsis;border:0.6mm solid rgba(52,211,153,0.35);}
.gold{color:${BOOK_GOLD};}
.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8mm;padding:10mm;text-align:center;background:radial-gradient(circle at 70% 25%,rgba(52,211,153,0.16),transparent 55%),${BOOK_FOREST};}
.kicker{color:${BOOK_GOLD};font-size:13pt;letter-spacing:5px;}
.title{color:#fff;font-size:58pt;font-weight:700;line-height:1.1;}
.foot{color:rgba(255,255,255,0.5);font-size:12pt;letter-spacing:1px;}
.back{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3.5mm;padding:10mm;text-align:center;background:radial-gradient(circle at 30% 80%,rgba(52,211,153,0.10),transparent 55%),${BOOK_FOREST};}
.back h2{color:${BOOK_GOLD};font-size:15pt;letter-spacing:3px;font-weight:700;margin-bottom:4mm;}
.back .w{color:#fff;font-size:16pt;}
.back .note{color:rgba(255,255,255,0.55);font-size:11pt;margin-top:7mm;max-width:150mm;line-height:1.5;}
.back .rule{width:34mm;height:0.4mm;background:rgba(232,201,106,0.5);margin-top:8mm;}
.back .author{color:#fff;font-size:14pt;font-weight:700;margin-top:3mm;}
.back .brand{color:${BOOK_GOLD};font-size:10pt;letter-spacing:5px;}
`;
  const qpage = (text) => `<div class="page qpage"><div class="q">${escapeHtml(text)}</div><div class="mark">${mark}</div></div>`;
  const suspensePage = (text) => `<div class="page qpage suspense"><div class="q">${escapeHtml(text)}</div><div class="mark">${mark}</div></div>`;
  const apage = (sp) => {
    const safe = sanitizeImageUrl(resolveImage(assets, (sp.image || "").toLowerCase()) ?? "");
    const bar = sp.text ? `<div class="bar">${escapeHtml(sp.text)}</div>` : "";
    const media = safe ? `<img src="${safe}" alt="${escapeHtml(sp.image || "")}"/>` : (warnings.push(`book: missing image "${sp.image}" (spread ${sp.n})`), `<div class="aplace">${placeholderTile(sp.image || "?")}</div>`);
    return `<div class="page apage">${bar}${media}</div>`;
  };
  const level = spec.level ?? 1;
  const kicker = level === 1 ? `WEEK ${spec.week} &middot; THE LETTER ${escapeHtml(spec.sound)}` : spec.soundType === "morphology" ? `WEEK ${spec.week} &middot; THE ENDING ${escapeHtml(spec.patternDisplay ?? spec.sound)}` : `WEEK ${spec.week} &middot; THE SOUND ${escapeHtml(spec.patternDisplay ?? (spec.sound || "").toUpperCase())}`;
  const pages = [];
  pages.push(
    `<div class="page cover"><div class="kicker">${kicker}</div><div class="title">${escapeHtml(book?.title ?? "")}</div><div class="foot">Book ${spec.week}</div></div>`
  );
  for (const sp of book?.spreads ?? []) {
    if ((sp.image || "").trim() === "") {
      pages.push(suspensePage(sp.text ?? ""));
      continue;
    }
    if (sp.text) pages.push(qpage(sp.text));
    pages.push(apage(sp));
  }
  const backWords = (book?.backCoverWords ?? []).map((w) => escapeHtml(w)).join(" &middot; ");
  pages.push(
    `<div class="page back"><h2>READ TOGETHER</h2>` + (backWords ? `<div class="w">${backWords}</div>` : "") + `<div class="note">Read slowly. Let the child sound out each word before you turn the page.<br/>The pause is the lesson.</div><div class="rule"></div><div class="author">Tredoux Willemse</div><div class="brand">MONTREE</div></div>`
  );
  return {
    html: docShell({ title: `Week ${spec.week} \u2014 ${book?.title ?? "Book"}`, css, body: pages.join(""), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint, ownReset: true }),
    warnings
  };
}

// lib/montree/english-curriculum/render/builders/vowel-wall.ts
function buildVowelWall(spec, _assets, opts = {}) {
  if ((spec.level ?? 1) >= 2) return buildPatternWall(spec, opts);
  const warnings = [];
  const isVowel = (c) => VOWELS.includes(c.toLowerCase());
  const letters = [];
  const push = (c) => {
    const v = (c || "").toLowerCase();
    if (v && /^[a-z]{1,2}$/.test(v) && !letters.includes(v)) letters.push(v);
  };
  push(spec.sound);
  push(spec.vowelLights);
  if (spec.celebration && /vowel wall complete/i.test(spec.celebration)) {
    for (const v of VOWELS) push(v);
  }
  if (letters.length === 0) push("a");
  const css = `
.v{display:flex;flex-direction:column;align-items:center;justify-content:center;height:29.7cm;}
.vl{font-size:170mm;font-weight:700;font-family:${KIDS_FONT};line-height:1;}
.vc{font-size:14pt;color:#000000;letter-spacing:6px;font-family:system-ui;margin-top:4mm;}
`;
  const pages = letters.map((c) => {
    const vowel = isVowel(c);
    const color = vowel ? VOWEL_BLUE : FRAME_COLOR;
    const caption = vowel ? "VOWEL" : "SOUND";
    return `<div class="page v"><div class="vl" style="color:${color};">${escapeHtml(c)}</div><div class="vc">${caption}</div></div>`;
  });
  return {
    html: docShell({ title: `Week ${spec.week} \u2014 Wall Posters`, css, body: pages.join(""), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings
  };
}
var PATTERN_LEAVES = {
  27: "sh",
  28: "ch",
  29: "th",
  30: "ck+FLSZ",
  31: "ng",
  32: "wh",
  33: "s-bl",
  34: "l-bl",
  35: "r-bl",
  36: "fin-I",
  37: "fin-II",
  38: "a_e",
  39: "i_e",
  40: "o_e",
  41: "u_e/e_e",
  42: "softc/g+tch/dge",
  43: "ai/ay",
  44: "ee/ea",
  45: "oa/ow",
  46: "igh/ie",
  47: "ar",
  48: "or/ore",
  49: "er/ir/ur",
  50: "MIRROR",
  51: "oo",
  52: "ou/ow",
  53: "oi/oy",
  54: "ew/ue/au/aw",
  55: "y",
  56: "kn/wr/mb",
  57: "-ing/-ed/-s",
  58: "-tion"
};
var L2_WEEKS = Array.from({ length: 16 }, (_, i) => 27 + i);
var L3_WEEKS = Array.from({ length: 16 }, (_, i) => 43 + i);
function buildPatternWall(spec, opts = {}) {
  const warnings = [];
  const week = spec.week;
  const display = spec.patternDisplay ?? spec.sound ?? PATTERN_LEAVES[week] ?? "";
  const isMorphology = spec.soundType === "morphology";
  const css = `
*{box-sizing:border-box;}
.pw{display:flex;flex-direction:column;align-items:center;justify-content:center;height:29.7cm;padding:12mm;}
.pw .kick{font-size:14pt;letter-spacing:6px;color:#000000;font-family:system-ui;text-transform:uppercase;}
.pw .big{font-size:150mm;font-weight:700;font-family:${KIDS_FONT};line-height:1;color:${FRAME_COLOR};}
.pw .cap{font-size:14pt;color:#000000;letter-spacing:6px;font-family:system-ui;margin-top:2mm;}
.tree{padding:12mm;}
.tree h1{text-align:center;font-family:${KIDS_FONT};color:${FRAME_COLOR};font-size:24pt;margin:0 0 2mm;}
.tree .sub{text-align:center;color:#000000;font-family:system-ui;font-size:11pt;letter-spacing:3px;margin-bottom:6mm;text-transform:uppercase;}
.crown{text-align:center;font-family:${KIDS_FONT};font-size:16pt;color:${BOOK_GOLD};margin-bottom:4mm;}
.branches{display:flex;gap:6mm;}
.col{flex:1;display:flex;flex-direction:column;gap:3mm;}
.col h2{font-family:system-ui;font-size:10pt;letter-spacing:2px;color:#000000;text-transform:uppercase;text-align:center;margin:0 0 2mm;}
.leaf{display:flex;justify-content:space-between;align-items:center;border:0.5mm solid #000000;border-radius:3mm;padding:2.5mm 4mm;font-family:${KIDS_FONT};font-size:12pt;color:#000000;}
.leaf .wk{font-size:9pt;color:#000000;font-family:system-ui;}
.leaf.earned{border-color:${BOOK_EMERALD};color:${FRAME_COLOR};background:rgba(52,211,153,0.08);}
.leaf.current{border-color:${BOOK_GOLD};color:#7a5b00;background:rgba(232,201,106,0.16);border-width:0.9mm;}
.leaf.mirror.earned{border-color:${VOWEL_BLUE};color:${VOWEL_BLUE};background:rgba(36,86,199,0.08);}
.trunk{margin-top:6mm;text-align:center;font-family:system-ui;font-size:10pt;letter-spacing:3px;color:#000000;border-top:0.5mm solid #000000;padding-top:4mm;}
`;
  const poster = `<div class="page pw"><div class="kick">${escapeHtml(
    isMorphology ? "THE ENDING" : "THE PATTERN"
  )}</div><div class="big">${escapeHtml(display)}</div><div class="cap">${escapeHtml((PATTERN_LEAVES[week] ?? display).toUpperCase())}</div></div>`;
  const leafRow = (wk) => {
    const label = PATTERN_LEAVES[wk] ?? "";
    const state = wk === week ? "current" : wk < week ? "earned" : "";
    const mirror = wk === 50 ? " mirror" : "";
    const crown = wk === 58 && week >= 58 ? " \u{1F451}" : "";
    return `<div class="leaf ${state}${mirror}"><span>${escapeHtml(label)}${crown}</span><span class="wk">W${wk}</span></div>`;
  };
  const crownLine = week >= 58 ? `<div class="crown">\u{1F451} POTATO \u2014 crowned atop the tree</div>` : "";
  const tree = `<div class="page tree"><h1>The Pattern Tree</h1><div class="sub">Level 1 letters = roots \xB7 Level 2 = left branches \xB7 Level 3 = canopy</div>` + crownLine + `<div class="branches"><div class="col"><h2>Level 2 \xB7 left branches</h2>${L2_WEEKS.map(leafRow).join("")}</div><div class="col"><h2>Level 3 \xB7 canopy</h2>${L3_WEEKS.map(leafRow).join("")}</div></div><div class="trunk">A B C D E F G H I J K L M N O P Q R S T U V W X Y Z \u2014 the roots</div></div>`;
  return {
    html: docShell({ title: `Week ${spec.week} \u2014 Pattern Wall`, css, body: poster + tree, fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings
  };
}

// lib/montree/english-curriculum/render/builders/qr-cards.ts
var import_qrcode = __toESM(require_lib());
function qrSvg(text, sizePx) {
  const qr = import_qrcode.default.create(text, { errorCorrectionLevel: "H" });
  const mods = qr.modules;
  const size = mods.size;
  const data = mods.data;
  const cell = sizePx / size;
  let rects = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (data[r * size + c]) {
        rects += `<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`;
      }
    }
  }
  return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}" xmlns="http://www.w3.org/2000/svg"><rect width="${sizePx}" height="${sizePx}" fill="#ffffff"/><g fill="${INK}">${rects}</g></svg>`;
}
function buildQrCards(spec, _assets, opts = {}) {
  const warnings = [];
  const songs = spec.songs ?? [];
  const css = `
.sheet{padding:12mm;}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8mm;}
.card{border:0.6mm solid ${FRAME_COLOR};border-radius:5mm;padding:8mm;display:flex;flex-direction:column;align-items:center;gap:5mm;height:120mm;justify-content:center;text-align:center;background:${BOOK_FOREST};}
.card .role{color:${BOOK_GOLD};font-size:11pt;letter-spacing:3px;text-transform:uppercase;font-family:system-ui;}
.card .title{color:#fff;font-size:20pt;font-weight:700;font-family:${KIDS_FONT};}
.card .qrwrap{background:#fff;padding:4mm;border-radius:3mm;}
.card .hint{color:rgba(255,255,255,0.55);font-size:10pt;font-family:${KIDS_FONT};}
.card .soon{color:rgba(255,255,255,0.5);font-size:13pt;font-family:${KIDS_FONT};padding:14mm 0;}
`;
  const card = (title, role, url) => {
    const head = `<div class="role">${escapeHtml(role)} song</div><div class="title">${escapeHtml(title)}</div>`;
    if (url) {
      return `<div class="card">${head}<div class="qrwrap">${qrSvg(url, 200)}</div><div class="hint">Scan to sing along</div></div>`;
    }
    warnings.push(`qr_cards: "${title}" has no audioUrl yet \u2014 placeholder rendered.`);
    return `<div class="card">${head}<div class="soon">\u{1F3B5} Song coming soon</div><div class="hint">Produce in Suno, then add audioUrl</div></div>`;
  };
  const cards = songs.map((s) => card(s.title, s.role, s.audioUrl));
  const pages = [];
  if (cards.length === 0) {
    pages.push(`<div class="page"><div class="page-title">No songs for this week.</div></div>`);
  } else {
    for (let i = 0; i < cards.length; i += 4) {
      pages.push(`<div class="page sheet"><div class="grid">${cards.slice(i, i + 4).join("")}</div></div>`);
    }
  }
  return {
    html: docShell({ title: `${spec.displayName || `Week ${spec.week}`} \u2014 Song QR Cards`, css, body: pages.join(""), fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings
  };
}

// lib/montree/english-curriculum/render/builders/class-rules-poster.ts
var ROW_H_MM = 44;
var IMG_MM = 40;
function picture2(word, assets, warnings) {
  const safe = sanitizeImageUrl(resolveImage(assets, word) ?? "");
  if (safe) return `<img src="${safe}" alt="${escapeHtml(word)}">`;
  warnings.push(`class_rules_poster: missing image for "${word}"`);
  return placeholderTile(word);
}
function buildClassRulesPoster(spec, assets, opts = {}) {
  const warnings = [];
  const rules = spec.materials?.ruleCards ?? [];
  const title = spec.displayName || "Our Classroom Rules";
  const phraseWidthCm = A4_WIDTH_CM - 2.8 - IMG_MM / 10 - 1.5;
  const phrasePt = (phrase) => adaptiveLabelFontSize(phrase, 34, phraseWidthCm, ROW_H_MM / 10);
  const css = `
.poster{box-sizing:border-box;padding:14mm;display:flex;flex-direction:column;height:100%;}
.p-head{text-align:center;margin-bottom:8mm;}
.p-title{font-family:${KIDS_FONT};font-weight:700;color:${FRAME_COLOR};font-size:21pt;line-height:1.15;}
.p-sub{font-family:system-ui;letter-spacing:5px;text-transform:uppercase;color:#000000;font-size:10pt;margin-top:3mm;}
.p-rows{display:flex;flex-direction:column;gap:5mm;flex:1;}
.p-row{display:flex;align-items:stretch;gap:5mm;background:${FRAME_COLOR};border-radius:${CARD_BORDER_RADIUS_CM}cm;padding:${WHITE_BORDER_CM}cm;height:${ROW_H_MM}mm;overflow:hidden;}
.p-img{width:${IMG_MM}mm;flex:0 0 auto;background:#fff;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.p-img img{width:100%;height:100%;object-fit:cover;display:block;}
.p-phrase{flex:1;background:#fff;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 6mm;font-family:${KIDS_FONT};font-weight:700;color:${INK};line-height:1.1;word-break:break-word;overflow-wrap:anywhere;}
`;
  const row = (rc) => `<div class="p-row"><div class="p-img">${picture2(rc.image.toLowerCase(), assets, warnings)}</div><div class="p-phrase" style="font-size:${phrasePt(rc.phrase)}pt;">${escapeHtml(rc.phrase)}</div></div>`;
  const body = rules.length ? `<div class="page poster"><div class="p-head"><div class="p-title">${escapeHtml(title)}</div><div class="p-sub">Grace &amp; Courtesy</div></div><div class="p-rows">${rules.map(row).join("")}</div></div>` : `<div class="page"><div class="page-title">No rules for this week.</div></div>`;
  return {
    html: docShell({ title: `${title} \u2014 Class Rules Poster`, css, body, fontBaseUrl: opts.fontBaseUrl, autoPrint: opts.autoPrint }),
    warnings
  };
}

// lib/montree/english-curriculum/render/builders/dark-phonics-card.ts
var CARD_W_MM = 180;
var CARD_H_MM2 = 250;
function buildDarkPhonicsCard(spec, _assets, opts = {}) {
  const warnings = [];
  const dp = opts.darkPhonics;
  const title = `${spec.displayName || `Week ${spec.week}`} \u2014 Montree Phonics`;
  if (!dp) {
    return {
      html: docShell({
        title,
        css: "",
        body: `<div class="page"><div class="page-title">No Montree Phonics card for this week.</div></div>`,
        fontBaseUrl: opts.fontBaseUrl,
        autoPrint: opts.autoPrint
      }),
      warnings: ["dark-phonics-card: no Dark Phonics lesson mapped to this week"]
    };
  }
  const grapheme = String(dp.sound || "").toLowerCase();
  const phrase = String(dp.title || "");
  const safeImg = sanitizeImageUrl(dp.imageUrl);
  if (!safeImg) warnings.push(`dark-phonics-card: missing/invalid image for lesson ${dp.lesson}`);
  const letterPt = grapheme.length <= 1 ? 340 : grapheme.length === 2 ? 240 : 170;
  const hasDescender = /[gjpqy]/.test(grapheme);
  const letterPadBottom = hasDescender ? "padding-bottom:0.26em;" : "";
  const phrasePt = adaptiveLabelFontSize(phrase, 48, CARD_W_MM / 10, 7);
  const css = `
.dp-page{width:${A4_WIDTH_CM}cm;height:${A4_HEIGHT_CM}cm;display:flex;align-items:center;justify-content:center;box-sizing:border-box;}
.dp-card{width:${CARD_W_MM}mm;height:${CARD_H_MM2}mm;background:${FRAME_COLOR};padding:${WHITE_BORDER_CM}cm;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;}
.dp-inner{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.dp-inner img{width:100%;height:100%;object-fit:contain;display:block;}
.dp-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:${KIDS_FONT};font-weight:bold;color:#000000;font-size:22pt;}
.dp-back-in{flex:1;min-height:0;background:white;border-radius:${CARD_BORDER_RADIUS_CM}cm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1.2cm 1.4cm;box-sizing:border-box;}
.dp-letter{font-family:${KIDS_FONT};font-weight:bold;color:${FRAME_COLOR};line-height:1;}
.dp-phrase{font-family:${KIDS_FONT};font-weight:bold;color:${INK};line-height:1.15;margin-top:0.8cm;word-break:break-word;overflow-wrap:anywhere;}
.dp-foot{font-family:${KIDS_FONT};color:#000000;font-size:13pt;margin-top:1.0cm;letter-spacing:0.06em;}
`;
  const frontInner = safeImg ? `<img src="${safeImg}" alt="${escapeHtml(phrase)}">` : `<div class="dp-ph">${escapeHtml(phrase)}</div>`;
  const front = `<div class="page dp-page"><div class="dp-card"><div class="dp-inner">${frontInner}</div></div></div>`;
  const back = `<div class="page dp-page"><div class="dp-card"><div class="dp-back-in"><div class="dp-letter" style="font-size:${letterPt}pt;${letterPadBottom}">${escapeHtml(grapheme)}</div><div class="dp-phrase" style="font-size:${phrasePt}pt;">${escapeHtml(phrase)}</div><div class="dp-foot">montree.xyz</div></div></div></div>`;
  return {
    html: docShell({
      title,
      css,
      body: front + back,
      fontBaseUrl: opts.fontBaseUrl,
      autoPrint: opts.autoPrint
    }),
    warnings
  };
}

// lib/montree/english-curriculum/spec/dark-phonics.json
var dark_phonics_default = {
  _note: "Dark Phonics single-card + Studio-video data. Keyed by lesson-map.ts lesson number (05-31, the SATPIN alphabet). A week maps to a lesson via spec/index.ts weekToLessonMap (first mapped lesson present here wins). 'sound' + 'title' are the video ground truth (filenames in ~/Desktop/Dark Phonics Songs/Dark Phonics \u2014 Final Videos (5-31)/). 'image' is a file in the --dark-phonics-dir (default ~/Desktop/English Curriculum 2026/Dark Phonics). 'videoUrl' was verified at build time (Jul 17 2026) against the public Supabase 'dark-phonics' bucket \u2014 every lesson-NN.mp4 in videos/ exists; null = no player. NOT a WeekSpec; the validator never sees it.",
  videoUrlTemplate: "https://montree.xyz/api/montree/media/proxy/videos/lesson-NN.mp4?bucket=dark-phonics",
  lessons: {
    "05": { sound: "s", title: "Snake in my Sock", image: "lesson-05.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-05.mp4?bucket=dark-phonics" },
    "06": { sound: "a", title: "Ant on my Apple", image: "lesson-06.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-06.mp4?bucket=dark-phonics" },
    "07": { sound: "t", title: "Tick-Tock Stinky Sock", image: "lesson-07.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-07.mp4?bucket=dark-phonics" },
    "08": { sound: "p", title: "Pop Pop Puppy Poop", image: "lesson-08.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-08.mp4?bucket=dark-phonics" },
    "09": { sound: "i", title: "Icky Sticky Pig", image: "lesson-09.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-09.mp4?bucket=dark-phonics" },
    "10": { sound: "n", title: "No-No Nanny Goat", image: "lesson-10.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-10.mp4?bucket=dark-phonics" },
    "11": { sound: "m", title: "Muddy Monkey", image: "lesson-11.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-11.mp4?bucket=dark-phonics" },
    "12": { sound: "d", title: "Dirty Dog Dig Dig", image: "lesson-12.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-12.mp4?bucket=dark-phonics" },
    "13": { sound: "g", title: "Goat Got My Gum", image: "lesson-13.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-13.mp4?bucket=dark-phonics" },
    "14": { sound: "o", title: "Hot Dog on a Log", image: "lesson-14.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-14.mp4?bucket=dark-phonics" },
    "15": { sound: "c", title: "Cat Ate My Cookie", image: "lesson-15.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-15.mp4?bucket=dark-phonics" },
    "16": { sound: "k", title: "Kooky King", image: "lesson-16.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-16.mp4?bucket=dark-phonics" },
    "17": { sound: "ck", title: "Kick the Stinky Sock", image: "lesson-17.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-17.mp4?bucket=dark-phonics" },
    "18": { sound: "e", title: "Ten Messy Hens", image: "lesson-18.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-18.mp4?bucket=dark-phonics" },
    "19": { sound: "u", title: "Yummy Bug in my Cup", image: "lesson-19.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-19.mp4?bucket=dark-phonics" },
    "20": { sound: "r", title: "Red Rat Run", image: "lesson-20.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-20.mp4?bucket=dark-phonics" },
    "21": { sound: "h", title: "Hairy Hippo", image: "lesson-21.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-21.mp4?bucket=dark-phonics" },
    "22": { sound: "b", title: "Big Baby Burp", image: "lesson-22.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-22.mp4?bucket=dark-phonics" },
    "23": { sound: "f", title: "Funny Fox in my Fan", image: "lesson-23.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-23.mp4?bucket=dark-phonics" },
    "24": { sound: "l", title: "Lazy Lion Licks", image: "lesson-24.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-24.mp4?bucket=dark-phonics" },
    "25": { sound: "j", title: "Jump in the Jelly Jam", image: "lesson-25.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-25.mp4?bucket=dark-phonics" },
    "26": { sound: "v", title: "Vroom-Vroom Van", image: "lesson-26.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-26.mp4?bucket=dark-phonics" },
    "27": { sound: "w", title: "Wiggly Wet Worm", image: "lesson-27.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-27.mp4?bucket=dark-phonics" },
    "28": { sound: "x", title: "Six Fox in a Box", image: "lesson-28.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-28.mp4?bucket=dark-phonics" },
    "29": { sound: "y", title: "Yummy Yellow Yo-Yo", image: "lesson-29.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-29.mp4?bucket=dark-phonics" },
    "30": { sound: "z", title: "Zippy Zebra", image: "lesson-30.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-30.mp4?bucket=dark-phonics" },
    "31": { sound: "qu", title: "Quick Quacky Duck", image: "lesson-31.png", videoUrl: "https://montree.xyz/api/montree/media/proxy/videos/lesson-31.mp4?bucket=dark-phonics" }
  }
};

// lib/montree/english-curriculum/spec/index.ts
function displayFor(sound) {
  if (sound === "qu") return "Qu qu";
  const c = sound.charAt(0);
  return c.toUpperCase() + c;
}
var SPINE_META = [
  { week: 1, sound: "a", anchorWord: "a", celebration: null, vowelLights: "a", castIntro: null },
  { week: 2, sound: "t", anchorWord: "at", celebration: null, vowelLights: null, castIntro: "Segina" },
  { week: 3, sound: "m", anchorWord: "mat", celebration: null, vowelLights: null, castIntro: null },
  { week: 4, sound: "c", anchorWord: "cat", celebration: "FIRST DECODABLE BOOK", vowelLights: null, castIntro: "Cat" },
  { week: 5, sound: "s", anchorWord: "sat", celebration: null, vowelLights: null, castIntro: "Sam" },
  { week: 6, sound: "n", anchorWord: "ant", celebration: "GLUE: I", vowelLights: null, castIntro: "Ant" },
  { week: 7, sound: "p", anchorWord: "pat", celebration: null, vowelLights: null, castIntro: null },
  { week: 8, sound: "i", anchorWord: "it", celebration: null, vowelLights: "i", castIntro: null },
  { week: 9, sound: "h", anchorWord: "hat", celebration: null, vowelLights: null, castIntro: null },
  { week: 10, sound: "d", anchorWord: "dad", celebration: "AND DECODABLE", vowelLights: null, castIntro: null },
  { week: 11, sound: "o", anchorWord: "on", celebration: "ON DECODABLE", vowelLights: "o", castIntro: null },
  { week: 12, sound: "g", anchorWord: "dog", celebration: null, vowelLights: null, castIntro: "Dog" },
  { week: 13, sound: "b", anchorWord: "big", celebration: null, vowelLights: null, castIntro: null },
  { week: 14, sound: "e", anchorWord: "pet", celebration: null, vowelLights: "e", castIntro: null },
  { week: 15, sound: "r", anchorWord: "rat", celebration: null, vowelLights: null, castIntro: "Rat" },
  { week: 16, sound: "u", anchorWord: "up", celebration: "VOWEL WALL COMPLETE", vowelLights: "u", castIntro: "Pup" },
  { week: 17, sound: "f", anchorWord: "fun", celebration: null, vowelLights: null, castIntro: null },
  { week: 18, sound: "l", anchorWord: "leg", celebration: null, vowelLights: null, castIntro: "Bug" },
  { week: 19, sound: "w", anchorWord: "wet", celebration: null, vowelLights: null, castIntro: null },
  { week: 20, sound: "j", anchorWord: "jam", celebration: null, vowelLights: null, castIntro: null },
  { week: 21, sound: "k", anchorWord: "kid", celebration: null, vowelLights: null, castIntro: "Duck" },
  { week: 22, sound: "v", anchorWord: "vet", celebration: "CAST REUNION", vowelLights: null, castIntro: null },
  { week: 23, sound: "y", anchorWord: "yes", celebration: null, vowelLights: null, castIntro: null },
  { week: 24, sound: "x", anchorWord: "fox", celebration: null, vowelLights: null, castIntro: "Fox" },
  { week: 25, sound: "qu", anchorWord: "quiz", celebration: "GLUE: says", vowelLights: null, castIntro: null },
  { week: 26, sound: "z", anchorWord: "zip", celebration: "GRADUATION", vowelLights: null, castIntro: null }
];
var WEEK_META = SPINE_META.map((m) => ({
  ...m,
  letterDisplay: displayFor(m.sound)
}));
var weekToLessonMap = {
  // Level 1 (W1–26) — locked.
  1: [6],
  2: [7],
  3: [11],
  4: [15],
  5: [5],
  6: [10],
  7: [8],
  8: [9],
  9: [21],
  10: [12],
  11: [14],
  12: [13],
  13: [22],
  14: [18],
  15: [20],
  16: [19],
  17: [23],
  18: [24],
  19: [27],
  20: [25],
  21: [16, 17],
  22: [26],
  23: [29],
  24: [28],
  25: [31],
  26: [30],
  // Level 2 (W27–42) — from MASTER_SPINE "Week→lesson-map equivalence W27–58".
  27: [42],
  28: [43],
  29: [44, 46],
  30: [41, 17],
  31: [48],
  32: [45],
  33: [49],
  34: [50],
  35: [51],
  36: [47],
  37: [47, 48],
  38: [54],
  39: [55],
  40: [56],
  41: [57],
  42: [58, 59, 60, 61],
  // Level 3 (W43–58). W50 is the EAL minimal-pair review (no lesson-map lesson).
  43: [84, 85],
  44: [86, 87],
  45: [88, 89],
  46: [90],
  47: [71],
  48: [72],
  49: [73, 74, 75],
  50: [],
  51: [95, 96],
  52: [91, 92],
  53: [93, 94],
  54: [97, 98, 99],
  55: [62, 63, 64],
  56: [104, 105, 106],
  57: [65, 66, 67],
  58: [109]
};
var DARK_PHONICS_LESSONS = dark_phonics_default.lessons;
function getDarkPhonicsForWeek(week) {
  const lessons = weekToLessonMap[week];
  if (!lessons || !lessons.length) return null;
  for (const n of lessons) {
    const key = String(n).padStart(2, "0");
    const entry = DARK_PHONICS_LESSONS[key];
    if (entry) {
      return {
        lesson: key,
        sound: entry.sound,
        title: entry.title,
        image: entry.image,
        videoUrl: entry.videoUrl ?? null
      };
    }
  }
  return null;
}

// lib/montree/english-curriculum/render/index.ts
var MATERIAL_TYPES = [
  { type: "three_part_cards", label: "Three-Part Cards", emoji: "\u{1F0CF}" },
  { type: "flashcards", label: "Flashcards", emoji: "\u26A1" },
  { type: "sentence_strips", label: "Sentence Strips", emoji: "\u{1F4CF}" },
  { type: "matching", label: "Word\u2013Picture Match", emoji: "\u{1F517}" },
  { type: "bingo", label: "Bingo + Calling Cards", emoji: "\u{1F3B2}" },
  { type: "tracing", label: "Letter Tracing", emoji: "\u270D\uFE0F" },
  { type: "coloring", label: "Colouring Pages", emoji: "\u{1F58D}\uFE0F" },
  { type: "dictionary_journal", label: "Dictionary Journal", emoji: "\u{1F4D3}" },
  { type: "book", label: "The Reader (book)", emoji: "\u{1F4D6}" },
  { type: "vowel_wall", label: "Wall Posters", emoji: "\u{1F170}\uFE0F" },
  { type: "qr_cards", label: "Song QR Cards", emoji: "\u{1F3B5}" },
  // Intro-Weeks only; filtered OUT of every phonics week by materialTypesForSpec.
  { type: "class_rules_poster", label: "Class Rules Poster", emoji: "\u{1F4DC}" }
];
var INTRO_MATERIAL_ORDER = ["flashcards", "class_rules_poster", "coloring", "qr_cards"];
var INTRO_LABELS = { flashcards: "Rule Flashcards" };
function materialTypesForSpec(spec) {
  if (spec?.soundType === "grace-courtesy") {
    return INTRO_MATERIAL_ORDER.map((t) => MATERIAL_TYPES.find((m) => m.type === t)).filter((m) => !!m).map((m) => INTRO_LABELS[m.type] ? { ...m, label: INTRO_LABELS[m.type] } : m);
  }
  return MATERIAL_TYPES.filter((m) => m.type !== "class_rules_poster");
}
var BUILDERS = {
  three_part_cards: buildThreePartCards,
  flashcards: buildFlashcards,
  sentence_strips: buildSentenceStrips,
  matching: buildMatching,
  bingo: buildBingo,
  tracing: buildTracing,
  coloring: buildColoring,
  dictionary_journal: buildDictionaryJournal,
  book: buildBook,
  vowel_wall: buildVowelWall,
  qr_cards: buildQrCards,
  class_rules_poster: buildClassRulesPoster,
  dark_phonics_card: buildDarkPhonicsCard
};
function buildMaterial(type, spec, assets, opts = {}) {
  const builder = BUILDERS[type];
  if (!builder) {
    return { html: "", warnings: [`Unknown material type "${type}"`] };
  }
  try {
    return builder(spec, assets, opts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { html: `<!DOCTYPE html><html><body><pre>Render error: ${msg}</pre></body></html>`, warnings: [`${type} render error: ${msg}`] };
  }
}
function assetGapReport2(spec, assets, priorSpecs = []) {
  return assetGapReport(spec, assets, priorSpecs);
}
export {
  KNOWN_STROKE_LETTERS,
  MATERIAL_TYPES,
  assetGapReport2 as assetGapReport,
  buildAssetMap,
  buildMaterial,
  escapeHtml,
  getDarkPhonicsForWeek,
  hexColor,
  letterStrokeSVG,
  materialTypesForSpec,
  parseAssetFilename,
  resolveImage,
  sanitizeImageUrl
};
