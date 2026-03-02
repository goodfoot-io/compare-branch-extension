import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);

import { resolve as __resolve } from 'node:path';
const __DEFAULT_LOG_DEST = ".cards/logs/cards-default-configuration-hooks.log";
const __workspace = process.env['WORKSPACE_PATH'];
if (__workspace && !process.env['CARDS_HOOKS_LOG_FILE']) {
  process.env['CARDS_HOOKS_LOG_FILE'] = __resolve(__workspace, __DEFAULT_LOG_DEST);
}
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
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
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

// ../../../node_modules/kind-of/index.js
var require_kind_of = __commonJS({
  "../../../node_modules/kind-of/index.js"(exports2, module2) {
    var toString = Object.prototype.toString;
    module2.exports = function kindOf(val) {
      if (val === void 0) return "undefined";
      if (val === null) return "null";
      var type = typeof val;
      if (type === "boolean") return "boolean";
      if (type === "string") return "string";
      if (type === "number") return "number";
      if (type === "symbol") return "symbol";
      if (type === "function") {
        return isGeneratorFn(val) ? "generatorfunction" : "function";
      }
      if (isArray(val)) return "array";
      if (isBuffer(val)) return "buffer";
      if (isArguments(val)) return "arguments";
      if (isDate(val)) return "date";
      if (isError(val)) return "error";
      if (isRegexp(val)) return "regexp";
      switch (ctorName(val)) {
        case "Symbol":
          return "symbol";
        case "Promise":
          return "promise";
        // Set, Map, WeakSet, WeakMap
        case "WeakMap":
          return "weakmap";
        case "WeakSet":
          return "weakset";
        case "Map":
          return "map";
        case "Set":
          return "set";
        // 8-bit typed arrays
        case "Int8Array":
          return "int8array";
        case "Uint8Array":
          return "uint8array";
        case "Uint8ClampedArray":
          return "uint8clampedarray";
        // 16-bit typed arrays
        case "Int16Array":
          return "int16array";
        case "Uint16Array":
          return "uint16array";
        // 32-bit typed arrays
        case "Int32Array":
          return "int32array";
        case "Uint32Array":
          return "uint32array";
        case "Float32Array":
          return "float32array";
        case "Float64Array":
          return "float64array";
      }
      if (isGeneratorObj(val)) {
        return "generator";
      }
      type = toString.call(val);
      switch (type) {
        case "[object Object]":
          return "object";
        // iterators
        case "[object Map Iterator]":
          return "mapiterator";
        case "[object Set Iterator]":
          return "setiterator";
        case "[object String Iterator]":
          return "stringiterator";
        case "[object Array Iterator]":
          return "arrayiterator";
      }
      return type.slice(8, -1).toLowerCase().replace(/\s/g, "");
    };
    function ctorName(val) {
      return typeof val.constructor === "function" ? val.constructor.name : null;
    }
    function isArray(val) {
      if (Array.isArray) return Array.isArray(val);
      return val instanceof Array;
    }
    function isError(val) {
      return val instanceof Error || typeof val.message === "string" && val.constructor && typeof val.constructor.stackTraceLimit === "number";
    }
    function isDate(val) {
      if (val instanceof Date) return true;
      return typeof val.toDateString === "function" && typeof val.getDate === "function" && typeof val.setDate === "function";
    }
    function isRegexp(val) {
      if (val instanceof RegExp) return true;
      return typeof val.flags === "string" && typeof val.ignoreCase === "boolean" && typeof val.multiline === "boolean" && typeof val.global === "boolean";
    }
    function isGeneratorFn(name, val) {
      return ctorName(name) === "GeneratorFunction";
    }
    function isGeneratorObj(val) {
      return typeof val.throw === "function" && typeof val.return === "function" && typeof val.next === "function";
    }
    function isArguments(val) {
      try {
        if (typeof val.length === "number" && typeof val.callee === "function") {
          return true;
        }
      } catch (err) {
        if (err.message.indexOf("callee") !== -1) {
          return true;
        }
      }
      return false;
    }
    function isBuffer(val) {
      if (val.constructor && typeof val.constructor.isBuffer === "function") {
        return val.constructor.isBuffer(val);
      }
      return false;
    }
  }
});

// ../../../node_modules/is-extendable/index.js
var require_is_extendable = __commonJS({
  "../../../node_modules/is-extendable/index.js"(exports2, module2) {
    "use strict";
    module2.exports = function isExtendable(val) {
      return typeof val !== "undefined" && val !== null && (typeof val === "object" || typeof val === "function");
    };
  }
});

// ../../../node_modules/extend-shallow/index.js
var require_extend_shallow = __commonJS({
  "../../../node_modules/extend-shallow/index.js"(exports2, module2) {
    "use strict";
    var isObject = require_is_extendable();
    module2.exports = function extend(o) {
      if (!isObject(o)) {
        o = {};
      }
      var len = arguments.length;
      for (var i = 1; i < len; i++) {
        var obj = arguments[i];
        if (isObject(obj)) {
          assign(o, obj);
        }
      }
      return o;
    };
    function assign(a, b) {
      for (var key in b) {
        if (hasOwn(b, key)) {
          a[key] = b[key];
        }
      }
    }
    function hasOwn(obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    }
  }
});

// ../../../node_modules/section-matter/index.js
var require_section_matter = __commonJS({
  "../../../node_modules/section-matter/index.js"(exports2, module2) {
    "use strict";
    var typeOf = require_kind_of();
    var extend = require_extend_shallow();
    module2.exports = function(input, options2) {
      if (typeof options2 === "function") {
        options2 = { parse: options2 };
      }
      var file = toObject(input);
      var defaults = { section_delimiter: "---", parse: identity };
      var opts = extend({}, defaults, options2);
      var delim = opts.section_delimiter;
      var lines = file.content.split(/\r?\n/);
      var sections = null;
      var section = createSection();
      var content = [];
      var stack = [];
      function initSections(val) {
        file.content = val;
        sections = [];
        content = [];
      }
      function closeSection(val) {
        if (stack.length) {
          section.key = getKey(stack[0], delim);
          section.content = val;
          opts.parse(section, sections);
          sections.push(section);
          section = createSection();
          content = [];
          stack = [];
        }
      }
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var len = stack.length;
        var ln = line.trim();
        if (isDelimiter(ln, delim)) {
          if (ln.length === 3 && i !== 0) {
            if (len === 0 || len === 2) {
              content.push(line);
              continue;
            }
            stack.push(ln);
            section.data = content.join("\n");
            content = [];
            continue;
          }
          if (sections === null) {
            initSections(content.join("\n"));
          }
          if (len === 2) {
            closeSection(content.join("\n"));
          }
          stack.push(ln);
          continue;
        }
        content.push(line);
      }
      if (sections === null) {
        initSections(content.join("\n"));
      } else {
        closeSection(content.join("\n"));
      }
      file.sections = sections;
      return file;
    };
    function isDelimiter(line, delim) {
      if (line.slice(0, delim.length) !== delim) {
        return false;
      }
      if (line.charAt(delim.length + 1) === delim.slice(-1)) {
        return false;
      }
      return true;
    }
    function toObject(input) {
      if (typeOf(input) !== "object") {
        input = { content: input };
      }
      if (typeof input.content !== "string" && !isBuffer(input.content)) {
        throw new TypeError("expected a buffer or string");
      }
      input.content = input.content.toString();
      input.sections = [];
      return input;
    }
    function getKey(val, delim) {
      return val ? val.slice(delim.length).trim() : "";
    }
    function createSection() {
      return { key: "", data: "", content: "" };
    }
    function identity(val) {
      return val;
    }
    function isBuffer(val) {
      if (val && val.constructor && typeof val.constructor.isBuffer === "function") {
        return val.constructor.isBuffer(val);
      }
      return false;
    }
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/common.js
var require_common = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/common.js"(exports2, module2) {
    "use strict";
    function isNothing(subject) {
      return typeof subject === "undefined" || subject === null;
    }
    function isObject(subject) {
      return typeof subject === "object" && subject !== null;
    }
    function toArray(sequence) {
      if (Array.isArray(sequence)) return sequence;
      else if (isNothing(sequence)) return [];
      return [sequence];
    }
    function extend(target, source) {
      var index, length, key, sourceKeys;
      if (source) {
        sourceKeys = Object.keys(source);
        for (index = 0, length = sourceKeys.length; index < length; index += 1) {
          key = sourceKeys[index];
          target[key] = source[key];
        }
      }
      return target;
    }
    function repeat(string, count) {
      var result = "", cycle;
      for (cycle = 0; cycle < count; cycle += 1) {
        result += string;
      }
      return result;
    }
    function isNegativeZero(number) {
      return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
    }
    module2.exports.isNothing = isNothing;
    module2.exports.isObject = isObject;
    module2.exports.toArray = toArray;
    module2.exports.repeat = repeat;
    module2.exports.isNegativeZero = isNegativeZero;
    module2.exports.extend = extend;
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/exception.js
var require_exception = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/exception.js"(exports2, module2) {
    "use strict";
    function YAMLException(reason, mark) {
      Error.call(this);
      this.name = "YAMLException";
      this.reason = reason;
      this.mark = mark;
      this.message = (this.reason || "(unknown reason)") + (this.mark ? " " + this.mark.toString() : "");
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      } else {
        this.stack = new Error().stack || "";
      }
    }
    YAMLException.prototype = Object.create(Error.prototype);
    YAMLException.prototype.constructor = YAMLException;
    YAMLException.prototype.toString = function toString(compact) {
      var result = this.name + ": ";
      result += this.reason || "(unknown reason)";
      if (!compact && this.mark) {
        result += " " + this.mark.toString();
      }
      return result;
    };
    module2.exports = YAMLException;
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/mark.js
var require_mark = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/mark.js"(exports2, module2) {
    "use strict";
    var common = require_common();
    function Mark(name, buffer, position, line, column) {
      this.name = name;
      this.buffer = buffer;
      this.position = position;
      this.line = line;
      this.column = column;
    }
    Mark.prototype.getSnippet = function getSnippet(indent, maxLength) {
      var head, start, tail, end, snippet;
      if (!this.buffer) return null;
      indent = indent || 4;
      maxLength = maxLength || 75;
      head = "";
      start = this.position;
      while (start > 0 && "\0\r\n\x85\u2028\u2029".indexOf(this.buffer.charAt(start - 1)) === -1) {
        start -= 1;
        if (this.position - start > maxLength / 2 - 1) {
          head = " ... ";
          start += 5;
          break;
        }
      }
      tail = "";
      end = this.position;
      while (end < this.buffer.length && "\0\r\n\x85\u2028\u2029".indexOf(this.buffer.charAt(end)) === -1) {
        end += 1;
        if (end - this.position > maxLength / 2 - 1) {
          tail = " ... ";
          end -= 5;
          break;
        }
      }
      snippet = this.buffer.slice(start, end);
      return common.repeat(" ", indent) + head + snippet + tail + "\n" + common.repeat(" ", indent + this.position - start + head.length) + "^";
    };
    Mark.prototype.toString = function toString(compact) {
      var snippet, where = "";
      if (this.name) {
        where += 'in "' + this.name + '" ';
      }
      where += "at line " + (this.line + 1) + ", column " + (this.column + 1);
      if (!compact) {
        snippet = this.getSnippet();
        if (snippet) {
          where += ":\n" + snippet;
        }
      }
      return where;
    };
    module2.exports = Mark;
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type.js
var require_type = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type.js"(exports2, module2) {
    "use strict";
    var YAMLException = require_exception();
    var TYPE_CONSTRUCTOR_OPTIONS = [
      "kind",
      "resolve",
      "construct",
      "instanceOf",
      "predicate",
      "represent",
      "defaultStyle",
      "styleAliases"
    ];
    var YAML_NODE_KINDS = [
      "scalar",
      "sequence",
      "mapping"
    ];
    function compileStyleAliases(map) {
      var result = {};
      if (map !== null) {
        Object.keys(map).forEach(function(style) {
          map[style].forEach(function(alias) {
            result[String(alias)] = style;
          });
        });
      }
      return result;
    }
    function Type(tag, options2) {
      options2 = options2 || {};
      Object.keys(options2).forEach(function(name) {
        if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
          throw new YAMLException('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
        }
      });
      this.tag = tag;
      this.kind = options2["kind"] || null;
      this.resolve = options2["resolve"] || function() {
        return true;
      };
      this.construct = options2["construct"] || function(data) {
        return data;
      };
      this.instanceOf = options2["instanceOf"] || null;
      this.predicate = options2["predicate"] || null;
      this.represent = options2["represent"] || null;
      this.defaultStyle = options2["defaultStyle"] || null;
      this.styleAliases = compileStyleAliases(options2["styleAliases"] || null);
      if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
        throw new YAMLException('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
      }
    }
    module2.exports = Type;
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema.js
var require_schema = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema.js"(exports2, module2) {
    "use strict";
    var common = require_common();
    var YAMLException = require_exception();
    var Type = require_type();
    function compileList(schema, name, result) {
      var exclude = [];
      schema.include.forEach(function(includedSchema) {
        result = compileList(includedSchema, name, result);
      });
      schema[name].forEach(function(currentType) {
        result.forEach(function(previousType, previousIndex) {
          if (previousType.tag === currentType.tag && previousType.kind === currentType.kind) {
            exclude.push(previousIndex);
          }
        });
        result.push(currentType);
      });
      return result.filter(function(type, index) {
        return exclude.indexOf(index) === -1;
      });
    }
    function compileMap() {
      var result = {
        scalar: {},
        sequence: {},
        mapping: {},
        fallback: {}
      }, index, length;
      function collectType(type) {
        result[type.kind][type.tag] = result["fallback"][type.tag] = type;
      }
      for (index = 0, length = arguments.length; index < length; index += 1) {
        arguments[index].forEach(collectType);
      }
      return result;
    }
    function Schema(definition) {
      this.include = definition.include || [];
      this.implicit = definition.implicit || [];
      this.explicit = definition.explicit || [];
      this.implicit.forEach(function(type) {
        if (type.loadKind && type.loadKind !== "scalar") {
          throw new YAMLException("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
        }
      });
      this.compiledImplicit = compileList(this, "implicit", []);
      this.compiledExplicit = compileList(this, "explicit", []);
      this.compiledTypeMap = compileMap(this.compiledImplicit, this.compiledExplicit);
    }
    Schema.DEFAULT = null;
    Schema.create = function createSchema() {
      var schemas, types;
      switch (arguments.length) {
        case 1:
          schemas = Schema.DEFAULT;
          types = arguments[0];
          break;
        case 2:
          schemas = arguments[0];
          types = arguments[1];
          break;
        default:
          throw new YAMLException("Wrong number of arguments for Schema.create function");
      }
      schemas = common.toArray(schemas);
      types = common.toArray(types);
      if (!schemas.every(function(schema) {
        return schema instanceof Schema;
      })) {
        throw new YAMLException("Specified list of super schemas (or a single Schema object) contains a non-Schema object.");
      }
      if (!types.every(function(type) {
        return type instanceof Type;
      })) {
        throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
      }
      return new Schema({
        include: schemas,
        explicit: types
      });
    };
    module2.exports = Schema;
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/str.js
var require_str = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/str.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:str", {
      kind: "scalar",
      construct: function(data) {
        return data !== null ? data : "";
      }
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/seq.js
var require_seq = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/seq.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:seq", {
      kind: "sequence",
      construct: function(data) {
        return data !== null ? data : [];
      }
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/map.js
var require_map = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/map.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:map", {
      kind: "mapping",
      construct: function(data) {
        return data !== null ? data : {};
      }
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema/failsafe.js
var require_failsafe = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema/failsafe.js"(exports2, module2) {
    "use strict";
    var Schema = require_schema();
    module2.exports = new Schema({
      explicit: [
        require_str(),
        require_seq(),
        require_map()
      ]
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/null.js
var require_null = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/null.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    function resolveYamlNull(data) {
      if (data === null) return true;
      var max = data.length;
      return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
    }
    function constructYamlNull() {
      return null;
    }
    function isNull(object) {
      return object === null;
    }
    module2.exports = new Type("tag:yaml.org,2002:null", {
      kind: "scalar",
      resolve: resolveYamlNull,
      construct: constructYamlNull,
      predicate: isNull,
      represent: {
        canonical: function() {
          return "~";
        },
        lowercase: function() {
          return "null";
        },
        uppercase: function() {
          return "NULL";
        },
        camelcase: function() {
          return "Null";
        }
      },
      defaultStyle: "lowercase"
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/bool.js
var require_bool = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/bool.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    function resolveYamlBoolean(data) {
      if (data === null) return false;
      var max = data.length;
      return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
    }
    function constructYamlBoolean(data) {
      return data === "true" || data === "True" || data === "TRUE";
    }
    function isBoolean(object) {
      return Object.prototype.toString.call(object) === "[object Boolean]";
    }
    module2.exports = new Type("tag:yaml.org,2002:bool", {
      kind: "scalar",
      resolve: resolveYamlBoolean,
      construct: constructYamlBoolean,
      predicate: isBoolean,
      represent: {
        lowercase: function(object) {
          return object ? "true" : "false";
        },
        uppercase: function(object) {
          return object ? "TRUE" : "FALSE";
        },
        camelcase: function(object) {
          return object ? "True" : "False";
        }
      },
      defaultStyle: "lowercase"
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/int.js
var require_int = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/int.js"(exports2, module2) {
    "use strict";
    var common = require_common();
    var Type = require_type();
    function isHexCode(c) {
      return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
    }
    function isOctCode(c) {
      return 48 <= c && c <= 55;
    }
    function isDecCode(c) {
      return 48 <= c && c <= 57;
    }
    function resolveYamlInteger(data) {
      if (data === null) return false;
      var max = data.length, index = 0, hasDigits = false, ch;
      if (!max) return false;
      ch = data[index];
      if (ch === "-" || ch === "+") {
        ch = data[++index];
      }
      if (ch === "0") {
        if (index + 1 === max) return true;
        ch = data[++index];
        if (ch === "b") {
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_") continue;
            if (ch !== "0" && ch !== "1") return false;
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
        if (ch === "x") {
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_") continue;
            if (!isHexCode(data.charCodeAt(index))) return false;
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
        for (; index < max; index++) {
          ch = data[index];
          if (ch === "_") continue;
          if (!isOctCode(data.charCodeAt(index))) return false;
          hasDigits = true;
        }
        return hasDigits && ch !== "_";
      }
      if (ch === "_") return false;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (ch === ":") break;
        if (!isDecCode(data.charCodeAt(index))) {
          return false;
        }
        hasDigits = true;
      }
      if (!hasDigits || ch === "_") return false;
      if (ch !== ":") return true;
      return /^(:[0-5]?[0-9])+$/.test(data.slice(index));
    }
    function constructYamlInteger(data) {
      var value = data, sign = 1, ch, base, digits = [];
      if (value.indexOf("_") !== -1) {
        value = value.replace(/_/g, "");
      }
      ch = value[0];
      if (ch === "-" || ch === "+") {
        if (ch === "-") sign = -1;
        value = value.slice(1);
        ch = value[0];
      }
      if (value === "0") return 0;
      if (ch === "0") {
        if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
        if (value[1] === "x") return sign * parseInt(value, 16);
        return sign * parseInt(value, 8);
      }
      if (value.indexOf(":") !== -1) {
        value.split(":").forEach(function(v) {
          digits.unshift(parseInt(v, 10));
        });
        value = 0;
        base = 1;
        digits.forEach(function(d) {
          value += d * base;
          base *= 60;
        });
        return sign * value;
      }
      return sign * parseInt(value, 10);
    }
    function isInteger(object) {
      return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
    }
    module2.exports = new Type("tag:yaml.org,2002:int", {
      kind: "scalar",
      resolve: resolveYamlInteger,
      construct: constructYamlInteger,
      predicate: isInteger,
      represent: {
        binary: function(obj) {
          return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
        },
        octal: function(obj) {
          return obj >= 0 ? "0" + obj.toString(8) : "-0" + obj.toString(8).slice(1);
        },
        decimal: function(obj) {
          return obj.toString(10);
        },
        /* eslint-disable max-len */
        hexadecimal: function(obj) {
          return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
        }
      },
      defaultStyle: "decimal",
      styleAliases: {
        binary: [2, "bin"],
        octal: [8, "oct"],
        decimal: [10, "dec"],
        hexadecimal: [16, "hex"]
      }
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/float.js
var require_float = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/float.js"(exports2, module2) {
    "use strict";
    var common = require_common();
    var Type = require_type();
    var YAML_FLOAT_PATTERN = new RegExp(
      // 2.5e4, 2.5 and integers
      "^(?:[-+]?(?:0|[1-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\\.[0-9_]*|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
    );
    function resolveYamlFloat(data) {
      if (data === null) return false;
      if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
      // Probably should update regexp & check speed
      data[data.length - 1] === "_") {
        return false;
      }
      return true;
    }
    function constructYamlFloat(data) {
      var value, sign, base, digits;
      value = data.replace(/_/g, "").toLowerCase();
      sign = value[0] === "-" ? -1 : 1;
      digits = [];
      if ("+-".indexOf(value[0]) >= 0) {
        value = value.slice(1);
      }
      if (value === ".inf") {
        return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      } else if (value === ".nan") {
        return NaN;
      } else if (value.indexOf(":") >= 0) {
        value.split(":").forEach(function(v) {
          digits.unshift(parseFloat(v, 10));
        });
        value = 0;
        base = 1;
        digits.forEach(function(d) {
          value += d * base;
          base *= 60;
        });
        return sign * value;
      }
      return sign * parseFloat(value, 10);
    }
    var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
    function representYamlFloat(object, style) {
      var res;
      if (isNaN(object)) {
        switch (style) {
          case "lowercase":
            return ".nan";
          case "uppercase":
            return ".NAN";
          case "camelcase":
            return ".NaN";
        }
      } else if (Number.POSITIVE_INFINITY === object) {
        switch (style) {
          case "lowercase":
            return ".inf";
          case "uppercase":
            return ".INF";
          case "camelcase":
            return ".Inf";
        }
      } else if (Number.NEGATIVE_INFINITY === object) {
        switch (style) {
          case "lowercase":
            return "-.inf";
          case "uppercase":
            return "-.INF";
          case "camelcase":
            return "-.Inf";
        }
      } else if (common.isNegativeZero(object)) {
        return "-0.0";
      }
      res = object.toString(10);
      return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
    }
    function isFloat(object) {
      return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
    }
    module2.exports = new Type("tag:yaml.org,2002:float", {
      kind: "scalar",
      resolve: resolveYamlFloat,
      construct: constructYamlFloat,
      predicate: isFloat,
      represent: representYamlFloat,
      defaultStyle: "lowercase"
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema/json.js
var require_json = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema/json.js"(exports2, module2) {
    "use strict";
    var Schema = require_schema();
    module2.exports = new Schema({
      include: [
        require_failsafe()
      ],
      implicit: [
        require_null(),
        require_bool(),
        require_int(),
        require_float()
      ]
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema/core.js
var require_core = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema/core.js"(exports2, module2) {
    "use strict";
    var Schema = require_schema();
    module2.exports = new Schema({
      include: [
        require_json()
      ]
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/timestamp.js
var require_timestamp = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/timestamp.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var YAML_DATE_REGEXP = new RegExp(
      "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
    );
    var YAML_TIMESTAMP_REGEXP = new RegExp(
      "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
    );
    function resolveYamlTimestamp(data) {
      if (data === null) return false;
      if (YAML_DATE_REGEXP.exec(data) !== null) return true;
      if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
      return false;
    }
    function constructYamlTimestamp(data) {
      var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
      match = YAML_DATE_REGEXP.exec(data);
      if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
      if (match === null) throw new Error("Date resolve error");
      year = +match[1];
      month = +match[2] - 1;
      day = +match[3];
      if (!match[4]) {
        return new Date(Date.UTC(year, month, day));
      }
      hour = +match[4];
      minute = +match[5];
      second = +match[6];
      if (match[7]) {
        fraction = match[7].slice(0, 3);
        while (fraction.length < 3) {
          fraction += "0";
        }
        fraction = +fraction;
      }
      if (match[9]) {
        tz_hour = +match[10];
        tz_minute = +(match[11] || 0);
        delta = (tz_hour * 60 + tz_minute) * 6e4;
        if (match[9] === "-") delta = -delta;
      }
      date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
      if (delta) date.setTime(date.getTime() - delta);
      return date;
    }
    function representYamlTimestamp(object) {
      return object.toISOString();
    }
    module2.exports = new Type("tag:yaml.org,2002:timestamp", {
      kind: "scalar",
      resolve: resolveYamlTimestamp,
      construct: constructYamlTimestamp,
      instanceOf: Date,
      represent: representYamlTimestamp
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/merge.js
var require_merge = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/merge.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    function resolveYamlMerge(data) {
      return data === "<<" || data === null;
    }
    module2.exports = new Type("tag:yaml.org,2002:merge", {
      kind: "scalar",
      resolve: resolveYamlMerge
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/binary.js
var require_binary = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/binary.js"(exports2, module2) {
    "use strict";
    var NodeBuffer;
    try {
      _require = __require;
      NodeBuffer = _require("buffer").Buffer;
    } catch (__) {
    }
    var _require;
    var Type = require_type();
    var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
    function resolveYamlBinary(data) {
      if (data === null) return false;
      var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;
      for (idx = 0; idx < max; idx++) {
        code = map.indexOf(data.charAt(idx));
        if (code > 64) continue;
        if (code < 0) return false;
        bitlen += 6;
      }
      return bitlen % 8 === 0;
    }
    function constructYamlBinary(data) {
      var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map = BASE64_MAP, bits = 0, result = [];
      for (idx = 0; idx < max; idx++) {
        if (idx % 4 === 0 && idx) {
          result.push(bits >> 16 & 255);
          result.push(bits >> 8 & 255);
          result.push(bits & 255);
        }
        bits = bits << 6 | map.indexOf(input.charAt(idx));
      }
      tailbits = max % 4 * 6;
      if (tailbits === 0) {
        result.push(bits >> 16 & 255);
        result.push(bits >> 8 & 255);
        result.push(bits & 255);
      } else if (tailbits === 18) {
        result.push(bits >> 10 & 255);
        result.push(bits >> 2 & 255);
      } else if (tailbits === 12) {
        result.push(bits >> 4 & 255);
      }
      if (NodeBuffer) {
        return NodeBuffer.from ? NodeBuffer.from(result) : new NodeBuffer(result);
      }
      return result;
    }
    function representYamlBinary(object) {
      var result = "", bits = 0, idx, tail, max = object.length, map = BASE64_MAP;
      for (idx = 0; idx < max; idx++) {
        if (idx % 3 === 0 && idx) {
          result += map[bits >> 18 & 63];
          result += map[bits >> 12 & 63];
          result += map[bits >> 6 & 63];
          result += map[bits & 63];
        }
        bits = (bits << 8) + object[idx];
      }
      tail = max % 3;
      if (tail === 0) {
        result += map[bits >> 18 & 63];
        result += map[bits >> 12 & 63];
        result += map[bits >> 6 & 63];
        result += map[bits & 63];
      } else if (tail === 2) {
        result += map[bits >> 10 & 63];
        result += map[bits >> 4 & 63];
        result += map[bits << 2 & 63];
        result += map[64];
      } else if (tail === 1) {
        result += map[bits >> 2 & 63];
        result += map[bits << 4 & 63];
        result += map[64];
        result += map[64];
      }
      return result;
    }
    function isBinary(object) {
      return NodeBuffer && NodeBuffer.isBuffer(object);
    }
    module2.exports = new Type("tag:yaml.org,2002:binary", {
      kind: "scalar",
      resolve: resolveYamlBinary,
      construct: constructYamlBinary,
      predicate: isBinary,
      represent: representYamlBinary
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/omap.js
var require_omap = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/omap.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var _toString = Object.prototype.toString;
    function resolveYamlOmap(data) {
      if (data === null) return true;
      var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        pairHasKey = false;
        if (_toString.call(pair) !== "[object Object]") return false;
        for (pairKey in pair) {
          if (_hasOwnProperty.call(pair, pairKey)) {
            if (!pairHasKey) pairHasKey = true;
            else return false;
          }
        }
        if (!pairHasKey) return false;
        if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
        else return false;
      }
      return true;
    }
    function constructYamlOmap(data) {
      return data !== null ? data : [];
    }
    module2.exports = new Type("tag:yaml.org,2002:omap", {
      kind: "sequence",
      resolve: resolveYamlOmap,
      construct: constructYamlOmap
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/pairs.js
var require_pairs = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/pairs.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var _toString = Object.prototype.toString;
    function resolveYamlPairs(data) {
      if (data === null) return true;
      var index, length, pair, keys, result, object = data;
      result = new Array(object.length);
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        if (_toString.call(pair) !== "[object Object]") return false;
        keys = Object.keys(pair);
        if (keys.length !== 1) return false;
        result[index] = [keys[0], pair[keys[0]]];
      }
      return true;
    }
    function constructYamlPairs(data) {
      if (data === null) return [];
      var index, length, pair, keys, result, object = data;
      result = new Array(object.length);
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        keys = Object.keys(pair);
        result[index] = [keys[0], pair[keys[0]]];
      }
      return result;
    }
    module2.exports = new Type("tag:yaml.org,2002:pairs", {
      kind: "sequence",
      resolve: resolveYamlPairs,
      construct: constructYamlPairs
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/set.js
var require_set = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/set.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    function resolveYamlSet(data) {
      if (data === null) return true;
      var key, object = data;
      for (key in object) {
        if (_hasOwnProperty.call(object, key)) {
          if (object[key] !== null) return false;
        }
      }
      return true;
    }
    function constructYamlSet(data) {
      return data !== null ? data : {};
    }
    module2.exports = new Type("tag:yaml.org,2002:set", {
      kind: "mapping",
      resolve: resolveYamlSet,
      construct: constructYamlSet
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema/default_safe.js
var require_default_safe = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema/default_safe.js"(exports2, module2) {
    "use strict";
    var Schema = require_schema();
    module2.exports = new Schema({
      include: [
        require_core()
      ],
      implicit: [
        require_timestamp(),
        require_merge()
      ],
      explicit: [
        require_binary(),
        require_omap(),
        require_pairs(),
        require_set()
      ]
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/js/undefined.js
var require_undefined = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/js/undefined.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    function resolveJavascriptUndefined() {
      return true;
    }
    function constructJavascriptUndefined() {
      return void 0;
    }
    function representJavascriptUndefined() {
      return "";
    }
    function isUndefined(object) {
      return typeof object === "undefined";
    }
    module2.exports = new Type("tag:yaml.org,2002:js/undefined", {
      kind: "scalar",
      resolve: resolveJavascriptUndefined,
      construct: constructJavascriptUndefined,
      predicate: isUndefined,
      represent: representJavascriptUndefined
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/js/regexp.js
var require_regexp = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/js/regexp.js"(exports2, module2) {
    "use strict";
    var Type = require_type();
    function resolveJavascriptRegExp(data) {
      if (data === null) return false;
      if (data.length === 0) return false;
      var regexp = data, tail = /\/([gim]*)$/.exec(data), modifiers = "";
      if (regexp[0] === "/") {
        if (tail) modifiers = tail[1];
        if (modifiers.length > 3) return false;
        if (regexp[regexp.length - modifiers.length - 1] !== "/") return false;
      }
      return true;
    }
    function constructJavascriptRegExp(data) {
      var regexp = data, tail = /\/([gim]*)$/.exec(data), modifiers = "";
      if (regexp[0] === "/") {
        if (tail) modifiers = tail[1];
        regexp = regexp.slice(1, regexp.length - modifiers.length - 1);
      }
      return new RegExp(regexp, modifiers);
    }
    function representJavascriptRegExp(object) {
      var result = "/" + object.source + "/";
      if (object.global) result += "g";
      if (object.multiline) result += "m";
      if (object.ignoreCase) result += "i";
      return result;
    }
    function isRegExp(object) {
      return Object.prototype.toString.call(object) === "[object RegExp]";
    }
    module2.exports = new Type("tag:yaml.org,2002:js/regexp", {
      kind: "scalar",
      resolve: resolveJavascriptRegExp,
      construct: constructJavascriptRegExp,
      predicate: isRegExp,
      represent: representJavascriptRegExp
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/js/function.js
var require_function = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/type/js/function.js"(exports2, module2) {
    "use strict";
    var esprima;
    try {
      _require = __require;
      esprima = _require("esprima");
    } catch (_) {
      if (typeof window !== "undefined") esprima = window.esprima;
    }
    var _require;
    var Type = require_type();
    function resolveJavascriptFunction(data) {
      if (data === null) return false;
      try {
        var source = "(" + data + ")", ast = esprima.parse(source, { range: true });
        if (ast.type !== "Program" || ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement" || ast.body[0].expression.type !== "ArrowFunctionExpression" && ast.body[0].expression.type !== "FunctionExpression") {
          return false;
        }
        return true;
      } catch (err) {
        return false;
      }
    }
    function constructJavascriptFunction(data) {
      var source = "(" + data + ")", ast = esprima.parse(source, { range: true }), params = [], body;
      if (ast.type !== "Program" || ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement" || ast.body[0].expression.type !== "ArrowFunctionExpression" && ast.body[0].expression.type !== "FunctionExpression") {
        throw new Error("Failed to resolve function");
      }
      ast.body[0].expression.params.forEach(function(param) {
        params.push(param.name);
      });
      body = ast.body[0].expression.body.range;
      if (ast.body[0].expression.body.type === "BlockStatement") {
        return new Function(params, source.slice(body[0] + 1, body[1] - 1));
      }
      return new Function(params, "return " + source.slice(body[0], body[1]));
    }
    function representJavascriptFunction(object) {
      return object.toString();
    }
    function isFunction(object) {
      return Object.prototype.toString.call(object) === "[object Function]";
    }
    module2.exports = new Type("tag:yaml.org,2002:js/function", {
      kind: "scalar",
      resolve: resolveJavascriptFunction,
      construct: constructJavascriptFunction,
      predicate: isFunction,
      represent: representJavascriptFunction
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema/default_full.js
var require_default_full = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/schema/default_full.js"(exports2, module2) {
    "use strict";
    var Schema = require_schema();
    module2.exports = Schema.DEFAULT = new Schema({
      include: [
        require_default_safe()
      ],
      explicit: [
        require_undefined(),
        require_regexp(),
        require_function()
      ]
    });
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/loader.js
var require_loader = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/loader.js"(exports2, module2) {
    "use strict";
    var common = require_common();
    var YAMLException = require_exception();
    var Mark = require_mark();
    var DEFAULT_SAFE_SCHEMA = require_default_safe();
    var DEFAULT_FULL_SCHEMA = require_default_full();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var CONTEXT_FLOW_IN = 1;
    var CONTEXT_FLOW_OUT = 2;
    var CONTEXT_BLOCK_IN = 3;
    var CONTEXT_BLOCK_OUT = 4;
    var CHOMPING_CLIP = 1;
    var CHOMPING_STRIP = 2;
    var CHOMPING_KEEP = 3;
    var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
    var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
    var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
    var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
    var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
    function _class(obj) {
      return Object.prototype.toString.call(obj);
    }
    function is_EOL(c) {
      return c === 10 || c === 13;
    }
    function is_WHITE_SPACE(c) {
      return c === 9 || c === 32;
    }
    function is_WS_OR_EOL(c) {
      return c === 9 || c === 32 || c === 10 || c === 13;
    }
    function is_FLOW_INDICATOR(c) {
      return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
    }
    function fromHexCode(c) {
      var lc;
      if (48 <= c && c <= 57) {
        return c - 48;
      }
      lc = c | 32;
      if (97 <= lc && lc <= 102) {
        return lc - 97 + 10;
      }
      return -1;
    }
    function escapedHexLen(c) {
      if (c === 120) {
        return 2;
      }
      if (c === 117) {
        return 4;
      }
      if (c === 85) {
        return 8;
      }
      return 0;
    }
    function fromDecimalCode(c) {
      if (48 <= c && c <= 57) {
        return c - 48;
      }
      return -1;
    }
    function simpleEscapeSequence(c) {
      return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "\x85" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
    }
    function charFromCodepoint(c) {
      if (c <= 65535) {
        return String.fromCharCode(c);
      }
      return String.fromCharCode(
        (c - 65536 >> 10) + 55296,
        (c - 65536 & 1023) + 56320
      );
    }
    function setProperty(object, key, value) {
      if (key === "__proto__") {
        Object.defineProperty(object, key, {
          configurable: true,
          enumerable: true,
          writable: true,
          value
        });
      } else {
        object[key] = value;
      }
    }
    var simpleEscapeCheck = new Array(256);
    var simpleEscapeMap = new Array(256);
    for (i = 0; i < 256; i++) {
      simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
      simpleEscapeMap[i] = simpleEscapeSequence(i);
    }
    var i;
    function State(input, options2) {
      this.input = input;
      this.filename = options2["filename"] || null;
      this.schema = options2["schema"] || DEFAULT_FULL_SCHEMA;
      this.onWarning = options2["onWarning"] || null;
      this.legacy = options2["legacy"] || false;
      this.json = options2["json"] || false;
      this.listener = options2["listener"] || null;
      this.implicitTypes = this.schema.compiledImplicit;
      this.typeMap = this.schema.compiledTypeMap;
      this.length = input.length;
      this.position = 0;
      this.line = 0;
      this.lineStart = 0;
      this.lineIndent = 0;
      this.documents = [];
    }
    function generateError(state, message) {
      return new YAMLException(
        message,
        new Mark(state.filename, state.input, state.position, state.line, state.position - state.lineStart)
      );
    }
    function throwError(state, message) {
      throw generateError(state, message);
    }
    function throwWarning(state, message) {
      if (state.onWarning) {
        state.onWarning.call(null, generateError(state, message));
      }
    }
    var directiveHandlers = {
      YAML: function handleYamlDirective(state, name, args) {
        var match, major, minor;
        if (state.version !== null) {
          throwError(state, "duplication of %YAML directive");
        }
        if (args.length !== 1) {
          throwError(state, "YAML directive accepts exactly one argument");
        }
        match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
        if (match === null) {
          throwError(state, "ill-formed argument of the YAML directive");
        }
        major = parseInt(match[1], 10);
        minor = parseInt(match[2], 10);
        if (major !== 1) {
          throwError(state, "unacceptable YAML version of the document");
        }
        state.version = args[0];
        state.checkLineBreaks = minor < 2;
        if (minor !== 1 && minor !== 2) {
          throwWarning(state, "unsupported YAML version of the document");
        }
      },
      TAG: function handleTagDirective(state, name, args) {
        var handle, prefix;
        if (args.length !== 2) {
          throwError(state, "TAG directive accepts exactly two arguments");
        }
        handle = args[0];
        prefix = args[1];
        if (!PATTERN_TAG_HANDLE.test(handle)) {
          throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
        }
        if (_hasOwnProperty.call(state.tagMap, handle)) {
          throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
        }
        if (!PATTERN_TAG_URI.test(prefix)) {
          throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
        }
        state.tagMap[handle] = prefix;
      }
    };
    function captureSegment(state, start, end, checkJson) {
      var _position, _length, _character, _result;
      if (start < end) {
        _result = state.input.slice(start, end);
        if (checkJson) {
          for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
            _character = _result.charCodeAt(_position);
            if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
              throwError(state, "expected valid JSON character");
            }
          }
        } else if (PATTERN_NON_PRINTABLE.test(_result)) {
          throwError(state, "the stream contains non-printable characters");
        }
        state.result += _result;
      }
    }
    function mergeMappings(state, destination, source, overridableKeys) {
      var sourceKeys, key, index, quantity;
      if (!common.isObject(source)) {
        throwError(state, "cannot merge mappings; the provided source object is unacceptable");
      }
      sourceKeys = Object.keys(source);
      for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
        key = sourceKeys[index];
        if (!_hasOwnProperty.call(destination, key)) {
          setProperty(destination, key, source[key]);
          overridableKeys[key] = true;
        }
      }
    }
    function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startPos) {
      var index, quantity;
      if (Array.isArray(keyNode)) {
        keyNode = Array.prototype.slice.call(keyNode);
        for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
          if (Array.isArray(keyNode[index])) {
            throwError(state, "nested arrays are not supported inside keys");
          }
          if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
            keyNode[index] = "[object Object]";
          }
        }
      }
      if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
        keyNode = "[object Object]";
      }
      keyNode = String(keyNode);
      if (_result === null) {
        _result = {};
      }
      if (keyTag === "tag:yaml.org,2002:merge") {
        if (Array.isArray(valueNode)) {
          for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
            mergeMappings(state, _result, valueNode[index], overridableKeys);
          }
        } else {
          mergeMappings(state, _result, valueNode, overridableKeys);
        }
      } else {
        if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
          state.line = startLine || state.line;
          state.position = startPos || state.position;
          throwError(state, "duplicated mapping key");
        }
        setProperty(_result, keyNode, valueNode);
        delete overridableKeys[keyNode];
      }
      return _result;
    }
    function readLineBreak(state) {
      var ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 10) {
        state.position++;
      } else if (ch === 13) {
        state.position++;
        if (state.input.charCodeAt(state.position) === 10) {
          state.position++;
        }
      } else {
        throwError(state, "a line break is expected");
      }
      state.line += 1;
      state.lineStart = state.position;
    }
    function skipSeparationSpace(state, allowComments, checkIndent) {
      var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (allowComments && ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (ch !== 10 && ch !== 13 && ch !== 0);
        }
        if (is_EOL(ch)) {
          readLineBreak(state);
          ch = state.input.charCodeAt(state.position);
          lineBreaks++;
          state.lineIndent = 0;
          while (ch === 32) {
            state.lineIndent++;
            ch = state.input.charCodeAt(++state.position);
          }
        } else {
          break;
        }
      }
      if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
        throwWarning(state, "deficient indentation");
      }
      return lineBreaks;
    }
    function testDocumentSeparator(state) {
      var _position = state.position, ch;
      ch = state.input.charCodeAt(_position);
      if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
        _position += 3;
        ch = state.input.charCodeAt(_position);
        if (ch === 0 || is_WS_OR_EOL(ch)) {
          return true;
        }
      }
      return false;
    }
    function writeFoldedLines(state, count) {
      if (count === 1) {
        state.result += " ";
      } else if (count > 1) {
        state.result += common.repeat("\n", count - 1);
      }
    }
    function readPlainScalar(state, nodeIndent, withinFlowCollection) {
      var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
      ch = state.input.charCodeAt(state.position);
      if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
        return false;
      }
      if (ch === 63 || ch === 45) {
        following = state.input.charCodeAt(state.position + 1);
        if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
          return false;
        }
      }
      state.kind = "scalar";
      state.result = "";
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
      while (ch !== 0) {
        if (ch === 58) {
          following = state.input.charCodeAt(state.position + 1);
          if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
            break;
          }
        } else if (ch === 35) {
          preceding = state.input.charCodeAt(state.position - 1);
          if (is_WS_OR_EOL(preceding)) {
            break;
          }
        } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
          break;
        } else if (is_EOL(ch)) {
          _line = state.line;
          _lineStart = state.lineStart;
          _lineIndent = state.lineIndent;
          skipSeparationSpace(state, false, -1);
          if (state.lineIndent >= nodeIndent) {
            hasPendingContent = true;
            ch = state.input.charCodeAt(state.position);
            continue;
          } else {
            state.position = captureEnd;
            state.line = _line;
            state.lineStart = _lineStart;
            state.lineIndent = _lineIndent;
            break;
          }
        }
        if (hasPendingContent) {
          captureSegment(state, captureStart, captureEnd, false);
          writeFoldedLines(state, state.line - _line);
          captureStart = captureEnd = state.position;
          hasPendingContent = false;
        }
        if (!is_WHITE_SPACE(ch)) {
          captureEnd = state.position + 1;
        }
        ch = state.input.charCodeAt(++state.position);
      }
      captureSegment(state, captureStart, captureEnd, false);
      if (state.result) {
        return true;
      }
      state.kind = _kind;
      state.result = _result;
      return false;
    }
    function readSingleQuotedScalar(state, nodeIndent) {
      var ch, captureStart, captureEnd;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 39) {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      state.position++;
      captureStart = captureEnd = state.position;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 39) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (ch === 39) {
            captureStart = state.position;
            state.position++;
            captureEnd = state.position;
          } else {
            return true;
          }
        } else if (is_EOL(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
          captureStart = captureEnd = state.position;
        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
          throwError(state, "unexpected end of the document within a single quoted scalar");
        } else {
          state.position++;
          captureEnd = state.position;
        }
      }
      throwError(state, "unexpected end of the stream within a single quoted scalar");
    }
    function readDoubleQuotedScalar(state, nodeIndent) {
      var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 34) {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      state.position++;
      captureStart = captureEnd = state.position;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 34) {
          captureSegment(state, captureStart, state.position, true);
          state.position++;
          return true;
        } else if (ch === 92) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (is_EOL(ch)) {
            skipSeparationSpace(state, false, nodeIndent);
          } else if (ch < 256 && simpleEscapeCheck[ch]) {
            state.result += simpleEscapeMap[ch];
            state.position++;
          } else if ((tmp = escapedHexLen(ch)) > 0) {
            hexLength = tmp;
            hexResult = 0;
            for (; hexLength > 0; hexLength--) {
              ch = state.input.charCodeAt(++state.position);
              if ((tmp = fromHexCode(ch)) >= 0) {
                hexResult = (hexResult << 4) + tmp;
              } else {
                throwError(state, "expected hexadecimal character");
              }
            }
            state.result += charFromCodepoint(hexResult);
            state.position++;
          } else {
            throwError(state, "unknown escape sequence");
          }
          captureStart = captureEnd = state.position;
        } else if (is_EOL(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
          captureStart = captureEnd = state.position;
        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
          throwError(state, "unexpected end of the document within a double quoted scalar");
        } else {
          state.position++;
          captureEnd = state.position;
        }
      }
      throwError(state, "unexpected end of the stream within a double quoted scalar");
    }
    function readFlowCollection(state, nodeIndent) {
      var readNext = true, _line, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = {}, keyNode, keyTag, valueNode, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 91) {
        terminator = 93;
        isMapping = false;
        _result = [];
      } else if (ch === 123) {
        terminator = 125;
        isMapping = true;
        _result = {};
      } else {
        return false;
      }
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(++state.position);
      while (ch !== 0) {
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === terminator) {
          state.position++;
          state.tag = _tag;
          state.anchor = _anchor;
          state.kind = isMapping ? "mapping" : "sequence";
          state.result = _result;
          return true;
        } else if (!readNext) {
          throwError(state, "missed comma between flow collection entries");
        }
        keyTag = keyNode = valueNode = null;
        isPair = isExplicitPair = false;
        if (ch === 63) {
          following = state.input.charCodeAt(state.position + 1);
          if (is_WS_OR_EOL(following)) {
            isPair = isExplicitPair = true;
            state.position++;
            skipSeparationSpace(state, true, nodeIndent);
          }
        }
        _line = state.line;
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        keyTag = state.tag;
        keyNode = state.result;
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if ((isExplicitPair || state.line === _line) && ch === 58) {
          isPair = true;
          ch = state.input.charCodeAt(++state.position);
          skipSeparationSpace(state, true, nodeIndent);
          composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
          valueNode = state.result;
        }
        if (isMapping) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode);
        } else if (isPair) {
          _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode));
        } else {
          _result.push(keyNode);
        }
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === 44) {
          readNext = true;
          ch = state.input.charCodeAt(++state.position);
        } else {
          readNext = false;
        }
      }
      throwError(state, "unexpected end of the stream within a flow collection");
    }
    function readBlockScalar(state, nodeIndent) {
      var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 124) {
        folding = false;
      } else if (ch === 62) {
        folding = true;
      } else {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      while (ch !== 0) {
        ch = state.input.charCodeAt(++state.position);
        if (ch === 43 || ch === 45) {
          if (CHOMPING_CLIP === chomping) {
            chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
          } else {
            throwError(state, "repeat of a chomping mode identifier");
          }
        } else if ((tmp = fromDecimalCode(ch)) >= 0) {
          if (tmp === 0) {
            throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
          } else if (!detectedIndent) {
            textIndent = nodeIndent + tmp - 1;
            detectedIndent = true;
          } else {
            throwError(state, "repeat of an indentation width identifier");
          }
        } else {
          break;
        }
      }
      if (is_WHITE_SPACE(ch)) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (is_WHITE_SPACE(ch));
        if (ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (!is_EOL(ch) && ch !== 0);
        }
      }
      while (ch !== 0) {
        readLineBreak(state);
        state.lineIndent = 0;
        ch = state.input.charCodeAt(state.position);
        while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
          state.lineIndent++;
          ch = state.input.charCodeAt(++state.position);
        }
        if (!detectedIndent && state.lineIndent > textIndent) {
          textIndent = state.lineIndent;
        }
        if (is_EOL(ch)) {
          emptyLines++;
          continue;
        }
        if (state.lineIndent < textIndent) {
          if (chomping === CHOMPING_KEEP) {
            state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
          } else if (chomping === CHOMPING_CLIP) {
            if (didReadContent) {
              state.result += "\n";
            }
          }
          break;
        }
        if (folding) {
          if (is_WHITE_SPACE(ch)) {
            atMoreIndented = true;
            state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
          } else if (atMoreIndented) {
            atMoreIndented = false;
            state.result += common.repeat("\n", emptyLines + 1);
          } else if (emptyLines === 0) {
            if (didReadContent) {
              state.result += " ";
            }
          } else {
            state.result += common.repeat("\n", emptyLines);
          }
        } else {
          state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        }
        didReadContent = true;
        detectedIndent = true;
        emptyLines = 0;
        captureStart = state.position;
        while (!is_EOL(ch) && ch !== 0) {
          ch = state.input.charCodeAt(++state.position);
        }
        captureSegment(state, captureStart, state.position, false);
      }
      return true;
    }
    function readBlockSequence(state, nodeIndent) {
      var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        if (ch !== 45) {
          break;
        }
        following = state.input.charCodeAt(state.position + 1);
        if (!is_WS_OR_EOL(following)) {
          break;
        }
        detected = true;
        state.position++;
        if (skipSeparationSpace(state, true, -1)) {
          if (state.lineIndent <= nodeIndent) {
            _result.push(null);
            ch = state.input.charCodeAt(state.position);
            continue;
          }
        }
        _line = state.line;
        composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
        _result.push(state.result);
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
          throwError(state, "bad indentation of a sequence entry");
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }
      if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = "sequence";
        state.result = _result;
        return true;
      }
      return false;
    }
    function readBlockMapping(state, nodeIndent, flowIndent) {
      var following, allowCompact, _line, _pos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = {}, keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        following = state.input.charCodeAt(state.position + 1);
        _line = state.line;
        _pos = state.position;
        if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
          if (ch === 63) {
            if (atExplicitKey) {
              storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
              keyTag = keyNode = valueNode = null;
            }
            detected = true;
            atExplicitKey = true;
            allowCompact = true;
          } else if (atExplicitKey) {
            atExplicitKey = false;
            allowCompact = true;
          } else {
            throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
          }
          state.position += 1;
          ch = following;
        } else if (composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
          if (state.line === _line) {
            ch = state.input.charCodeAt(state.position);
            while (is_WHITE_SPACE(ch)) {
              ch = state.input.charCodeAt(++state.position);
            }
            if (ch === 58) {
              ch = state.input.charCodeAt(++state.position);
              if (!is_WS_OR_EOL(ch)) {
                throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
              }
              if (atExplicitKey) {
                storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
                keyTag = keyNode = valueNode = null;
              }
              detected = true;
              atExplicitKey = false;
              allowCompact = false;
              keyTag = state.tag;
              keyNode = state.result;
            } else if (detected) {
              throwError(state, "can not read an implicit mapping pair; a colon is missed");
            } else {
              state.tag = _tag;
              state.anchor = _anchor;
              return true;
            }
          } else if (detected) {
            throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
          } else {
            state.tag = _tag;
            state.anchor = _anchor;
            return true;
          }
        } else {
          break;
        }
        if (state.line === _line || state.lineIndent > nodeIndent) {
          if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
            if (atExplicitKey) {
              keyNode = state.result;
            } else {
              valueNode = state.result;
            }
          }
          if (!atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _pos);
            keyTag = keyNode = valueNode = null;
          }
          skipSeparationSpace(state, true, -1);
          ch = state.input.charCodeAt(state.position);
        }
        if (state.lineIndent > nodeIndent && ch !== 0) {
          throwError(state, "bad indentation of a mapping entry");
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }
      if (atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null);
      }
      if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = "mapping";
        state.result = _result;
      }
      return detected;
    }
    function readTagProperty(state) {
      var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 33) return false;
      if (state.tag !== null) {
        throwError(state, "duplication of a tag property");
      }
      ch = state.input.charCodeAt(++state.position);
      if (ch === 60) {
        isVerbatim = true;
        ch = state.input.charCodeAt(++state.position);
      } else if (ch === 33) {
        isNamed = true;
        tagHandle = "!!";
        ch = state.input.charCodeAt(++state.position);
      } else {
        tagHandle = "!";
      }
      _position = state.position;
      if (isVerbatim) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && ch !== 62);
        if (state.position < state.length) {
          tagName = state.input.slice(_position, state.position);
          ch = state.input.charCodeAt(++state.position);
        } else {
          throwError(state, "unexpected end of the stream within a verbatim tag");
        }
      } else {
        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          if (ch === 33) {
            if (!isNamed) {
              tagHandle = state.input.slice(_position - 1, state.position + 1);
              if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
                throwError(state, "named tag handle cannot contain such characters");
              }
              isNamed = true;
              _position = state.position + 1;
            } else {
              throwError(state, "tag suffix cannot contain exclamation marks");
            }
          }
          ch = state.input.charCodeAt(++state.position);
        }
        tagName = state.input.slice(_position, state.position);
        if (PATTERN_FLOW_INDICATORS.test(tagName)) {
          throwError(state, "tag suffix cannot contain flow indicator characters");
        }
      }
      if (tagName && !PATTERN_TAG_URI.test(tagName)) {
        throwError(state, "tag name cannot contain such characters: " + tagName);
      }
      if (isVerbatim) {
        state.tag = tagName;
      } else if (_hasOwnProperty.call(state.tagMap, tagHandle)) {
        state.tag = state.tagMap[tagHandle] + tagName;
      } else if (tagHandle === "!") {
        state.tag = "!" + tagName;
      } else if (tagHandle === "!!") {
        state.tag = "tag:yaml.org,2002:" + tagName;
      } else {
        throwError(state, 'undeclared tag handle "' + tagHandle + '"');
      }
      return true;
    }
    function readAnchorProperty(state) {
      var _position, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 38) return false;
      if (state.anchor !== null) {
        throwError(state, "duplication of an anchor property");
      }
      ch = state.input.charCodeAt(++state.position);
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === _position) {
        throwError(state, "name of an anchor node must contain at least one character");
      }
      state.anchor = state.input.slice(_position, state.position);
      return true;
    }
    function readAlias(state) {
      var _position, alias, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 42) return false;
      ch = state.input.charCodeAt(++state.position);
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === _position) {
        throwError(state, "name of an alias node must contain at least one character");
      }
      alias = state.input.slice(_position, state.position);
      if (!_hasOwnProperty.call(state.anchorMap, alias)) {
        throwError(state, 'unidentified alias "' + alias + '"');
      }
      state.result = state.anchorMap[alias];
      skipSeparationSpace(state, true, -1);
      return true;
    }
    function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
      var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, type, flowIndent, blockIndent;
      if (state.listener !== null) {
        state.listener("open", state);
      }
      state.tag = null;
      state.anchor = null;
      state.kind = null;
      state.result = null;
      allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
      if (allowToSeek) {
        if (skipSeparationSpace(state, true, -1)) {
          atNewLine = true;
          if (state.lineIndent > parentIndent) {
            indentStatus = 1;
          } else if (state.lineIndent === parentIndent) {
            indentStatus = 0;
          } else if (state.lineIndent < parentIndent) {
            indentStatus = -1;
          }
        }
      }
      if (indentStatus === 1) {
        while (readTagProperty(state) || readAnchorProperty(state)) {
          if (skipSeparationSpace(state, true, -1)) {
            atNewLine = true;
            allowBlockCollections = allowBlockStyles;
            if (state.lineIndent > parentIndent) {
              indentStatus = 1;
            } else if (state.lineIndent === parentIndent) {
              indentStatus = 0;
            } else if (state.lineIndent < parentIndent) {
              indentStatus = -1;
            }
          } else {
            allowBlockCollections = false;
          }
        }
      }
      if (allowBlockCollections) {
        allowBlockCollections = atNewLine || allowCompact;
      }
      if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
        if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
          flowIndent = parentIndent;
        } else {
          flowIndent = parentIndent + 1;
        }
        blockIndent = state.position - state.lineStart;
        if (indentStatus === 1) {
          if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
            hasContent = true;
          } else {
            if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
              hasContent = true;
            } else if (readAlias(state)) {
              hasContent = true;
              if (state.tag !== null || state.anchor !== null) {
                throwError(state, "alias node should not have any properties");
              }
            } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
              hasContent = true;
              if (state.tag === null) {
                state.tag = "?";
              }
            }
            if (state.anchor !== null) {
              state.anchorMap[state.anchor] = state.result;
            }
          }
        } else if (indentStatus === 0) {
          hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
        }
      }
      if (state.tag !== null && state.tag !== "!") {
        if (state.tag === "?") {
          if (state.result !== null && state.kind !== "scalar") {
            throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
          }
          for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
            type = state.implicitTypes[typeIndex];
            if (type.resolve(state.result)) {
              state.result = type.construct(state.result);
              state.tag = type.tag;
              if (state.anchor !== null) {
                state.anchorMap[state.anchor] = state.result;
              }
              break;
            }
          }
        } else if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) {
          type = state.typeMap[state.kind || "fallback"][state.tag];
          if (state.result !== null && type.kind !== state.kind) {
            throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"');
          }
          if (!type.resolve(state.result)) {
            throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
          } else {
            state.result = type.construct(state.result);
            if (state.anchor !== null) {
              state.anchorMap[state.anchor] = state.result;
            }
          }
        } else {
          throwError(state, "unknown tag !<" + state.tag + ">");
        }
      }
      if (state.listener !== null) {
        state.listener("close", state);
      }
      return state.tag !== null || state.anchor !== null || hasContent;
    }
    function readDocument(state) {
      var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
      state.version = null;
      state.checkLineBreaks = state.legacy;
      state.tagMap = {};
      state.anchorMap = {};
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if (state.lineIndent > 0 || ch !== 37) {
          break;
        }
        hasDirectives = true;
        ch = state.input.charCodeAt(++state.position);
        _position = state.position;
        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        directiveName = state.input.slice(_position, state.position);
        directiveArgs = [];
        if (directiveName.length < 1) {
          throwError(state, "directive name must not be less than one character in length");
        }
        while (ch !== 0) {
          while (is_WHITE_SPACE(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          if (ch === 35) {
            do {
              ch = state.input.charCodeAt(++state.position);
            } while (ch !== 0 && !is_EOL(ch));
            break;
          }
          if (is_EOL(ch)) break;
          _position = state.position;
          while (ch !== 0 && !is_WS_OR_EOL(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          directiveArgs.push(state.input.slice(_position, state.position));
        }
        if (ch !== 0) readLineBreak(state);
        if (_hasOwnProperty.call(directiveHandlers, directiveName)) {
          directiveHandlers[directiveName](state, directiveName, directiveArgs);
        } else {
          throwWarning(state, 'unknown document directive "' + directiveName + '"');
        }
      }
      skipSeparationSpace(state, true, -1);
      if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      } else if (hasDirectives) {
        throwError(state, "directives end mark is expected");
      }
      composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
      skipSeparationSpace(state, true, -1);
      if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
        throwWarning(state, "non-ASCII line breaks are interpreted as content");
      }
      state.documents.push(state.result);
      if (state.position === state.lineStart && testDocumentSeparator(state)) {
        if (state.input.charCodeAt(state.position) === 46) {
          state.position += 3;
          skipSeparationSpace(state, true, -1);
        }
        return;
      }
      if (state.position < state.length - 1) {
        throwError(state, "end of the stream or a document separator is expected");
      } else {
        return;
      }
    }
    function loadDocuments(input, options2) {
      input = String(input);
      options2 = options2 || {};
      if (input.length !== 0) {
        if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
          input += "\n";
        }
        if (input.charCodeAt(0) === 65279) {
          input = input.slice(1);
        }
      }
      var state = new State(input, options2);
      var nullpos = input.indexOf("\0");
      if (nullpos !== -1) {
        state.position = nullpos;
        throwError(state, "null byte is not allowed in input");
      }
      state.input += "\0";
      while (state.input.charCodeAt(state.position) === 32) {
        state.lineIndent += 1;
        state.position += 1;
      }
      while (state.position < state.length - 1) {
        readDocument(state);
      }
      return state.documents;
    }
    function loadAll(input, iterator, options2) {
      if (iterator !== null && typeof iterator === "object" && typeof options2 === "undefined") {
        options2 = iterator;
        iterator = null;
      }
      var documents = loadDocuments(input, options2);
      if (typeof iterator !== "function") {
        return documents;
      }
      for (var index = 0, length = documents.length; index < length; index += 1) {
        iterator(documents[index]);
      }
    }
    function load(input, options2) {
      var documents = loadDocuments(input, options2);
      if (documents.length === 0) {
        return void 0;
      } else if (documents.length === 1) {
        return documents[0];
      }
      throw new YAMLException("expected a single document in the stream, but found more");
    }
    function safeLoadAll(input, iterator, options2) {
      if (typeof iterator === "object" && iterator !== null && typeof options2 === "undefined") {
        options2 = iterator;
        iterator = null;
      }
      return loadAll(input, iterator, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options2));
    }
    function safeLoad(input, options2) {
      return load(input, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options2));
    }
    module2.exports.loadAll = loadAll;
    module2.exports.load = load;
    module2.exports.safeLoadAll = safeLoadAll;
    module2.exports.safeLoad = safeLoad;
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/dumper.js
var require_dumper = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml/dumper.js"(exports2, module2) {
    "use strict";
    var common = require_common();
    var YAMLException = require_exception();
    var DEFAULT_FULL_SCHEMA = require_default_full();
    var DEFAULT_SAFE_SCHEMA = require_default_safe();
    var _toString = Object.prototype.toString;
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var CHAR_TAB = 9;
    var CHAR_LINE_FEED = 10;
    var CHAR_CARRIAGE_RETURN = 13;
    var CHAR_SPACE = 32;
    var CHAR_EXCLAMATION = 33;
    var CHAR_DOUBLE_QUOTE = 34;
    var CHAR_SHARP = 35;
    var CHAR_PERCENT = 37;
    var CHAR_AMPERSAND = 38;
    var CHAR_SINGLE_QUOTE = 39;
    var CHAR_ASTERISK = 42;
    var CHAR_COMMA = 44;
    var CHAR_MINUS = 45;
    var CHAR_COLON = 58;
    var CHAR_EQUALS = 61;
    var CHAR_GREATER_THAN = 62;
    var CHAR_QUESTION = 63;
    var CHAR_COMMERCIAL_AT = 64;
    var CHAR_LEFT_SQUARE_BRACKET = 91;
    var CHAR_RIGHT_SQUARE_BRACKET = 93;
    var CHAR_GRAVE_ACCENT = 96;
    var CHAR_LEFT_CURLY_BRACKET = 123;
    var CHAR_VERTICAL_LINE = 124;
    var CHAR_RIGHT_CURLY_BRACKET = 125;
    var ESCAPE_SEQUENCES = {};
    ESCAPE_SEQUENCES[0] = "\\0";
    ESCAPE_SEQUENCES[7] = "\\a";
    ESCAPE_SEQUENCES[8] = "\\b";
    ESCAPE_SEQUENCES[9] = "\\t";
    ESCAPE_SEQUENCES[10] = "\\n";
    ESCAPE_SEQUENCES[11] = "\\v";
    ESCAPE_SEQUENCES[12] = "\\f";
    ESCAPE_SEQUENCES[13] = "\\r";
    ESCAPE_SEQUENCES[27] = "\\e";
    ESCAPE_SEQUENCES[34] = '\\"';
    ESCAPE_SEQUENCES[92] = "\\\\";
    ESCAPE_SEQUENCES[133] = "\\N";
    ESCAPE_SEQUENCES[160] = "\\_";
    ESCAPE_SEQUENCES[8232] = "\\L";
    ESCAPE_SEQUENCES[8233] = "\\P";
    var DEPRECATED_BOOLEANS_SYNTAX = [
      "y",
      "Y",
      "yes",
      "Yes",
      "YES",
      "on",
      "On",
      "ON",
      "n",
      "N",
      "no",
      "No",
      "NO",
      "off",
      "Off",
      "OFF"
    ];
    function compileStyleMap(schema, map) {
      var result, keys, index, length, tag, style, type;
      if (map === null) return {};
      result = {};
      keys = Object.keys(map);
      for (index = 0, length = keys.length; index < length; index += 1) {
        tag = keys[index];
        style = String(map[tag]);
        if (tag.slice(0, 2) === "!!") {
          tag = "tag:yaml.org,2002:" + tag.slice(2);
        }
        type = schema.compiledTypeMap["fallback"][tag];
        if (type && _hasOwnProperty.call(type.styleAliases, style)) {
          style = type.styleAliases[style];
        }
        result[tag] = style;
      }
      return result;
    }
    function encodeHex(character) {
      var string, handle, length;
      string = character.toString(16).toUpperCase();
      if (character <= 255) {
        handle = "x";
        length = 2;
      } else if (character <= 65535) {
        handle = "u";
        length = 4;
      } else if (character <= 4294967295) {
        handle = "U";
        length = 8;
      } else {
        throw new YAMLException("code point within a string may not be greater than 0xFFFFFFFF");
      }
      return "\\" + handle + common.repeat("0", length - string.length) + string;
    }
    function State(options2) {
      this.schema = options2["schema"] || DEFAULT_FULL_SCHEMA;
      this.indent = Math.max(1, options2["indent"] || 2);
      this.noArrayIndent = options2["noArrayIndent"] || false;
      this.skipInvalid = options2["skipInvalid"] || false;
      this.flowLevel = common.isNothing(options2["flowLevel"]) ? -1 : options2["flowLevel"];
      this.styleMap = compileStyleMap(this.schema, options2["styles"] || null);
      this.sortKeys = options2["sortKeys"] || false;
      this.lineWidth = options2["lineWidth"] || 80;
      this.noRefs = options2["noRefs"] || false;
      this.noCompatMode = options2["noCompatMode"] || false;
      this.condenseFlow = options2["condenseFlow"] || false;
      this.implicitTypes = this.schema.compiledImplicit;
      this.explicitTypes = this.schema.compiledExplicit;
      this.tag = null;
      this.result = "";
      this.duplicates = [];
      this.usedDuplicates = null;
    }
    function indentString(string, spaces) {
      var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
      while (position < length) {
        next = string.indexOf("\n", position);
        if (next === -1) {
          line = string.slice(position);
          position = length;
        } else {
          line = string.slice(position, next + 1);
          position = next + 1;
        }
        if (line.length && line !== "\n") result += ind;
        result += line;
      }
      return result;
    }
    function generateNextLine(state, level) {
      return "\n" + common.repeat(" ", state.indent * level);
    }
    function testImplicitResolving(state, str2) {
      var index, length, type;
      for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
        type = state.implicitTypes[index];
        if (type.resolve(str2)) {
          return true;
        }
      }
      return false;
    }
    function isWhitespace(c) {
      return c === CHAR_SPACE || c === CHAR_TAB;
    }
    function isPrintable(c) {
      return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== 65279 || 65536 <= c && c <= 1114111;
    }
    function isNsChar(c) {
      return isPrintable(c) && !isWhitespace(c) && c !== 65279 && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
    }
    function isPlainSafe(c, prev) {
      return isPrintable(c) && c !== 65279 && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_COLON && (c !== CHAR_SHARP || prev && isNsChar(prev));
    }
    function isPlainSafeFirst(c) {
      return isPrintable(c) && c !== 65279 && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
    }
    function needIndentIndicator(string) {
      var leadingSpaceRe = /^\n* /;
      return leadingSpaceRe.test(string);
    }
    var STYLE_PLAIN = 1;
    var STYLE_SINGLE = 2;
    var STYLE_LITERAL = 3;
    var STYLE_FOLDED = 4;
    var STYLE_DOUBLE = 5;
    function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType) {
      var i;
      var char, prev_char;
      var hasLineBreak = false;
      var hasFoldableLine = false;
      var shouldTrackWidth = lineWidth !== -1;
      var previousLineBreak = -1;
      var plain = isPlainSafeFirst(string.charCodeAt(0)) && !isWhitespace(string.charCodeAt(string.length - 1));
      if (singleLineOnly) {
        for (i = 0; i < string.length; i++) {
          char = string.charCodeAt(i);
          if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          prev_char = i > 0 ? string.charCodeAt(i - 1) : null;
          plain = plain && isPlainSafe(char, prev_char);
        }
      } else {
        for (i = 0; i < string.length; i++) {
          char = string.charCodeAt(i);
          if (char === CHAR_LINE_FEED) {
            hasLineBreak = true;
            if (shouldTrackWidth) {
              hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
              i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
              previousLineBreak = i;
            }
          } else if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          prev_char = i > 0 ? string.charCodeAt(i - 1) : null;
          plain = plain && isPlainSafe(char, prev_char);
        }
        hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
      }
      if (!hasLineBreak && !hasFoldableLine) {
        return plain && !testAmbiguousType(string) ? STYLE_PLAIN : STYLE_SINGLE;
      }
      if (indentPerLevel > 9 && needIndentIndicator(string)) {
        return STYLE_DOUBLE;
      }
      return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
    }
    function writeScalar(state, string, level, iskey) {
      state.dump = (function() {
        if (string.length === 0) {
          return "''";
        }
        if (!state.noCompatMode && DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1) {
          return "'" + string + "'";
        }
        var indent = state.indent * Math.max(1, level);
        var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
        var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
        function testAmbiguity(string2) {
          return testImplicitResolving(state, string2);
        }
        switch (chooseScalarStyle(string, singleLineOnly, state.indent, lineWidth, testAmbiguity)) {
          case STYLE_PLAIN:
            return string;
          case STYLE_SINGLE:
            return "'" + string.replace(/'/g, "''") + "'";
          case STYLE_LITERAL:
            return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
          case STYLE_FOLDED:
            return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
          case STYLE_DOUBLE:
            return '"' + escapeString(string, lineWidth) + '"';
          default:
            throw new YAMLException("impossible error: invalid scalar style");
        }
      })();
    }
    function blockHeader(string, indentPerLevel) {
      var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
      var clip = string[string.length - 1] === "\n";
      var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
      var chomp = keep ? "+" : clip ? "" : "-";
      return indentIndicator + chomp + "\n";
    }
    function dropEndingNewline(string) {
      return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
    }
    function foldString(string, width) {
      var lineRe = /(\n+)([^\n]*)/g;
      var result = (function() {
        var nextLF = string.indexOf("\n");
        nextLF = nextLF !== -1 ? nextLF : string.length;
        lineRe.lastIndex = nextLF;
        return foldLine(string.slice(0, nextLF), width);
      })();
      var prevMoreIndented = string[0] === "\n" || string[0] === " ";
      var moreIndented;
      var match;
      while (match = lineRe.exec(string)) {
        var prefix = match[1], line = match[2];
        moreIndented = line[0] === " ";
        result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
        prevMoreIndented = moreIndented;
      }
      return result;
    }
    function foldLine(line, width) {
      if (line === "" || line[0] === " ") return line;
      var breakRe = / [^ ]/g;
      var match;
      var start = 0, end, curr = 0, next = 0;
      var result = "";
      while (match = breakRe.exec(line)) {
        next = match.index;
        if (next - start > width) {
          end = curr > start ? curr : next;
          result += "\n" + line.slice(start, end);
          start = end + 1;
        }
        curr = next;
      }
      result += "\n";
      if (line.length - start > width && curr > start) {
        result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
      } else {
        result += line.slice(start);
      }
      return result.slice(1);
    }
    function escapeString(string) {
      var result = "";
      var char, nextChar;
      var escapeSeq;
      for (var i = 0; i < string.length; i++) {
        char = string.charCodeAt(i);
        if (char >= 55296 && char <= 56319) {
          nextChar = string.charCodeAt(i + 1);
          if (nextChar >= 56320 && nextChar <= 57343) {
            result += encodeHex((char - 55296) * 1024 + nextChar - 56320 + 65536);
            i++;
            continue;
          }
        }
        escapeSeq = ESCAPE_SEQUENCES[char];
        result += !escapeSeq && isPrintable(char) ? string[i] : escapeSeq || encodeHex(char);
      }
      return result;
    }
    function writeFlowSequence(state, level, object) {
      var _result = "", _tag = state.tag, index, length;
      for (index = 0, length = object.length; index < length; index += 1) {
        if (writeNode(state, level, object[index], false, false)) {
          if (index !== 0) _result += "," + (!state.condenseFlow ? " " : "");
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = "[" + _result + "]";
    }
    function writeBlockSequence(state, level, object, compact) {
      var _result = "", _tag = state.tag, index, length;
      for (index = 0, length = object.length; index < length; index += 1) {
        if (writeNode(state, level + 1, object[index], true, true)) {
          if (!compact || index !== 0) {
            _result += generateNextLine(state, level);
          }
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            _result += "-";
          } else {
            _result += "- ";
          }
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = _result || "[]";
    }
    function writeFlowMapping(state, level, object) {
      var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
      for (index = 0, length = objectKeyList.length; index < length; index += 1) {
        pairBuffer = "";
        if (index !== 0) pairBuffer += ", ";
        if (state.condenseFlow) pairBuffer += '"';
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (!writeNode(state, level, objectKey, false, false)) {
          continue;
        }
        if (state.dump.length > 1024) pairBuffer += "? ";
        pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
        if (!writeNode(state, level, objectValue, false, false)) {
          continue;
        }
        pairBuffer += state.dump;
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = "{" + _result + "}";
    }
    function writeBlockMapping(state, level, object, compact) {
      var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
      if (state.sortKeys === true) {
        objectKeyList.sort();
      } else if (typeof state.sortKeys === "function") {
        objectKeyList.sort(state.sortKeys);
      } else if (state.sortKeys) {
        throw new YAMLException("sortKeys must be a boolean or a function");
      }
      for (index = 0, length = objectKeyList.length; index < length; index += 1) {
        pairBuffer = "";
        if (!compact || index !== 0) {
          pairBuffer += generateNextLine(state, level);
        }
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (!writeNode(state, level + 1, objectKey, true, true, true)) {
          continue;
        }
        explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
        if (explicitPair) {
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            pairBuffer += "?";
          } else {
            pairBuffer += "? ";
          }
        }
        pairBuffer += state.dump;
        if (explicitPair) {
          pairBuffer += generateNextLine(state, level);
        }
        if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
          continue;
        }
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          pairBuffer += ":";
        } else {
          pairBuffer += ": ";
        }
        pairBuffer += state.dump;
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = _result || "{}";
    }
    function detectType(state, object, explicit) {
      var _result, typeList, index, length, type, style;
      typeList = explicit ? state.explicitTypes : state.implicitTypes;
      for (index = 0, length = typeList.length; index < length; index += 1) {
        type = typeList[index];
        if ((type.instanceOf || type.predicate) && (!type.instanceOf || typeof object === "object" && object instanceof type.instanceOf) && (!type.predicate || type.predicate(object))) {
          state.tag = explicit ? type.tag : "?";
          if (type.represent) {
            style = state.styleMap[type.tag] || type.defaultStyle;
            if (_toString.call(type.represent) === "[object Function]") {
              _result = type.represent(object, style);
            } else if (_hasOwnProperty.call(type.represent, style)) {
              _result = type.represent[style](object, style);
            } else {
              throw new YAMLException("!<" + type.tag + '> tag resolver accepts not "' + style + '" style');
            }
            state.dump = _result;
          }
          return true;
        }
      }
      return false;
    }
    function writeNode(state, level, object, block, compact, iskey) {
      state.tag = null;
      state.dump = object;
      if (!detectType(state, object, false)) {
        detectType(state, object, true);
      }
      var type = _toString.call(state.dump);
      if (block) {
        block = state.flowLevel < 0 || state.flowLevel > level;
      }
      var objectOrArray = type === "[object Object]" || type === "[object Array]", duplicateIndex, duplicate;
      if (objectOrArray) {
        duplicateIndex = state.duplicates.indexOf(object);
        duplicate = duplicateIndex !== -1;
      }
      if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
        compact = false;
      }
      if (duplicate && state.usedDuplicates[duplicateIndex]) {
        state.dump = "*ref_" + duplicateIndex;
      } else {
        if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
          state.usedDuplicates[duplicateIndex] = true;
        }
        if (type === "[object Object]") {
          if (block && Object.keys(state.dump).length !== 0) {
            writeBlockMapping(state, level, state.dump, compact);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + state.dump;
            }
          } else {
            writeFlowMapping(state, level, state.dump);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + " " + state.dump;
            }
          }
        } else if (type === "[object Array]") {
          var arrayLevel = state.noArrayIndent && level > 0 ? level - 1 : level;
          if (block && state.dump.length !== 0) {
            writeBlockSequence(state, arrayLevel, state.dump, compact);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + state.dump;
            }
          } else {
            writeFlowSequence(state, arrayLevel, state.dump);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + " " + state.dump;
            }
          }
        } else if (type === "[object String]") {
          if (state.tag !== "?") {
            writeScalar(state, state.dump, level, iskey);
          }
        } else {
          if (state.skipInvalid) return false;
          throw new YAMLException("unacceptable kind of an object to dump " + type);
        }
        if (state.tag !== null && state.tag !== "?") {
          state.dump = "!<" + state.tag + "> " + state.dump;
        }
      }
      return true;
    }
    function getDuplicateReferences(object, state) {
      var objects = [], duplicatesIndexes = [], index, length;
      inspectNode(object, objects, duplicatesIndexes);
      for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
        state.duplicates.push(objects[duplicatesIndexes[index]]);
      }
      state.usedDuplicates = new Array(length);
    }
    function inspectNode(object, objects, duplicatesIndexes) {
      var objectKeyList, index, length;
      if (object !== null && typeof object === "object") {
        index = objects.indexOf(object);
        if (index !== -1) {
          if (duplicatesIndexes.indexOf(index) === -1) {
            duplicatesIndexes.push(index);
          }
        } else {
          objects.push(object);
          if (Array.isArray(object)) {
            for (index = 0, length = object.length; index < length; index += 1) {
              inspectNode(object[index], objects, duplicatesIndexes);
            }
          } else {
            objectKeyList = Object.keys(object);
            for (index = 0, length = objectKeyList.length; index < length; index += 1) {
              inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
            }
          }
        }
      }
    }
    function dump(input, options2) {
      options2 = options2 || {};
      var state = new State(options2);
      if (!state.noRefs) getDuplicateReferences(input, state);
      if (writeNode(state, 0, input, true, true)) return state.dump + "\n";
      return "";
    }
    function safeDump(input, options2) {
      return dump(input, common.extend({ schema: DEFAULT_SAFE_SCHEMA }, options2));
    }
    module2.exports.dump = dump;
    module2.exports.safeDump = safeDump;
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml.js
var require_js_yaml = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/lib/js-yaml.js"(exports2, module2) {
    "use strict";
    var loader = require_loader();
    var dumper = require_dumper();
    function deprecated(name) {
      return function() {
        throw new Error("Function " + name + " is deprecated and cannot be used.");
      };
    }
    module2.exports.Type = require_type();
    module2.exports.Schema = require_schema();
    module2.exports.FAILSAFE_SCHEMA = require_failsafe();
    module2.exports.JSON_SCHEMA = require_json();
    module2.exports.CORE_SCHEMA = require_core();
    module2.exports.DEFAULT_SAFE_SCHEMA = require_default_safe();
    module2.exports.DEFAULT_FULL_SCHEMA = require_default_full();
    module2.exports.load = loader.load;
    module2.exports.loadAll = loader.loadAll;
    module2.exports.safeLoad = loader.safeLoad;
    module2.exports.safeLoadAll = loader.safeLoadAll;
    module2.exports.dump = dumper.dump;
    module2.exports.safeDump = dumper.safeDump;
    module2.exports.YAMLException = require_exception();
    module2.exports.MINIMAL_SCHEMA = require_failsafe();
    module2.exports.SAFE_SCHEMA = require_default_safe();
    module2.exports.DEFAULT_SCHEMA = require_default_full();
    module2.exports.scan = deprecated("scan");
    module2.exports.parse = deprecated("parse");
    module2.exports.compose = deprecated("compose");
    module2.exports.addConstructor = deprecated("addConstructor");
  }
});

// ../../../node_modules/gray-matter/node_modules/js-yaml/index.js
var require_js_yaml2 = __commonJS({
  "../../../node_modules/gray-matter/node_modules/js-yaml/index.js"(exports2, module2) {
    "use strict";
    var yaml2 = require_js_yaml();
    module2.exports = yaml2;
  }
});

// ../../../node_modules/gray-matter/lib/engines.js
var require_engines = __commonJS({
  "../../../node_modules/gray-matter/lib/engines.js"(exports, module) {
    "use strict";
    var yaml = require_js_yaml2();
    var engines = exports = module.exports;
    engines.yaml = {
      parse: yaml.safeLoad.bind(yaml),
      stringify: yaml.safeDump.bind(yaml)
    };
    engines.json = {
      parse: JSON.parse.bind(JSON),
      stringify: function(obj, options2) {
        const opts = Object.assign({ replacer: null, space: 2 }, options2);
        return JSON.stringify(obj, opts.replacer, opts.space);
      }
    };
    engines.javascript = {
      parse: function parse(str, options, wrap) {
        try {
          if (wrap !== false) {
            str = "(function() {\nreturn " + str.trim() + ";\n}());";
          }
          return eval(str) || {};
        } catch (err) {
          if (wrap !== false && /(unexpected|identifier)/i.test(err.message)) {
            return parse(str, options, false);
          }
          throw new SyntaxError(err);
        }
      },
      stringify: function() {
        throw new Error("stringifying JavaScript is not supported");
      }
    };
  }
});

// ../../../node_modules/strip-bom-string/index.js
var require_strip_bom_string = __commonJS({
  "../../../node_modules/strip-bom-string/index.js"(exports2, module2) {
    "use strict";
    module2.exports = function(str2) {
      if (typeof str2 === "string" && str2.charAt(0) === "\uFEFF") {
        return str2.slice(1);
      }
      return str2;
    };
  }
});

// ../../../node_modules/gray-matter/lib/utils.js
var require_utils = __commonJS({
  "../../../node_modules/gray-matter/lib/utils.js"(exports2) {
    "use strict";
    var stripBom = require_strip_bom_string();
    var typeOf = require_kind_of();
    exports2.define = function(obj, key, val) {
      Reflect.defineProperty(obj, key, {
        enumerable: false,
        configurable: true,
        writable: true,
        value: val
      });
    };
    exports2.isBuffer = function(val) {
      return typeOf(val) === "buffer";
    };
    exports2.isObject = function(val) {
      return typeOf(val) === "object";
    };
    exports2.toBuffer = function(input) {
      return typeof input === "string" ? Buffer.from(input) : input;
    };
    exports2.toString = function(input) {
      if (exports2.isBuffer(input)) return stripBom(String(input));
      if (typeof input !== "string") {
        throw new TypeError("expected input to be a string or buffer");
      }
      return stripBom(input);
    };
    exports2.arrayify = function(val) {
      return val ? Array.isArray(val) ? val : [val] : [];
    };
    exports2.startsWith = function(str2, substr, len) {
      if (typeof len !== "number") len = substr.length;
      return str2.slice(0, len) === substr;
    };
  }
});

// ../../../node_modules/gray-matter/lib/defaults.js
var require_defaults = __commonJS({
  "../../../node_modules/gray-matter/lib/defaults.js"(exports2, module2) {
    "use strict";
    var engines2 = require_engines();
    var utils = require_utils();
    module2.exports = function(options2) {
      const opts = Object.assign({}, options2);
      opts.delimiters = utils.arrayify(opts.delims || opts.delimiters || "---");
      if (opts.delimiters.length === 1) {
        opts.delimiters.push(opts.delimiters[0]);
      }
      opts.language = (opts.language || opts.lang || "yaml").toLowerCase();
      opts.engines = Object.assign({}, engines2, opts.parsers, opts.engines);
      return opts;
    };
  }
});

// ../../../node_modules/gray-matter/lib/engine.js
var require_engine = __commonJS({
  "../../../node_modules/gray-matter/lib/engine.js"(exports2, module2) {
    "use strict";
    module2.exports = function(name, options2) {
      let engine = options2.engines[name] || options2.engines[aliase(name)];
      if (typeof engine === "undefined") {
        throw new Error('gray-matter engine "' + name + '" is not registered');
      }
      if (typeof engine === "function") {
        engine = { parse: engine };
      }
      return engine;
    };
    function aliase(name) {
      switch (name.toLowerCase()) {
        case "js":
        case "javascript":
          return "javascript";
        case "coffee":
        case "coffeescript":
        case "cson":
          return "coffee";
        case "yaml":
        case "yml":
          return "yaml";
        default: {
          return name;
        }
      }
    }
  }
});

// ../../../node_modules/gray-matter/lib/stringify.js
var require_stringify = __commonJS({
  "../../../node_modules/gray-matter/lib/stringify.js"(exports2, module2) {
    "use strict";
    var typeOf = require_kind_of();
    var getEngine = require_engine();
    var defaults = require_defaults();
    module2.exports = function(file, data, options2) {
      if (data == null && options2 == null) {
        switch (typeOf(file)) {
          case "object":
            data = file.data;
            options2 = {};
            break;
          case "string":
            return file;
          default: {
            throw new TypeError("expected file to be a string or object");
          }
        }
      }
      const str2 = file.content;
      const opts = defaults(options2);
      if (data == null) {
        if (!opts.data) return file;
        data = opts.data;
      }
      const language = file.language || opts.language;
      const engine = getEngine(language, opts);
      if (typeof engine.stringify !== "function") {
        throw new TypeError('expected "' + language + '.stringify" to be a function');
      }
      data = Object.assign({}, file.data, data);
      const open = opts.delimiters[0];
      const close = opts.delimiters[1];
      const matter2 = engine.stringify(data, options2).trim();
      let buf = "";
      if (matter2 !== "{}") {
        buf = newline(open) + newline(matter2) + newline(close);
      }
      if (typeof file.excerpt === "string" && file.excerpt !== "") {
        if (str2.indexOf(file.excerpt.trim()) === -1) {
          buf += newline(file.excerpt) + newline(close);
        }
      }
      return buf + newline(str2);
    };
    function newline(str2) {
      return str2.slice(-1) !== "\n" ? str2 + "\n" : str2;
    }
  }
});

// ../../../node_modules/gray-matter/lib/excerpt.js
var require_excerpt = __commonJS({
  "../../../node_modules/gray-matter/lib/excerpt.js"(exports2, module2) {
    "use strict";
    var defaults = require_defaults();
    module2.exports = function(file, options2) {
      const opts = defaults(options2);
      if (file.data == null) {
        file.data = {};
      }
      if (typeof opts.excerpt === "function") {
        return opts.excerpt(file, opts);
      }
      const sep = file.data.excerpt_separator || opts.excerpt_separator;
      if (sep == null && (opts.excerpt === false || opts.excerpt == null)) {
        return file;
      }
      const delimiter = typeof opts.excerpt === "string" ? opts.excerpt : sep || opts.delimiters[0];
      const idx = file.content.indexOf(delimiter);
      if (idx !== -1) {
        file.excerpt = file.content.slice(0, idx);
      }
      return file;
    };
  }
});

// ../../../node_modules/gray-matter/lib/to-file.js
var require_to_file = __commonJS({
  "../../../node_modules/gray-matter/lib/to-file.js"(exports2, module2) {
    "use strict";
    var typeOf = require_kind_of();
    var stringify = require_stringify();
    var utils = require_utils();
    module2.exports = function(file) {
      if (typeOf(file) !== "object") {
        file = { content: file };
      }
      if (typeOf(file.data) !== "object") {
        file.data = {};
      }
      if (file.contents && file.content == null) {
        file.content = file.contents;
      }
      utils.define(file, "orig", utils.toBuffer(file.content));
      utils.define(file, "language", file.language || "");
      utils.define(file, "matter", file.matter || "");
      utils.define(file, "stringify", function(data, options2) {
        if (options2 && options2.language) {
          file.language = options2.language;
        }
        return stringify(file, data, options2);
      });
      file.content = utils.toString(file.content);
      file.isEmpty = false;
      file.excerpt = "";
      return file;
    };
  }
});

// ../../../node_modules/gray-matter/lib/parse.js
var require_parse = __commonJS({
  "../../../node_modules/gray-matter/lib/parse.js"(exports2, module2) {
    "use strict";
    var getEngine = require_engine();
    var defaults = require_defaults();
    module2.exports = function(language, str2, options2) {
      const opts = defaults(options2);
      const engine = getEngine(language, opts);
      if (typeof engine.parse !== "function") {
        throw new TypeError('expected "' + language + '.parse" to be a function');
      }
      return engine.parse(str2, opts);
    };
  }
});

// ../../../node_modules/gray-matter/index.js
var require_gray_matter = __commonJS({
  "../../../node_modules/gray-matter/index.js"(exports2, module2) {
    "use strict";
    var fs = __require("fs");
    var sections = require_section_matter();
    var defaults = require_defaults();
    var stringify = require_stringify();
    var excerpt = require_excerpt();
    var engines2 = require_engines();
    var toFile = require_to_file();
    var parse2 = require_parse();
    var utils = require_utils();
    function matter2(input, options2) {
      if (input === "") {
        return { data: {}, content: input, excerpt: "", orig: input };
      }
      let file = toFile(input);
      const cached = matter2.cache[file.content];
      if (!options2) {
        if (cached) {
          file = Object.assign({}, cached);
          file.orig = cached.orig;
          return file;
        }
        matter2.cache[file.content] = file;
      }
      return parseMatter(file, options2);
    }
    function parseMatter(file, options2) {
      const opts = defaults(options2);
      const open = opts.delimiters[0];
      const close = "\n" + opts.delimiters[1];
      let str2 = file.content;
      if (opts.language) {
        file.language = opts.language;
      }
      const openLen = open.length;
      if (!utils.startsWith(str2, open, openLen)) {
        excerpt(file, opts);
        return file;
      }
      if (str2.charAt(openLen) === open.slice(-1)) {
        return file;
      }
      str2 = str2.slice(openLen);
      const len = str2.length;
      const language = matter2.language(str2, opts);
      if (language.name) {
        file.language = language.name;
        str2 = str2.slice(language.raw.length);
      }
      let closeIndex = str2.indexOf(close);
      if (closeIndex === -1) {
        closeIndex = len;
      }
      file.matter = str2.slice(0, closeIndex);
      const block = file.matter.replace(/^\s*#[^\n]+/gm, "").trim();
      if (block === "") {
        file.isEmpty = true;
        file.empty = file.content;
        file.data = {};
      } else {
        file.data = parse2(file.language, file.matter, opts);
      }
      if (closeIndex === len) {
        file.content = "";
      } else {
        file.content = str2.slice(closeIndex + close.length);
        if (file.content[0] === "\r") {
          file.content = file.content.slice(1);
        }
        if (file.content[0] === "\n") {
          file.content = file.content.slice(1);
        }
      }
      excerpt(file, opts);
      if (opts.sections === true || typeof opts.section === "function") {
        sections(file, opts.section);
      }
      return file;
    }
    matter2.engines = engines2;
    matter2.stringify = function(file, data, options2) {
      if (typeof file === "string") file = matter2(file, options2);
      return stringify(file, data, options2);
    };
    matter2.read = function(filepath, options2) {
      const str2 = fs.readFileSync(filepath, "utf8");
      const file = matter2(str2, options2);
      file.path = filepath;
      return file;
    };
    matter2.test = function(str2, options2) {
      return utils.startsWith(str2, defaults(options2).delimiters[0]);
    };
    matter2.language = function(str2, options2) {
      const opts = defaults(options2);
      const open = opts.delimiters[0];
      if (matter2.test(str2)) {
        str2 = str2.slice(open.length);
      }
      const language = str2.slice(0, str2.search(/\r?\n/));
      return {
        raw: language,
        name: language ? language.trim() : ""
      };
    };
    matter2.cache = {};
    matter2.clearCache = function() {
      matter2.cache = {};
    };
    module2.exports = matter2;
  }
});

// src/validators/note-validator.ts
import { readFileSync as readFileSync3 } from "node:fs";

// ../sdk/src/config/factories/type-hooks.ts
function defineTypeValidator(config, handler) {
  const fn = async (request, context) => {
    return await Promise.resolve(handler(request, context));
  };
  return Object.assign(fn, {
    factoryType: "typeValidator",
    typeName: config.typeName,
    timeout: config.timeout,
    sourcePath: config.sourcePath,
    schema: config.schema,
    description: config.description
  });
}

// ../sdk/src/config/env.ts
import { readFileSync } from "node:fs";
var CARDS_ENV_VARS = {
  /**
   * Unique identifier for the current card.
   * Available in all actions and type hooks.
   */
  CARD_ID: "CARD_ID",
  /**
   * The environment name from settings.json.
   * Available in all actions and type hooks.
   */
  ENVIRONMENT: "ENVIRONMENT",
  /**
   * Display name of the action button that triggered this handler.
   * Available in actions only (not type hooks).
   */
  ACTION_NAME: "ACTION_NAME",
  /**
   * Card's execution mode, determining UI interaction model.
   * Available in actions only (not type hooks).
   * Valid values: 'interactive' | 'background'
   */
  EXECUTION_MODE: "EXECUTION_MODE",
  /**
   * Cards server base URL for API calls.
   * Available in all actions and type hooks.
   */
  API_BASE_URL: "API_BASE_URL",
  /**
   * Authentication token for API calls.
   * Available in all actions and type hooks.
   */
  API_ACCESS_TOKEN: "API_ACCESS_TOKEN",
  /**
   * Configured coding agent identifier from cards.codingAgent setting.
   * Available in actions only (not type hooks).
   * Optional.
   */
  CODING_AGENT: "CODING_AGENT",
  /**
   * The registered type name.
   * Available in type hooks only.
   */
  TYPE_NAME: "TYPE_NAME",
  /**
   * The type's version string from settings.json configuration.
   * Available in type hooks only.
   */
  TYPE_VERSION: "TYPE_VERSION",
  /**
   * The file name within the type directory.
   * Available in type hooks only.
   */
  FILE_NAME: "FILE_NAME",
  /**
   * Full path to the file.
   * Available in type hooks only.
   */
  FILE_PATH: "FILE_PATH",
  /**
   * File size in bytes.
   * Available in type hooks only.
   */
  FILE_SIZE: "FILE_SIZE",
  /**
   * SHA256 hash of content.
   * Available in type hooks only.
   */
  SHA256: "SHA256",
  /**
   * MIME type of the content.
   * Available in type hooks only.
   */
  CONTENT_TYPE: "CONTENT_TYPE",
  /**
   * Path to the VS Code bundled Node.js interpreter.
   *
   * Set by the extension host from `process.execPath` (with
   * `ELECTRON_RUN_AS_NODE=1`). Commands in settings.json use
   * `$VSCODE_NODE ./bin/...` so they work regardless of
   * whether `node` is on the system PATH.
   *
   * Available in all actions and type hooks.
   */
  VSCODE_NODE: "VSCODE_NODE",
  /**
   * Path to the Node.js interpreter running the wrapper process.
   *
   * Set by the wrapper from `process.execPath`. Use `$NODE` in embedded
   * bash statements to invoke Node scripts portably.
   *
   * Available in all actions.
   */
  NODE: "NODE",
  /**
   * Path to the Unix domain socket for runtime-to-dispatcher communication.
   * Available in actions only.
   */
  SOCKET_PATH: "SOCKET_PATH",
  /**
   * Path to a JSON file containing switchToInteractive data from a previous handler.
   * Available in actions only. Optional.
   */
  SWITCH_TO_INTERACTIVE_DATA_PATH: "SWITCH_TO_INTERACTIVE_DATA_PATH",
  /**
   * Path to the settings configuration directory.
   * Available in actions only.
   */
  CONFIG_PATH: "CONFIG_PATH",
  /**
   * Path to the VS Code workspace root directory.
   * Set by the action handler (e.g., launch.ts) to the worktree path.
   * Available in hooks running inside the claude CLI.
   */
  WORKSPACE_PATH: "WORKSPACE_PATH",
  /**
   * Absolute path to the main git repository root (NOT a worktree).
   * Set by ActionDispatcher; consumed by the wrapper and watcher for
   * git operations (worktree removal, branch deletion) that must run
   * against the main repository.
   */
  REPO_ROOT: "REPO_ROOT",
  /**
   * Path to the card's repository directory.
   * Available in actions only.
   */
  CARD_REPO_PATH: "CARD_REPO_PATH",
  /**
   * Resolved shell command for the wrapper to spawn as the action handler.
   * Set by ActionDispatcher; consumed by the wrapper (not by action handlers).
   */
  ACTION_COMMAND: "ACTION_COMMAND",
  /**
   * Git branch that the card's workspace branch will merge into.
   * Resolved from the workspace HEAD at launch time.
   * Set by the launch action.
   * Available in actions only.
   */
  BASE_BRANCH: "BASE_BRANCH",
  /**
   * Git branch from which the card's workspace branch was created.
   * May differ from BASE_BRANCH when the worktree was created against
   * a different ref than the current workspace HEAD.
   * Set by the launch action.
   * Available in actions only.
   */
  PARENT_BRANCH: "PARENT_BRANCH",
  /**
   * Git branch name for the card's workspace implementation.
   * Set by the launch action after resolving or creating the worktree.
   * Available in actions only.
   */
  WORKSPACE_BRANCH: "WORKSPACE_BRANCH",
  /**
   * Session ID persisted by the session-start hook via `persistEnvVar`.
   *
   * Available in Bash tool shell descendants (commands, git hooks) after
   * session start. NOT available in hooks spawned directly by Claude Code
   * (stop, session-end, etc.) — those receive the session ID via hook input.
   *
   * The card-repo post-commit hook reads this to record commits directly
   * without needing a process-tree walk or PID registry lookup.
   */
  CARDS_SESSION_ID: "CARDS_SESSION_ID",
  /**
   * Absolute path to the VS Code extension installation directory.
   *
   * Set by the extension host from `context.extensionUri.fsPath` and injected
   * into all spawned action processes. Use this to locate bundled assets such
   * as the runtime plugin directory (`<extensionPath>/dist/plugins/runtime`).
   *
   * Available in actions only (not type hooks).
   */
  EXTENSION_PATH: "EXTENSION_PATH"
};
function getCardId() {
  const value = process.env[CARDS_ENV_VARS.CARD_ID];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.CARD_ID}`);
  }
  return value;
}
function getEnvironment() {
  const value = process.env[CARDS_ENV_VARS.ENVIRONMENT];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.ENVIRONMENT}`);
  }
  return value;
}
function getApiBaseUrl() {
  const value = process.env[CARDS_ENV_VARS.API_BASE_URL];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.API_BASE_URL}`);
  }
  return value;
}
function getApiAccessToken() {
  const value = process.env[CARDS_ENV_VARS.API_ACCESS_TOKEN];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.API_ACCESS_TOKEN}`);
  }
  return value;
}
function getTypeName() {
  const value = process.env[CARDS_ENV_VARS.TYPE_NAME];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.TYPE_NAME}`);
  }
  return value;
}
function getTypeVersion() {
  const value = process.env[CARDS_ENV_VARS.TYPE_VERSION];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.TYPE_VERSION}`);
  }
  return value;
}
function getFileName() {
  const value = process.env[CARDS_ENV_VARS.FILE_NAME];
  if (value === void 0 || value === "") {
    throw new Error(`Missing required environment variable: ${CARDS_ENV_VARS.FILE_NAME}`);
  }
  return value;
}

// ../sdk/src/config/logger.ts
import { closeSync, existsSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";
var LOG_LEVELS = ["debug", "info", "warn", "error"];
var Logger = class {
  /**
   * Registered event handlers by log level.
   */
  handlers = /* @__PURE__ */ new Map();
  /**
   * File descriptor for log file output.
   * Lazily initialized on first write.
   */
  logFileFd = null;
  /**
   * Path to the log file, if configured.
   */
  logFilePath = null;
  /**
   * Whether file initialization has been attempted.
   */
  fileInitialized = false;
  /**
   * Current hook context for enriching log events.
   */
  currentHookType;
  /**
   * Current hook input for enriching log events.
   */
  currentInput;
  /**
   * Creates a new Logger instance.
   *
   * Typically you should use the exported `logger` singleton rather than
   * creating new instances.
   * @param config - Optional configuration
   * @example
   * ```typescript
   * // Use singleton (recommended)
   * import { logger } from '@cards/sdk/config';
   *
   * // Or create custom instance
   * const customLogger = new Logger({ logFilePath: '/var/log/hooks.log' });
   * ```
   */
  constructor(config = {}) {
    for (const level of LOG_LEVELS) {
      this.handlers.set(level, /* @__PURE__ */ new Set());
    }
    this.logFilePath = config.logFilePath ?? process.env["CARDS_HOOKS_LOG_FILE"] ?? null;
  }
  /**
   * Logs a debug message.
   *
   * Use for detailed debugging information that is typically only useful
   * during development or troubleshooting.
   * @param message - Diagnostic text describing low-level execution details.
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * logger.debug('Processing hook input', { taskId: 'task-123', inputSize: 256 });
   * ```
   */
  debug(message, context) {
    this.emit("debug", message, context);
  }
  /**
   * Logs an info message.
   *
   * Use for general operational events like hook invocations, successful
   * completions, or state changes.
   * @param message - Operational message describing normal hook progress.
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * logger.info('Task started', { taskId: 'task-123', cardId: 'card-456' });
   * ```
   */
  info(message, context) {
    this.emit("info", message, context);
  }
  /**
   * Logs a warning message.
   *
   * Use for conditions that may indicate cards but don't prevent
   * operation, such as deprecated patterns or performance concerns.
   * @param message - Warning text for recoverable or suspicious conditions.
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * logger.warn('Deprecated hook pattern detected', { pattern: 'legacyMatcher' });
   * ```
   */
  warn(message, context) {
    this.emit("warn", message, context);
  }
  /**
   * Logs an error message.
   *
   * Use for error conditions that require attention but were handled
   * gracefully. For exceptions, prefer {@link logError}.
   * @param message - Error text describing a handled failure condition.
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * logger.error('Failed to validate hook input', { reason: 'empty taskId' });
   * ```
   */
  error(message, context) {
    this.emit("error", message, context);
  }
  /**
   * Logs a structured error with full error details.
   *
   * Use this for caught exceptions. Non-Error values are normalized so handlers
   * always receive a consistent error shape.
   * @param error - The error to log
   * @param message - Human-readable description of what failed
   * @param context - Optional structured metadata merged into the emitted event.
   * @example
   * ```typescript
   * try {
   *   await dangerousOperation();
   * } catch (err) {
   *   logger.logError(err, 'Failed to execute dangerous operation', {
   *     operation: 'delete',
   *     target: '/important/file.txt'
   *   });
   * }
   * ```
   */
  logError(error, message, context) {
    const errorInfo = this.extractErrorInfo(error);
    const event = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level: "error",
      hookType: this.currentHookType,
      message,
      input: this.currentInput,
      error: errorInfo,
      context
    };
    this.deliverEvent(event);
  }
  /**
   * Subscribes a handler to log events at the specified level.
   *
   * The handler will be called for every log event at the specified level.
   * Returns an unsubscribe function that should be called when the handler
   * is no longer needed. Handler errors are ignored to avoid disrupting hooks.
   * @param level - The log level to subscribe to
   * @param handler - The handler function to call for each event
   * @returns A function to unsubscribe the handler
   * @example
   * ```typescript
   * // Subscribe to error events
   * const unsubscribe = logger.on('error', (event) => {
   *   console.error(`[${event.hookType}] ${event.message}`);
   *   if (event.error) {
   *     console.error(event.error.stack);
   *   }
   * });
   *
   * // Later, clean up
   * unsubscribe();
   * ```
   * @example
   * ```typescript
   * // Forward to external logging library
   * import pino from 'pino';
   * const pinoLogger = pino();
   *
   * logger.on('info', (event) => pinoLogger.info(event, event.message));
   * logger.on('warn', (event) => pinoLogger.warn(event, event.message));
   * logger.on('error', (event) => pinoLogger.error(event, event.message));
   * ```
   */
  on(level, handler) {
    const levelHandlers = this.handlers.get(level);
    if (levelHandlers) {
      levelHandlers.add(handler);
    }
    return () => {
      levelHandlers?.delete(handler);
    };
  }
  /**
   * Sets the current hook context for enriching log events.
   *
   * This is called internally by the runtime before invoking hook handlers.
   * You typically don't need to call this directly.
   * @param hookType - The type of hook being executed
   * @param input - The hook input data
   * @internal
   */
  setContext(hookType, input) {
    this.currentHookType = hookType;
    this.currentInput = input;
  }
  /**
   * Clears the current hook context.
   *
   * Called internally by the runtime after hook execution completes.
   * @internal
   */
  clearContext() {
    this.currentHookType = void 0;
    this.currentInput = void 0;
  }
  /**
   * Sets a default log file path that only takes effect if no other source
   * has configured file logging.
   *
   * This is the lowest-priority file path source. It will be ignored if
   * any of these have already set a path:
   * - `logFilePath` in the constructor config
   * - `CARDS_HOOKS_LOG_FILE` environment variable
   * - {@link setLogFile} called at runtime
   *
   * Intended for use by CLI entry points (e.g., the `--log` flag).
   * @param filePath - Default path to the log file
   * @example
   * ```typescript
   * // Wire --log CLI argument as a fallback
   * if (args.log) {
   *   logger.setDefaultLogFile(args.log);
   * }
   * ```
   */
  setDefaultLogFile(filePath) {
    if (this.logFilePath === null) {
      this.logFilePath = filePath;
      this.fileInitialized = false;
    }
  }
  /**
   * Configures the log file path at runtime.
   *
   * Call this to enable or change file logging. Setting to `null` disables
   * file logging and closes any open file handle. Directories are created
   * on demand when the first write occurs.
   * @param filePath - Path to the log file, or null to disable
   * @example
   * ```typescript
   * // Enable file logging at runtime
   * logger.setLogFile('/var/log/cards-sdk.log');
   *
   * // Disable file logging
   * logger.setLogFile(null);
   * ```
   */
  setLogFile(filePath) {
    if (this.logFileFd !== null) {
      try {
        closeSync(this.logFileFd);
      } catch {
      }
      this.logFileFd = null;
    }
    this.logFilePath = filePath;
    this.fileInitialized = false;
  }
  /**
   * Closes all resources held by the logger.
   *
   * Call this during graceful shutdown to ensure all log data is flushed.
   * Safe to call multiple times.
   * @example
   * ```typescript
   * process.on('exit', () => {
   *   logger.close();
   * });
   * ```
   */
  close() {
    if (this.logFileFd !== null) {
      try {
        closeSync(this.logFileFd);
      } catch {
      }
      this.logFileFd = null;
    }
    this.fileInitialized = false;
  }
  /**
   * Checks if there are any active handlers or destinations.
   *
   * Returns true if any handlers are registered or file logging is enabled.
   * Useful for deciding whether to compute expensive log context.
   * @returns Whether the logger has any active output destinations
   */
  hasDestinations() {
    const hasHandlers = Array.from(this.handlers.values()).some((handlers) => handlers.size > 0);
    return hasHandlers || this.logFilePath !== null;
  }
  // ============================================================================
  // Private Methods
  // ============================================================================
  /**
   * Emits a log event.
   * @param level - The severity level of the event
   * @param message - The log message
   * @param context - Optional additional context data
   */
  emit(level, message, context) {
    const event = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      hookType: this.currentHookType,
      message,
      input: this.currentInput,
      context
    };
    this.deliverEvent(event);
  }
  /**
   * Delivers an event to all registered destinations.
   * @param event - The log event to deliver
   */
  deliverEvent(event) {
    const levelHandlers = this.handlers.get(event.level);
    if (levelHandlers) {
      for (const handler of levelHandlers) {
        try {
          handler(event);
        } catch {
        }
      }
    }
    this.writeToFile(event);
  }
  /**
   * Writes an event to the log file.
   * @param event - The log event to write
   */
  writeToFile(event) {
    if (!this.logFilePath) return;
    if (!this.fileInitialized) {
      this.initializeFile();
    }
    if (this.logFileFd === null) return;
    try {
      const line = `${JSON.stringify(event)}
`;
      writeSync(this.logFileFd, line);
    } catch {
    }
  }
  /**
   * Initializes the log file for writing.
   */
  initializeFile() {
    this.fileInitialized = true;
    if (!this.logFilePath) return;
    try {
      const dir = dirname(this.logFilePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      this.logFileFd = openSync(this.logFilePath, "a");
    } catch {
      this.logFileFd = null;
    }
  }
  /**
   * Extracts structured error information from an unknown error.
   * @param error - The error to extract information from
   * @returns Structured error information
   */
  extractErrorInfo(error) {
    if (error instanceof Error) {
      const info = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
      if (error.cause !== void 0) {
        info.cause = this.extractErrorInfo(error.cause);
      }
      return info;
    }
    return {
      name: "UnknownError",
      message: String(error)
    };
  }
};
var logger = new Logger();

// ../sdk/src/config/validation.ts
import { readFileSync as readFileSync2 } from "node:fs";
function validationSuccess(metadata) {
  if (metadata !== void 0) {
    return { valid: true, metadata };
  }
  return { valid: true };
}
function validationError(errors) {
  return { valid: false, errors };
}
async function executeValidation(validation) {
  const logger2 = new Logger();
  try {
    const filePath = process.env[CARDS_ENV_VARS.FILE_PATH];
    if (!filePath) {
      process.stdout.write(JSON.stringify({ valid: false, errors: ["FILE_PATH environment variable is not set"] }));
      return process.exit(0);
    }
    let metadata;
    try {
      const sidecarContent = readFileSync2(`${filePath}.meta.json`, "utf-8");
      metadata = JSON.parse(sidecarContent);
    } catch {
    }
    const request = {
      filePath,
      metadata
    };
    const context = {
      logger: logger2,
      cwd: process.cwd(),
      typeName: getTypeName(),
      typeVersion: getTypeVersion(),
      fileName: getFileName(),
      cardId: getCardId(),
      environment: getEnvironment(),
      apiBaseUrl: getApiBaseUrl(),
      apiAccessToken: getApiAccessToken()
    };
    const result = await validation(request, context);
    process.stdout.write(JSON.stringify(result));
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger2.error("Validation error", { error: errorMessage });
    process.stdout.write(JSON.stringify({ valid: false, errors: [errorMessage] }));
    process.exit(0);
  }
}

// src/validators/note-validator.ts
var import_gray_matter = __toESM(require_gray_matter(), 1);
var FRONTMATTER_REGEX = /^---\r?\n[\s\S]*?\r?\n---/;
function validateRequiredField(frontmatter, fieldName) {
  const value = frontmatter[fieldName];
  if (value === void 0 || value === null) {
    return { code: "REQUIRED", message: `Field "${fieldName}" is required`, field: fieldName };
  }
  if (typeof value !== "string") {
    return { code: "INVALID_TYPE", message: `Field "${fieldName}" must be a string`, field: fieldName };
  }
  if (value.trim() === "") {
    return { code: "EMPTY", message: `Field "${fieldName}" cannot be empty`, field: fieldName };
  }
  return null;
}
var note_validator_default = defineTypeValidator(
  {
    typeName: "note",
    schema: "YAML frontmatter (id, author, title) followed by markdown body",
    description: "Markdown notes with structured YAML frontmatter metadata",
    timeout: 3e4
  },
  async (request, context) => {
    const errors = [];
    context.logger.info("Validating note", { fileName: context.fileName });
    const content = readFileSync3(request.filePath, "utf-8");
    if (!FRONTMATTER_REGEX.test(content)) {
      return validationError(["Note must have YAML frontmatter"]);
    }
    let parsed;
    try {
      parsed = (0, import_gray_matter.default)(content);
    } catch (error) {
      context.logger.error("Failed to parse frontmatter", { error });
      return validationError(["Invalid YAML in frontmatter"]);
    }
    const frontmatter = parsed.data;
    const requiredFields = ["id", "author", "title"];
    for (const field of requiredFields) {
      const error = validateRequiredField(frontmatter, field);
      if (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      context.logger.warn("Note validation failed", { errorCount: errors.length });
      return validationError(errors.map((e) => e.field ? `**${e.field}**: ${e.message}` : e.message));
    }
    context.logger.info("Note validation succeeded", {
      noteId: frontmatter["id"],
      author: frontmatter["author"],
      title: frontmatter["title"]
    });
    return validationSuccess({ noteId: frontmatter["id"] });
  }
);

// src/validators/hook-wrapper.ts
executeValidation(note_validator_default);
/*! Bundled license information:

is-extendable/index.js:
  (*!
   * is-extendable <https://github.com/jonschlinkert/is-extendable>
   *
   * Copyright (c) 2015, Jon Schlinkert.
   * Licensed under the MIT License.
   *)

strip-bom-string/index.js:
  (*!
   * strip-bom-string <https://github.com/jonschlinkert/strip-bom-string>
   *
   * Copyright (c) 2015, 2017, Jon Schlinkert.
   * Released under the MIT License.
   *)
*/
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2tpbmQtb2YvaW5kZXguanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2lzLWV4dGVuZGFibGUvaW5kZXguanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2V4dGVuZC1zaGFsbG93L2luZGV4LmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9zZWN0aW9uLW1hdHRlci9pbmRleC5qcyIsICIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ3JheS1tYXR0ZXIvbm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvY29tbW9uLmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ncmF5LW1hdHRlci9ub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC9leGNlcHRpb24uanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL25vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL21hcmsuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL25vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3R5cGUuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL25vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3NjaGVtYS5qcyIsICIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ3JheS1tYXR0ZXIvbm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvdHlwZS9zdHIuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL25vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3R5cGUvc2VxLmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ncmF5LW1hdHRlci9ub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC90eXBlL21hcC5qcyIsICIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ3JheS1tYXR0ZXIvbm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvc2NoZW1hL2ZhaWxzYWZlLmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ncmF5LW1hdHRlci9ub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC90eXBlL251bGwuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL25vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3R5cGUvYm9vbC5qcyIsICIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ3JheS1tYXR0ZXIvbm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvdHlwZS9pbnQuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL25vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3R5cGUvZmxvYXQuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL25vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3NjaGVtYS9qc29uLmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ncmF5LW1hdHRlci9ub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC9zY2hlbWEvY29yZS5qcyIsICIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ3JheS1tYXR0ZXIvbm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvdHlwZS90aW1lc3RhbXAuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL25vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3R5cGUvbWVyZ2UuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL25vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3R5cGUvYmluYXJ5LmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ncmF5LW1hdHRlci9ub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC90eXBlL29tYXAuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL25vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3R5cGUvcGFpcnMuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL25vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3R5cGUvc2V0LmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ncmF5LW1hdHRlci9ub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC9zY2hlbWEvZGVmYXVsdF9zYWZlLmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ncmF5LW1hdHRlci9ub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC90eXBlL2pzL3VuZGVmaW5lZC5qcyIsICIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ3JheS1tYXR0ZXIvbm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvdHlwZS9qcy9yZWdleHAuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL25vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3R5cGUvanMvZnVuY3Rpb24uanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL25vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL3NjaGVtYS9kZWZhdWx0X2Z1bGwuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL25vZGVfbW9kdWxlcy9qcy15YW1sL2xpYi9qcy15YW1sL2xvYWRlci5qcyIsICIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ3JheS1tYXR0ZXIvbm9kZV9tb2R1bGVzL2pzLXlhbWwvbGliL2pzLXlhbWwvZHVtcGVyLmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ncmF5LW1hdHRlci9ub2RlX21vZHVsZXMvanMteWFtbC9saWIvanMteWFtbC5qcyIsICIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ3JheS1tYXR0ZXIvbm9kZV9tb2R1bGVzL2pzLXlhbWwvaW5kZXguanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL2xpYi9lbmdpbmVzLmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9zdHJpcC1ib20tc3RyaW5nL2luZGV4LmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ncmF5LW1hdHRlci9saWIvdXRpbHMuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL2xpYi9kZWZhdWx0cy5qcyIsICIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ3JheS1tYXR0ZXIvbGliL2VuZ2luZS5qcyIsICIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ3JheS1tYXR0ZXIvbGliL3N0cmluZ2lmeS5qcyIsICIuLi8uLi8uLi8uLi8uLi9ub2RlX21vZHVsZXMvZ3JheS1tYXR0ZXIvbGliL2V4Y2VycHQuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL2xpYi90by1maWxlLmpzIiwgIi4uLy4uLy4uLy4uLy4uL25vZGVfbW9kdWxlcy9ncmF5LW1hdHRlci9saWIvcGFyc2UuanMiLCAiLi4vLi4vLi4vLi4vLi4vbm9kZV9tb2R1bGVzL2dyYXktbWF0dGVyL2luZGV4LmpzIiwgIi4uLy4uL3NyYy92YWxpZGF0b3JzL25vdGUtdmFsaWRhdG9yLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2ZhY3Rvcmllcy90eXBlLWhvb2tzLnRzIiwgIi4uLy4uLy4uL3Nkay9zcmMvY29uZmlnL2Vudi50cyIsICIuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy9sb2dnZXIudHMiLCAiLi4vLi4vLi4vc2RrL3NyYy9jb25maWcvdmFsaWRhdGlvbi50cyIsICIuLi8uLi9zcmMvdmFsaWRhdG9ycy9ob29rLXdyYXBwZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbInZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ga2luZE9mKHZhbCkge1xuICBpZiAodmFsID09PSB2b2lkIDApIHJldHVybiAndW5kZWZpbmVkJztcbiAgaWYgKHZhbCA9PT0gbnVsbCkgcmV0dXJuICdudWxsJztcblxuICB2YXIgdHlwZSA9IHR5cGVvZiB2YWw7XG4gIGlmICh0eXBlID09PSAnYm9vbGVhbicpIHJldHVybiAnYm9vbGVhbic7XG4gIGlmICh0eXBlID09PSAnc3RyaW5nJykgcmV0dXJuICdzdHJpbmcnO1xuICBpZiAodHlwZSA9PT0gJ251bWJlcicpIHJldHVybiAnbnVtYmVyJztcbiAgaWYgKHR5cGUgPT09ICdzeW1ib2wnKSByZXR1cm4gJ3N5bWJvbCc7XG4gIGlmICh0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGlzR2VuZXJhdG9yRm4odmFsKSA/ICdnZW5lcmF0b3JmdW5jdGlvbicgOiAnZnVuY3Rpb24nO1xuICB9XG5cbiAgaWYgKGlzQXJyYXkodmFsKSkgcmV0dXJuICdhcnJheSc7XG4gIGlmIChpc0J1ZmZlcih2YWwpKSByZXR1cm4gJ2J1ZmZlcic7XG4gIGlmIChpc0FyZ3VtZW50cyh2YWwpKSByZXR1cm4gJ2FyZ3VtZW50cyc7XG4gIGlmIChpc0RhdGUodmFsKSkgcmV0dXJuICdkYXRlJztcbiAgaWYgKGlzRXJyb3IodmFsKSkgcmV0dXJuICdlcnJvcic7XG4gIGlmIChpc1JlZ2V4cCh2YWwpKSByZXR1cm4gJ3JlZ2V4cCc7XG5cbiAgc3dpdGNoIChjdG9yTmFtZSh2YWwpKSB7XG4gICAgY2FzZSAnU3ltYm9sJzogcmV0dXJuICdzeW1ib2wnO1xuICAgIGNhc2UgJ1Byb21pc2UnOiByZXR1cm4gJ3Byb21pc2UnO1xuXG4gICAgLy8gU2V0LCBNYXAsIFdlYWtTZXQsIFdlYWtNYXBcbiAgICBjYXNlICdXZWFrTWFwJzogcmV0dXJuICd3ZWFrbWFwJztcbiAgICBjYXNlICdXZWFrU2V0JzogcmV0dXJuICd3ZWFrc2V0JztcbiAgICBjYXNlICdNYXAnOiByZXR1cm4gJ21hcCc7XG4gICAgY2FzZSAnU2V0JzogcmV0dXJuICdzZXQnO1xuXG4gICAgLy8gOC1iaXQgdHlwZWQgYXJyYXlzXG4gICAgY2FzZSAnSW50OEFycmF5JzogcmV0dXJuICdpbnQ4YXJyYXknO1xuICAgIGNhc2UgJ1VpbnQ4QXJyYXknOiByZXR1cm4gJ3VpbnQ4YXJyYXknO1xuICAgIGNhc2UgJ1VpbnQ4Q2xhbXBlZEFycmF5JzogcmV0dXJuICd1aW50OGNsYW1wZWRhcnJheSc7XG5cbiAgICAvLyAxNi1iaXQgdHlwZWQgYXJyYXlzXG4gICAgY2FzZSAnSW50MTZBcnJheSc6IHJldHVybiAnaW50MTZhcnJheSc7XG4gICAgY2FzZSAnVWludDE2QXJyYXknOiByZXR1cm4gJ3VpbnQxNmFycmF5JztcblxuICAgIC8vIDMyLWJpdCB0eXBlZCBhcnJheXNcbiAgICBjYXNlICdJbnQzMkFycmF5JzogcmV0dXJuICdpbnQzMmFycmF5JztcbiAgICBjYXNlICdVaW50MzJBcnJheSc6IHJldHVybiAndWludDMyYXJyYXknO1xuICAgIGNhc2UgJ0Zsb2F0MzJBcnJheSc6IHJldHVybiAnZmxvYXQzMmFycmF5JztcbiAgICBjYXNlICdGbG9hdDY0QXJyYXknOiByZXR1cm4gJ2Zsb2F0NjRhcnJheSc7XG4gIH1cblxuICBpZiAoaXNHZW5lcmF0b3JPYmoodmFsKSkge1xuICAgIHJldHVybiAnZ2VuZXJhdG9yJztcbiAgfVxuXG4gIC8vIE5vbi1wbGFpbiBvYmplY3RzXG4gIHR5cGUgPSB0b1N0cmluZy5jYWxsKHZhbCk7XG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgJ1tvYmplY3QgT2JqZWN0XSc6IHJldHVybiAnb2JqZWN0JztcbiAgICAvLyBpdGVyYXRvcnNcbiAgICBjYXNlICdbb2JqZWN0IE1hcCBJdGVyYXRvcl0nOiByZXR1cm4gJ21hcGl0ZXJhdG9yJztcbiAgICBjYXNlICdbb2JqZWN0IFNldCBJdGVyYXRvcl0nOiByZXR1cm4gJ3NldGl0ZXJhdG9yJztcbiAgICBjYXNlICdbb2JqZWN0IFN0cmluZyBJdGVyYXRvcl0nOiByZXR1cm4gJ3N0cmluZ2l0ZXJhdG9yJztcbiAgICBjYXNlICdbb2JqZWN0IEFycmF5IEl0ZXJhdG9yXSc6IHJldHVybiAnYXJyYXlpdGVyYXRvcic7XG4gIH1cblxuICAvLyBvdGhlclxuICByZXR1cm4gdHlwZS5zbGljZSg4LCAtMSkudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9cXHMvZywgJycpO1xufTtcblxuZnVuY3Rpb24gY3Rvck5hbWUodmFsKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsLmNvbnN0cnVjdG9yID09PSAnZnVuY3Rpb24nID8gdmFsLmNvbnN0cnVjdG9yLm5hbWUgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5KHZhbCkge1xuICBpZiAoQXJyYXkuaXNBcnJheSkgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsKTtcbiAgcmV0dXJuIHZhbCBpbnN0YW5jZW9mIEFycmF5O1xufVxuXG5mdW5jdGlvbiBpc0Vycm9yKHZhbCkge1xuICByZXR1cm4gdmFsIGluc3RhbmNlb2YgRXJyb3IgfHwgKHR5cGVvZiB2YWwubWVzc2FnZSA9PT0gJ3N0cmluZycgJiYgdmFsLmNvbnN0cnVjdG9yICYmIHR5cGVvZiB2YWwuY29uc3RydWN0b3Iuc3RhY2tUcmFjZUxpbWl0ID09PSAnbnVtYmVyJyk7XG59XG5cbmZ1bmN0aW9uIGlzRGF0ZSh2YWwpIHtcbiAgaWYgKHZhbCBpbnN0YW5jZW9mIERhdGUpIHJldHVybiB0cnVlO1xuICByZXR1cm4gdHlwZW9mIHZhbC50b0RhdGVTdHJpbmcgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgdmFsLmdldERhdGUgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgdmFsLnNldERhdGUgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzUmVnZXhwKHZhbCkge1xuICBpZiAodmFsIGluc3RhbmNlb2YgUmVnRXhwKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIHR5cGVvZiB2YWwuZmxhZ3MgPT09ICdzdHJpbmcnXG4gICAgJiYgdHlwZW9mIHZhbC5pZ25vcmVDYXNlID09PSAnYm9vbGVhbidcbiAgICAmJiB0eXBlb2YgdmFsLm11bHRpbGluZSA9PT0gJ2Jvb2xlYW4nXG4gICAgJiYgdHlwZW9mIHZhbC5nbG9iYWwgPT09ICdib29sZWFuJztcbn1cblxuZnVuY3Rpb24gaXNHZW5lcmF0b3JGbihuYW1lLCB2YWwpIHtcbiAgcmV0dXJuIGN0b3JOYW1lKG5hbWUpID09PSAnR2VuZXJhdG9yRnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc0dlbmVyYXRvck9iaih2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWwudGhyb3cgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgdmFsLnJldHVybiA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiB2YWwubmV4dCA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNBcmd1bWVudHModmFsKSB7XG4gIHRyeSB7XG4gICAgaWYgKHR5cGVvZiB2YWwubGVuZ3RoID09PSAnbnVtYmVyJyAmJiB0eXBlb2YgdmFsLmNhbGxlZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoZXJyLm1lc3NhZ2UuaW5kZXhPZignY2FsbGVlJykgIT09IC0xKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIElmIHlvdSBuZWVkIHRvIHN1cHBvcnQgU2FmYXJpIDUtNyAoOC0xMCB5ci1vbGQgYnJvd3NlciksXG4gKiB0YWtlIGEgbG9vayBhdCBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2lzLWJ1ZmZlclxuICovXG5cbmZ1bmN0aW9uIGlzQnVmZmVyKHZhbCkge1xuICBpZiAodmFsLmNvbnN0cnVjdG9yICYmIHR5cGVvZiB2YWwuY29uc3RydWN0b3IuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gdmFsLmNvbnN0cnVjdG9yLmlzQnVmZmVyKHZhbCk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuIiwgIi8qIVxuICogaXMtZXh0ZW5kYWJsZSA8aHR0cHM6Ly9naXRodWIuY29tL2pvbnNjaGxpbmtlcnQvaXMtZXh0ZW5kYWJsZT5cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUsIEpvbiBTY2hsaW5rZXJ0LlxuICogTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0V4dGVuZGFibGUodmFsKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsICE9PSAndW5kZWZpbmVkJyAmJiB2YWwgIT09IG51bGxcbiAgICAmJiAodHlwZW9mIHZhbCA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHZhbCA9PT0gJ2Z1bmN0aW9uJyk7XG59O1xuIiwgIid1c2Ugc3RyaWN0JztcblxudmFyIGlzT2JqZWN0ID0gcmVxdWlyZSgnaXMtZXh0ZW5kYWJsZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGV4dGVuZChvLyosIG9iamVjdHMqLykge1xuICBpZiAoIWlzT2JqZWN0KG8pKSB7IG8gPSB7fTsgfVxuXG4gIHZhciBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMTsgaSA8IGxlbjsgaSsrKSB7XG4gICAgdmFyIG9iaiA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGlmIChpc09iamVjdChvYmopKSB7XG4gICAgICBhc3NpZ24obywgb2JqKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG87XG59O1xuXG5mdW5jdGlvbiBhc3NpZ24oYSwgYikge1xuICBmb3IgKHZhciBrZXkgaW4gYikge1xuICAgIGlmIChoYXNPd24oYiwga2V5KSkge1xuICAgICAgYVtrZXldID0gYltrZXldO1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ2l2ZW4gYGtleWAgaXMgYW4gb3duIHByb3BlcnR5IG9mIGBvYmpgLlxuICovXG5cbmZ1bmN0aW9uIGhhc093bihvYmosIGtleSkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KTtcbn1cbiIsICIndXNlIHN0cmljdCc7XG5cbnZhciB0eXBlT2YgPSByZXF1aXJlKCdraW5kLW9mJyk7XG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnZXh0ZW5kLXNoYWxsb3cnKTtcblxuLyoqXG4gKiBQYXJzZSBzZWN0aW9ucyBpbiBgaW5wdXRgIHdpdGggdGhlIGdpdmVuIGBvcHRpb25zYC5cbiAqXG4gKiBgYGBqc1xuICogdmFyIHNlY3Rpb25zID0gcmVxdWlyZSgneyU9IG5hbWUgJX0nKTtcbiAqIHZhciByZXN1bHQgPSBzZWN0aW9ucyhpbnB1dCwgb3B0aW9ucyk7XG4gKiAvLyB7IGNvbnRlbnQ6ICdDb250ZW50IGJlZm9yZSBzZWN0aW9ucycsIHNlY3Rpb25zOiBbXSB9XG4gKiBgYGBcbiAqIEBwYXJhbSB7U3RyaW5nfEJ1ZmZlcnxPYmplY3R9IGBpbnB1dGAgSWYgaW5wdXQgaXMgYW4gb2JqZWN0LCBpdCdzIGBjb250ZW50YCBwcm9wZXJ0eSBtdXN0IGJlIGEgc3RyaW5nIG9yIGJ1ZmZlci5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtPYmplY3R9IFJldHVybnMgYW4gb2JqZWN0IHdpdGggYSBgY29udGVudGAgc3RyaW5nIGFuZCBhbiBhcnJheSBvZiBgc2VjdGlvbnNgIG9iamVjdHMuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW5wdXQsIG9wdGlvbnMpIHtcbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSAnZnVuY3Rpb24nKSB7XG4gICAgb3B0aW9ucyA9IHsgcGFyc2U6IG9wdGlvbnMgfTtcbiAgfVxuXG4gIHZhciBmaWxlID0gdG9PYmplY3QoaW5wdXQpO1xuICB2YXIgZGVmYXVsdHMgPSB7c2VjdGlvbl9kZWxpbWl0ZXI6ICctLS0nLCBwYXJzZTogaWRlbnRpdHl9O1xuICB2YXIgb3B0cyA9IGV4dGVuZCh7fSwgZGVmYXVsdHMsIG9wdGlvbnMpO1xuICB2YXIgZGVsaW0gPSBvcHRzLnNlY3Rpb25fZGVsaW1pdGVyO1xuICB2YXIgbGluZXMgPSBmaWxlLmNvbnRlbnQuc3BsaXQoL1xccj9cXG4vKTtcbiAgdmFyIHNlY3Rpb25zID0gbnVsbDtcbiAgdmFyIHNlY3Rpb24gPSBjcmVhdGVTZWN0aW9uKCk7XG4gIHZhciBjb250ZW50ID0gW107XG4gIHZhciBzdGFjayA9IFtdO1xuXG4gIGZ1bmN0aW9uIGluaXRTZWN0aW9ucyh2YWwpIHtcbiAgICBmaWxlLmNvbnRlbnQgPSB2YWw7XG4gICAgc2VjdGlvbnMgPSBbXTtcbiAgICBjb250ZW50ID0gW107XG4gIH1cblxuICBmdW5jdGlvbiBjbG9zZVNlY3Rpb24odmFsKSB7XG4gICAgaWYgKHN0YWNrLmxlbmd0aCkge1xuICAgICAgc2VjdGlvbi5rZXkgPSBnZXRLZXkoc3RhY2tbMF0sIGRlbGltKTtcbiAgICAgIHNlY3Rpb24uY29udGVudCA9IHZhbDtcbiAgICAgIG9wdHMucGFyc2Uoc2VjdGlvbiwgc2VjdGlvbnMpO1xuICAgICAgc2VjdGlvbnMucHVzaChzZWN0aW9uKTtcbiAgICAgIHNlY3Rpb24gPSBjcmVhdGVTZWN0aW9uKCk7XG4gICAgICBjb250ZW50ID0gW107XG4gICAgICBzdGFjayA9IFtdO1xuICAgIH1cbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgbGluZSA9IGxpbmVzW2ldO1xuICAgIHZhciBsZW4gPSBzdGFjay5sZW5ndGg7XG4gICAgdmFyIGxuID0gbGluZS50cmltKCk7XG5cbiAgICBpZiAoaXNEZWxpbWl0ZXIobG4sIGRlbGltKSkge1xuICAgICAgaWYgKGxuLmxlbmd0aCA9PT0gMyAmJiBpICE9PSAwKSB7XG4gICAgICAgIGlmIChsZW4gPT09IDAgfHwgbGVuID09PSAyKSB7XG4gICAgICAgICAgY29udGVudC5wdXNoKGxpbmUpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHN0YWNrLnB1c2gobG4pO1xuICAgICAgICBzZWN0aW9uLmRhdGEgPSBjb250ZW50LmpvaW4oJ1xcbicpO1xuICAgICAgICBjb250ZW50ID0gW107XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2VjdGlvbnMgPT09IG51bGwpIHtcbiAgICAgICAgaW5pdFNlY3Rpb25zKGNvbnRlbnQuam9pbignXFxuJykpO1xuICAgICAgfVxuXG4gICAgICBpZiAobGVuID09PSAyKSB7XG4gICAgICAgIGNsb3NlU2VjdGlvbihjb250ZW50LmpvaW4oJ1xcbicpKTtcbiAgICAgIH1cblxuICAgICAgc3RhY2sucHVzaChsbik7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBjb250ZW50LnB1c2gobGluZSk7XG4gIH1cblxuICBpZiAoc2VjdGlvbnMgPT09IG51bGwpIHtcbiAgICBpbml0U2VjdGlvbnMoY29udGVudC5qb2luKCdcXG4nKSk7XG4gIH0gZWxzZSB7XG4gICAgY2xvc2VTZWN0aW9uKGNvbnRlbnQuam9pbignXFxuJykpO1xuICB9XG5cbiAgZmlsZS5zZWN0aW9ucyA9IHNlY3Rpb25zO1xuICByZXR1cm4gZmlsZTtcbn07XG5cbmZ1bmN0aW9uIGlzRGVsaW1pdGVyKGxpbmUsIGRlbGltKSB7XG4gIGlmIChsaW5lLnNsaWNlKDAsIGRlbGltLmxlbmd0aCkgIT09IGRlbGltKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChsaW5lLmNoYXJBdChkZWxpbS5sZW5ndGggKyAxKSA9PT0gZGVsaW0uc2xpY2UoLTEpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiB0b09iamVjdChpbnB1dCkge1xuICBpZiAodHlwZU9mKGlucHV0KSAhPT0gJ29iamVjdCcpIHtcbiAgICBpbnB1dCA9IHsgY29udGVudDogaW5wdXQgfTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgaW5wdXQuY29udGVudCAhPT0gJ3N0cmluZycgJiYgIWlzQnVmZmVyKGlucHV0LmNvbnRlbnQpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZXhwZWN0ZWQgYSBidWZmZXIgb3Igc3RyaW5nJyk7XG4gIH1cblxuICBpbnB1dC5jb250ZW50ID0gaW5wdXQuY29udGVudC50b1N0cmluZygpO1xuICBpbnB1dC5zZWN0aW9ucyA9IFtdO1xuICByZXR1cm4gaW5wdXQ7XG59XG5cbmZ1bmN0aW9uIGdldEtleSh2YWwsIGRlbGltKSB7XG4gIHJldHVybiB2YWwgPyB2YWwuc2xpY2UoZGVsaW0ubGVuZ3RoKS50cmltKCkgOiAnJztcbn1cblxuZnVuY3Rpb24gY3JlYXRlU2VjdGlvbigpIHtcbiAgcmV0dXJuIHsga2V5OiAnJywgZGF0YTogJycsIGNvbnRlbnQ6ICcnIH07XG59XG5cbmZ1bmN0aW9uIGlkZW50aXR5KHZhbCkge1xuICByZXR1cm4gdmFsO1xufVxuXG5mdW5jdGlvbiBpc0J1ZmZlcih2YWwpIHtcbiAgaWYgKHZhbCAmJiB2YWwuY29uc3RydWN0b3IgJiYgdHlwZW9mIHZhbC5jb25zdHJ1Y3Rvci5pc0J1ZmZlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiB2YWwuY29uc3RydWN0b3IuaXNCdWZmZXIodmFsKTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG5cbmZ1bmN0aW9uIGlzTm90aGluZyhzdWJqZWN0KSB7XG4gIHJldHVybiAodHlwZW9mIHN1YmplY3QgPT09ICd1bmRlZmluZWQnKSB8fCAoc3ViamVjdCA9PT0gbnVsbCk7XG59XG5cblxuZnVuY3Rpb24gaXNPYmplY3Qoc3ViamVjdCkge1xuICByZXR1cm4gKHR5cGVvZiBzdWJqZWN0ID09PSAnb2JqZWN0JykgJiYgKHN1YmplY3QgIT09IG51bGwpO1xufVxuXG5cbmZ1bmN0aW9uIHRvQXJyYXkoc2VxdWVuY2UpIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoc2VxdWVuY2UpKSByZXR1cm4gc2VxdWVuY2U7XG4gIGVsc2UgaWYgKGlzTm90aGluZyhzZXF1ZW5jZSkpIHJldHVybiBbXTtcblxuICByZXR1cm4gWyBzZXF1ZW5jZSBdO1xufVxuXG5cbmZ1bmN0aW9uIGV4dGVuZCh0YXJnZXQsIHNvdXJjZSkge1xuICB2YXIgaW5kZXgsIGxlbmd0aCwga2V5LCBzb3VyY2VLZXlzO1xuXG4gIGlmIChzb3VyY2UpIHtcbiAgICBzb3VyY2VLZXlzID0gT2JqZWN0LmtleXMoc291cmNlKTtcblxuICAgIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBzb3VyY2VLZXlzLmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICAgIGtleSA9IHNvdXJjZUtleXNbaW5kZXhdO1xuICAgICAgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGFyZ2V0O1xufVxuXG5cbmZ1bmN0aW9uIHJlcGVhdChzdHJpbmcsIGNvdW50KSB7XG4gIHZhciByZXN1bHQgPSAnJywgY3ljbGU7XG5cbiAgZm9yIChjeWNsZSA9IDA7IGN5Y2xlIDwgY291bnQ7IGN5Y2xlICs9IDEpIHtcbiAgICByZXN1bHQgKz0gc3RyaW5nO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuXG5mdW5jdGlvbiBpc05lZ2F0aXZlWmVybyhudW1iZXIpIHtcbiAgcmV0dXJuIChudW1iZXIgPT09IDApICYmIChOdW1iZXIuTkVHQVRJVkVfSU5GSU5JVFkgPT09IDEgLyBudW1iZXIpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzLmlzTm90aGluZyAgICAgID0gaXNOb3RoaW5nO1xubW9kdWxlLmV4cG9ydHMuaXNPYmplY3QgICAgICAgPSBpc09iamVjdDtcbm1vZHVsZS5leHBvcnRzLnRvQXJyYXkgICAgICAgID0gdG9BcnJheTtcbm1vZHVsZS5leHBvcnRzLnJlcGVhdCAgICAgICAgID0gcmVwZWF0O1xubW9kdWxlLmV4cG9ydHMuaXNOZWdhdGl2ZVplcm8gPSBpc05lZ2F0aXZlWmVybztcbm1vZHVsZS5leHBvcnRzLmV4dGVuZCAgICAgICAgID0gZXh0ZW5kO1xuIiwgIi8vIFlBTUwgZXJyb3IgY2xhc3MuIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvODQ1ODk4NFxuLy9cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gWUFNTEV4Y2VwdGlvbihyZWFzb24sIG1hcmspIHtcbiAgLy8gU3VwZXIgY29uc3RydWN0b3JcbiAgRXJyb3IuY2FsbCh0aGlzKTtcblxuICB0aGlzLm5hbWUgPSAnWUFNTEV4Y2VwdGlvbic7XG4gIHRoaXMucmVhc29uID0gcmVhc29uO1xuICB0aGlzLm1hcmsgPSBtYXJrO1xuICB0aGlzLm1lc3NhZ2UgPSAodGhpcy5yZWFzb24gfHwgJyh1bmtub3duIHJlYXNvbiknKSArICh0aGlzLm1hcmsgPyAnICcgKyB0aGlzLm1hcmsudG9TdHJpbmcoKSA6ICcnKTtcblxuICAvLyBJbmNsdWRlIHN0YWNrIHRyYWNlIGluIGVycm9yIG9iamVjdFxuICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICAvLyBDaHJvbWUgYW5kIE5vZGVKU1xuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuICB9IGVsc2Uge1xuICAgIC8vIEZGLCBJRSAxMCsgYW5kIFNhZmFyaSA2Ky4gRmFsbGJhY2sgZm9yIG90aGVyc1xuICAgIHRoaXMuc3RhY2sgPSAobmV3IEVycm9yKCkpLnN0YWNrIHx8ICcnO1xuICB9XG59XG5cblxuLy8gSW5oZXJpdCBmcm9tIEVycm9yXG5ZQU1MRXhjZXB0aW9uLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKTtcbllBTUxFeGNlcHRpb24ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gWUFNTEV4Y2VwdGlvbjtcblxuXG5ZQU1MRXhjZXB0aW9uLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKGNvbXBhY3QpIHtcbiAgdmFyIHJlc3VsdCA9IHRoaXMubmFtZSArICc6ICc7XG5cbiAgcmVzdWx0ICs9IHRoaXMucmVhc29uIHx8ICcodW5rbm93biByZWFzb24pJztcblxuICBpZiAoIWNvbXBhY3QgJiYgdGhpcy5tYXJrKSB7XG4gICAgcmVzdWx0ICs9ICcgJyArIHRoaXMubWFyay50b1N0cmluZygpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBZQU1MRXhjZXB0aW9uO1xuIiwgIid1c2Ugc3RyaWN0JztcblxuXG52YXIgY29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKTtcblxuXG5mdW5jdGlvbiBNYXJrKG5hbWUsIGJ1ZmZlciwgcG9zaXRpb24sIGxpbmUsIGNvbHVtbikge1xuICB0aGlzLm5hbWUgICAgID0gbmFtZTtcbiAgdGhpcy5idWZmZXIgICA9IGJ1ZmZlcjtcbiAgdGhpcy5wb3NpdGlvbiA9IHBvc2l0aW9uO1xuICB0aGlzLmxpbmUgICAgID0gbGluZTtcbiAgdGhpcy5jb2x1bW4gICA9IGNvbHVtbjtcbn1cblxuXG5NYXJrLnByb3RvdHlwZS5nZXRTbmlwcGV0ID0gZnVuY3Rpb24gZ2V0U25pcHBldChpbmRlbnQsIG1heExlbmd0aCkge1xuICB2YXIgaGVhZCwgc3RhcnQsIHRhaWwsIGVuZCwgc25pcHBldDtcblxuICBpZiAoIXRoaXMuYnVmZmVyKSByZXR1cm4gbnVsbDtcblxuICBpbmRlbnQgPSBpbmRlbnQgfHwgNDtcbiAgbWF4TGVuZ3RoID0gbWF4TGVuZ3RoIHx8IDc1O1xuXG4gIGhlYWQgPSAnJztcbiAgc3RhcnQgPSB0aGlzLnBvc2l0aW9uO1xuXG4gIHdoaWxlIChzdGFydCA+IDAgJiYgJ1xceDAwXFxyXFxuXFx4ODVcXHUyMDI4XFx1MjAyOScuaW5kZXhPZih0aGlzLmJ1ZmZlci5jaGFyQXQoc3RhcnQgLSAxKSkgPT09IC0xKSB7XG4gICAgc3RhcnQgLT0gMTtcbiAgICBpZiAodGhpcy5wb3NpdGlvbiAtIHN0YXJ0ID4gKG1heExlbmd0aCAvIDIgLSAxKSkge1xuICAgICAgaGVhZCA9ICcgLi4uICc7XG4gICAgICBzdGFydCArPSA1O1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdGFpbCA9ICcnO1xuICBlbmQgPSB0aGlzLnBvc2l0aW9uO1xuXG4gIHdoaWxlIChlbmQgPCB0aGlzLmJ1ZmZlci5sZW5ndGggJiYgJ1xceDAwXFxyXFxuXFx4ODVcXHUyMDI4XFx1MjAyOScuaW5kZXhPZih0aGlzLmJ1ZmZlci5jaGFyQXQoZW5kKSkgPT09IC0xKSB7XG4gICAgZW5kICs9IDE7XG4gICAgaWYgKGVuZCAtIHRoaXMucG9zaXRpb24gPiAobWF4TGVuZ3RoIC8gMiAtIDEpKSB7XG4gICAgICB0YWlsID0gJyAuLi4gJztcbiAgICAgIGVuZCAtPSA1O1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgc25pcHBldCA9IHRoaXMuYnVmZmVyLnNsaWNlKHN0YXJ0LCBlbmQpO1xuXG4gIHJldHVybiBjb21tb24ucmVwZWF0KCcgJywgaW5kZW50KSArIGhlYWQgKyBzbmlwcGV0ICsgdGFpbCArICdcXG4nICtcbiAgICAgICAgIGNvbW1vbi5yZXBlYXQoJyAnLCBpbmRlbnQgKyB0aGlzLnBvc2l0aW9uIC0gc3RhcnQgKyBoZWFkLmxlbmd0aCkgKyAnXic7XG59O1xuXG5cbk1hcmsucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoY29tcGFjdCkge1xuICB2YXIgc25pcHBldCwgd2hlcmUgPSAnJztcblxuICBpZiAodGhpcy5uYW1lKSB7XG4gICAgd2hlcmUgKz0gJ2luIFwiJyArIHRoaXMubmFtZSArICdcIiAnO1xuICB9XG5cbiAgd2hlcmUgKz0gJ2F0IGxpbmUgJyArICh0aGlzLmxpbmUgKyAxKSArICcsIGNvbHVtbiAnICsgKHRoaXMuY29sdW1uICsgMSk7XG5cbiAgaWYgKCFjb21wYWN0KSB7XG4gICAgc25pcHBldCA9IHRoaXMuZ2V0U25pcHBldCgpO1xuXG4gICAgaWYgKHNuaXBwZXQpIHtcbiAgICAgIHdoZXJlICs9ICc6XFxuJyArIHNuaXBwZXQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHdoZXJlO1xufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcms7XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG52YXIgWUFNTEV4Y2VwdGlvbiA9IHJlcXVpcmUoJy4vZXhjZXB0aW9uJyk7XG5cbnZhciBUWVBFX0NPTlNUUlVDVE9SX09QVElPTlMgPSBbXG4gICdraW5kJyxcbiAgJ3Jlc29sdmUnLFxuICAnY29uc3RydWN0JyxcbiAgJ2luc3RhbmNlT2YnLFxuICAncHJlZGljYXRlJyxcbiAgJ3JlcHJlc2VudCcsXG4gICdkZWZhdWx0U3R5bGUnLFxuICAnc3R5bGVBbGlhc2VzJ1xuXTtcblxudmFyIFlBTUxfTk9ERV9LSU5EUyA9IFtcbiAgJ3NjYWxhcicsXG4gICdzZXF1ZW5jZScsXG4gICdtYXBwaW5nJ1xuXTtcblxuZnVuY3Rpb24gY29tcGlsZVN0eWxlQWxpYXNlcyhtYXApIHtcbiAgdmFyIHJlc3VsdCA9IHt9O1xuXG4gIGlmIChtYXAgIT09IG51bGwpIHtcbiAgICBPYmplY3Qua2V5cyhtYXApLmZvckVhY2goZnVuY3Rpb24gKHN0eWxlKSB7XG4gICAgICBtYXBbc3R5bGVdLmZvckVhY2goZnVuY3Rpb24gKGFsaWFzKSB7XG4gICAgICAgIHJlc3VsdFtTdHJpbmcoYWxpYXMpXSA9IHN0eWxlO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBUeXBlKHRhZywgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICBPYmplY3Qua2V5cyhvcHRpb25zKS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgaWYgKFRZUEVfQ09OU1RSVUNUT1JfT1BUSU9OUy5pbmRleE9mKG5hbWUpID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IFlBTUxFeGNlcHRpb24oJ1Vua25vd24gb3B0aW9uIFwiJyArIG5hbWUgKyAnXCIgaXMgbWV0IGluIGRlZmluaXRpb24gb2YgXCInICsgdGFnICsgJ1wiIFlBTUwgdHlwZS4nKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIFRPRE86IEFkZCB0YWcgZm9ybWF0IGNoZWNrLlxuICB0aGlzLnRhZyAgICAgICAgICA9IHRhZztcbiAgdGhpcy5raW5kICAgICAgICAgPSBvcHRpb25zWydraW5kJ10gICAgICAgICB8fCBudWxsO1xuICB0aGlzLnJlc29sdmUgICAgICA9IG9wdGlvbnNbJ3Jlc29sdmUnXSAgICAgIHx8IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRydWU7IH07XG4gIHRoaXMuY29uc3RydWN0ICAgID0gb3B0aW9uc1snY29uc3RydWN0J10gICAgfHwgZnVuY3Rpb24gKGRhdGEpIHsgcmV0dXJuIGRhdGE7IH07XG4gIHRoaXMuaW5zdGFuY2VPZiAgID0gb3B0aW9uc1snaW5zdGFuY2VPZiddICAgfHwgbnVsbDtcbiAgdGhpcy5wcmVkaWNhdGUgICAgPSBvcHRpb25zWydwcmVkaWNhdGUnXSAgICB8fCBudWxsO1xuICB0aGlzLnJlcHJlc2VudCAgICA9IG9wdGlvbnNbJ3JlcHJlc2VudCddICAgIHx8IG51bGw7XG4gIHRoaXMuZGVmYXVsdFN0eWxlID0gb3B0aW9uc1snZGVmYXVsdFN0eWxlJ10gfHwgbnVsbDtcbiAgdGhpcy5zdHlsZUFsaWFzZXMgPSBjb21waWxlU3R5bGVBbGlhc2VzKG9wdGlvbnNbJ3N0eWxlQWxpYXNlcyddIHx8IG51bGwpO1xuXG4gIGlmIChZQU1MX05PREVfS0lORFMuaW5kZXhPZih0aGlzLmtpbmQpID09PSAtMSkge1xuICAgIHRocm93IG5ldyBZQU1MRXhjZXB0aW9uKCdVbmtub3duIGtpbmQgXCInICsgdGhpcy5raW5kICsgJ1wiIGlzIHNwZWNpZmllZCBmb3IgXCInICsgdGFnICsgJ1wiIFlBTUwgdHlwZS4nKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFR5cGU7XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG4vKmVzbGludC1kaXNhYmxlIG1heC1sZW4qL1xuXG52YXIgY29tbW9uICAgICAgICA9IHJlcXVpcmUoJy4vY29tbW9uJyk7XG52YXIgWUFNTEV4Y2VwdGlvbiA9IHJlcXVpcmUoJy4vZXhjZXB0aW9uJyk7XG52YXIgVHlwZSAgICAgICAgICA9IHJlcXVpcmUoJy4vdHlwZScpO1xuXG5cbmZ1bmN0aW9uIGNvbXBpbGVMaXN0KHNjaGVtYSwgbmFtZSwgcmVzdWx0KSB7XG4gIHZhciBleGNsdWRlID0gW107XG5cbiAgc2NoZW1hLmluY2x1ZGUuZm9yRWFjaChmdW5jdGlvbiAoaW5jbHVkZWRTY2hlbWEpIHtcbiAgICByZXN1bHQgPSBjb21waWxlTGlzdChpbmNsdWRlZFNjaGVtYSwgbmFtZSwgcmVzdWx0KTtcbiAgfSk7XG5cbiAgc2NoZW1hW25hbWVdLmZvckVhY2goZnVuY3Rpb24gKGN1cnJlbnRUeXBlKSB7XG4gICAgcmVzdWx0LmZvckVhY2goZnVuY3Rpb24gKHByZXZpb3VzVHlwZSwgcHJldmlvdXNJbmRleCkge1xuICAgICAgaWYgKHByZXZpb3VzVHlwZS50YWcgPT09IGN1cnJlbnRUeXBlLnRhZyAmJiBwcmV2aW91c1R5cGUua2luZCA9PT0gY3VycmVudFR5cGUua2luZCkge1xuICAgICAgICBleGNsdWRlLnB1c2gocHJldmlvdXNJbmRleCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXN1bHQucHVzaChjdXJyZW50VHlwZSk7XG4gIH0pO1xuXG4gIHJldHVybiByZXN1bHQuZmlsdGVyKGZ1bmN0aW9uICh0eXBlLCBpbmRleCkge1xuICAgIHJldHVybiBleGNsdWRlLmluZGV4T2YoaW5kZXgpID09PSAtMTtcbiAgfSk7XG59XG5cblxuZnVuY3Rpb24gY29tcGlsZU1hcCgvKiBsaXN0cy4uLiAqLykge1xuICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICBzY2FsYXI6IHt9LFxuICAgICAgICBzZXF1ZW5jZToge30sXG4gICAgICAgIG1hcHBpbmc6IHt9LFxuICAgICAgICBmYWxsYmFjazoge31cbiAgICAgIH0sIGluZGV4LCBsZW5ndGg7XG5cbiAgZnVuY3Rpb24gY29sbGVjdFR5cGUodHlwZSkge1xuICAgIHJlc3VsdFt0eXBlLmtpbmRdW3R5cGUudGFnXSA9IHJlc3VsdFsnZmFsbGJhY2snXVt0eXBlLnRhZ10gPSB0eXBlO1xuICB9XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgYXJndW1lbnRzW2luZGV4XS5mb3JFYWNoKGNvbGxlY3RUeXBlKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5cbmZ1bmN0aW9uIFNjaGVtYShkZWZpbml0aW9uKSB7XG4gIHRoaXMuaW5jbHVkZSAgPSBkZWZpbml0aW9uLmluY2x1ZGUgIHx8IFtdO1xuICB0aGlzLmltcGxpY2l0ID0gZGVmaW5pdGlvbi5pbXBsaWNpdCB8fCBbXTtcbiAgdGhpcy5leHBsaWNpdCA9IGRlZmluaXRpb24uZXhwbGljaXQgfHwgW107XG5cbiAgdGhpcy5pbXBsaWNpdC5mb3JFYWNoKGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgaWYgKHR5cGUubG9hZEtpbmQgJiYgdHlwZS5sb2FkS2luZCAhPT0gJ3NjYWxhcicpIHtcbiAgICAgIHRocm93IG5ldyBZQU1MRXhjZXB0aW9uKCdUaGVyZSBpcyBhIG5vbi1zY2FsYXIgdHlwZSBpbiB0aGUgaW1wbGljaXQgbGlzdCBvZiBhIHNjaGVtYS4gSW1wbGljaXQgcmVzb2x2aW5nIG9mIHN1Y2ggdHlwZXMgaXMgbm90IHN1cHBvcnRlZC4nKTtcbiAgICB9XG4gIH0pO1xuXG4gIHRoaXMuY29tcGlsZWRJbXBsaWNpdCA9IGNvbXBpbGVMaXN0KHRoaXMsICdpbXBsaWNpdCcsIFtdKTtcbiAgdGhpcy5jb21waWxlZEV4cGxpY2l0ID0gY29tcGlsZUxpc3QodGhpcywgJ2V4cGxpY2l0JywgW10pO1xuICB0aGlzLmNvbXBpbGVkVHlwZU1hcCAgPSBjb21waWxlTWFwKHRoaXMuY29tcGlsZWRJbXBsaWNpdCwgdGhpcy5jb21waWxlZEV4cGxpY2l0KTtcbn1cblxuXG5TY2hlbWEuREVGQVVMVCA9IG51bGw7XG5cblxuU2NoZW1hLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZVNjaGVtYSgpIHtcbiAgdmFyIHNjaGVtYXMsIHR5cGVzO1xuXG4gIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIGNhc2UgMTpcbiAgICAgIHNjaGVtYXMgPSBTY2hlbWEuREVGQVVMVDtcbiAgICAgIHR5cGVzID0gYXJndW1lbnRzWzBdO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIDI6XG4gICAgICBzY2hlbWFzID0gYXJndW1lbnRzWzBdO1xuICAgICAgdHlwZXMgPSBhcmd1bWVudHNbMV07XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgWUFNTEV4Y2VwdGlvbignV3JvbmcgbnVtYmVyIG9mIGFyZ3VtZW50cyBmb3IgU2NoZW1hLmNyZWF0ZSBmdW5jdGlvbicpO1xuICB9XG5cbiAgc2NoZW1hcyA9IGNvbW1vbi50b0FycmF5KHNjaGVtYXMpO1xuICB0eXBlcyA9IGNvbW1vbi50b0FycmF5KHR5cGVzKTtcblxuICBpZiAoIXNjaGVtYXMuZXZlcnkoZnVuY3Rpb24gKHNjaGVtYSkgeyByZXR1cm4gc2NoZW1hIGluc3RhbmNlb2YgU2NoZW1hOyB9KSkge1xuICAgIHRocm93IG5ldyBZQU1MRXhjZXB0aW9uKCdTcGVjaWZpZWQgbGlzdCBvZiBzdXBlciBzY2hlbWFzIChvciBhIHNpbmdsZSBTY2hlbWEgb2JqZWN0KSBjb250YWlucyBhIG5vbi1TY2hlbWEgb2JqZWN0LicpO1xuICB9XG5cbiAgaWYgKCF0eXBlcy5ldmVyeShmdW5jdGlvbiAodHlwZSkgeyByZXR1cm4gdHlwZSBpbnN0YW5jZW9mIFR5cGU7IH0pKSB7XG4gICAgdGhyb3cgbmV3IFlBTUxFeGNlcHRpb24oJ1NwZWNpZmllZCBsaXN0IG9mIFlBTUwgdHlwZXMgKG9yIGEgc2luZ2xlIFR5cGUgb2JqZWN0KSBjb250YWlucyBhIG5vbi1UeXBlIG9iamVjdC4nKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgU2NoZW1hKHtcbiAgICBpbmNsdWRlOiBzY2hlbWFzLFxuICAgIGV4cGxpY2l0OiB0eXBlc1xuICB9KTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBTY2hlbWE7XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVHlwZSA9IHJlcXVpcmUoJy4uL3R5cGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZSgndGFnOnlhbWwub3JnLDIwMDI6c3RyJywge1xuICBraW5kOiAnc2NhbGFyJyxcbiAgY29uc3RydWN0OiBmdW5jdGlvbiAoZGF0YSkgeyByZXR1cm4gZGF0YSAhPT0gbnVsbCA/IGRhdGEgOiAnJzsgfVxufSk7XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVHlwZSA9IHJlcXVpcmUoJy4uL3R5cGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZSgndGFnOnlhbWwub3JnLDIwMDI6c2VxJywge1xuICBraW5kOiAnc2VxdWVuY2UnLFxuICBjb25zdHJ1Y3Q6IGZ1bmN0aW9uIChkYXRhKSB7IHJldHVybiBkYXRhICE9PSBudWxsID8gZGF0YSA6IFtdOyB9XG59KTtcbiIsICIndXNlIHN0cmljdCc7XG5cbnZhciBUeXBlID0gcmVxdWlyZSgnLi4vdHlwZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBUeXBlKCd0YWc6eWFtbC5vcmcsMjAwMjptYXAnLCB7XG4gIGtpbmQ6ICdtYXBwaW5nJyxcbiAgY29uc3RydWN0OiBmdW5jdGlvbiAoZGF0YSkgeyByZXR1cm4gZGF0YSAhPT0gbnVsbCA/IGRhdGEgOiB7fTsgfVxufSk7XG4iLCAiLy8gU3RhbmRhcmQgWUFNTCdzIEZhaWxzYWZlIHNjaGVtYS5cbi8vIGh0dHA6Ly93d3cueWFtbC5vcmcvc3BlYy8xLjIvc3BlYy5odG1sI2lkMjgwMjM0NlxuXG5cbid1c2Ugc3RyaWN0JztcblxuXG52YXIgU2NoZW1hID0gcmVxdWlyZSgnLi4vc2NoZW1hJyk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgU2NoZW1hKHtcbiAgZXhwbGljaXQ6IFtcbiAgICByZXF1aXJlKCcuLi90eXBlL3N0cicpLFxuICAgIHJlcXVpcmUoJy4uL3R5cGUvc2VxJyksXG4gICAgcmVxdWlyZSgnLi4vdHlwZS9tYXAnKVxuICBdXG59KTtcbiIsICIndXNlIHN0cmljdCc7XG5cbnZhciBUeXBlID0gcmVxdWlyZSgnLi4vdHlwZScpO1xuXG5mdW5jdGlvbiByZXNvbHZlWWFtbE51bGwoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIHRydWU7XG5cbiAgdmFyIG1heCA9IGRhdGEubGVuZ3RoO1xuXG4gIHJldHVybiAobWF4ID09PSAxICYmIGRhdGEgPT09ICd+JykgfHxcbiAgICAgICAgIChtYXggPT09IDQgJiYgKGRhdGEgPT09ICdudWxsJyB8fCBkYXRhID09PSAnTnVsbCcgfHwgZGF0YSA9PT0gJ05VTEwnKSk7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFlhbWxOdWxsKCkge1xuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNOdWxsKG9iamVjdCkge1xuICByZXR1cm4gb2JqZWN0ID09PSBudWxsO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBUeXBlKCd0YWc6eWFtbC5vcmcsMjAwMjpudWxsJywge1xuICBraW5kOiAnc2NhbGFyJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZVlhbWxOdWxsLFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdFlhbWxOdWxsLFxuICBwcmVkaWNhdGU6IGlzTnVsbCxcbiAgcmVwcmVzZW50OiB7XG4gICAgY2Fub25pY2FsOiBmdW5jdGlvbiAoKSB7IHJldHVybiAnfic7ICAgIH0sXG4gICAgbG93ZXJjYXNlOiBmdW5jdGlvbiAoKSB7IHJldHVybiAnbnVsbCc7IH0sXG4gICAgdXBwZXJjYXNlOiBmdW5jdGlvbiAoKSB7IHJldHVybiAnTlVMTCc7IH0sXG4gICAgY2FtZWxjYXNlOiBmdW5jdGlvbiAoKSB7IHJldHVybiAnTnVsbCc7IH1cbiAgfSxcbiAgZGVmYXVsdFN0eWxlOiAnbG93ZXJjYXNlJ1xufSk7XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVHlwZSA9IHJlcXVpcmUoJy4uL3R5cGUnKTtcblxuZnVuY3Rpb24gcmVzb2x2ZVlhbWxCb29sZWFuKGRhdGEpIHtcbiAgaWYgKGRhdGEgPT09IG51bGwpIHJldHVybiBmYWxzZTtcblxuICB2YXIgbWF4ID0gZGF0YS5sZW5ndGg7XG5cbiAgcmV0dXJuIChtYXggPT09IDQgJiYgKGRhdGEgPT09ICd0cnVlJyB8fCBkYXRhID09PSAnVHJ1ZScgfHwgZGF0YSA9PT0gJ1RSVUUnKSkgfHxcbiAgICAgICAgIChtYXggPT09IDUgJiYgKGRhdGEgPT09ICdmYWxzZScgfHwgZGF0YSA9PT0gJ0ZhbHNlJyB8fCBkYXRhID09PSAnRkFMU0UnKSk7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFlhbWxCb29sZWFuKGRhdGEpIHtcbiAgcmV0dXJuIGRhdGEgPT09ICd0cnVlJyB8fFxuICAgICAgICAgZGF0YSA9PT0gJ1RydWUnIHx8XG4gICAgICAgICBkYXRhID09PSAnVFJVRSc7XG59XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihvYmplY3QpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpID09PSAnW29iamVjdCBCb29sZWFuXSc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOmJvb2wnLCB7XG4gIGtpbmQ6ICdzY2FsYXInLFxuICByZXNvbHZlOiByZXNvbHZlWWFtbEJvb2xlYW4sXG4gIGNvbnN0cnVjdDogY29uc3RydWN0WWFtbEJvb2xlYW4sXG4gIHByZWRpY2F0ZTogaXNCb29sZWFuLFxuICByZXByZXNlbnQ6IHtcbiAgICBsb3dlcmNhc2U6IGZ1bmN0aW9uIChvYmplY3QpIHsgcmV0dXJuIG9iamVjdCA/ICd0cnVlJyA6ICdmYWxzZSc7IH0sXG4gICAgdXBwZXJjYXNlOiBmdW5jdGlvbiAob2JqZWN0KSB7IHJldHVybiBvYmplY3QgPyAnVFJVRScgOiAnRkFMU0UnOyB9LFxuICAgIGNhbWVsY2FzZTogZnVuY3Rpb24gKG9iamVjdCkgeyByZXR1cm4gb2JqZWN0ID8gJ1RydWUnIDogJ0ZhbHNlJzsgfVxuICB9LFxuICBkZWZhdWx0U3R5bGU6ICdsb3dlcmNhc2UnXG59KTtcbiIsICIndXNlIHN0cmljdCc7XG5cbnZhciBjb21tb24gPSByZXF1aXJlKCcuLi9jb21tb24nKTtcbnZhciBUeXBlICAgPSByZXF1aXJlKCcuLi90eXBlJyk7XG5cbmZ1bmN0aW9uIGlzSGV4Q29kZShjKSB7XG4gIHJldHVybiAoKDB4MzAvKiAwICovIDw9IGMpICYmIChjIDw9IDB4MzkvKiA5ICovKSkgfHxcbiAgICAgICAgICgoMHg0MS8qIEEgKi8gPD0gYykgJiYgKGMgPD0gMHg0Ni8qIEYgKi8pKSB8fFxuICAgICAgICAgKCgweDYxLyogYSAqLyA8PSBjKSAmJiAoYyA8PSAweDY2LyogZiAqLykpO1xufVxuXG5mdW5jdGlvbiBpc09jdENvZGUoYykge1xuICByZXR1cm4gKCgweDMwLyogMCAqLyA8PSBjKSAmJiAoYyA8PSAweDM3LyogNyAqLykpO1xufVxuXG5mdW5jdGlvbiBpc0RlY0NvZGUoYykge1xuICByZXR1cm4gKCgweDMwLyogMCAqLyA8PSBjKSAmJiAoYyA8PSAweDM5LyogOSAqLykpO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlWWFtbEludGVnZXIoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBtYXggPSBkYXRhLmxlbmd0aCxcbiAgICAgIGluZGV4ID0gMCxcbiAgICAgIGhhc0RpZ2l0cyA9IGZhbHNlLFxuICAgICAgY2g7XG5cbiAgaWYgKCFtYXgpIHJldHVybiBmYWxzZTtcblxuICBjaCA9IGRhdGFbaW5kZXhdO1xuXG4gIC8vIHNpZ25cbiAgaWYgKGNoID09PSAnLScgfHwgY2ggPT09ICcrJykge1xuICAgIGNoID0gZGF0YVsrK2luZGV4XTtcbiAgfVxuXG4gIGlmIChjaCA9PT0gJzAnKSB7XG4gICAgLy8gMFxuICAgIGlmIChpbmRleCArIDEgPT09IG1heCkgcmV0dXJuIHRydWU7XG4gICAgY2ggPSBkYXRhWysraW5kZXhdO1xuXG4gICAgLy8gYmFzZSAyLCBiYXNlIDgsIGJhc2UgMTZcblxuICAgIGlmIChjaCA9PT0gJ2InKSB7XG4gICAgICAvLyBiYXNlIDJcbiAgICAgIGluZGV4Kys7XG5cbiAgICAgIGZvciAoOyBpbmRleCA8IG1heDsgaW5kZXgrKykge1xuICAgICAgICBjaCA9IGRhdGFbaW5kZXhdO1xuICAgICAgICBpZiAoY2ggPT09ICdfJykgY29udGludWU7XG4gICAgICAgIGlmIChjaCAhPT0gJzAnICYmIGNoICE9PSAnMScpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaGFzRGlnaXRzID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBoYXNEaWdpdHMgJiYgY2ggIT09ICdfJztcbiAgICB9XG5cblxuICAgIGlmIChjaCA9PT0gJ3gnKSB7XG4gICAgICAvLyBiYXNlIDE2XG4gICAgICBpbmRleCsrO1xuXG4gICAgICBmb3IgKDsgaW5kZXggPCBtYXg7IGluZGV4KyspIHtcbiAgICAgICAgY2ggPSBkYXRhW2luZGV4XTtcbiAgICAgICAgaWYgKGNoID09PSAnXycpIGNvbnRpbnVlO1xuICAgICAgICBpZiAoIWlzSGV4Q29kZShkYXRhLmNoYXJDb2RlQXQoaW5kZXgpKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBoYXNEaWdpdHMgPSB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGhhc0RpZ2l0cyAmJiBjaCAhPT0gJ18nO1xuICAgIH1cblxuICAgIC8vIGJhc2UgOFxuICAgIGZvciAoOyBpbmRleCA8IG1heDsgaW5kZXgrKykge1xuICAgICAgY2ggPSBkYXRhW2luZGV4XTtcbiAgICAgIGlmIChjaCA9PT0gJ18nKSBjb250aW51ZTtcbiAgICAgIGlmICghaXNPY3RDb2RlKGRhdGEuY2hhckNvZGVBdChpbmRleCkpKSByZXR1cm4gZmFsc2U7XG4gICAgICBoYXNEaWdpdHMgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gaGFzRGlnaXRzICYmIGNoICE9PSAnXyc7XG4gIH1cblxuICAvLyBiYXNlIDEwIChleGNlcHQgMCkgb3IgYmFzZSA2MFxuXG4gIC8vIHZhbHVlIHNob3VsZCBub3Qgc3RhcnQgd2l0aCBgX2A7XG4gIGlmIChjaCA9PT0gJ18nKSByZXR1cm4gZmFsc2U7XG5cbiAgZm9yICg7IGluZGV4IDwgbWF4OyBpbmRleCsrKSB7XG4gICAgY2ggPSBkYXRhW2luZGV4XTtcbiAgICBpZiAoY2ggPT09ICdfJykgY29udGludWU7XG4gICAgaWYgKGNoID09PSAnOicpIGJyZWFrO1xuICAgIGlmICghaXNEZWNDb2RlKGRhdGEuY2hhckNvZGVBdChpbmRleCkpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGhhc0RpZ2l0cyA9IHRydWU7XG4gIH1cblxuICAvLyBTaG91bGQgaGF2ZSBkaWdpdHMgYW5kIHNob3VsZCBub3QgZW5kIHdpdGggYF9gXG4gIGlmICghaGFzRGlnaXRzIHx8IGNoID09PSAnXycpIHJldHVybiBmYWxzZTtcblxuICAvLyBpZiAhYmFzZTYwIC0gZG9uZTtcbiAgaWYgKGNoICE9PSAnOicpIHJldHVybiB0cnVlO1xuXG4gIC8vIGJhc2U2MCBhbG1vc3Qgbm90IHVzZWQsIG5vIG5lZWRzIHRvIG9wdGltaXplXG4gIHJldHVybiAvXig6WzAtNV0/WzAtOV0pKyQvLnRlc3QoZGF0YS5zbGljZShpbmRleCkpO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RZYW1sSW50ZWdlcihkYXRhKSB7XG4gIHZhciB2YWx1ZSA9IGRhdGEsIHNpZ24gPSAxLCBjaCwgYmFzZSwgZGlnaXRzID0gW107XG5cbiAgaWYgKHZhbHVlLmluZGV4T2YoJ18nKSAhPT0gLTEpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoL18vZywgJycpO1xuICB9XG5cbiAgY2ggPSB2YWx1ZVswXTtcblxuICBpZiAoY2ggPT09ICctJyB8fCBjaCA9PT0gJysnKSB7XG4gICAgaWYgKGNoID09PSAnLScpIHNpZ24gPSAtMTtcbiAgICB2YWx1ZSA9IHZhbHVlLnNsaWNlKDEpO1xuICAgIGNoID0gdmFsdWVbMF07XG4gIH1cblxuICBpZiAodmFsdWUgPT09ICcwJykgcmV0dXJuIDA7XG5cbiAgaWYgKGNoID09PSAnMCcpIHtcbiAgICBpZiAodmFsdWVbMV0gPT09ICdiJykgcmV0dXJuIHNpZ24gKiBwYXJzZUludCh2YWx1ZS5zbGljZSgyKSwgMik7XG4gICAgaWYgKHZhbHVlWzFdID09PSAneCcpIHJldHVybiBzaWduICogcGFyc2VJbnQodmFsdWUsIDE2KTtcbiAgICByZXR1cm4gc2lnbiAqIHBhcnNlSW50KHZhbHVlLCA4KTtcbiAgfVxuXG4gIGlmICh2YWx1ZS5pbmRleE9mKCc6JykgIT09IC0xKSB7XG4gICAgdmFsdWUuc3BsaXQoJzonKS5mb3JFYWNoKGZ1bmN0aW9uICh2KSB7XG4gICAgICBkaWdpdHMudW5zaGlmdChwYXJzZUludCh2LCAxMCkpO1xuICAgIH0pO1xuXG4gICAgdmFsdWUgPSAwO1xuICAgIGJhc2UgPSAxO1xuXG4gICAgZGlnaXRzLmZvckVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgIHZhbHVlICs9IChkICogYmFzZSk7XG4gICAgICBiYXNlICo9IDYwO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHNpZ24gKiB2YWx1ZTtcblxuICB9XG5cbiAgcmV0dXJuIHNpZ24gKiBwYXJzZUludCh2YWx1ZSwgMTApO1xufVxuXG5mdW5jdGlvbiBpc0ludGVnZXIob2JqZWN0KSB7XG4gIHJldHVybiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iamVjdCkpID09PSAnW29iamVjdCBOdW1iZXJdJyAmJlxuICAgICAgICAgKG9iamVjdCAlIDEgPT09IDAgJiYgIWNvbW1vbi5pc05lZ2F0aXZlWmVybyhvYmplY3QpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZSgndGFnOnlhbWwub3JnLDIwMDI6aW50Jywge1xuICBraW5kOiAnc2NhbGFyJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZVlhbWxJbnRlZ2VyLFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdFlhbWxJbnRlZ2VyLFxuICBwcmVkaWNhdGU6IGlzSW50ZWdlcixcbiAgcmVwcmVzZW50OiB7XG4gICAgYmluYXJ5OiAgICAgIGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiA+PSAwID8gJzBiJyArIG9iai50b1N0cmluZygyKSA6ICctMGInICsgb2JqLnRvU3RyaW5nKDIpLnNsaWNlKDEpOyB9LFxuICAgIG9jdGFsOiAgICAgICBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogPj0gMCA/ICcwJyAgKyBvYmoudG9TdHJpbmcoOCkgOiAnLTAnICArIG9iai50b1N0cmluZyg4KS5zbGljZSgxKTsgfSxcbiAgICBkZWNpbWFsOiAgICAgZnVuY3Rpb24gKG9iaikgeyByZXR1cm4gb2JqLnRvU3RyaW5nKDEwKTsgfSxcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG4gICAgaGV4YWRlY2ltYWw6IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiA+PSAwID8gJzB4JyArIG9iai50b1N0cmluZygxNikudG9VcHBlckNhc2UoKSA6ICAnLTB4JyArIG9iai50b1N0cmluZygxNikudG9VcHBlckNhc2UoKS5zbGljZSgxKTsgfVxuICB9LFxuICBkZWZhdWx0U3R5bGU6ICdkZWNpbWFsJyxcbiAgc3R5bGVBbGlhc2VzOiB7XG4gICAgYmluYXJ5OiAgICAgIFsgMiwgICdiaW4nIF0sXG4gICAgb2N0YWw6ICAgICAgIFsgOCwgICdvY3QnIF0sXG4gICAgZGVjaW1hbDogICAgIFsgMTAsICdkZWMnIF0sXG4gICAgaGV4YWRlY2ltYWw6IFsgMTYsICdoZXgnIF1cbiAgfVxufSk7XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29tbW9uID0gcmVxdWlyZSgnLi4vY29tbW9uJyk7XG52YXIgVHlwZSAgID0gcmVxdWlyZSgnLi4vdHlwZScpO1xuXG52YXIgWUFNTF9GTE9BVF9QQVRURVJOID0gbmV3IFJlZ0V4cChcbiAgLy8gMi41ZTQsIDIuNSBhbmQgaW50ZWdlcnNcbiAgJ14oPzpbLStdPyg/OjB8WzEtOV1bMC05X10qKSg/OlxcXFwuWzAtOV9dKik/KD86W2VFXVstK10/WzAtOV0rKT8nICtcbiAgLy8gLjJlNCwgLjJcbiAgLy8gc3BlY2lhbCBjYXNlLCBzZWVtcyBub3QgZnJvbSBzcGVjXG4gICd8XFxcXC5bMC05X10rKD86W2VFXVstK10/WzAtOV0rKT8nICtcbiAgLy8gMjA6NTlcbiAgJ3xbLStdP1swLTldWzAtOV9dKig/OjpbMC01XT9bMC05XSkrXFxcXC5bMC05X10qJyArXG4gIC8vIC5pbmZcbiAgJ3xbLStdP1xcXFwuKD86aW5mfEluZnxJTkYpJyArXG4gIC8vIC5uYW5cbiAgJ3xcXFxcLig/Om5hbnxOYU58TkFOKSkkJyk7XG5cbmZ1bmN0aW9uIHJlc29sdmVZYW1sRmxvYXQoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuXG4gIGlmICghWUFNTF9GTE9BVF9QQVRURVJOLnRlc3QoZGF0YSkgfHxcbiAgICAgIC8vIFF1aWNrIGhhY2sgdG8gbm90IGFsbG93IGludGVnZXJzIGVuZCB3aXRoIGBfYFxuICAgICAgLy8gUHJvYmFibHkgc2hvdWxkIHVwZGF0ZSByZWdleHAgJiBjaGVjayBzcGVlZFxuICAgICAgZGF0YVtkYXRhLmxlbmd0aCAtIDFdID09PSAnXycpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0WWFtbEZsb2F0KGRhdGEpIHtcbiAgdmFyIHZhbHVlLCBzaWduLCBiYXNlLCBkaWdpdHM7XG5cbiAgdmFsdWUgID0gZGF0YS5yZXBsYWNlKC9fL2csICcnKS50b0xvd2VyQ2FzZSgpO1xuICBzaWduICAgPSB2YWx1ZVswXSA9PT0gJy0nID8gLTEgOiAxO1xuICBkaWdpdHMgPSBbXTtcblxuICBpZiAoJystJy5pbmRleE9mKHZhbHVlWzBdKSA+PSAwKSB7XG4gICAgdmFsdWUgPSB2YWx1ZS5zbGljZSgxKTtcbiAgfVxuXG4gIGlmICh2YWx1ZSA9PT0gJy5pbmYnKSB7XG4gICAgcmV0dXJuIChzaWduID09PSAxKSA/IE51bWJlci5QT1NJVElWRV9JTkZJTklUWSA6IE51bWJlci5ORUdBVElWRV9JTkZJTklUWTtcblxuICB9IGVsc2UgaWYgKHZhbHVlID09PSAnLm5hbicpIHtcbiAgICByZXR1cm4gTmFOO1xuXG4gIH0gZWxzZSBpZiAodmFsdWUuaW5kZXhPZignOicpID49IDApIHtcbiAgICB2YWx1ZS5zcGxpdCgnOicpLmZvckVhY2goZnVuY3Rpb24gKHYpIHtcbiAgICAgIGRpZ2l0cy51bnNoaWZ0KHBhcnNlRmxvYXQodiwgMTApKTtcbiAgICB9KTtcblxuICAgIHZhbHVlID0gMC4wO1xuICAgIGJhc2UgPSAxO1xuXG4gICAgZGlnaXRzLmZvckVhY2goZnVuY3Rpb24gKGQpIHtcbiAgICAgIHZhbHVlICs9IGQgKiBiYXNlO1xuICAgICAgYmFzZSAqPSA2MDtcbiAgICB9KTtcblxuICAgIHJldHVybiBzaWduICogdmFsdWU7XG5cbiAgfVxuICByZXR1cm4gc2lnbiAqIHBhcnNlRmxvYXQodmFsdWUsIDEwKTtcbn1cblxuXG52YXIgU0NJRU5USUZJQ19XSVRIT1VUX0RPVCA9IC9eWy0rXT9bMC05XStlLztcblxuZnVuY3Rpb24gcmVwcmVzZW50WWFtbEZsb2F0KG9iamVjdCwgc3R5bGUpIHtcbiAgdmFyIHJlcztcblxuICBpZiAoaXNOYU4ob2JqZWN0KSkge1xuICAgIHN3aXRjaCAoc3R5bGUpIHtcbiAgICAgIGNhc2UgJ2xvd2VyY2FzZSc6IHJldHVybiAnLm5hbic7XG4gICAgICBjYXNlICd1cHBlcmNhc2UnOiByZXR1cm4gJy5OQU4nO1xuICAgICAgY2FzZSAnY2FtZWxjYXNlJzogcmV0dXJuICcuTmFOJztcbiAgICB9XG4gIH0gZWxzZSBpZiAoTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZID09PSBvYmplY3QpIHtcbiAgICBzd2l0Y2ggKHN0eWxlKSB7XG4gICAgICBjYXNlICdsb3dlcmNhc2UnOiByZXR1cm4gJy5pbmYnO1xuICAgICAgY2FzZSAndXBwZXJjYXNlJzogcmV0dXJuICcuSU5GJztcbiAgICAgIGNhc2UgJ2NhbWVsY2FzZSc6IHJldHVybiAnLkluZic7XG4gICAgfVxuICB9IGVsc2UgaWYgKE51bWJlci5ORUdBVElWRV9JTkZJTklUWSA9PT0gb2JqZWN0KSB7XG4gICAgc3dpdGNoIChzdHlsZSkge1xuICAgICAgY2FzZSAnbG93ZXJjYXNlJzogcmV0dXJuICctLmluZic7XG4gICAgICBjYXNlICd1cHBlcmNhc2UnOiByZXR1cm4gJy0uSU5GJztcbiAgICAgIGNhc2UgJ2NhbWVsY2FzZSc6IHJldHVybiAnLS5JbmYnO1xuICAgIH1cbiAgfSBlbHNlIGlmIChjb21tb24uaXNOZWdhdGl2ZVplcm8ob2JqZWN0KSkge1xuICAgIHJldHVybiAnLTAuMCc7XG4gIH1cblxuICByZXMgPSBvYmplY3QudG9TdHJpbmcoMTApO1xuXG4gIC8vIEpTIHN0cmluZ2lmaWVyIGNhbiBidWlsZCBzY2llbnRpZmljIGZvcm1hdCB3aXRob3V0IGRvdHM6IDVlLTEwMCxcbiAgLy8gd2hpbGUgWUFNTCByZXF1cmVzIGRvdDogNS5lLTEwMC4gRml4IGl0IHdpdGggc2ltcGxlIGhhY2tcblxuICByZXR1cm4gU0NJRU5USUZJQ19XSVRIT1VUX0RPVC50ZXN0KHJlcykgPyByZXMucmVwbGFjZSgnZScsICcuZScpIDogcmVzO1xufVxuXG5mdW5jdGlvbiBpc0Zsb2F0KG9iamVjdCkge1xuICByZXR1cm4gKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpID09PSAnW29iamVjdCBOdW1iZXJdJykgJiZcbiAgICAgICAgIChvYmplY3QgJSAxICE9PSAwIHx8IGNvbW1vbi5pc05lZ2F0aXZlWmVybyhvYmplY3QpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZSgndGFnOnlhbWwub3JnLDIwMDI6ZmxvYXQnLCB7XG4gIGtpbmQ6ICdzY2FsYXInLFxuICByZXNvbHZlOiByZXNvbHZlWWFtbEZsb2F0LFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdFlhbWxGbG9hdCxcbiAgcHJlZGljYXRlOiBpc0Zsb2F0LFxuICByZXByZXNlbnQ6IHJlcHJlc2VudFlhbWxGbG9hdCxcbiAgZGVmYXVsdFN0eWxlOiAnbG93ZXJjYXNlJ1xufSk7XG4iLCAiLy8gU3RhbmRhcmQgWUFNTCdzIEpTT04gc2NoZW1hLlxuLy8gaHR0cDovL3d3dy55YW1sLm9yZy9zcGVjLzEuMi9zcGVjLmh0bWwjaWQyODAzMjMxXG4vL1xuLy8gTk9URTogSlMtWUFNTCBkb2VzIG5vdCBzdXBwb3J0IHNjaGVtYS1zcGVjaWZpYyB0YWcgcmVzb2x1dGlvbiByZXN0cmljdGlvbnMuXG4vLyBTbywgdGhpcyBzY2hlbWEgaXMgbm90IHN1Y2ggc3RyaWN0IGFzIGRlZmluZWQgaW4gdGhlIFlBTUwgc3BlY2lmaWNhdGlvbi5cbi8vIEl0IGFsbG93cyBudW1iZXJzIGluIGJpbmFyeSBub3RhaW9uLCB1c2UgYE51bGxgIGFuZCBgTlVMTGAgYXMgYG51bGxgLCBldGMuXG5cblxuJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciBTY2hlbWEgPSByZXF1aXJlKCcuLi9zY2hlbWEnKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTY2hlbWEoe1xuICBpbmNsdWRlOiBbXG4gICAgcmVxdWlyZSgnLi9mYWlsc2FmZScpXG4gIF0sXG4gIGltcGxpY2l0OiBbXG4gICAgcmVxdWlyZSgnLi4vdHlwZS9udWxsJyksXG4gICAgcmVxdWlyZSgnLi4vdHlwZS9ib29sJyksXG4gICAgcmVxdWlyZSgnLi4vdHlwZS9pbnQnKSxcbiAgICByZXF1aXJlKCcuLi90eXBlL2Zsb2F0JylcbiAgXVxufSk7XG4iLCAiLy8gU3RhbmRhcmQgWUFNTCdzIENvcmUgc2NoZW1hLlxuLy8gaHR0cDovL3d3dy55YW1sLm9yZy9zcGVjLzEuMi9zcGVjLmh0bWwjaWQyODA0OTIzXG4vL1xuLy8gTk9URTogSlMtWUFNTCBkb2VzIG5vdCBzdXBwb3J0IHNjaGVtYS1zcGVjaWZpYyB0YWcgcmVzb2x1dGlvbiByZXN0cmljdGlvbnMuXG4vLyBTbywgQ29yZSBzY2hlbWEgaGFzIG5vIGRpc3RpbmN0aW9ucyBmcm9tIEpTT04gc2NoZW1hIGlzIEpTLVlBTUwuXG5cblxuJ3VzZSBzdHJpY3QnO1xuXG5cbnZhciBTY2hlbWEgPSByZXF1aXJlKCcuLi9zY2hlbWEnKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBTY2hlbWEoe1xuICBpbmNsdWRlOiBbXG4gICAgcmVxdWlyZSgnLi9qc29uJylcbiAgXVxufSk7XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVHlwZSA9IHJlcXVpcmUoJy4uL3R5cGUnKTtcblxudmFyIFlBTUxfREFURV9SRUdFWFAgPSBuZXcgUmVnRXhwKFxuICAnXihbMC05XVswLTldWzAtOV1bMC05XSknICAgICAgICAgICsgLy8gWzFdIHllYXJcbiAgJy0oWzAtOV1bMC05XSknICAgICAgICAgICAgICAgICAgICArIC8vIFsyXSBtb250aFxuICAnLShbMC05XVswLTldKSQnKTsgICAgICAgICAgICAgICAgICAgLy8gWzNdIGRheVxuXG52YXIgWUFNTF9USU1FU1RBTVBfUkVHRVhQID0gbmV3IFJlZ0V4cChcbiAgJ14oWzAtOV1bMC05XVswLTldWzAtOV0pJyAgICAgICAgICArIC8vIFsxXSB5ZWFyXG4gICctKFswLTldWzAtOV0/KScgICAgICAgICAgICAgICAgICAgKyAvLyBbMl0gbW9udGhcbiAgJy0oWzAtOV1bMC05XT8pJyAgICAgICAgICAgICAgICAgICArIC8vIFszXSBkYXlcbiAgJyg/OltUdF18WyBcXFxcdF0rKScgICAgICAgICAgICAgICAgICsgLy8gLi4uXG4gICcoWzAtOV1bMC05XT8pJyAgICAgICAgICAgICAgICAgICAgKyAvLyBbNF0gaG91clxuICAnOihbMC05XVswLTldKScgICAgICAgICAgICAgICAgICAgICsgLy8gWzVdIG1pbnV0ZVxuICAnOihbMC05XVswLTldKScgICAgICAgICAgICAgICAgICAgICsgLy8gWzZdIHNlY29uZFxuICAnKD86XFxcXC4oWzAtOV0qKSk/JyAgICAgICAgICAgICAgICAgKyAvLyBbN10gZnJhY3Rpb25cbiAgJyg/OlsgXFxcXHRdKihafChbLStdKShbMC05XVswLTldPyknICsgLy8gWzhdIHR6IFs5XSB0el9zaWduIFsxMF0gdHpfaG91clxuICAnKD86OihbMC05XVswLTldKSk/KSk/JCcpOyAgICAgICAgICAgLy8gWzExXSB0el9taW51dGVcblxuZnVuY3Rpb24gcmVzb2x2ZVlhbWxUaW1lc3RhbXAoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICBpZiAoWUFNTF9EQVRFX1JFR0VYUC5leGVjKGRhdGEpICE9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKFlBTUxfVElNRVNUQU1QX1JFR0VYUC5leGVjKGRhdGEpICE9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RZYW1sVGltZXN0YW1wKGRhdGEpIHtcbiAgdmFyIG1hdGNoLCB5ZWFyLCBtb250aCwgZGF5LCBob3VyLCBtaW51dGUsIHNlY29uZCwgZnJhY3Rpb24gPSAwLFxuICAgICAgZGVsdGEgPSBudWxsLCB0el9ob3VyLCB0el9taW51dGUsIGRhdGU7XG5cbiAgbWF0Y2ggPSBZQU1MX0RBVEVfUkVHRVhQLmV4ZWMoZGF0YSk7XG4gIGlmIChtYXRjaCA9PT0gbnVsbCkgbWF0Y2ggPSBZQU1MX1RJTUVTVEFNUF9SRUdFWFAuZXhlYyhkYXRhKTtcblxuICBpZiAobWF0Y2ggPT09IG51bGwpIHRocm93IG5ldyBFcnJvcignRGF0ZSByZXNvbHZlIGVycm9yJyk7XG5cbiAgLy8gbWF0Y2g6IFsxXSB5ZWFyIFsyXSBtb250aCBbM10gZGF5XG5cbiAgeWVhciA9ICsobWF0Y2hbMV0pO1xuICBtb250aCA9ICsobWF0Y2hbMl0pIC0gMTsgLy8gSlMgbW9udGggc3RhcnRzIHdpdGggMFxuICBkYXkgPSArKG1hdGNoWzNdKTtcblxuICBpZiAoIW1hdGNoWzRdKSB7IC8vIG5vIGhvdXJcbiAgICByZXR1cm4gbmV3IERhdGUoRGF0ZS5VVEMoeWVhciwgbW9udGgsIGRheSkpO1xuICB9XG5cbiAgLy8gbWF0Y2g6IFs0XSBob3VyIFs1XSBtaW51dGUgWzZdIHNlY29uZCBbN10gZnJhY3Rpb25cblxuICBob3VyID0gKyhtYXRjaFs0XSk7XG4gIG1pbnV0ZSA9ICsobWF0Y2hbNV0pO1xuICBzZWNvbmQgPSArKG1hdGNoWzZdKTtcblxuICBpZiAobWF0Y2hbN10pIHtcbiAgICBmcmFjdGlvbiA9IG1hdGNoWzddLnNsaWNlKDAsIDMpO1xuICAgIHdoaWxlIChmcmFjdGlvbi5sZW5ndGggPCAzKSB7IC8vIG1pbGxpLXNlY29uZHNcbiAgICAgIGZyYWN0aW9uICs9ICcwJztcbiAgICB9XG4gICAgZnJhY3Rpb24gPSArZnJhY3Rpb247XG4gIH1cblxuICAvLyBtYXRjaDogWzhdIHR6IFs5XSB0el9zaWduIFsxMF0gdHpfaG91ciBbMTFdIHR6X21pbnV0ZVxuXG4gIGlmIChtYXRjaFs5XSkge1xuICAgIHR6X2hvdXIgPSArKG1hdGNoWzEwXSk7XG4gICAgdHpfbWludXRlID0gKyhtYXRjaFsxMV0gfHwgMCk7XG4gICAgZGVsdGEgPSAodHpfaG91ciAqIDYwICsgdHpfbWludXRlKSAqIDYwMDAwOyAvLyBkZWx0YSBpbiBtaWxpLXNlY29uZHNcbiAgICBpZiAobWF0Y2hbOV0gPT09ICctJykgZGVsdGEgPSAtZGVsdGE7XG4gIH1cblxuICBkYXRlID0gbmV3IERhdGUoRGF0ZS5VVEMoeWVhciwgbW9udGgsIGRheSwgaG91ciwgbWludXRlLCBzZWNvbmQsIGZyYWN0aW9uKSk7XG5cbiAgaWYgKGRlbHRhKSBkYXRlLnNldFRpbWUoZGF0ZS5nZXRUaW1lKCkgLSBkZWx0YSk7XG5cbiAgcmV0dXJuIGRhdGU7XG59XG5cbmZ1bmN0aW9uIHJlcHJlc2VudFlhbWxUaW1lc3RhbXAob2JqZWN0IC8qLCBzdHlsZSovKSB7XG4gIHJldHVybiBvYmplY3QudG9JU09TdHJpbmcoKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZSgndGFnOnlhbWwub3JnLDIwMDI6dGltZXN0YW1wJywge1xuICBraW5kOiAnc2NhbGFyJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZVlhbWxUaW1lc3RhbXAsXG4gIGNvbnN0cnVjdDogY29uc3RydWN0WWFtbFRpbWVzdGFtcCxcbiAgaW5zdGFuY2VPZjogRGF0ZSxcbiAgcmVwcmVzZW50OiByZXByZXNlbnRZYW1sVGltZXN0YW1wXG59KTtcbiIsICIndXNlIHN0cmljdCc7XG5cbnZhciBUeXBlID0gcmVxdWlyZSgnLi4vdHlwZScpO1xuXG5mdW5jdGlvbiByZXNvbHZlWWFtbE1lcmdlKGRhdGEpIHtcbiAgcmV0dXJuIGRhdGEgPT09ICc8PCcgfHwgZGF0YSA9PT0gbnVsbDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZSgndGFnOnlhbWwub3JnLDIwMDI6bWVyZ2UnLCB7XG4gIGtpbmQ6ICdzY2FsYXInLFxuICByZXNvbHZlOiByZXNvbHZlWWFtbE1lcmdlXG59KTtcbiIsICIndXNlIHN0cmljdCc7XG5cbi8qZXNsaW50LWRpc2FibGUgbm8tYml0d2lzZSovXG5cbnZhciBOb2RlQnVmZmVyO1xuXG50cnkge1xuICAvLyBBIHRyaWNrIGZvciBicm93c2VyaWZpZWQgdmVyc2lvbiwgdG8gbm90IGluY2x1ZGUgYEJ1ZmZlcmAgc2hpbVxuICB2YXIgX3JlcXVpcmUgPSByZXF1aXJlO1xuICBOb2RlQnVmZmVyID0gX3JlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlcjtcbn0gY2F0Y2ggKF9fKSB7fVxuXG52YXIgVHlwZSAgICAgICA9IHJlcXVpcmUoJy4uL3R5cGUnKTtcblxuXG4vLyBbIDY0LCA2NSwgNjYgXSAtPiBbIHBhZGRpbmcsIENSLCBMRiBdXG52YXIgQkFTRTY0X01BUCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvPVxcblxccic7XG5cblxuZnVuY3Rpb24gcmVzb2x2ZVlhbWxCaW5hcnkoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuXG4gIHZhciBjb2RlLCBpZHgsIGJpdGxlbiA9IDAsIG1heCA9IGRhdGEubGVuZ3RoLCBtYXAgPSBCQVNFNjRfTUFQO1xuXG4gIC8vIENvbnZlcnQgb25lIGJ5IG9uZS5cbiAgZm9yIChpZHggPSAwOyBpZHggPCBtYXg7IGlkeCsrKSB7XG4gICAgY29kZSA9IG1hcC5pbmRleE9mKGRhdGEuY2hhckF0KGlkeCkpO1xuXG4gICAgLy8gU2tpcCBDUi9MRlxuICAgIGlmIChjb2RlID4gNjQpIGNvbnRpbnVlO1xuXG4gICAgLy8gRmFpbCBvbiBpbGxlZ2FsIGNoYXJhY3RlcnNcbiAgICBpZiAoY29kZSA8IDApIHJldHVybiBmYWxzZTtcblxuICAgIGJpdGxlbiArPSA2O1xuICB9XG5cbiAgLy8gSWYgdGhlcmUgYXJlIGFueSBiaXRzIGxlZnQsIHNvdXJjZSB3YXMgY29ycnVwdGVkXG4gIHJldHVybiAoYml0bGVuICUgOCkgPT09IDA7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFlhbWxCaW5hcnkoZGF0YSkge1xuICB2YXIgaWR4LCB0YWlsYml0cyxcbiAgICAgIGlucHV0ID0gZGF0YS5yZXBsYWNlKC9bXFxyXFxuPV0vZywgJycpLCAvLyByZW1vdmUgQ1IvTEYgJiBwYWRkaW5nIHRvIHNpbXBsaWZ5IHNjYW5cbiAgICAgIG1heCA9IGlucHV0Lmxlbmd0aCxcbiAgICAgIG1hcCA9IEJBU0U2NF9NQVAsXG4gICAgICBiaXRzID0gMCxcbiAgICAgIHJlc3VsdCA9IFtdO1xuXG4gIC8vIENvbGxlY3QgYnkgNio0IGJpdHMgKDMgYnl0ZXMpXG5cbiAgZm9yIChpZHggPSAwOyBpZHggPCBtYXg7IGlkeCsrKSB7XG4gICAgaWYgKChpZHggJSA0ID09PSAwKSAmJiBpZHgpIHtcbiAgICAgIHJlc3VsdC5wdXNoKChiaXRzID4+IDE2KSAmIDB4RkYpO1xuICAgICAgcmVzdWx0LnB1c2goKGJpdHMgPj4gOCkgJiAweEZGKTtcbiAgICAgIHJlc3VsdC5wdXNoKGJpdHMgJiAweEZGKTtcbiAgICB9XG5cbiAgICBiaXRzID0gKGJpdHMgPDwgNikgfCBtYXAuaW5kZXhPZihpbnB1dC5jaGFyQXQoaWR4KSk7XG4gIH1cblxuICAvLyBEdW1wIHRhaWxcblxuICB0YWlsYml0cyA9IChtYXggJSA0KSAqIDY7XG5cbiAgaWYgKHRhaWxiaXRzID09PSAwKSB7XG4gICAgcmVzdWx0LnB1c2goKGJpdHMgPj4gMTYpICYgMHhGRik7XG4gICAgcmVzdWx0LnB1c2goKGJpdHMgPj4gOCkgJiAweEZGKTtcbiAgICByZXN1bHQucHVzaChiaXRzICYgMHhGRik7XG4gIH0gZWxzZSBpZiAodGFpbGJpdHMgPT09IDE4KSB7XG4gICAgcmVzdWx0LnB1c2goKGJpdHMgPj4gMTApICYgMHhGRik7XG4gICAgcmVzdWx0LnB1c2goKGJpdHMgPj4gMikgJiAweEZGKTtcbiAgfSBlbHNlIGlmICh0YWlsYml0cyA9PT0gMTIpIHtcbiAgICByZXN1bHQucHVzaCgoYml0cyA+PiA0KSAmIDB4RkYpO1xuICB9XG5cbiAgLy8gV3JhcCBpbnRvIEJ1ZmZlciBmb3IgTm9kZUpTIGFuZCBsZWF2ZSBBcnJheSBmb3IgYnJvd3NlclxuICBpZiAoTm9kZUJ1ZmZlcikge1xuICAgIC8vIFN1cHBvcnQgbm9kZSA2LisgQnVmZmVyIEFQSSB3aGVuIGF2YWlsYWJsZVxuICAgIHJldHVybiBOb2RlQnVmZmVyLmZyb20gPyBOb2RlQnVmZmVyLmZyb20ocmVzdWx0KSA6IG5ldyBOb2RlQnVmZmVyKHJlc3VsdCk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiByZXByZXNlbnRZYW1sQmluYXJ5KG9iamVjdCAvKiwgc3R5bGUqLykge1xuICB2YXIgcmVzdWx0ID0gJycsIGJpdHMgPSAwLCBpZHgsIHRhaWwsXG4gICAgICBtYXggPSBvYmplY3QubGVuZ3RoLFxuICAgICAgbWFwID0gQkFTRTY0X01BUDtcblxuICAvLyBDb252ZXJ0IGV2ZXJ5IHRocmVlIGJ5dGVzIHRvIDQgQVNDSUkgY2hhcmFjdGVycy5cblxuICBmb3IgKGlkeCA9IDA7IGlkeCA8IG1heDsgaWR4KyspIHtcbiAgICBpZiAoKGlkeCAlIDMgPT09IDApICYmIGlkeCkge1xuICAgICAgcmVzdWx0ICs9IG1hcFsoYml0cyA+PiAxOCkgJiAweDNGXTtcbiAgICAgIHJlc3VsdCArPSBtYXBbKGJpdHMgPj4gMTIpICYgMHgzRl07XG4gICAgICByZXN1bHQgKz0gbWFwWyhiaXRzID4+IDYpICYgMHgzRl07XG4gICAgICByZXN1bHQgKz0gbWFwW2JpdHMgJiAweDNGXTtcbiAgICB9XG5cbiAgICBiaXRzID0gKGJpdHMgPDwgOCkgKyBvYmplY3RbaWR4XTtcbiAgfVxuXG4gIC8vIER1bXAgdGFpbFxuXG4gIHRhaWwgPSBtYXggJSAzO1xuXG4gIGlmICh0YWlsID09PSAwKSB7XG4gICAgcmVzdWx0ICs9IG1hcFsoYml0cyA+PiAxOCkgJiAweDNGXTtcbiAgICByZXN1bHQgKz0gbWFwWyhiaXRzID4+IDEyKSAmIDB4M0ZdO1xuICAgIHJlc3VsdCArPSBtYXBbKGJpdHMgPj4gNikgJiAweDNGXTtcbiAgICByZXN1bHQgKz0gbWFwW2JpdHMgJiAweDNGXTtcbiAgfSBlbHNlIGlmICh0YWlsID09PSAyKSB7XG4gICAgcmVzdWx0ICs9IG1hcFsoYml0cyA+PiAxMCkgJiAweDNGXTtcbiAgICByZXN1bHQgKz0gbWFwWyhiaXRzID4+IDQpICYgMHgzRl07XG4gICAgcmVzdWx0ICs9IG1hcFsoYml0cyA8PCAyKSAmIDB4M0ZdO1xuICAgIHJlc3VsdCArPSBtYXBbNjRdO1xuICB9IGVsc2UgaWYgKHRhaWwgPT09IDEpIHtcbiAgICByZXN1bHQgKz0gbWFwWyhiaXRzID4+IDIpICYgMHgzRl07XG4gICAgcmVzdWx0ICs9IG1hcFsoYml0cyA8PCA0KSAmIDB4M0ZdO1xuICAgIHJlc3VsdCArPSBtYXBbNjRdO1xuICAgIHJlc3VsdCArPSBtYXBbNjRdO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaXNCaW5hcnkob2JqZWN0KSB7XG4gIHJldHVybiBOb2RlQnVmZmVyICYmIE5vZGVCdWZmZXIuaXNCdWZmZXIob2JqZWN0KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZSgndGFnOnlhbWwub3JnLDIwMDI6YmluYXJ5Jywge1xuICBraW5kOiAnc2NhbGFyJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZVlhbWxCaW5hcnksXG4gIGNvbnN0cnVjdDogY29uc3RydWN0WWFtbEJpbmFyeSxcbiAgcHJlZGljYXRlOiBpc0JpbmFyeSxcbiAgcmVwcmVzZW50OiByZXByZXNlbnRZYW1sQmluYXJ5XG59KTtcbiIsICIndXNlIHN0cmljdCc7XG5cbnZhciBUeXBlID0gcmVxdWlyZSgnLi4vdHlwZScpO1xuXG52YXIgX2hhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciBfdG9TdHJpbmcgICAgICAgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5mdW5jdGlvbiByZXNvbHZlWWFtbE9tYXAoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIHRydWU7XG5cbiAgdmFyIG9iamVjdEtleXMgPSBbXSwgaW5kZXgsIGxlbmd0aCwgcGFpciwgcGFpcktleSwgcGFpckhhc0tleSxcbiAgICAgIG9iamVjdCA9IGRhdGE7XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IG9iamVjdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgcGFpciA9IG9iamVjdFtpbmRleF07XG4gICAgcGFpckhhc0tleSA9IGZhbHNlO1xuXG4gICAgaWYgKF90b1N0cmluZy5jYWxsKHBhaXIpICE9PSAnW29iamVjdCBPYmplY3RdJykgcmV0dXJuIGZhbHNlO1xuXG4gICAgZm9yIChwYWlyS2V5IGluIHBhaXIpIHtcbiAgICAgIGlmIChfaGFzT3duUHJvcGVydHkuY2FsbChwYWlyLCBwYWlyS2V5KSkge1xuICAgICAgICBpZiAoIXBhaXJIYXNLZXkpIHBhaXJIYXNLZXkgPSB0cnVlO1xuICAgICAgICBlbHNlIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXBhaXJIYXNLZXkpIHJldHVybiBmYWxzZTtcblxuICAgIGlmIChvYmplY3RLZXlzLmluZGV4T2YocGFpcktleSkgPT09IC0xKSBvYmplY3RLZXlzLnB1c2gocGFpcktleSk7XG4gICAgZWxzZSByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0WWFtbE9tYXAoZGF0YSkge1xuICByZXR1cm4gZGF0YSAhPT0gbnVsbCA/IGRhdGEgOiBbXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZSgndGFnOnlhbWwub3JnLDIwMDI6b21hcCcsIHtcbiAga2luZDogJ3NlcXVlbmNlJyxcbiAgcmVzb2x2ZTogcmVzb2x2ZVlhbWxPbWFwLFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdFlhbWxPbWFwXG59KTtcbiIsICIndXNlIHN0cmljdCc7XG5cbnZhciBUeXBlID0gcmVxdWlyZSgnLi4vdHlwZScpO1xuXG52YXIgX3RvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuZnVuY3Rpb24gcmVzb2x2ZVlhbWxQYWlycyhkYXRhKSB7XG4gIGlmIChkYXRhID09PSBudWxsKSByZXR1cm4gdHJ1ZTtcblxuICB2YXIgaW5kZXgsIGxlbmd0aCwgcGFpciwga2V5cywgcmVzdWx0LFxuICAgICAgb2JqZWN0ID0gZGF0YTtcblxuICByZXN1bHQgPSBuZXcgQXJyYXkob2JqZWN0Lmxlbmd0aCk7XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IG9iamVjdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgcGFpciA9IG9iamVjdFtpbmRleF07XG5cbiAgICBpZiAoX3RvU3RyaW5nLmNhbGwocGFpcikgIT09ICdbb2JqZWN0IE9iamVjdF0nKSByZXR1cm4gZmFsc2U7XG5cbiAgICBrZXlzID0gT2JqZWN0LmtleXMocGFpcik7XG5cbiAgICBpZiAoa2V5cy5sZW5ndGggIT09IDEpIHJldHVybiBmYWxzZTtcblxuICAgIHJlc3VsdFtpbmRleF0gPSBbIGtleXNbMF0sIHBhaXJba2V5c1swXV0gXTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RZYW1sUGFpcnMoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIFtdO1xuXG4gIHZhciBpbmRleCwgbGVuZ3RoLCBwYWlyLCBrZXlzLCByZXN1bHQsXG4gICAgICBvYmplY3QgPSBkYXRhO1xuXG4gIHJlc3VsdCA9IG5ldyBBcnJheShvYmplY3QubGVuZ3RoKTtcblxuICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gb2JqZWN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICBwYWlyID0gb2JqZWN0W2luZGV4XTtcblxuICAgIGtleXMgPSBPYmplY3Qua2V5cyhwYWlyKTtcblxuICAgIHJlc3VsdFtpbmRleF0gPSBbIGtleXNbMF0sIHBhaXJba2V5c1swXV0gXTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOnBhaXJzJywge1xuICBraW5kOiAnc2VxdWVuY2UnLFxuICByZXNvbHZlOiByZXNvbHZlWWFtbFBhaXJzLFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdFlhbWxQYWlyc1xufSk7XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVHlwZSA9IHJlcXVpcmUoJy4uL3R5cGUnKTtcblxudmFyIF9oYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbmZ1bmN0aW9uIHJlc29sdmVZYW1sU2V0KGRhdGEpIHtcbiAgaWYgKGRhdGEgPT09IG51bGwpIHJldHVybiB0cnVlO1xuXG4gIHZhciBrZXksIG9iamVjdCA9IGRhdGE7XG5cbiAgZm9yIChrZXkgaW4gb2JqZWN0KSB7XG4gICAgaWYgKF9oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iamVjdCwga2V5KSkge1xuICAgICAgaWYgKG9iamVjdFtrZXldICE9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdFlhbWxTZXQoZGF0YSkge1xuICByZXR1cm4gZGF0YSAhPT0gbnVsbCA/IGRhdGEgOiB7fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZSgndGFnOnlhbWwub3JnLDIwMDI6c2V0Jywge1xuICBraW5kOiAnbWFwcGluZycsXG4gIHJlc29sdmU6IHJlc29sdmVZYW1sU2V0LFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdFlhbWxTZXRcbn0pO1xuIiwgIi8vIEpTLVlBTUwncyBkZWZhdWx0IHNjaGVtYSBmb3IgYHNhZmVMb2FkYCBmdW5jdGlvbi5cbi8vIEl0IGlzIG5vdCBkZXNjcmliZWQgaW4gdGhlIFlBTUwgc3BlY2lmaWNhdGlvbi5cbi8vXG4vLyBUaGlzIHNjaGVtYSBpcyBiYXNlZCBvbiBzdGFuZGFyZCBZQU1MJ3MgQ29yZSBzY2hlbWEgYW5kIGluY2x1ZGVzIG1vc3Qgb2Zcbi8vIGV4dHJhIHR5cGVzIGRlc2NyaWJlZCBhdCBZQU1MIHRhZyByZXBvc2l0b3J5LiAoaHR0cDovL3lhbWwub3JnL3R5cGUvKVxuXG5cbid1c2Ugc3RyaWN0JztcblxuXG52YXIgU2NoZW1hID0gcmVxdWlyZSgnLi4vc2NoZW1hJyk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgU2NoZW1hKHtcbiAgaW5jbHVkZTogW1xuICAgIHJlcXVpcmUoJy4vY29yZScpXG4gIF0sXG4gIGltcGxpY2l0OiBbXG4gICAgcmVxdWlyZSgnLi4vdHlwZS90aW1lc3RhbXAnKSxcbiAgICByZXF1aXJlKCcuLi90eXBlL21lcmdlJylcbiAgXSxcbiAgZXhwbGljaXQ6IFtcbiAgICByZXF1aXJlKCcuLi90eXBlL2JpbmFyeScpLFxuICAgIHJlcXVpcmUoJy4uL3R5cGUvb21hcCcpLFxuICAgIHJlcXVpcmUoJy4uL3R5cGUvcGFpcnMnKSxcbiAgICByZXF1aXJlKCcuLi90eXBlL3NldCcpXG4gIF1cbn0pO1xuIiwgIid1c2Ugc3RyaWN0JztcblxudmFyIFR5cGUgPSByZXF1aXJlKCcuLi8uLi90eXBlJyk7XG5cbmZ1bmN0aW9uIHJlc29sdmVKYXZhc2NyaXB0VW5kZWZpbmVkKCkge1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gY29uc3RydWN0SmF2YXNjcmlwdFVuZGVmaW5lZCgpIHtcbiAgLyplc2xpbnQtZGlzYWJsZSBuby11bmRlZmluZWQqL1xuICByZXR1cm4gdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiByZXByZXNlbnRKYXZhc2NyaXB0VW5kZWZpbmVkKCkge1xuICByZXR1cm4gJyc7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKG9iamVjdCkge1xuICByZXR1cm4gdHlwZW9mIG9iamVjdCA9PT0gJ3VuZGVmaW5lZCc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOmpzL3VuZGVmaW5lZCcsIHtcbiAga2luZDogJ3NjYWxhcicsXG4gIHJlc29sdmU6IHJlc29sdmVKYXZhc2NyaXB0VW5kZWZpbmVkLFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdEphdmFzY3JpcHRVbmRlZmluZWQsXG4gIHByZWRpY2F0ZTogaXNVbmRlZmluZWQsXG4gIHJlcHJlc2VudDogcmVwcmVzZW50SmF2YXNjcmlwdFVuZGVmaW5lZFxufSk7XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVHlwZSA9IHJlcXVpcmUoJy4uLy4uL3R5cGUnKTtcblxuZnVuY3Rpb24gcmVzb2x2ZUphdmFzY3JpcHRSZWdFeHAoZGF0YSkge1xuICBpZiAoZGF0YSA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZGF0YS5sZW5ndGggPT09IDApIHJldHVybiBmYWxzZTtcblxuICB2YXIgcmVnZXhwID0gZGF0YSxcbiAgICAgIHRhaWwgICA9IC9cXC8oW2dpbV0qKSQvLmV4ZWMoZGF0YSksXG4gICAgICBtb2RpZmllcnMgPSAnJztcblxuICAvLyBpZiByZWdleHAgc3RhcnRzIHdpdGggJy8nIGl0IGNhbiBoYXZlIG1vZGlmaWVycyBhbmQgbXVzdCBiZSBwcm9wZXJseSBjbG9zZWRcbiAgLy8gYC9mb28vZ2ltYCAtIG1vZGlmaWVycyB0YWlsIGNhbiBiZSBtYXhpbXVtIDMgY2hhcnNcbiAgaWYgKHJlZ2V4cFswXSA9PT0gJy8nKSB7XG4gICAgaWYgKHRhaWwpIG1vZGlmaWVycyA9IHRhaWxbMV07XG5cbiAgICBpZiAobW9kaWZpZXJzLmxlbmd0aCA+IDMpIHJldHVybiBmYWxzZTtcbiAgICAvLyBpZiBleHByZXNzaW9uIHN0YXJ0cyB3aXRoIC8sIGlzIHNob3VsZCBiZSBwcm9wZXJseSB0ZXJtaW5hdGVkXG4gICAgaWYgKHJlZ2V4cFtyZWdleHAubGVuZ3RoIC0gbW9kaWZpZXJzLmxlbmd0aCAtIDFdICE9PSAnLycpIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBjb25zdHJ1Y3RKYXZhc2NyaXB0UmVnRXhwKGRhdGEpIHtcbiAgdmFyIHJlZ2V4cCA9IGRhdGEsXG4gICAgICB0YWlsICAgPSAvXFwvKFtnaW1dKikkLy5leGVjKGRhdGEpLFxuICAgICAgbW9kaWZpZXJzID0gJyc7XG5cbiAgLy8gYC9mb28vZ2ltYCAtIHRhaWwgY2FuIGJlIG1heGltdW0gNCBjaGFyc1xuICBpZiAocmVnZXhwWzBdID09PSAnLycpIHtcbiAgICBpZiAodGFpbCkgbW9kaWZpZXJzID0gdGFpbFsxXTtcbiAgICByZWdleHAgPSByZWdleHAuc2xpY2UoMSwgcmVnZXhwLmxlbmd0aCAtIG1vZGlmaWVycy5sZW5ndGggLSAxKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUmVnRXhwKHJlZ2V4cCwgbW9kaWZpZXJzKTtcbn1cblxuZnVuY3Rpb24gcmVwcmVzZW50SmF2YXNjcmlwdFJlZ0V4cChvYmplY3QgLyosIHN0eWxlKi8pIHtcbiAgdmFyIHJlc3VsdCA9ICcvJyArIG9iamVjdC5zb3VyY2UgKyAnLyc7XG5cbiAgaWYgKG9iamVjdC5nbG9iYWwpIHJlc3VsdCArPSAnZyc7XG4gIGlmIChvYmplY3QubXVsdGlsaW5lKSByZXN1bHQgKz0gJ20nO1xuICBpZiAob2JqZWN0Lmlnbm9yZUNhc2UpIHJlc3VsdCArPSAnaSc7XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaXNSZWdFeHAob2JqZWN0KSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IFR5cGUoJ3RhZzp5YW1sLm9yZywyMDAyOmpzL3JlZ2V4cCcsIHtcbiAga2luZDogJ3NjYWxhcicsXG4gIHJlc29sdmU6IHJlc29sdmVKYXZhc2NyaXB0UmVnRXhwLFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdEphdmFzY3JpcHRSZWdFeHAsXG4gIHByZWRpY2F0ZTogaXNSZWdFeHAsXG4gIHJlcHJlc2VudDogcmVwcmVzZW50SmF2YXNjcmlwdFJlZ0V4cFxufSk7XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZXNwcmltYTtcblxuLy8gQnJvd3NlcmlmaWVkIHZlcnNpb24gZG9lcyBub3QgaGF2ZSBlc3ByaW1hXG4vL1xuLy8gMS4gRm9yIG5vZGUuanMganVzdCByZXF1aXJlIG1vZHVsZSBhcyBkZXBzXG4vLyAyLiBGb3IgYnJvd3NlciB0cnkgdG8gcmVxdWlyZSBtdWR1bGUgdmlhIGV4dGVybmFsIEFNRCBzeXN0ZW0uXG4vLyAgICBJZiBub3QgZm91bmQgLSB0cnkgdG8gZmFsbGJhY2sgdG8gd2luZG93LmVzcHJpbWEuIElmIG5vdFxuLy8gICAgZm91bmQgdG9vIC0gdGhlbiBmYWlsIHRvIHBhcnNlLlxuLy9cbnRyeSB7XG4gIC8vIHdvcmthcm91bmQgdG8gZXhjbHVkZSBwYWNrYWdlIGZyb20gYnJvd3NlcmlmeSBsaXN0LlxuICB2YXIgX3JlcXVpcmUgPSByZXF1aXJlO1xuICBlc3ByaW1hID0gX3JlcXVpcmUoJ2VzcHJpbWEnKTtcbn0gY2F0Y2ggKF8pIHtcbiAgLyogZXNsaW50LWRpc2FibGUgbm8tcmVkZWNsYXJlICovXG4gIC8qIGdsb2JhbCB3aW5kb3cgKi9cbiAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSBlc3ByaW1hID0gd2luZG93LmVzcHJpbWE7XG59XG5cbnZhciBUeXBlID0gcmVxdWlyZSgnLi4vLi4vdHlwZScpO1xuXG5mdW5jdGlvbiByZXNvbHZlSmF2YXNjcmlwdEZ1bmN0aW9uKGRhdGEpIHtcbiAgaWYgKGRhdGEgPT09IG51bGwpIHJldHVybiBmYWxzZTtcblxuICB0cnkge1xuICAgIHZhciBzb3VyY2UgPSAnKCcgKyBkYXRhICsgJyknLFxuICAgICAgICBhc3QgICAgPSBlc3ByaW1hLnBhcnNlKHNvdXJjZSwgeyByYW5nZTogdHJ1ZSB9KTtcblxuICAgIGlmIChhc3QudHlwZSAgICAgICAgICAgICAgICAgICAgIT09ICdQcm9ncmFtJyAgICAgICAgICAgICB8fFxuICAgICAgICBhc3QuYm9keS5sZW5ndGggICAgICAgICAgICAgIT09IDEgICAgICAgICAgICAgICAgICAgICB8fFxuICAgICAgICBhc3QuYm9keVswXS50eXBlICAgICAgICAgICAgIT09ICdFeHByZXNzaW9uU3RhdGVtZW50JyB8fFxuICAgICAgICAoYXN0LmJvZHlbMF0uZXhwcmVzc2lvbi50eXBlICE9PSAnQXJyb3dGdW5jdGlvbkV4cHJlc3Npb24nICYmXG4gICAgICAgICAgYXN0LmJvZHlbMF0uZXhwcmVzc2lvbi50eXBlICE9PSAnRnVuY3Rpb25FeHByZXNzaW9uJykpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbnN0cnVjdEphdmFzY3JpcHRGdW5jdGlvbihkYXRhKSB7XG4gIC8qanNsaW50IGV2aWw6dHJ1ZSovXG5cbiAgdmFyIHNvdXJjZSA9ICcoJyArIGRhdGEgKyAnKScsXG4gICAgICBhc3QgICAgPSBlc3ByaW1hLnBhcnNlKHNvdXJjZSwgeyByYW5nZTogdHJ1ZSB9KSxcbiAgICAgIHBhcmFtcyA9IFtdLFxuICAgICAgYm9keTtcblxuICBpZiAoYXN0LnR5cGUgICAgICAgICAgICAgICAgICAgICE9PSAnUHJvZ3JhbScgICAgICAgICAgICAgfHxcbiAgICAgIGFzdC5ib2R5Lmxlbmd0aCAgICAgICAgICAgICAhPT0gMSAgICAgICAgICAgICAgICAgICAgIHx8XG4gICAgICBhc3QuYm9keVswXS50eXBlICAgICAgICAgICAgIT09ICdFeHByZXNzaW9uU3RhdGVtZW50JyB8fFxuICAgICAgKGFzdC5ib2R5WzBdLmV4cHJlc3Npb24udHlwZSAhPT0gJ0Fycm93RnVuY3Rpb25FeHByZXNzaW9uJyAmJlxuICAgICAgICBhc3QuYm9keVswXS5leHByZXNzaW9uLnR5cGUgIT09ICdGdW5jdGlvbkV4cHJlc3Npb24nKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHJlc29sdmUgZnVuY3Rpb24nKTtcbiAgfVxuXG4gIGFzdC5ib2R5WzBdLmV4cHJlc3Npb24ucGFyYW1zLmZvckVhY2goZnVuY3Rpb24gKHBhcmFtKSB7XG4gICAgcGFyYW1zLnB1c2gocGFyYW0ubmFtZSk7XG4gIH0pO1xuXG4gIGJvZHkgPSBhc3QuYm9keVswXS5leHByZXNzaW9uLmJvZHkucmFuZ2U7XG5cbiAgLy8gRXNwcmltYSdzIHJhbmdlcyBpbmNsdWRlIHRoZSBmaXJzdCAneycgYW5kIHRoZSBsYXN0ICd9JyBjaGFyYWN0ZXJzIG9uXG4gIC8vIGZ1bmN0aW9uIGV4cHJlc3Npb25zLiBTbyBjdXQgdGhlbSBvdXQuXG4gIGlmIChhc3QuYm9keVswXS5leHByZXNzaW9uLmJvZHkudHlwZSA9PT0gJ0Jsb2NrU3RhdGVtZW50Jykge1xuICAgIC8qZXNsaW50LWRpc2FibGUgbm8tbmV3LWZ1bmMqL1xuICAgIHJldHVybiBuZXcgRnVuY3Rpb24ocGFyYW1zLCBzb3VyY2Uuc2xpY2UoYm9keVswXSArIDEsIGJvZHlbMV0gLSAxKSk7XG4gIH1cbiAgLy8gRVM2IGFycm93IGZ1bmN0aW9ucyBjYW4gb21pdCB0aGUgQmxvY2tTdGF0ZW1lbnQuIEluIHRoYXQgY2FzZSwganVzdCByZXR1cm5cbiAgLy8gdGhlIGJvZHkuXG4gIC8qZXNsaW50LWRpc2FibGUgbm8tbmV3LWZ1bmMqL1xuICByZXR1cm4gbmV3IEZ1bmN0aW9uKHBhcmFtcywgJ3JldHVybiAnICsgc291cmNlLnNsaWNlKGJvZHlbMF0sIGJvZHlbMV0pKTtcbn1cblxuZnVuY3Rpb24gcmVwcmVzZW50SmF2YXNjcmlwdEZ1bmN0aW9uKG9iamVjdCAvKiwgc3R5bGUqLykge1xuICByZXR1cm4gb2JqZWN0LnRvU3RyaW5nKCk7XG59XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24ob2JqZWN0KSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgVHlwZSgndGFnOnlhbWwub3JnLDIwMDI6anMvZnVuY3Rpb24nLCB7XG4gIGtpbmQ6ICdzY2FsYXInLFxuICByZXNvbHZlOiByZXNvbHZlSmF2YXNjcmlwdEZ1bmN0aW9uLFxuICBjb25zdHJ1Y3Q6IGNvbnN0cnVjdEphdmFzY3JpcHRGdW5jdGlvbixcbiAgcHJlZGljYXRlOiBpc0Z1bmN0aW9uLFxuICByZXByZXNlbnQ6IHJlcHJlc2VudEphdmFzY3JpcHRGdW5jdGlvblxufSk7XG4iLCAiLy8gSlMtWUFNTCdzIGRlZmF1bHQgc2NoZW1hIGZvciBgbG9hZGAgZnVuY3Rpb24uXG4vLyBJdCBpcyBub3QgZGVzY3JpYmVkIGluIHRoZSBZQU1MIHNwZWNpZmljYXRpb24uXG4vL1xuLy8gVGhpcyBzY2hlbWEgaXMgYmFzZWQgb24gSlMtWUFNTCdzIGRlZmF1bHQgc2FmZSBzY2hlbWEgYW5kIGluY2x1ZGVzXG4vLyBKYXZhU2NyaXB0LXNwZWNpZmljIHR5cGVzOiAhIWpzL3VuZGVmaW5lZCwgISFqcy9yZWdleHAgYW5kICEhanMvZnVuY3Rpb24uXG4vL1xuLy8gQWxzbyB0aGlzIHNjaGVtYSBpcyB1c2VkIGFzIGRlZmF1bHQgYmFzZSBzY2hlbWEgYXQgYFNjaGVtYS5jcmVhdGVgIGZ1bmN0aW9uLlxuXG5cbid1c2Ugc3RyaWN0JztcblxuXG52YXIgU2NoZW1hID0gcmVxdWlyZSgnLi4vc2NoZW1hJyk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBTY2hlbWEuREVGQVVMVCA9IG5ldyBTY2hlbWEoe1xuICBpbmNsdWRlOiBbXG4gICAgcmVxdWlyZSgnLi9kZWZhdWx0X3NhZmUnKVxuICBdLFxuICBleHBsaWNpdDogW1xuICAgIHJlcXVpcmUoJy4uL3R5cGUvanMvdW5kZWZpbmVkJyksXG4gICAgcmVxdWlyZSgnLi4vdHlwZS9qcy9yZWdleHAnKSxcbiAgICByZXF1aXJlKCcuLi90eXBlL2pzL2Z1bmN0aW9uJylcbiAgXVxufSk7XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG4vKmVzbGludC1kaXNhYmxlIG1heC1sZW4sbm8tdXNlLWJlZm9yZS1kZWZpbmUqL1xuXG52YXIgY29tbW9uICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vY29tbW9uJyk7XG52YXIgWUFNTEV4Y2VwdGlvbiAgICAgICA9IHJlcXVpcmUoJy4vZXhjZXB0aW9uJyk7XG52YXIgTWFyayAgICAgICAgICAgICAgICA9IHJlcXVpcmUoJy4vbWFyaycpO1xudmFyIERFRkFVTFRfU0FGRV9TQ0hFTUEgPSByZXF1aXJlKCcuL3NjaGVtYS9kZWZhdWx0X3NhZmUnKTtcbnZhciBERUZBVUxUX0ZVTExfU0NIRU1BID0gcmVxdWlyZSgnLi9zY2hlbWEvZGVmYXVsdF9mdWxsJyk7XG5cblxudmFyIF9oYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cblxudmFyIENPTlRFWFRfRkxPV19JTiAgID0gMTtcbnZhciBDT05URVhUX0ZMT1dfT1VUICA9IDI7XG52YXIgQ09OVEVYVF9CTE9DS19JTiAgPSAzO1xudmFyIENPTlRFWFRfQkxPQ0tfT1VUID0gNDtcblxuXG52YXIgQ0hPTVBJTkdfQ0xJUCAgPSAxO1xudmFyIENIT01QSU5HX1NUUklQID0gMjtcbnZhciBDSE9NUElOR19LRUVQICA9IDM7XG5cblxudmFyIFBBVFRFUk5fTk9OX1BSSU5UQUJMRSAgICAgICAgID0gL1tcXHgwMC1cXHgwOFxceDBCXFx4MENcXHgwRS1cXHgxRlxceDdGLVxceDg0XFx4ODYtXFx4OUZcXHVGRkZFXFx1RkZGRl18W1xcdUQ4MDAtXFx1REJGRl0oPyFbXFx1REMwMC1cXHVERkZGXSl8KD86W15cXHVEODAwLVxcdURCRkZdfF4pW1xcdURDMDAtXFx1REZGRl0vO1xudmFyIFBBVFRFUk5fTk9OX0FTQ0lJX0xJTkVfQlJFQUtTID0gL1tcXHg4NVxcdTIwMjhcXHUyMDI5XS87XG52YXIgUEFUVEVSTl9GTE9XX0lORElDQVRPUlMgICAgICAgPSAvWyxcXFtcXF1cXHtcXH1dLztcbnZhciBQQVRURVJOX1RBR19IQU5ETEUgICAgICAgICAgICA9IC9eKD86IXwhIXwhW2EtelxcLV0rISkkL2k7XG52YXIgUEFUVEVSTl9UQUdfVVJJICAgICAgICAgICAgICAgPSAvXig/OiF8W14sXFxbXFxdXFx7XFx9XSkoPzolWzAtOWEtZl17Mn18WzAtOWEtelxcLSM7XFwvXFw/OkAmPVxcK1xcJCxfXFwuIX5cXConXFwoXFwpXFxbXFxdXSkqJC9pO1xuXG5cbmZ1bmN0aW9uIF9jbGFzcyhvYmopIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopOyB9XG5cbmZ1bmN0aW9uIGlzX0VPTChjKSB7XG4gIHJldHVybiAoYyA9PT0gMHgwQS8qIExGICovKSB8fCAoYyA9PT0gMHgwRC8qIENSICovKTtcbn1cblxuZnVuY3Rpb24gaXNfV0hJVEVfU1BBQ0UoYykge1xuICByZXR1cm4gKGMgPT09IDB4MDkvKiBUYWIgKi8pIHx8IChjID09PSAweDIwLyogU3BhY2UgKi8pO1xufVxuXG5mdW5jdGlvbiBpc19XU19PUl9FT0woYykge1xuICByZXR1cm4gKGMgPT09IDB4MDkvKiBUYWIgKi8pIHx8XG4gICAgICAgICAoYyA9PT0gMHgyMC8qIFNwYWNlICovKSB8fFxuICAgICAgICAgKGMgPT09IDB4MEEvKiBMRiAqLykgfHxcbiAgICAgICAgIChjID09PSAweDBELyogQ1IgKi8pO1xufVxuXG5mdW5jdGlvbiBpc19GTE9XX0lORElDQVRPUihjKSB7XG4gIHJldHVybiBjID09PSAweDJDLyogLCAqLyB8fFxuICAgICAgICAgYyA9PT0gMHg1Qi8qIFsgKi8gfHxcbiAgICAgICAgIGMgPT09IDB4NUQvKiBdICovIHx8XG4gICAgICAgICBjID09PSAweDdCLyogeyAqLyB8fFxuICAgICAgICAgYyA9PT0gMHg3RC8qIH0gKi87XG59XG5cbmZ1bmN0aW9uIGZyb21IZXhDb2RlKGMpIHtcbiAgdmFyIGxjO1xuXG4gIGlmICgoMHgzMC8qIDAgKi8gPD0gYykgJiYgKGMgPD0gMHgzOS8qIDkgKi8pKSB7XG4gICAgcmV0dXJuIGMgLSAweDMwO1xuICB9XG5cbiAgLyplc2xpbnQtZGlzYWJsZSBuby1iaXR3aXNlKi9cbiAgbGMgPSBjIHwgMHgyMDtcblxuICBpZiAoKDB4NjEvKiBhICovIDw9IGxjKSAmJiAobGMgPD0gMHg2Ni8qIGYgKi8pKSB7XG4gICAgcmV0dXJuIGxjIC0gMHg2MSArIDEwO1xuICB9XG5cbiAgcmV0dXJuIC0xO1xufVxuXG5mdW5jdGlvbiBlc2NhcGVkSGV4TGVuKGMpIHtcbiAgaWYgKGMgPT09IDB4NzgvKiB4ICovKSB7IHJldHVybiAyOyB9XG4gIGlmIChjID09PSAweDc1LyogdSAqLykgeyByZXR1cm4gNDsgfVxuICBpZiAoYyA9PT0gMHg1NS8qIFUgKi8pIHsgcmV0dXJuIDg7IH1cbiAgcmV0dXJuIDA7XG59XG5cbmZ1bmN0aW9uIGZyb21EZWNpbWFsQ29kZShjKSB7XG4gIGlmICgoMHgzMC8qIDAgKi8gPD0gYykgJiYgKGMgPD0gMHgzOS8qIDkgKi8pKSB7XG4gICAgcmV0dXJuIGMgLSAweDMwO1xuICB9XG5cbiAgcmV0dXJuIC0xO1xufVxuXG5mdW5jdGlvbiBzaW1wbGVFc2NhcGVTZXF1ZW5jZShjKSB7XG4gIC8qIGVzbGludC1kaXNhYmxlIGluZGVudCAqL1xuICByZXR1cm4gKGMgPT09IDB4MzAvKiAwICovKSA/ICdcXHgwMCcgOlxuICAgICAgICAoYyA9PT0gMHg2MS8qIGEgKi8pID8gJ1xceDA3JyA6XG4gICAgICAgIChjID09PSAweDYyLyogYiAqLykgPyAnXFx4MDgnIDpcbiAgICAgICAgKGMgPT09IDB4NzQvKiB0ICovKSA/ICdcXHgwOScgOlxuICAgICAgICAoYyA9PT0gMHgwOS8qIFRhYiAqLykgPyAnXFx4MDknIDpcbiAgICAgICAgKGMgPT09IDB4NkUvKiBuICovKSA/ICdcXHgwQScgOlxuICAgICAgICAoYyA9PT0gMHg3Ni8qIHYgKi8pID8gJ1xceDBCJyA6XG4gICAgICAgIChjID09PSAweDY2LyogZiAqLykgPyAnXFx4MEMnIDpcbiAgICAgICAgKGMgPT09IDB4NzIvKiByICovKSA/ICdcXHgwRCcgOlxuICAgICAgICAoYyA9PT0gMHg2NS8qIGUgKi8pID8gJ1xceDFCJyA6XG4gICAgICAgIChjID09PSAweDIwLyogU3BhY2UgKi8pID8gJyAnIDpcbiAgICAgICAgKGMgPT09IDB4MjIvKiBcIiAqLykgPyAnXFx4MjInIDpcbiAgICAgICAgKGMgPT09IDB4MkYvKiAvICovKSA/ICcvJyA6XG4gICAgICAgIChjID09PSAweDVDLyogXFwgKi8pID8gJ1xceDVDJyA6XG4gICAgICAgIChjID09PSAweDRFLyogTiAqLykgPyAnXFx4ODUnIDpcbiAgICAgICAgKGMgPT09IDB4NUYvKiBfICovKSA/ICdcXHhBMCcgOlxuICAgICAgICAoYyA9PT0gMHg0Qy8qIEwgKi8pID8gJ1xcdTIwMjgnIDpcbiAgICAgICAgKGMgPT09IDB4NTAvKiBQICovKSA/ICdcXHUyMDI5JyA6ICcnO1xufVxuXG5mdW5jdGlvbiBjaGFyRnJvbUNvZGVwb2ludChjKSB7XG4gIGlmIChjIDw9IDB4RkZGRikge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGMpO1xuICB9XG4gIC8vIEVuY29kZSBVVEYtMTYgc3Vycm9nYXRlIHBhaXJcbiAgLy8gaHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvVVRGLTE2I0NvZGVfcG9pbnRzX1UuMkIwMTAwMDBfdG9fVS4yQjEwRkZGRlxuICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShcbiAgICAoKGMgLSAweDAxMDAwMCkgPj4gMTApICsgMHhEODAwLFxuICAgICgoYyAtIDB4MDEwMDAwKSAmIDB4MDNGRikgKyAweERDMDBcbiAgKTtcbn1cblxuLy8gc2V0IGEgcHJvcGVydHkgb2YgYSBsaXRlcmFsIG9iamVjdCwgd2hpbGUgcHJvdGVjdGluZyBhZ2FpbnN0IHByb3RvdHlwZSBwb2xsdXRpb24sXG4vLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL25vZGVjYS9qcy15YW1sL2lzc3Vlcy8xNjQgZm9yIG1vcmUgZGV0YWlsc1xuZnVuY3Rpb24gc2V0UHJvcGVydHkob2JqZWN0LCBrZXksIHZhbHVlKSB7XG4gIC8vIHVzZWQgZm9yIHRoaXMgc3BlY2lmaWMga2V5IG9ubHkgYmVjYXVzZSBPYmplY3QuZGVmaW5lUHJvcGVydHkgaXMgc2xvd1xuICBpZiAoa2V5ID09PSAnX19wcm90b19fJykge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIGtleSwge1xuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgdmFsdWU6IHZhbHVlXG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgb2JqZWN0W2tleV0gPSB2YWx1ZTtcbiAgfVxufVxuXG52YXIgc2ltcGxlRXNjYXBlQ2hlY2sgPSBuZXcgQXJyYXkoMjU2KTsgLy8gaW50ZWdlciwgZm9yIGZhc3QgYWNjZXNzXG52YXIgc2ltcGxlRXNjYXBlTWFwID0gbmV3IEFycmF5KDI1Nik7XG5mb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgaSsrKSB7XG4gIHNpbXBsZUVzY2FwZUNoZWNrW2ldID0gc2ltcGxlRXNjYXBlU2VxdWVuY2UoaSkgPyAxIDogMDtcbiAgc2ltcGxlRXNjYXBlTWFwW2ldID0gc2ltcGxlRXNjYXBlU2VxdWVuY2UoaSk7XG59XG5cblxuZnVuY3Rpb24gU3RhdGUoaW5wdXQsIG9wdGlvbnMpIHtcbiAgdGhpcy5pbnB1dCA9IGlucHV0O1xuXG4gIHRoaXMuZmlsZW5hbWUgID0gb3B0aW9uc1snZmlsZW5hbWUnXSAgfHwgbnVsbDtcbiAgdGhpcy5zY2hlbWEgICAgPSBvcHRpb25zWydzY2hlbWEnXSAgICB8fCBERUZBVUxUX0ZVTExfU0NIRU1BO1xuICB0aGlzLm9uV2FybmluZyA9IG9wdGlvbnNbJ29uV2FybmluZyddIHx8IG51bGw7XG4gIHRoaXMubGVnYWN5ICAgID0gb3B0aW9uc1snbGVnYWN5J10gICAgfHwgZmFsc2U7XG4gIHRoaXMuanNvbiAgICAgID0gb3B0aW9uc1snanNvbiddICAgICAgfHwgZmFsc2U7XG4gIHRoaXMubGlzdGVuZXIgID0gb3B0aW9uc1snbGlzdGVuZXInXSAgfHwgbnVsbDtcblxuICB0aGlzLmltcGxpY2l0VHlwZXMgPSB0aGlzLnNjaGVtYS5jb21waWxlZEltcGxpY2l0O1xuICB0aGlzLnR5cGVNYXAgICAgICAgPSB0aGlzLnNjaGVtYS5jb21waWxlZFR5cGVNYXA7XG5cbiAgdGhpcy5sZW5ndGggICAgID0gaW5wdXQubGVuZ3RoO1xuICB0aGlzLnBvc2l0aW9uICAgPSAwO1xuICB0aGlzLmxpbmUgICAgICAgPSAwO1xuICB0aGlzLmxpbmVTdGFydCAgPSAwO1xuICB0aGlzLmxpbmVJbmRlbnQgPSAwO1xuXG4gIHRoaXMuZG9jdW1lbnRzID0gW107XG5cbiAgLypcbiAgdGhpcy52ZXJzaW9uO1xuICB0aGlzLmNoZWNrTGluZUJyZWFrcztcbiAgdGhpcy50YWdNYXA7XG4gIHRoaXMuYW5jaG9yTWFwO1xuICB0aGlzLnRhZztcbiAgdGhpcy5hbmNob3I7XG4gIHRoaXMua2luZDtcbiAgdGhpcy5yZXN1bHQ7Ki9cblxufVxuXG5cbmZ1bmN0aW9uIGdlbmVyYXRlRXJyb3Ioc3RhdGUsIG1lc3NhZ2UpIHtcbiAgcmV0dXJuIG5ldyBZQU1MRXhjZXB0aW9uKFxuICAgIG1lc3NhZ2UsXG4gICAgbmV3IE1hcmsoc3RhdGUuZmlsZW5hbWUsIHN0YXRlLmlucHV0LCBzdGF0ZS5wb3NpdGlvbiwgc3RhdGUubGluZSwgKHN0YXRlLnBvc2l0aW9uIC0gc3RhdGUubGluZVN0YXJ0KSkpO1xufVxuXG5mdW5jdGlvbiB0aHJvd0Vycm9yKHN0YXRlLCBtZXNzYWdlKSB7XG4gIHRocm93IGdlbmVyYXRlRXJyb3Ioc3RhdGUsIG1lc3NhZ2UpO1xufVxuXG5mdW5jdGlvbiB0aHJvd1dhcm5pbmcoc3RhdGUsIG1lc3NhZ2UpIHtcbiAgaWYgKHN0YXRlLm9uV2FybmluZykge1xuICAgIHN0YXRlLm9uV2FybmluZy5jYWxsKG51bGwsIGdlbmVyYXRlRXJyb3Ioc3RhdGUsIG1lc3NhZ2UpKTtcbiAgfVxufVxuXG5cbnZhciBkaXJlY3RpdmVIYW5kbGVycyA9IHtcblxuICBZQU1MOiBmdW5jdGlvbiBoYW5kbGVZYW1sRGlyZWN0aXZlKHN0YXRlLCBuYW1lLCBhcmdzKSB7XG5cbiAgICB2YXIgbWF0Y2gsIG1ham9yLCBtaW5vcjtcblxuICAgIGlmIChzdGF0ZS52ZXJzaW9uICE9PSBudWxsKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnZHVwbGljYXRpb24gb2YgJVlBTUwgZGlyZWN0aXZlJyk7XG4gICAgfVxuXG4gICAgaWYgKGFyZ3MubGVuZ3RoICE9PSAxKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnWUFNTCBkaXJlY3RpdmUgYWNjZXB0cyBleGFjdGx5IG9uZSBhcmd1bWVudCcpO1xuICAgIH1cblxuICAgIG1hdGNoID0gL14oWzAtOV0rKVxcLihbMC05XSspJC8uZXhlYyhhcmdzWzBdKTtcblxuICAgIGlmIChtYXRjaCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2lsbC1mb3JtZWQgYXJndW1lbnQgb2YgdGhlIFlBTUwgZGlyZWN0aXZlJyk7XG4gICAgfVxuXG4gICAgbWFqb3IgPSBwYXJzZUludChtYXRjaFsxXSwgMTApO1xuICAgIG1pbm9yID0gcGFyc2VJbnQobWF0Y2hbMl0sIDEwKTtcblxuICAgIGlmIChtYWpvciAhPT0gMSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuYWNjZXB0YWJsZSBZQU1MIHZlcnNpb24gb2YgdGhlIGRvY3VtZW50Jyk7XG4gICAgfVxuXG4gICAgc3RhdGUudmVyc2lvbiA9IGFyZ3NbMF07XG4gICAgc3RhdGUuY2hlY2tMaW5lQnJlYWtzID0gKG1pbm9yIDwgMik7XG5cbiAgICBpZiAobWlub3IgIT09IDEgJiYgbWlub3IgIT09IDIpIHtcbiAgICAgIHRocm93V2FybmluZyhzdGF0ZSwgJ3Vuc3VwcG9ydGVkIFlBTUwgdmVyc2lvbiBvZiB0aGUgZG9jdW1lbnQnKTtcbiAgICB9XG4gIH0sXG5cbiAgVEFHOiBmdW5jdGlvbiBoYW5kbGVUYWdEaXJlY3RpdmUoc3RhdGUsIG5hbWUsIGFyZ3MpIHtcblxuICAgIHZhciBoYW5kbGUsIHByZWZpeDtcblxuICAgIGlmIChhcmdzLmxlbmd0aCAhPT0gMikge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ1RBRyBkaXJlY3RpdmUgYWNjZXB0cyBleGFjdGx5IHR3byBhcmd1bWVudHMnKTtcbiAgICB9XG5cbiAgICBoYW5kbGUgPSBhcmdzWzBdO1xuICAgIHByZWZpeCA9IGFyZ3NbMV07XG5cbiAgICBpZiAoIVBBVFRFUk5fVEFHX0hBTkRMRS50ZXN0KGhhbmRsZSkpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdpbGwtZm9ybWVkIHRhZyBoYW5kbGUgKGZpcnN0IGFyZ3VtZW50KSBvZiB0aGUgVEFHIGRpcmVjdGl2ZScpO1xuICAgIH1cblxuICAgIGlmIChfaGFzT3duUHJvcGVydHkuY2FsbChzdGF0ZS50YWdNYXAsIGhhbmRsZSkpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd0aGVyZSBpcyBhIHByZXZpb3VzbHkgZGVjbGFyZWQgc3VmZml4IGZvciBcIicgKyBoYW5kbGUgKyAnXCIgdGFnIGhhbmRsZScpO1xuICAgIH1cblxuICAgIGlmICghUEFUVEVSTl9UQUdfVVJJLnRlc3QocHJlZml4KSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2lsbC1mb3JtZWQgdGFnIHByZWZpeCAoc2Vjb25kIGFyZ3VtZW50KSBvZiB0aGUgVEFHIGRpcmVjdGl2ZScpO1xuICAgIH1cblxuICAgIHN0YXRlLnRhZ01hcFtoYW5kbGVdID0gcHJlZml4O1xuICB9XG59O1xuXG5cbmZ1bmN0aW9uIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBzdGFydCwgZW5kLCBjaGVja0pzb24pIHtcbiAgdmFyIF9wb3NpdGlvbiwgX2xlbmd0aCwgX2NoYXJhY3RlciwgX3Jlc3VsdDtcblxuICBpZiAoc3RhcnQgPCBlbmQpIHtcbiAgICBfcmVzdWx0ID0gc3RhdGUuaW5wdXQuc2xpY2Uoc3RhcnQsIGVuZCk7XG5cbiAgICBpZiAoY2hlY2tKc29uKSB7XG4gICAgICBmb3IgKF9wb3NpdGlvbiA9IDAsIF9sZW5ndGggPSBfcmVzdWx0Lmxlbmd0aDsgX3Bvc2l0aW9uIDwgX2xlbmd0aDsgX3Bvc2l0aW9uICs9IDEpIHtcbiAgICAgICAgX2NoYXJhY3RlciA9IF9yZXN1bHQuY2hhckNvZGVBdChfcG9zaXRpb24pO1xuICAgICAgICBpZiAoIShfY2hhcmFjdGVyID09PSAweDA5IHx8XG4gICAgICAgICAgICAgICgweDIwIDw9IF9jaGFyYWN0ZXIgJiYgX2NoYXJhY3RlciA8PSAweDEwRkZGRikpKSB7XG4gICAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2V4cGVjdGVkIHZhbGlkIEpTT04gY2hhcmFjdGVyJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKFBBVFRFUk5fTk9OX1BSSU5UQUJMRS50ZXN0KF9yZXN1bHQpKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndGhlIHN0cmVhbSBjb250YWlucyBub24tcHJpbnRhYmxlIGNoYXJhY3RlcnMnKTtcbiAgICB9XG5cbiAgICBzdGF0ZS5yZXN1bHQgKz0gX3Jlc3VsdDtcbiAgfVxufVxuXG5mdW5jdGlvbiBtZXJnZU1hcHBpbmdzKHN0YXRlLCBkZXN0aW5hdGlvbiwgc291cmNlLCBvdmVycmlkYWJsZUtleXMpIHtcbiAgdmFyIHNvdXJjZUtleXMsIGtleSwgaW5kZXgsIHF1YW50aXR5O1xuXG4gIGlmICghY29tbW9uLmlzT2JqZWN0KHNvdXJjZSkpIHtcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAnY2Fubm90IG1lcmdlIG1hcHBpbmdzOyB0aGUgcHJvdmlkZWQgc291cmNlIG9iamVjdCBpcyB1bmFjY2VwdGFibGUnKTtcbiAgfVxuXG4gIHNvdXJjZUtleXMgPSBPYmplY3Qua2V5cyhzb3VyY2UpO1xuXG4gIGZvciAoaW5kZXggPSAwLCBxdWFudGl0eSA9IHNvdXJjZUtleXMubGVuZ3RoOyBpbmRleCA8IHF1YW50aXR5OyBpbmRleCArPSAxKSB7XG4gICAga2V5ID0gc291cmNlS2V5c1tpbmRleF07XG5cbiAgICBpZiAoIV9oYXNPd25Qcm9wZXJ0eS5jYWxsKGRlc3RpbmF0aW9uLCBrZXkpKSB7XG4gICAgICBzZXRQcm9wZXJ0eShkZXN0aW5hdGlvbiwga2V5LCBzb3VyY2Vba2V5XSk7XG4gICAgICBvdmVycmlkYWJsZUtleXNba2V5XSA9IHRydWU7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHN0b3JlTWFwcGluZ1BhaXIoc3RhdGUsIF9yZXN1bHQsIG92ZXJyaWRhYmxlS2V5cywga2V5VGFnLCBrZXlOb2RlLCB2YWx1ZU5vZGUsIHN0YXJ0TGluZSwgc3RhcnRQb3MpIHtcbiAgdmFyIGluZGV4LCBxdWFudGl0eTtcblxuICAvLyBUaGUgb3V0cHV0IGlzIGEgcGxhaW4gb2JqZWN0IGhlcmUsIHNvIGtleXMgY2FuIG9ubHkgYmUgc3RyaW5ncy5cbiAgLy8gV2UgbmVlZCB0byBjb252ZXJ0IGtleU5vZGUgdG8gYSBzdHJpbmcsIGJ1dCBkb2luZyBzbyBjYW4gaGFuZyB0aGUgcHJvY2Vzc1xuICAvLyAoZGVlcGx5IG5lc3RlZCBhcnJheXMgdGhhdCBleHBsb2RlIGV4cG9uZW50aWFsbHkgdXNpbmcgYWxpYXNlcykuXG4gIGlmIChBcnJheS5pc0FycmF5KGtleU5vZGUpKSB7XG4gICAga2V5Tm9kZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGtleU5vZGUpO1xuXG4gICAgZm9yIChpbmRleCA9IDAsIHF1YW50aXR5ID0ga2V5Tm9kZS5sZW5ndGg7IGluZGV4IDwgcXVhbnRpdHk7IGluZGV4ICs9IDEpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGtleU5vZGVbaW5kZXhdKSkge1xuICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnbmVzdGVkIGFycmF5cyBhcmUgbm90IHN1cHBvcnRlZCBpbnNpZGUga2V5cycpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGtleU5vZGUgPT09ICdvYmplY3QnICYmIF9jbGFzcyhrZXlOb2RlW2luZGV4XSkgPT09ICdbb2JqZWN0IE9iamVjdF0nKSB7XG4gICAgICAgIGtleU5vZGVbaW5kZXhdID0gJ1tvYmplY3QgT2JqZWN0XSc7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQXZvaWQgY29kZSBleGVjdXRpb24gaW4gbG9hZCgpIHZpYSB0b1N0cmluZyBwcm9wZXJ0eVxuICAvLyAoc3RpbGwgdXNlIGl0cyBvd24gdG9TdHJpbmcgZm9yIGFycmF5cywgdGltZXN0YW1wcyxcbiAgLy8gYW5kIHdoYXRldmVyIHVzZXIgc2NoZW1hIGV4dGVuc2lvbnMgaGFwcGVuIHRvIGhhdmUgQEB0b1N0cmluZ1RhZylcbiAgaWYgKHR5cGVvZiBrZXlOb2RlID09PSAnb2JqZWN0JyAmJiBfY2xhc3Moa2V5Tm9kZSkgPT09ICdbb2JqZWN0IE9iamVjdF0nKSB7XG4gICAga2V5Tm9kZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuICB9XG5cblxuICBrZXlOb2RlID0gU3RyaW5nKGtleU5vZGUpO1xuXG4gIGlmIChfcmVzdWx0ID09PSBudWxsKSB7XG4gICAgX3Jlc3VsdCA9IHt9O1xuICB9XG5cbiAgaWYgKGtleVRhZyA9PT0gJ3RhZzp5YW1sLm9yZywyMDAyOm1lcmdlJykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlTm9kZSkpIHtcbiAgICAgIGZvciAoaW5kZXggPSAwLCBxdWFudGl0eSA9IHZhbHVlTm9kZS5sZW5ndGg7IGluZGV4IDwgcXVhbnRpdHk7IGluZGV4ICs9IDEpIHtcbiAgICAgICAgbWVyZ2VNYXBwaW5ncyhzdGF0ZSwgX3Jlc3VsdCwgdmFsdWVOb2RlW2luZGV4XSwgb3ZlcnJpZGFibGVLZXlzKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbWVyZ2VNYXBwaW5ncyhzdGF0ZSwgX3Jlc3VsdCwgdmFsdWVOb2RlLCBvdmVycmlkYWJsZUtleXMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoIXN0YXRlLmpzb24gJiZcbiAgICAgICAgIV9oYXNPd25Qcm9wZXJ0eS5jYWxsKG92ZXJyaWRhYmxlS2V5cywga2V5Tm9kZSkgJiZcbiAgICAgICAgX2hhc093blByb3BlcnR5LmNhbGwoX3Jlc3VsdCwga2V5Tm9kZSkpIHtcbiAgICAgIHN0YXRlLmxpbmUgPSBzdGFydExpbmUgfHwgc3RhdGUubGluZTtcbiAgICAgIHN0YXRlLnBvc2l0aW9uID0gc3RhcnRQb3MgfHwgc3RhdGUucG9zaXRpb247XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnZHVwbGljYXRlZCBtYXBwaW5nIGtleScpO1xuICAgIH1cbiAgICBzZXRQcm9wZXJ0eShfcmVzdWx0LCBrZXlOb2RlLCB2YWx1ZU5vZGUpO1xuICAgIGRlbGV0ZSBvdmVycmlkYWJsZUtleXNba2V5Tm9kZV07XG4gIH1cblxuICByZXR1cm4gX3Jlc3VsdDtcbn1cblxuZnVuY3Rpb24gcmVhZExpbmVCcmVhayhzdGF0ZSkge1xuICB2YXIgY2g7XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICBpZiAoY2ggPT09IDB4MEEvKiBMRiAqLykge1xuICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gIH0gZWxzZSBpZiAoY2ggPT09IDB4MEQvKiBDUiAqLykge1xuICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gICAgaWYgKHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pID09PSAweDBBLyogTEYgKi8pIHtcbiAgICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICdhIGxpbmUgYnJlYWsgaXMgZXhwZWN0ZWQnKTtcbiAgfVxuXG4gIHN0YXRlLmxpbmUgKz0gMTtcbiAgc3RhdGUubGluZVN0YXJ0ID0gc3RhdGUucG9zaXRpb247XG59XG5cbmZ1bmN0aW9uIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIGFsbG93Q29tbWVudHMsIGNoZWNrSW5kZW50KSB7XG4gIHZhciBsaW5lQnJlYWtzID0gMCxcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgd2hpbGUgKGNoICE9PSAwKSB7XG4gICAgd2hpbGUgKGlzX1dISVRFX1NQQUNFKGNoKSkge1xuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICAgIH1cblxuICAgIGlmIChhbGxvd0NvbW1lbnRzICYmIGNoID09PSAweDIzLyogIyAqLykge1xuICAgICAgZG8ge1xuICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgICB9IHdoaWxlIChjaCAhPT0gMHgwQS8qIExGICovICYmIGNoICE9PSAweDBELyogQ1IgKi8gJiYgY2ggIT09IDApO1xuICAgIH1cblxuICAgIGlmIChpc19FT0woY2gpKSB7XG4gICAgICByZWFkTGluZUJyZWFrKHN0YXRlKTtcblxuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcbiAgICAgIGxpbmVCcmVha3MrKztcbiAgICAgIHN0YXRlLmxpbmVJbmRlbnQgPSAwO1xuXG4gICAgICB3aGlsZSAoY2ggPT09IDB4MjAvKiBTcGFjZSAqLykge1xuICAgICAgICBzdGF0ZS5saW5lSW5kZW50Kys7XG4gICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKGNoZWNrSW5kZW50ICE9PSAtMSAmJiBsaW5lQnJlYWtzICE9PSAwICYmIHN0YXRlLmxpbmVJbmRlbnQgPCBjaGVja0luZGVudCkge1xuICAgIHRocm93V2FybmluZyhzdGF0ZSwgJ2RlZmljaWVudCBpbmRlbnRhdGlvbicpO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVCcmVha3M7XG59XG5cbmZ1bmN0aW9uIHRlc3REb2N1bWVudFNlcGFyYXRvcihzdGF0ZSkge1xuICB2YXIgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb24sXG4gICAgICBjaDtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoX3Bvc2l0aW9uKTtcblxuICAvLyBDb25kaXRpb24gc3RhdGUucG9zaXRpb24gPT09IHN0YXRlLmxpbmVTdGFydCBpcyB0ZXN0ZWRcbiAgLy8gaW4gcGFyZW50IG9uIGVhY2ggY2FsbCwgZm9yIGVmZmljaWVuY3kuIE5vIG5lZWRzIHRvIHRlc3QgaGVyZSBhZ2Fpbi5cbiAgaWYgKChjaCA9PT0gMHgyRC8qIC0gKi8gfHwgY2ggPT09IDB4MkUvKiAuICovKSAmJlxuICAgICAgY2ggPT09IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoX3Bvc2l0aW9uICsgMSkgJiZcbiAgICAgIGNoID09PSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KF9wb3NpdGlvbiArIDIpKSB7XG5cbiAgICBfcG9zaXRpb24gKz0gMztcblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChfcG9zaXRpb24pO1xuXG4gICAgaWYgKGNoID09PSAwIHx8IGlzX1dTX09SX0VPTChjaCkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gd3JpdGVGb2xkZWRMaW5lcyhzdGF0ZSwgY291bnQpIHtcbiAgaWYgKGNvdW50ID09PSAxKSB7XG4gICAgc3RhdGUucmVzdWx0ICs9ICcgJztcbiAgfSBlbHNlIGlmIChjb3VudCA+IDEpIHtcbiAgICBzdGF0ZS5yZXN1bHQgKz0gY29tbW9uLnJlcGVhdCgnXFxuJywgY291bnQgLSAxKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHJlYWRQbGFpblNjYWxhcihzdGF0ZSwgbm9kZUluZGVudCwgd2l0aGluRmxvd0NvbGxlY3Rpb24pIHtcbiAgdmFyIHByZWNlZGluZyxcbiAgICAgIGZvbGxvd2luZyxcbiAgICAgIGNhcHR1cmVTdGFydCxcbiAgICAgIGNhcHR1cmVFbmQsXG4gICAgICBoYXNQZW5kaW5nQ29udGVudCxcbiAgICAgIF9saW5lLFxuICAgICAgX2xpbmVTdGFydCxcbiAgICAgIF9saW5lSW5kZW50LFxuICAgICAgX2tpbmQgPSBzdGF0ZS5raW5kLFxuICAgICAgX3Jlc3VsdCA9IHN0YXRlLnJlc3VsdCxcbiAgICAgIGNoO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGlzX1dTX09SX0VPTChjaCkgICAgICB8fFxuICAgICAgaXNfRkxPV19JTkRJQ0FUT1IoY2gpIHx8XG4gICAgICBjaCA9PT0gMHgyMy8qICMgKi8gICAgfHxcbiAgICAgIGNoID09PSAweDI2LyogJiAqLyAgICB8fFxuICAgICAgY2ggPT09IDB4MkEvKiAqICovICAgIHx8XG4gICAgICBjaCA9PT0gMHgyMS8qICEgKi8gICAgfHxcbiAgICAgIGNoID09PSAweDdDLyogfCAqLyAgICB8fFxuICAgICAgY2ggPT09IDB4M0UvKiA+ICovICAgIHx8XG4gICAgICBjaCA9PT0gMHgyNy8qICcgKi8gICAgfHxcbiAgICAgIGNoID09PSAweDIyLyogXCIgKi8gICAgfHxcbiAgICAgIGNoID09PSAweDI1LyogJSAqLyAgICB8fFxuICAgICAgY2ggPT09IDB4NDAvKiBAICovICAgIHx8XG4gICAgICBjaCA9PT0gMHg2MC8qIGAgKi8pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoY2ggPT09IDB4M0YvKiA/ICovIHx8IGNoID09PSAweDJELyogLSAqLykge1xuICAgIGZvbGxvd2luZyA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24gKyAxKTtcblxuICAgIGlmIChpc19XU19PUl9FT0woZm9sbG93aW5nKSB8fFxuICAgICAgICB3aXRoaW5GbG93Q29sbGVjdGlvbiAmJiBpc19GTE9XX0lORElDQVRPUihmb2xsb3dpbmcpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgc3RhdGUua2luZCA9ICdzY2FsYXInO1xuICBzdGF0ZS5yZXN1bHQgPSAnJztcbiAgY2FwdHVyZVN0YXJ0ID0gY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuICBoYXNQZW5kaW5nQ29udGVudCA9IGZhbHNlO1xuXG4gIHdoaWxlIChjaCAhPT0gMCkge1xuICAgIGlmIChjaCA9PT0gMHgzQS8qIDogKi8pIHtcbiAgICAgIGZvbGxvd2luZyA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24gKyAxKTtcblxuICAgICAgaWYgKGlzX1dTX09SX0VPTChmb2xsb3dpbmcpIHx8XG4gICAgICAgICAgd2l0aGluRmxvd0NvbGxlY3Rpb24gJiYgaXNfRkxPV19JTkRJQ0FUT1IoZm9sbG93aW5nKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAoY2ggPT09IDB4MjMvKiAjICovKSB7XG4gICAgICBwcmVjZWRpbmcgPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uIC0gMSk7XG5cbiAgICAgIGlmIChpc19XU19PUl9FT0wocHJlY2VkaW5nKSkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAoKHN0YXRlLnBvc2l0aW9uID09PSBzdGF0ZS5saW5lU3RhcnQgJiYgdGVzdERvY3VtZW50U2VwYXJhdG9yKHN0YXRlKSkgfHxcbiAgICAgICAgICAgICAgIHdpdGhpbkZsb3dDb2xsZWN0aW9uICYmIGlzX0ZMT1dfSU5ESUNBVE9SKGNoKSkge1xuICAgICAgYnJlYWs7XG5cbiAgICB9IGVsc2UgaWYgKGlzX0VPTChjaCkpIHtcbiAgICAgIF9saW5lID0gc3RhdGUubGluZTtcbiAgICAgIF9saW5lU3RhcnQgPSBzdGF0ZS5saW5lU3RhcnQ7XG4gICAgICBfbGluZUluZGVudCA9IHN0YXRlLmxpbmVJbmRlbnQ7XG4gICAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCBmYWxzZSwgLTEpO1xuXG4gICAgICBpZiAoc3RhdGUubGluZUluZGVudCA+PSBub2RlSW5kZW50KSB7XG4gICAgICAgIGhhc1BlbmRpbmdDb250ZW50ID0gdHJ1ZTtcbiAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS5wb3NpdGlvbiA9IGNhcHR1cmVFbmQ7XG4gICAgICAgIHN0YXRlLmxpbmUgPSBfbGluZTtcbiAgICAgICAgc3RhdGUubGluZVN0YXJ0ID0gX2xpbmVTdGFydDtcbiAgICAgICAgc3RhdGUubGluZUluZGVudCA9IF9saW5lSW5kZW50O1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaGFzUGVuZGluZ0NvbnRlbnQpIHtcbiAgICAgIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIGNhcHR1cmVFbmQsIGZhbHNlKTtcbiAgICAgIHdyaXRlRm9sZGVkTGluZXMoc3RhdGUsIHN0YXRlLmxpbmUgLSBfbGluZSk7XG4gICAgICBjYXB0dXJlU3RhcnQgPSBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb247XG4gICAgICBoYXNQZW5kaW5nQ29udGVudCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghaXNfV0hJVEVfU1BBQ0UoY2gpKSB7XG4gICAgICBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb24gKyAxO1xuICAgIH1cblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgfVxuXG4gIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIGNhcHR1cmVFbmQsIGZhbHNlKTtcblxuICBpZiAoc3RhdGUucmVzdWx0KSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBzdGF0ZS5raW5kID0gX2tpbmQ7XG4gIHN0YXRlLnJlc3VsdCA9IF9yZXN1bHQ7XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcmVhZFNpbmdsZVF1b3RlZFNjYWxhcihzdGF0ZSwgbm9kZUluZGVudCkge1xuICB2YXIgY2gsXG4gICAgICBjYXB0dXJlU3RhcnQsIGNhcHR1cmVFbmQ7XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICBpZiAoY2ggIT09IDB4MjcvKiAnICovKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgc3RhdGUua2luZCA9ICdzY2FsYXInO1xuICBzdGF0ZS5yZXN1bHQgPSAnJztcbiAgc3RhdGUucG9zaXRpb24rKztcbiAgY2FwdHVyZVN0YXJ0ID0gY2FwdHVyZUVuZCA9IHN0YXRlLnBvc2l0aW9uO1xuXG4gIHdoaWxlICgoY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKSkgIT09IDApIHtcbiAgICBpZiAoY2ggPT09IDB4MjcvKiAnICovKSB7XG4gICAgICBjYXB0dXJlU2VnbWVudChzdGF0ZSwgY2FwdHVyZVN0YXJ0LCBzdGF0ZS5wb3NpdGlvbiwgdHJ1ZSk7XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICAgIGlmIChjaCA9PT0gMHgyNy8qICcgKi8pIHtcbiAgICAgICAgY2FwdHVyZVN0YXJ0ID0gc3RhdGUucG9zaXRpb247XG4gICAgICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gICAgICAgIGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIGlmIChpc19FT0woY2gpKSB7XG4gICAgICBjYXB0dXJlU2VnbWVudChzdGF0ZSwgY2FwdHVyZVN0YXJ0LCBjYXB0dXJlRW5kLCB0cnVlKTtcbiAgICAgIHdyaXRlRm9sZGVkTGluZXMoc3RhdGUsIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIGZhbHNlLCBub2RlSW5kZW50KSk7XG4gICAgICBjYXB0dXJlU3RhcnQgPSBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb247XG5cbiAgICB9IGVsc2UgaWYgKHN0YXRlLnBvc2l0aW9uID09PSBzdGF0ZS5saW5lU3RhcnQgJiYgdGVzdERvY3VtZW50U2VwYXJhdG9yKHN0YXRlKSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuZXhwZWN0ZWQgZW5kIG9mIHRoZSBkb2N1bWVudCB3aXRoaW4gYSBzaW5nbGUgcXVvdGVkIHNjYWxhcicpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gICAgICBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb247XG4gICAgfVxuICB9XG5cbiAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuZXhwZWN0ZWQgZW5kIG9mIHRoZSBzdHJlYW0gd2l0aGluIGEgc2luZ2xlIHF1b3RlZCBzY2FsYXInKTtcbn1cblxuZnVuY3Rpb24gcmVhZERvdWJsZVF1b3RlZFNjYWxhcihzdGF0ZSwgbm9kZUluZGVudCkge1xuICB2YXIgY2FwdHVyZVN0YXJ0LFxuICAgICAgY2FwdHVyZUVuZCxcbiAgICAgIGhleExlbmd0aCxcbiAgICAgIGhleFJlc3VsdCxcbiAgICAgIHRtcCxcbiAgICAgIGNoO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoICE9PSAweDIyLyogXCIgKi8pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBzdGF0ZS5raW5kID0gJ3NjYWxhcic7XG4gIHN0YXRlLnJlc3VsdCA9ICcnO1xuICBzdGF0ZS5wb3NpdGlvbisrO1xuICBjYXB0dXJlU3RhcnQgPSBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb247XG5cbiAgd2hpbGUgKChjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pKSAhPT0gMCkge1xuICAgIGlmIChjaCA9PT0gMHgyMi8qIFwiICovKSB7XG4gICAgICBjYXB0dXJlU2VnbWVudChzdGF0ZSwgY2FwdHVyZVN0YXJ0LCBzdGF0ZS5wb3NpdGlvbiwgdHJ1ZSk7XG4gICAgICBzdGF0ZS5wb3NpdGlvbisrO1xuICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICB9IGVsc2UgaWYgKGNoID09PSAweDVDLyogXFwgKi8pIHtcbiAgICAgIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIHN0YXRlLnBvc2l0aW9uLCB0cnVlKTtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcblxuICAgICAgaWYgKGlzX0VPTChjaCkpIHtcbiAgICAgICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgZmFsc2UsIG5vZGVJbmRlbnQpO1xuXG4gICAgICAgIC8vIFRPRE86IHJld29yayB0byBpbmxpbmUgZm4gd2l0aCBubyB0eXBlIGNhc3Q/XG4gICAgICB9IGVsc2UgaWYgKGNoIDwgMjU2ICYmIHNpbXBsZUVzY2FwZUNoZWNrW2NoXSkge1xuICAgICAgICBzdGF0ZS5yZXN1bHQgKz0gc2ltcGxlRXNjYXBlTWFwW2NoXTtcbiAgICAgICAgc3RhdGUucG9zaXRpb24rKztcblxuICAgICAgfSBlbHNlIGlmICgodG1wID0gZXNjYXBlZEhleExlbihjaCkpID4gMCkge1xuICAgICAgICBoZXhMZW5ndGggPSB0bXA7XG4gICAgICAgIGhleFJlc3VsdCA9IDA7XG5cbiAgICAgICAgZm9yICg7IGhleExlbmd0aCA+IDA7IGhleExlbmd0aC0tKSB7XG4gICAgICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gICAgICAgICAgaWYgKCh0bXAgPSBmcm9tSGV4Q29kZShjaCkpID49IDApIHtcbiAgICAgICAgICAgIGhleFJlc3VsdCA9IChoZXhSZXN1bHQgPDwgNCkgKyB0bXA7XG5cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2V4cGVjdGVkIGhleGFkZWNpbWFsIGNoYXJhY3RlcicpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLnJlc3VsdCArPSBjaGFyRnJvbUNvZGVwb2ludChoZXhSZXN1bHQpO1xuXG4gICAgICAgIHN0YXRlLnBvc2l0aW9uKys7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd1bmtub3duIGVzY2FwZSBzZXF1ZW5jZScpO1xuICAgICAgfVxuXG4gICAgICBjYXB0dXJlU3RhcnQgPSBjYXB0dXJlRW5kID0gc3RhdGUucG9zaXRpb247XG5cbiAgICB9IGVsc2UgaWYgKGlzX0VPTChjaCkpIHtcbiAgICAgIGNhcHR1cmVTZWdtZW50KHN0YXRlLCBjYXB0dXJlU3RhcnQsIGNhcHR1cmVFbmQsIHRydWUpO1xuICAgICAgd3JpdGVGb2xkZWRMaW5lcyhzdGF0ZSwgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgZmFsc2UsIG5vZGVJbmRlbnQpKTtcbiAgICAgIGNhcHR1cmVTdGFydCA9IGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcblxuICAgIH0gZWxzZSBpZiAoc3RhdGUucG9zaXRpb24gPT09IHN0YXRlLmxpbmVTdGFydCAmJiB0ZXN0RG9jdW1lbnRTZXBhcmF0b3Ioc3RhdGUpKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndW5leHBlY3RlZCBlbmQgb2YgdGhlIGRvY3VtZW50IHdpdGhpbiBhIGRvdWJsZSBxdW90ZWQgc2NhbGFyJyk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdGUucG9zaXRpb24rKztcbiAgICAgIGNhcHR1cmVFbmQgPSBzdGF0ZS5wb3NpdGlvbjtcbiAgICB9XG4gIH1cblxuICB0aHJvd0Vycm9yKHN0YXRlLCAndW5leHBlY3RlZCBlbmQgb2YgdGhlIHN0cmVhbSB3aXRoaW4gYSBkb3VibGUgcXVvdGVkIHNjYWxhcicpO1xufVxuXG5mdW5jdGlvbiByZWFkRmxvd0NvbGxlY3Rpb24oc3RhdGUsIG5vZGVJbmRlbnQpIHtcbiAgdmFyIHJlYWROZXh0ID0gdHJ1ZSxcbiAgICAgIF9saW5lLFxuICAgICAgX3RhZyAgICAgPSBzdGF0ZS50YWcsXG4gICAgICBfcmVzdWx0LFxuICAgICAgX2FuY2hvciAgPSBzdGF0ZS5hbmNob3IsXG4gICAgICBmb2xsb3dpbmcsXG4gICAgICB0ZXJtaW5hdG9yLFxuICAgICAgaXNQYWlyLFxuICAgICAgaXNFeHBsaWNpdFBhaXIsXG4gICAgICBpc01hcHBpbmcsXG4gICAgICBvdmVycmlkYWJsZUtleXMgPSB7fSxcbiAgICAgIGtleU5vZGUsXG4gICAgICBrZXlUYWcsXG4gICAgICB2YWx1ZU5vZGUsXG4gICAgICBjaDtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gIGlmIChjaCA9PT0gMHg1Qi8qIFsgKi8pIHtcbiAgICB0ZXJtaW5hdG9yID0gMHg1RDsvKiBdICovXG4gICAgaXNNYXBwaW5nID0gZmFsc2U7XG4gICAgX3Jlc3VsdCA9IFtdO1xuICB9IGVsc2UgaWYgKGNoID09PSAweDdCLyogeyAqLykge1xuICAgIHRlcm1pbmF0b3IgPSAweDdEOy8qIH0gKi9cbiAgICBpc01hcHBpbmcgPSB0cnVlO1xuICAgIF9yZXN1bHQgPSB7fTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoc3RhdGUuYW5jaG9yICE9PSBudWxsKSB7XG4gICAgc3RhdGUuYW5jaG9yTWFwW3N0YXRlLmFuY2hvcl0gPSBfcmVzdWx0O1xuICB9XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gIHdoaWxlIChjaCAhPT0gMCkge1xuICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIG5vZGVJbmRlbnQpO1xuXG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICAgIGlmIChjaCA9PT0gdGVybWluYXRvcikge1xuICAgICAgc3RhdGUucG9zaXRpb24rKztcbiAgICAgIHN0YXRlLnRhZyA9IF90YWc7XG4gICAgICBzdGF0ZS5hbmNob3IgPSBfYW5jaG9yO1xuICAgICAgc3RhdGUua2luZCA9IGlzTWFwcGluZyA/ICdtYXBwaW5nJyA6ICdzZXF1ZW5jZSc7XG4gICAgICBzdGF0ZS5yZXN1bHQgPSBfcmVzdWx0O1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICghcmVhZE5leHQpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdtaXNzZWQgY29tbWEgYmV0d2VlbiBmbG93IGNvbGxlY3Rpb24gZW50cmllcycpO1xuICAgIH1cblxuICAgIGtleVRhZyA9IGtleU5vZGUgPSB2YWx1ZU5vZGUgPSBudWxsO1xuICAgIGlzUGFpciA9IGlzRXhwbGljaXRQYWlyID0gZmFsc2U7XG5cbiAgICBpZiAoY2ggPT09IDB4M0YvKiA/ICovKSB7XG4gICAgICBmb2xsb3dpbmcgPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uICsgMSk7XG5cbiAgICAgIGlmIChpc19XU19PUl9FT0woZm9sbG93aW5nKSkge1xuICAgICAgICBpc1BhaXIgPSBpc0V4cGxpY2l0UGFpciA9IHRydWU7XG4gICAgICAgIHN0YXRlLnBvc2l0aW9uKys7XG4gICAgICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIG5vZGVJbmRlbnQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIF9saW5lID0gc3RhdGUubGluZTtcbiAgICBjb21wb3NlTm9kZShzdGF0ZSwgbm9kZUluZGVudCwgQ09OVEVYVF9GTE9XX0lOLCBmYWxzZSwgdHJ1ZSk7XG4gICAga2V5VGFnID0gc3RhdGUudGFnO1xuICAgIGtleU5vZGUgPSBzdGF0ZS5yZXN1bHQ7XG4gICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgbm9kZUluZGVudCk7XG5cbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gICAgaWYgKChpc0V4cGxpY2l0UGFpciB8fCBzdGF0ZS5saW5lID09PSBfbGluZSkgJiYgY2ggPT09IDB4M0EvKiA6ICovKSB7XG4gICAgICBpc1BhaXIgPSB0cnVlO1xuICAgICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuICAgICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgbm9kZUluZGVudCk7XG4gICAgICBjb21wb3NlTm9kZShzdGF0ZSwgbm9kZUluZGVudCwgQ09OVEVYVF9GTE9XX0lOLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICB2YWx1ZU5vZGUgPSBzdGF0ZS5yZXN1bHQ7XG4gICAgfVxuXG4gICAgaWYgKGlzTWFwcGluZykge1xuICAgICAgc3RvcmVNYXBwaW5nUGFpcihzdGF0ZSwgX3Jlc3VsdCwgb3ZlcnJpZGFibGVLZXlzLCBrZXlUYWcsIGtleU5vZGUsIHZhbHVlTm9kZSk7XG4gICAgfSBlbHNlIGlmIChpc1BhaXIpIHtcbiAgICAgIF9yZXN1bHQucHVzaChzdG9yZU1hcHBpbmdQYWlyKHN0YXRlLCBudWxsLCBvdmVycmlkYWJsZUtleXMsIGtleVRhZywga2V5Tm9kZSwgdmFsdWVOb2RlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIF9yZXN1bHQucHVzaChrZXlOb2RlKTtcbiAgICB9XG5cbiAgICBza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCBub2RlSW5kZW50KTtcblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICBpZiAoY2ggPT09IDB4MkMvKiAsICovKSB7XG4gICAgICByZWFkTmV4dCA9IHRydWU7XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlYWROZXh0ID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuZXhwZWN0ZWQgZW5kIG9mIHRoZSBzdHJlYW0gd2l0aGluIGEgZmxvdyBjb2xsZWN0aW9uJyk7XG59XG5cbmZ1bmN0aW9uIHJlYWRCbG9ja1NjYWxhcihzdGF0ZSwgbm9kZUluZGVudCkge1xuICB2YXIgY2FwdHVyZVN0YXJ0LFxuICAgICAgZm9sZGluZyxcbiAgICAgIGNob21waW5nICAgICAgID0gQ0hPTVBJTkdfQ0xJUCxcbiAgICAgIGRpZFJlYWRDb250ZW50ID0gZmFsc2UsXG4gICAgICBkZXRlY3RlZEluZGVudCA9IGZhbHNlLFxuICAgICAgdGV4dEluZGVudCAgICAgPSBub2RlSW5kZW50LFxuICAgICAgZW1wdHlMaW5lcyAgICAgPSAwLFxuICAgICAgYXRNb3JlSW5kZW50ZWQgPSBmYWxzZSxcbiAgICAgIHRtcCxcbiAgICAgIGNoO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoID09PSAweDdDLyogfCAqLykge1xuICAgIGZvbGRpbmcgPSBmYWxzZTtcbiAgfSBlbHNlIGlmIChjaCA9PT0gMHgzRS8qID4gKi8pIHtcbiAgICBmb2xkaW5nID0gdHJ1ZTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBzdGF0ZS5raW5kID0gJ3NjYWxhcic7XG4gIHN0YXRlLnJlc3VsdCA9ICcnO1xuXG4gIHdoaWxlIChjaCAhPT0gMCkge1xuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcblxuICAgIGlmIChjaCA9PT0gMHgyQi8qICsgKi8gfHwgY2ggPT09IDB4MkQvKiAtICovKSB7XG4gICAgICBpZiAoQ0hPTVBJTkdfQ0xJUCA9PT0gY2hvbXBpbmcpIHtcbiAgICAgICAgY2hvbXBpbmcgPSAoY2ggPT09IDB4MkIvKiArICovKSA/IENIT01QSU5HX0tFRVAgOiBDSE9NUElOR19TVFJJUDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdyZXBlYXQgb2YgYSBjaG9tcGluZyBtb2RlIGlkZW50aWZpZXInKTtcbiAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAoKHRtcCA9IGZyb21EZWNpbWFsQ29kZShjaCkpID49IDApIHtcbiAgICAgIGlmICh0bXAgPT09IDApIHtcbiAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2JhZCBleHBsaWNpdCBpbmRlbnRhdGlvbiB3aWR0aCBvZiBhIGJsb2NrIHNjYWxhcjsgaXQgY2Fubm90IGJlIGxlc3MgdGhhbiBvbmUnKTtcbiAgICAgIH0gZWxzZSBpZiAoIWRldGVjdGVkSW5kZW50KSB7XG4gICAgICAgIHRleHRJbmRlbnQgPSBub2RlSW5kZW50ICsgdG1wIC0gMTtcbiAgICAgICAgZGV0ZWN0ZWRJbmRlbnQgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3JlcGVhdCBvZiBhbiBpbmRlbnRhdGlvbiB3aWR0aCBpZGVudGlmaWVyJyk7XG4gICAgICB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKGlzX1dISVRFX1NQQUNFKGNoKSkge1xuICAgIGRvIHsgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pOyB9XG4gICAgd2hpbGUgKGlzX1dISVRFX1NQQUNFKGNoKSk7XG5cbiAgICBpZiAoY2ggPT09IDB4MjMvKiAjICovKSB7XG4gICAgICBkbyB7IGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTsgfVxuICAgICAgd2hpbGUgKCFpc19FT0woY2gpICYmIChjaCAhPT0gMCkpO1xuICAgIH1cbiAgfVxuXG4gIHdoaWxlIChjaCAhPT0gMCkge1xuICAgIHJlYWRMaW5lQnJlYWsoc3RhdGUpO1xuICAgIHN0YXRlLmxpbmVJbmRlbnQgPSAwO1xuXG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICAgIHdoaWxlICgoIWRldGVjdGVkSW5kZW50IHx8IHN0YXRlLmxpbmVJbmRlbnQgPCB0ZXh0SW5kZW50KSAmJlxuICAgICAgICAgICAoY2ggPT09IDB4MjAvKiBTcGFjZSAqLykpIHtcbiAgICAgIHN0YXRlLmxpbmVJbmRlbnQrKztcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICB9XG5cbiAgICBpZiAoIWRldGVjdGVkSW5kZW50ICYmIHN0YXRlLmxpbmVJbmRlbnQgPiB0ZXh0SW5kZW50KSB7XG4gICAgICB0ZXh0SW5kZW50ID0gc3RhdGUubGluZUluZGVudDtcbiAgICB9XG5cbiAgICBpZiAoaXNfRU9MKGNoKSkge1xuICAgICAgZW1wdHlMaW5lcysrO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgLy8gRW5kIG9mIHRoZSBzY2FsYXIuXG4gICAgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPCB0ZXh0SW5kZW50KSB7XG5cbiAgICAgIC8vIFBlcmZvcm0gdGhlIGNob21waW5nLlxuICAgICAgaWYgKGNob21waW5nID09PSBDSE9NUElOR19LRUVQKSB7XG4gICAgICAgIHN0YXRlLnJlc3VsdCArPSBjb21tb24ucmVwZWF0KCdcXG4nLCBkaWRSZWFkQ29udGVudCA/IDEgKyBlbXB0eUxpbmVzIDogZW1wdHlMaW5lcyk7XG4gICAgICB9IGVsc2UgaWYgKGNob21waW5nID09PSBDSE9NUElOR19DTElQKSB7XG4gICAgICAgIGlmIChkaWRSZWFkQ29udGVudCkgeyAvLyBpLmUuIG9ubHkgaWYgdGhlIHNjYWxhciBpcyBub3QgZW1wdHkuXG4gICAgICAgICAgc3RhdGUucmVzdWx0ICs9ICdcXG4nO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEJyZWFrIHRoaXMgYHdoaWxlYCBjeWNsZSBhbmQgZ28gdG8gdGhlIGZ1bmNpdG9uJ3MgZXBpbG9ndWUuXG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBGb2xkZWQgc3R5bGU6IHVzZSBmYW5jeSBydWxlcyB0byBoYW5kbGUgbGluZSBicmVha3MuXG4gICAgaWYgKGZvbGRpbmcpIHtcblxuICAgICAgLy8gTGluZXMgc3RhcnRpbmcgd2l0aCB3aGl0ZSBzcGFjZSBjaGFyYWN0ZXJzIChtb3JlLWluZGVudGVkIGxpbmVzKSBhcmUgbm90IGZvbGRlZC5cbiAgICAgIGlmIChpc19XSElURV9TUEFDRShjaCkpIHtcbiAgICAgICAgYXRNb3JlSW5kZW50ZWQgPSB0cnVlO1xuICAgICAgICAvLyBleGNlcHQgZm9yIHRoZSBmaXJzdCBjb250ZW50IGxpbmUgKGNmLiBFeGFtcGxlIDguMSlcbiAgICAgICAgc3RhdGUucmVzdWx0ICs9IGNvbW1vbi5yZXBlYXQoJ1xcbicsIGRpZFJlYWRDb250ZW50ID8gMSArIGVtcHR5TGluZXMgOiBlbXB0eUxpbmVzKTtcblxuICAgICAgLy8gRW5kIG9mIG1vcmUtaW5kZW50ZWQgYmxvY2suXG4gICAgICB9IGVsc2UgaWYgKGF0TW9yZUluZGVudGVkKSB7XG4gICAgICAgIGF0TW9yZUluZGVudGVkID0gZmFsc2U7XG4gICAgICAgIHN0YXRlLnJlc3VsdCArPSBjb21tb24ucmVwZWF0KCdcXG4nLCBlbXB0eUxpbmVzICsgMSk7XG5cbiAgICAgIC8vIEp1c3Qgb25lIGxpbmUgYnJlYWsgLSBwZXJjZWl2ZSBhcyB0aGUgc2FtZSBsaW5lLlxuICAgICAgfSBlbHNlIGlmIChlbXB0eUxpbmVzID09PSAwKSB7XG4gICAgICAgIGlmIChkaWRSZWFkQ29udGVudCkgeyAvLyBpLmUuIG9ubHkgaWYgd2UgaGF2ZSBhbHJlYWR5IHJlYWQgc29tZSBzY2FsYXIgY29udGVudC5cbiAgICAgICAgICBzdGF0ZS5yZXN1bHQgKz0gJyAnO1xuICAgICAgICB9XG5cbiAgICAgIC8vIFNldmVyYWwgbGluZSBicmVha3MgLSBwZXJjZWl2ZSBhcyBkaWZmZXJlbnQgbGluZXMuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS5yZXN1bHQgKz0gY29tbW9uLnJlcGVhdCgnXFxuJywgZW1wdHlMaW5lcyk7XG4gICAgICB9XG5cbiAgICAvLyBMaXRlcmFsIHN0eWxlOiBqdXN0IGFkZCBleGFjdCBudW1iZXIgb2YgbGluZSBicmVha3MgYmV0d2VlbiBjb250ZW50IGxpbmVzLlxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBLZWVwIGFsbCBsaW5lIGJyZWFrcyBleGNlcHQgdGhlIGhlYWRlciBsaW5lIGJyZWFrLlxuICAgICAgc3RhdGUucmVzdWx0ICs9IGNvbW1vbi5yZXBlYXQoJ1xcbicsIGRpZFJlYWRDb250ZW50ID8gMSArIGVtcHR5TGluZXMgOiBlbXB0eUxpbmVzKTtcbiAgICB9XG5cbiAgICBkaWRSZWFkQ29udGVudCA9IHRydWU7XG4gICAgZGV0ZWN0ZWRJbmRlbnQgPSB0cnVlO1xuICAgIGVtcHR5TGluZXMgPSAwO1xuICAgIGNhcHR1cmVTdGFydCA9IHN0YXRlLnBvc2l0aW9uO1xuXG4gICAgd2hpbGUgKCFpc19FT0woY2gpICYmIChjaCAhPT0gMCkpIHtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICB9XG5cbiAgICBjYXB0dXJlU2VnbWVudChzdGF0ZSwgY2FwdHVyZVN0YXJ0LCBzdGF0ZS5wb3NpdGlvbiwgZmFsc2UpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlYWRCbG9ja1NlcXVlbmNlKHN0YXRlLCBub2RlSW5kZW50KSB7XG4gIHZhciBfbGluZSxcbiAgICAgIF90YWcgICAgICA9IHN0YXRlLnRhZyxcbiAgICAgIF9hbmNob3IgICA9IHN0YXRlLmFuY2hvcixcbiAgICAgIF9yZXN1bHQgICA9IFtdLFxuICAgICAgZm9sbG93aW5nLFxuICAgICAgZGV0ZWN0ZWQgID0gZmFsc2UsXG4gICAgICBjaDtcblxuICBpZiAoc3RhdGUuYW5jaG9yICE9PSBudWxsKSB7XG4gICAgc3RhdGUuYW5jaG9yTWFwW3N0YXRlLmFuY2hvcl0gPSBfcmVzdWx0O1xuICB9XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICB3aGlsZSAoY2ggIT09IDApIHtcblxuICAgIGlmIChjaCAhPT0gMHgyRC8qIC0gKi8pIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGZvbGxvd2luZyA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24gKyAxKTtcblxuICAgIGlmICghaXNfV1NfT1JfRU9MKGZvbGxvd2luZykpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGRldGVjdGVkID0gdHJ1ZTtcbiAgICBzdGF0ZS5wb3NpdGlvbisrO1xuXG4gICAgaWYgKHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKSkge1xuICAgICAgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPD0gbm9kZUluZGVudCkge1xuICAgICAgICBfcmVzdWx0LnB1c2gobnVsbCk7XG4gICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIF9saW5lID0gc3RhdGUubGluZTtcbiAgICBjb21wb3NlTm9kZShzdGF0ZSwgbm9kZUluZGVudCwgQ09OVEVYVF9CTE9DS19JTiwgZmFsc2UsIHRydWUpO1xuICAgIF9yZXN1bHQucHVzaChzdGF0ZS5yZXN1bHQpO1xuICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICBpZiAoKHN0YXRlLmxpbmUgPT09IF9saW5lIHx8IHN0YXRlLmxpbmVJbmRlbnQgPiBub2RlSW5kZW50KSAmJiAoY2ggIT09IDApKSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnYmFkIGluZGVudGF0aW9uIG9mIGEgc2VxdWVuY2UgZW50cnknKTtcbiAgICB9IGVsc2UgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPCBub2RlSW5kZW50KSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBpZiAoZGV0ZWN0ZWQpIHtcbiAgICBzdGF0ZS50YWcgPSBfdGFnO1xuICAgIHN0YXRlLmFuY2hvciA9IF9hbmNob3I7XG4gICAgc3RhdGUua2luZCA9ICdzZXF1ZW5jZSc7XG4gICAgc3RhdGUucmVzdWx0ID0gX3Jlc3VsdDtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHJlYWRCbG9ja01hcHBpbmcoc3RhdGUsIG5vZGVJbmRlbnQsIGZsb3dJbmRlbnQpIHtcbiAgdmFyIGZvbGxvd2luZyxcbiAgICAgIGFsbG93Q29tcGFjdCxcbiAgICAgIF9saW5lLFxuICAgICAgX3BvcyxcbiAgICAgIF90YWcgICAgICAgICAgPSBzdGF0ZS50YWcsXG4gICAgICBfYW5jaG9yICAgICAgID0gc3RhdGUuYW5jaG9yLFxuICAgICAgX3Jlc3VsdCAgICAgICA9IHt9LFxuICAgICAgb3ZlcnJpZGFibGVLZXlzID0ge30sXG4gICAgICBrZXlUYWcgICAgICAgID0gbnVsbCxcbiAgICAgIGtleU5vZGUgICAgICAgPSBudWxsLFxuICAgICAgdmFsdWVOb2RlICAgICA9IG51bGwsXG4gICAgICBhdEV4cGxpY2l0S2V5ID0gZmFsc2UsXG4gICAgICBkZXRlY3RlZCAgICAgID0gZmFsc2UsXG4gICAgICBjaDtcblxuICBpZiAoc3RhdGUuYW5jaG9yICE9PSBudWxsKSB7XG4gICAgc3RhdGUuYW5jaG9yTWFwW3N0YXRlLmFuY2hvcl0gPSBfcmVzdWx0O1xuICB9XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICB3aGlsZSAoY2ggIT09IDApIHtcbiAgICBmb2xsb3dpbmcgPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uICsgMSk7XG4gICAgX2xpbmUgPSBzdGF0ZS5saW5lOyAvLyBTYXZlIHRoZSBjdXJyZW50IGxpbmUuXG4gICAgX3BvcyA9IHN0YXRlLnBvc2l0aW9uO1xuXG4gICAgLy9cbiAgICAvLyBFeHBsaWNpdCBub3RhdGlvbiBjYXNlLiBUaGVyZSBhcmUgdHdvIHNlcGFyYXRlIGJsb2NrczpcbiAgICAvLyBmaXJzdCBmb3IgdGhlIGtleSAoZGVub3RlZCBieSBcIj9cIikgYW5kIHNlY29uZCBmb3IgdGhlIHZhbHVlIChkZW5vdGVkIGJ5IFwiOlwiKVxuICAgIC8vXG4gICAgaWYgKChjaCA9PT0gMHgzRi8qID8gKi8gfHwgY2ggPT09IDB4M0EvKiA6ICovKSAmJiBpc19XU19PUl9FT0woZm9sbG93aW5nKSkge1xuXG4gICAgICBpZiAoY2ggPT09IDB4M0YvKiA/ICovKSB7XG4gICAgICAgIGlmIChhdEV4cGxpY2l0S2V5KSB7XG4gICAgICAgICAgc3RvcmVNYXBwaW5nUGFpcihzdGF0ZSwgX3Jlc3VsdCwgb3ZlcnJpZGFibGVLZXlzLCBrZXlUYWcsIGtleU5vZGUsIG51bGwpO1xuICAgICAgICAgIGtleVRhZyA9IGtleU5vZGUgPSB2YWx1ZU5vZGUgPSBudWxsO1xuICAgICAgICB9XG5cbiAgICAgICAgZGV0ZWN0ZWQgPSB0cnVlO1xuICAgICAgICBhdEV4cGxpY2l0S2V5ID0gdHJ1ZTtcbiAgICAgICAgYWxsb3dDb21wYWN0ID0gdHJ1ZTtcblxuICAgICAgfSBlbHNlIGlmIChhdEV4cGxpY2l0S2V5KSB7XG4gICAgICAgIC8vIGkuZS4gMHgzQS8qIDogKi8gPT09IGNoYXJhY3RlciBhZnRlciB0aGUgZXhwbGljaXQga2V5LlxuICAgICAgICBhdEV4cGxpY2l0S2V5ID0gZmFsc2U7XG4gICAgICAgIGFsbG93Q29tcGFjdCA9IHRydWU7XG5cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdpbmNvbXBsZXRlIGV4cGxpY2l0IG1hcHBpbmcgcGFpcjsgYSBrZXkgbm9kZSBpcyBtaXNzZWQ7IG9yIGZvbGxvd2VkIGJ5IGEgbm9uLXRhYnVsYXRlZCBlbXB0eSBsaW5lJyk7XG4gICAgICB9XG5cbiAgICAgIHN0YXRlLnBvc2l0aW9uICs9IDE7XG4gICAgICBjaCA9IGZvbGxvd2luZztcblxuICAgIC8vXG4gICAgLy8gSW1wbGljaXQgbm90YXRpb24gY2FzZS4gRmxvdy1zdHlsZSBub2RlIGFzIHRoZSBrZXkgZmlyc3QsIHRoZW4gXCI6XCIsIGFuZCB0aGUgdmFsdWUuXG4gICAgLy9cbiAgICB9IGVsc2UgaWYgKGNvbXBvc2VOb2RlKHN0YXRlLCBmbG93SW5kZW50LCBDT05URVhUX0ZMT1dfT1VULCBmYWxzZSwgdHJ1ZSkpIHtcblxuICAgICAgaWYgKHN0YXRlLmxpbmUgPT09IF9saW5lKSB7XG4gICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICAgICAgd2hpbGUgKGlzX1dISVRFX1NQQUNFKGNoKSkge1xuICAgICAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaCA9PT0gMHgzQS8qIDogKi8pIHtcbiAgICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICAgICAgICBpZiAoIWlzX1dTX09SX0VPTChjaCkpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdhIHdoaXRlc3BhY2UgY2hhcmFjdGVyIGlzIGV4cGVjdGVkIGFmdGVyIHRoZSBrZXktdmFsdWUgc2VwYXJhdG9yIHdpdGhpbiBhIGJsb2NrIG1hcHBpbmcnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoYXRFeHBsaWNpdEtleSkge1xuICAgICAgICAgICAgc3RvcmVNYXBwaW5nUGFpcihzdGF0ZSwgX3Jlc3VsdCwgb3ZlcnJpZGFibGVLZXlzLCBrZXlUYWcsIGtleU5vZGUsIG51bGwpO1xuICAgICAgICAgICAga2V5VGFnID0ga2V5Tm9kZSA9IHZhbHVlTm9kZSA9IG51bGw7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGV0ZWN0ZWQgPSB0cnVlO1xuICAgICAgICAgIGF0RXhwbGljaXRLZXkgPSBmYWxzZTtcbiAgICAgICAgICBhbGxvd0NvbXBhY3QgPSBmYWxzZTtcbiAgICAgICAgICBrZXlUYWcgPSBzdGF0ZS50YWc7XG4gICAgICAgICAga2V5Tm9kZSA9IHN0YXRlLnJlc3VsdDtcblxuICAgICAgICB9IGVsc2UgaWYgKGRldGVjdGVkKSB7XG4gICAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2NhbiBub3QgcmVhZCBhbiBpbXBsaWNpdCBtYXBwaW5nIHBhaXI7IGEgY29sb24gaXMgbWlzc2VkJyk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdGF0ZS50YWcgPSBfdGFnO1xuICAgICAgICAgIHN0YXRlLmFuY2hvciA9IF9hbmNob3I7XG4gICAgICAgICAgcmV0dXJuIHRydWU7IC8vIEtlZXAgdGhlIHJlc3VsdCBvZiBgY29tcG9zZU5vZGVgLlxuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSBpZiAoZGV0ZWN0ZWQpIHtcbiAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2NhbiBub3QgcmVhZCBhIGJsb2NrIG1hcHBpbmcgZW50cnk7IGEgbXVsdGlsaW5lIGtleSBtYXkgbm90IGJlIGFuIGltcGxpY2l0IGtleScpO1xuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS50YWcgPSBfdGFnO1xuICAgICAgICBzdGF0ZS5hbmNob3IgPSBfYW5jaG9yO1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gS2VlcCB0aGUgcmVzdWx0IG9mIGBjb21wb3NlTm9kZWAuXG4gICAgICB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWs7IC8vIFJlYWRpbmcgaXMgZG9uZS4gR28gdG8gdGhlIGVwaWxvZ3VlLlxuICAgIH1cblxuICAgIC8vXG4gICAgLy8gQ29tbW9uIHJlYWRpbmcgY29kZSBmb3IgYm90aCBleHBsaWNpdCBhbmQgaW1wbGljaXQgbm90YXRpb25zLlxuICAgIC8vXG4gICAgaWYgKHN0YXRlLmxpbmUgPT09IF9saW5lIHx8IHN0YXRlLmxpbmVJbmRlbnQgPiBub2RlSW5kZW50KSB7XG4gICAgICBpZiAoY29tcG9zZU5vZGUoc3RhdGUsIG5vZGVJbmRlbnQsIENPTlRFWFRfQkxPQ0tfT1VULCB0cnVlLCBhbGxvd0NvbXBhY3QpKSB7XG4gICAgICAgIGlmIChhdEV4cGxpY2l0S2V5KSB7XG4gICAgICAgICAga2V5Tm9kZSA9IHN0YXRlLnJlc3VsdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZU5vZGUgPSBzdGF0ZS5yZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCFhdEV4cGxpY2l0S2V5KSB7XG4gICAgICAgIHN0b3JlTWFwcGluZ1BhaXIoc3RhdGUsIF9yZXN1bHQsIG92ZXJyaWRhYmxlS2V5cywga2V5VGFnLCBrZXlOb2RlLCB2YWx1ZU5vZGUsIF9saW5lLCBfcG9zKTtcbiAgICAgICAga2V5VGFnID0ga2V5Tm9kZSA9IHZhbHVlTm9kZSA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG4gICAgfVxuXG4gICAgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPiBub2RlSW5kZW50ICYmIChjaCAhPT0gMCkpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdiYWQgaW5kZW50YXRpb24gb2YgYSBtYXBwaW5nIGVudHJ5Jyk7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5saW5lSW5kZW50IDwgbm9kZUluZGVudCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgLy9cbiAgLy8gRXBpbG9ndWUuXG4gIC8vXG5cbiAgLy8gU3BlY2lhbCBjYXNlOiBsYXN0IG1hcHBpbmcncyBub2RlIGNvbnRhaW5zIG9ubHkgdGhlIGtleSBpbiBleHBsaWNpdCBub3RhdGlvbi5cbiAgaWYgKGF0RXhwbGljaXRLZXkpIHtcbiAgICBzdG9yZU1hcHBpbmdQYWlyKHN0YXRlLCBfcmVzdWx0LCBvdmVycmlkYWJsZUtleXMsIGtleVRhZywga2V5Tm9kZSwgbnVsbCk7XG4gIH1cblxuICAvLyBFeHBvc2UgdGhlIHJlc3VsdGluZyBtYXBwaW5nLlxuICBpZiAoZGV0ZWN0ZWQpIHtcbiAgICBzdGF0ZS50YWcgPSBfdGFnO1xuICAgIHN0YXRlLmFuY2hvciA9IF9hbmNob3I7XG4gICAgc3RhdGUua2luZCA9ICdtYXBwaW5nJztcbiAgICBzdGF0ZS5yZXN1bHQgPSBfcmVzdWx0O1xuICB9XG5cbiAgcmV0dXJuIGRldGVjdGVkO1xufVxuXG5mdW5jdGlvbiByZWFkVGFnUHJvcGVydHkoc3RhdGUpIHtcbiAgdmFyIF9wb3NpdGlvbixcbiAgICAgIGlzVmVyYmF0aW0gPSBmYWxzZSxcbiAgICAgIGlzTmFtZWQgICAgPSBmYWxzZSxcbiAgICAgIHRhZ0hhbmRsZSxcbiAgICAgIHRhZ05hbWUsXG4gICAgICBjaDtcblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pO1xuXG4gIGlmIChjaCAhPT0gMHgyMS8qICEgKi8pIHJldHVybiBmYWxzZTtcblxuICBpZiAoc3RhdGUudGFnICE9PSBudWxsKSB7XG4gICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2R1cGxpY2F0aW9uIG9mIGEgdGFnIHByb3BlcnR5Jyk7XG4gIH1cblxuICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoID09PSAweDNDLyogPCAqLykge1xuICAgIGlzVmVyYmF0aW0gPSB0cnVlO1xuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcblxuICB9IGVsc2UgaWYgKGNoID09PSAweDIxLyogISAqLykge1xuICAgIGlzTmFtZWQgPSB0cnVlO1xuICAgIHRhZ0hhbmRsZSA9ICchISc7XG4gICAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KCsrc3RhdGUucG9zaXRpb24pO1xuXG4gIH0gZWxzZSB7XG4gICAgdGFnSGFuZGxlID0gJyEnO1xuICB9XG5cbiAgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgaWYgKGlzVmVyYmF0aW0pIHtcbiAgICBkbyB7IGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTsgfVxuICAgIHdoaWxlIChjaCAhPT0gMCAmJiBjaCAhPT0gMHgzRS8qID4gKi8pO1xuXG4gICAgaWYgKHN0YXRlLnBvc2l0aW9uIDwgc3RhdGUubGVuZ3RoKSB7XG4gICAgICB0YWdOYW1lID0gc3RhdGUuaW5wdXQuc2xpY2UoX3Bvc2l0aW9uLCBzdGF0ZS5wb3NpdGlvbik7XG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd1bmV4cGVjdGVkIGVuZCBvZiB0aGUgc3RyZWFtIHdpdGhpbiBhIHZlcmJhdGltIHRhZycpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB3aGlsZSAoY2ggIT09IDAgJiYgIWlzX1dTX09SX0VPTChjaCkpIHtcblxuICAgICAgaWYgKGNoID09PSAweDIxLyogISAqLykge1xuICAgICAgICBpZiAoIWlzTmFtZWQpIHtcbiAgICAgICAgICB0YWdIYW5kbGUgPSBzdGF0ZS5pbnB1dC5zbGljZShfcG9zaXRpb24gLSAxLCBzdGF0ZS5wb3NpdGlvbiArIDEpO1xuXG4gICAgICAgICAgaWYgKCFQQVRURVJOX1RBR19IQU5ETEUudGVzdCh0YWdIYW5kbGUpKSB7XG4gICAgICAgICAgICB0aHJvd0Vycm9yKHN0YXRlLCAnbmFtZWQgdGFnIGhhbmRsZSBjYW5ub3QgY29udGFpbiBzdWNoIGNoYXJhY3RlcnMnKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpc05hbWVkID0gdHJ1ZTtcbiAgICAgICAgICBfcG9zaXRpb24gPSBzdGF0ZS5wb3NpdGlvbiArIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3RhZyBzdWZmaXggY2Fubm90IGNvbnRhaW4gZXhjbGFtYXRpb24gbWFya3MnKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgfVxuXG4gICAgdGFnTmFtZSA9IHN0YXRlLmlucHV0LnNsaWNlKF9wb3NpdGlvbiwgc3RhdGUucG9zaXRpb24pO1xuXG4gICAgaWYgKFBBVFRFUk5fRkxPV19JTkRJQ0FUT1JTLnRlc3QodGFnTmFtZSkpIHtcbiAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd0YWcgc3VmZml4IGNhbm5vdCBjb250YWluIGZsb3cgaW5kaWNhdG9yIGNoYXJhY3RlcnMnKTtcbiAgICB9XG4gIH1cblxuICBpZiAodGFnTmFtZSAmJiAhUEFUVEVSTl9UQUdfVVJJLnRlc3QodGFnTmFtZSkpIHtcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAndGFnIG5hbWUgY2Fubm90IGNvbnRhaW4gc3VjaCBjaGFyYWN0ZXJzOiAnICsgdGFnTmFtZSk7XG4gIH1cblxuICBpZiAoaXNWZXJiYXRpbSkge1xuICAgIHN0YXRlLnRhZyA9IHRhZ05hbWU7XG5cbiAgfSBlbHNlIGlmIChfaGFzT3duUHJvcGVydHkuY2FsbChzdGF0ZS50YWdNYXAsIHRhZ0hhbmRsZSkpIHtcbiAgICBzdGF0ZS50YWcgPSBzdGF0ZS50YWdNYXBbdGFnSGFuZGxlXSArIHRhZ05hbWU7XG5cbiAgfSBlbHNlIGlmICh0YWdIYW5kbGUgPT09ICchJykge1xuICAgIHN0YXRlLnRhZyA9ICchJyArIHRhZ05hbWU7XG5cbiAgfSBlbHNlIGlmICh0YWdIYW5kbGUgPT09ICchIScpIHtcbiAgICBzdGF0ZS50YWcgPSAndGFnOnlhbWwub3JnLDIwMDI6JyArIHRhZ05hbWU7XG5cbiAgfSBlbHNlIHtcbiAgICB0aHJvd0Vycm9yKHN0YXRlLCAndW5kZWNsYXJlZCB0YWcgaGFuZGxlIFwiJyArIHRhZ0hhbmRsZSArICdcIicpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlYWRBbmNob3JQcm9wZXJ0eShzdGF0ZSkge1xuICB2YXIgX3Bvc2l0aW9uLFxuICAgICAgY2g7XG5cbiAgY2ggPSBzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKTtcblxuICBpZiAoY2ggIT09IDB4MjYvKiAmICovKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKHN0YXRlLmFuY2hvciAhPT0gbnVsbCkge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICdkdXBsaWNhdGlvbiBvZiBhbiBhbmNob3IgcHJvcGVydHknKTtcbiAgfVxuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgd2hpbGUgKGNoICE9PSAwICYmICFpc19XU19PUl9FT0woY2gpICYmICFpc19GTE9XX0lORElDQVRPUihjaCkpIHtcbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gIH1cblxuICBpZiAoc3RhdGUucG9zaXRpb24gPT09IF9wb3NpdGlvbikge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICduYW1lIG9mIGFuIGFuY2hvciBub2RlIG11c3QgY29udGFpbiBhdCBsZWFzdCBvbmUgY2hhcmFjdGVyJyk7XG4gIH1cblxuICBzdGF0ZS5hbmNob3IgPSBzdGF0ZS5pbnB1dC5zbGljZShfcG9zaXRpb24sIHN0YXRlLnBvc2l0aW9uKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHJlYWRBbGlhcyhzdGF0ZSkge1xuICB2YXIgX3Bvc2l0aW9uLCBhbGlhcyxcbiAgICAgIGNoO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKGNoICE9PSAweDJBLyogKiAqLykgcmV0dXJuIGZhbHNlO1xuXG4gIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgd2hpbGUgKGNoICE9PSAwICYmICFpc19XU19PUl9FT0woY2gpICYmICFpc19GTE9XX0lORElDQVRPUihjaCkpIHtcbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gIH1cblxuICBpZiAoc3RhdGUucG9zaXRpb24gPT09IF9wb3NpdGlvbikge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICduYW1lIG9mIGFuIGFsaWFzIG5vZGUgbXVzdCBjb250YWluIGF0IGxlYXN0IG9uZSBjaGFyYWN0ZXInKTtcbiAgfVxuXG4gIGFsaWFzID0gc3RhdGUuaW5wdXQuc2xpY2UoX3Bvc2l0aW9uLCBzdGF0ZS5wb3NpdGlvbik7XG5cbiAgaWYgKCFfaGFzT3duUHJvcGVydHkuY2FsbChzdGF0ZS5hbmNob3JNYXAsIGFsaWFzKSkge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICd1bmlkZW50aWZpZWQgYWxpYXMgXCInICsgYWxpYXMgKyAnXCInKTtcbiAgfVxuXG4gIHN0YXRlLnJlc3VsdCA9IHN0YXRlLmFuY2hvck1hcFthbGlhc107XG4gIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbXBvc2VOb2RlKHN0YXRlLCBwYXJlbnRJbmRlbnQsIG5vZGVDb250ZXh0LCBhbGxvd1RvU2VlaywgYWxsb3dDb21wYWN0KSB7XG4gIHZhciBhbGxvd0Jsb2NrU3R5bGVzLFxuICAgICAgYWxsb3dCbG9ja1NjYWxhcnMsXG4gICAgICBhbGxvd0Jsb2NrQ29sbGVjdGlvbnMsXG4gICAgICBpbmRlbnRTdGF0dXMgPSAxLCAvLyAxOiB0aGlzPnBhcmVudCwgMDogdGhpcz1wYXJlbnQsIC0xOiB0aGlzPHBhcmVudFxuICAgICAgYXROZXdMaW5lICA9IGZhbHNlLFxuICAgICAgaGFzQ29udGVudCA9IGZhbHNlLFxuICAgICAgdHlwZUluZGV4LFxuICAgICAgdHlwZVF1YW50aXR5LFxuICAgICAgdHlwZSxcbiAgICAgIGZsb3dJbmRlbnQsXG4gICAgICBibG9ja0luZGVudDtcblxuICBpZiAoc3RhdGUubGlzdGVuZXIgIT09IG51bGwpIHtcbiAgICBzdGF0ZS5saXN0ZW5lcignb3BlbicsIHN0YXRlKTtcbiAgfVxuXG4gIHN0YXRlLnRhZyAgICA9IG51bGw7XG4gIHN0YXRlLmFuY2hvciA9IG51bGw7XG4gIHN0YXRlLmtpbmQgICA9IG51bGw7XG4gIHN0YXRlLnJlc3VsdCA9IG51bGw7XG5cbiAgYWxsb3dCbG9ja1N0eWxlcyA9IGFsbG93QmxvY2tTY2FsYXJzID0gYWxsb3dCbG9ja0NvbGxlY3Rpb25zID1cbiAgICBDT05URVhUX0JMT0NLX09VVCA9PT0gbm9kZUNvbnRleHQgfHxcbiAgICBDT05URVhUX0JMT0NLX0lOICA9PT0gbm9kZUNvbnRleHQ7XG5cbiAgaWYgKGFsbG93VG9TZWVrKSB7XG4gICAgaWYgKHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKSkge1xuICAgICAgYXROZXdMaW5lID0gdHJ1ZTtcblxuICAgICAgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPiBwYXJlbnRJbmRlbnQpIHtcbiAgICAgICAgaW5kZW50U3RhdHVzID0gMTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUubGluZUluZGVudCA9PT0gcGFyZW50SW5kZW50KSB7XG4gICAgICAgIGluZGVudFN0YXR1cyA9IDA7XG4gICAgICB9IGVsc2UgaWYgKHN0YXRlLmxpbmVJbmRlbnQgPCBwYXJlbnRJbmRlbnQpIHtcbiAgICAgICAgaW5kZW50U3RhdHVzID0gLTE7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKGluZGVudFN0YXR1cyA9PT0gMSkge1xuICAgIHdoaWxlIChyZWFkVGFnUHJvcGVydHkoc3RhdGUpIHx8IHJlYWRBbmNob3JQcm9wZXJ0eShzdGF0ZSkpIHtcbiAgICAgIGlmIChza2lwU2VwYXJhdGlvblNwYWNlKHN0YXRlLCB0cnVlLCAtMSkpIHtcbiAgICAgICAgYXROZXdMaW5lID0gdHJ1ZTtcbiAgICAgICAgYWxsb3dCbG9ja0NvbGxlY3Rpb25zID0gYWxsb3dCbG9ja1N0eWxlcztcblxuICAgICAgICBpZiAoc3RhdGUubGluZUluZGVudCA+IHBhcmVudEluZGVudCkge1xuICAgICAgICAgIGluZGVudFN0YXR1cyA9IDE7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUubGluZUluZGVudCA9PT0gcGFyZW50SW5kZW50KSB7XG4gICAgICAgICAgaW5kZW50U3RhdHVzID0gMDtcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZS5saW5lSW5kZW50IDwgcGFyZW50SW5kZW50KSB7XG4gICAgICAgICAgaW5kZW50U3RhdHVzID0gLTE7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFsbG93QmxvY2tDb2xsZWN0aW9ucyA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChhbGxvd0Jsb2NrQ29sbGVjdGlvbnMpIHtcbiAgICBhbGxvd0Jsb2NrQ29sbGVjdGlvbnMgPSBhdE5ld0xpbmUgfHwgYWxsb3dDb21wYWN0O1xuICB9XG5cbiAgaWYgKGluZGVudFN0YXR1cyA9PT0gMSB8fCBDT05URVhUX0JMT0NLX09VVCA9PT0gbm9kZUNvbnRleHQpIHtcbiAgICBpZiAoQ09OVEVYVF9GTE9XX0lOID09PSBub2RlQ29udGV4dCB8fCBDT05URVhUX0ZMT1dfT1VUID09PSBub2RlQ29udGV4dCkge1xuICAgICAgZmxvd0luZGVudCA9IHBhcmVudEluZGVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgZmxvd0luZGVudCA9IHBhcmVudEluZGVudCArIDE7XG4gICAgfVxuXG4gICAgYmxvY2tJbmRlbnQgPSBzdGF0ZS5wb3NpdGlvbiAtIHN0YXRlLmxpbmVTdGFydDtcblxuICAgIGlmIChpbmRlbnRTdGF0dXMgPT09IDEpIHtcbiAgICAgIGlmIChhbGxvd0Jsb2NrQ29sbGVjdGlvbnMgJiZcbiAgICAgICAgICAocmVhZEJsb2NrU2VxdWVuY2Uoc3RhdGUsIGJsb2NrSW5kZW50KSB8fFxuICAgICAgICAgICByZWFkQmxvY2tNYXBwaW5nKHN0YXRlLCBibG9ja0luZGVudCwgZmxvd0luZGVudCkpIHx8XG4gICAgICAgICAgcmVhZEZsb3dDb2xsZWN0aW9uKHN0YXRlLCBmbG93SW5kZW50KSkge1xuICAgICAgICBoYXNDb250ZW50ID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICgoYWxsb3dCbG9ja1NjYWxhcnMgJiYgcmVhZEJsb2NrU2NhbGFyKHN0YXRlLCBmbG93SW5kZW50KSkgfHxcbiAgICAgICAgICAgIHJlYWRTaW5nbGVRdW90ZWRTY2FsYXIoc3RhdGUsIGZsb3dJbmRlbnQpIHx8XG4gICAgICAgICAgICByZWFkRG91YmxlUXVvdGVkU2NhbGFyKHN0YXRlLCBmbG93SW5kZW50KSkge1xuICAgICAgICAgIGhhc0NvbnRlbnQgPSB0cnVlO1xuXG4gICAgICAgIH0gZWxzZSBpZiAocmVhZEFsaWFzKHN0YXRlKSkge1xuICAgICAgICAgIGhhc0NvbnRlbnQgPSB0cnVlO1xuXG4gICAgICAgICAgaWYgKHN0YXRlLnRhZyAhPT0gbnVsbCB8fCBzdGF0ZS5hbmNob3IgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdhbGlhcyBub2RlIHNob3VsZCBub3QgaGF2ZSBhbnkgcHJvcGVydGllcycpO1xuICAgICAgICAgIH1cblxuICAgICAgICB9IGVsc2UgaWYgKHJlYWRQbGFpblNjYWxhcihzdGF0ZSwgZmxvd0luZGVudCwgQ09OVEVYVF9GTE9XX0lOID09PSBub2RlQ29udGV4dCkpIHtcbiAgICAgICAgICBoYXNDb250ZW50ID0gdHJ1ZTtcblxuICAgICAgICAgIGlmIChzdGF0ZS50YWcgPT09IG51bGwpIHtcbiAgICAgICAgICAgIHN0YXRlLnRhZyA9ICc/JztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc3RhdGUuYW5jaG9yICE9PSBudWxsKSB7XG4gICAgICAgICAgc3RhdGUuYW5jaG9yTWFwW3N0YXRlLmFuY2hvcl0gPSBzdGF0ZS5yZXN1bHQ7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGluZGVudFN0YXR1cyA9PT0gMCkge1xuICAgICAgLy8gU3BlY2lhbCBjYXNlOiBibG9jayBzZXF1ZW5jZXMgYXJlIGFsbG93ZWQgdG8gaGF2ZSBzYW1lIGluZGVudGF0aW9uIGxldmVsIGFzIHRoZSBwYXJlbnQuXG4gICAgICAvLyBodHRwOi8vd3d3LnlhbWwub3JnL3NwZWMvMS4yL3NwZWMuaHRtbCNpZDI3OTk3ODRcbiAgICAgIGhhc0NvbnRlbnQgPSBhbGxvd0Jsb2NrQ29sbGVjdGlvbnMgJiYgcmVhZEJsb2NrU2VxdWVuY2Uoc3RhdGUsIGJsb2NrSW5kZW50KTtcbiAgICB9XG4gIH1cblxuICBpZiAoc3RhdGUudGFnICE9PSBudWxsICYmIHN0YXRlLnRhZyAhPT0gJyEnKSB7XG4gICAgaWYgKHN0YXRlLnRhZyA9PT0gJz8nKSB7XG4gICAgICAvLyBJbXBsaWNpdCByZXNvbHZpbmcgaXMgbm90IGFsbG93ZWQgZm9yIG5vbi1zY2FsYXIgdHlwZXMsIGFuZCAnPydcbiAgICAgIC8vIG5vbi1zcGVjaWZpYyB0YWcgaXMgb25seSBhdXRvbWF0aWNhbGx5IGFzc2lnbmVkIHRvIHBsYWluIHNjYWxhcnMuXG4gICAgICAvL1xuICAgICAgLy8gV2Ugb25seSBuZWVkIHRvIGNoZWNrIGtpbmQgY29uZm9ybWl0eSBpbiBjYXNlIHVzZXIgZXhwbGljaXRseSBhc3NpZ25zICc/J1xuICAgICAgLy8gdGFnLCBmb3IgZXhhbXBsZSBsaWtlIHRoaXM6IFwiITw/PiBbMF1cIlxuICAgICAgLy9cbiAgICAgIGlmIChzdGF0ZS5yZXN1bHQgIT09IG51bGwgJiYgc3RhdGUua2luZCAhPT0gJ3NjYWxhcicpIHtcbiAgICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ3VuYWNjZXB0YWJsZSBub2RlIGtpbmQgZm9yICE8Pz4gdGFnOyBpdCBzaG91bGQgYmUgXCJzY2FsYXJcIiwgbm90IFwiJyArIHN0YXRlLmtpbmQgKyAnXCInKTtcbiAgICAgIH1cblxuICAgICAgZm9yICh0eXBlSW5kZXggPSAwLCB0eXBlUXVhbnRpdHkgPSBzdGF0ZS5pbXBsaWNpdFR5cGVzLmxlbmd0aDsgdHlwZUluZGV4IDwgdHlwZVF1YW50aXR5OyB0eXBlSW5kZXggKz0gMSkge1xuICAgICAgICB0eXBlID0gc3RhdGUuaW1wbGljaXRUeXBlc1t0eXBlSW5kZXhdO1xuXG4gICAgICAgIGlmICh0eXBlLnJlc29sdmUoc3RhdGUucmVzdWx0KSkgeyAvLyBgc3RhdGUucmVzdWx0YCB1cGRhdGVkIGluIHJlc29sdmVyIGlmIG1hdGNoZWRcbiAgICAgICAgICBzdGF0ZS5yZXN1bHQgPSB0eXBlLmNvbnN0cnVjdChzdGF0ZS5yZXN1bHQpO1xuICAgICAgICAgIHN0YXRlLnRhZyA9IHR5cGUudGFnO1xuICAgICAgICAgIGlmIChzdGF0ZS5hbmNob3IgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHN0YXRlLmFuY2hvck1hcFtzdGF0ZS5hbmNob3JdID0gc3RhdGUucmVzdWx0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoX2hhc093blByb3BlcnR5LmNhbGwoc3RhdGUudHlwZU1hcFtzdGF0ZS5raW5kIHx8ICdmYWxsYmFjayddLCBzdGF0ZS50YWcpKSB7XG4gICAgICB0eXBlID0gc3RhdGUudHlwZU1hcFtzdGF0ZS5raW5kIHx8ICdmYWxsYmFjayddW3N0YXRlLnRhZ107XG5cbiAgICAgIGlmIChzdGF0ZS5yZXN1bHQgIT09IG51bGwgJiYgdHlwZS5raW5kICE9PSBzdGF0ZS5raW5kKSB7XG4gICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICd1bmFjY2VwdGFibGUgbm9kZSBraW5kIGZvciAhPCcgKyBzdGF0ZS50YWcgKyAnPiB0YWc7IGl0IHNob3VsZCBiZSBcIicgKyB0eXBlLmtpbmQgKyAnXCIsIG5vdCBcIicgKyBzdGF0ZS5raW5kICsgJ1wiJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICghdHlwZS5yZXNvbHZlKHN0YXRlLnJlc3VsdCkpIHsgLy8gYHN0YXRlLnJlc3VsdGAgdXBkYXRlZCBpbiByZXNvbHZlciBpZiBtYXRjaGVkXG4gICAgICAgIHRocm93RXJyb3Ioc3RhdGUsICdjYW5ub3QgcmVzb2x2ZSBhIG5vZGUgd2l0aCAhPCcgKyBzdGF0ZS50YWcgKyAnPiBleHBsaWNpdCB0YWcnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLnJlc3VsdCA9IHR5cGUuY29uc3RydWN0KHN0YXRlLnJlc3VsdCk7XG4gICAgICAgIGlmIChzdGF0ZS5hbmNob3IgIT09IG51bGwpIHtcbiAgICAgICAgICBzdGF0ZS5hbmNob3JNYXBbc3RhdGUuYW5jaG9yXSA9IHN0YXRlLnJlc3VsdDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvd0Vycm9yKHN0YXRlLCAndW5rbm93biB0YWcgITwnICsgc3RhdGUudGFnICsgJz4nKTtcbiAgICB9XG4gIH1cblxuICBpZiAoc3RhdGUubGlzdGVuZXIgIT09IG51bGwpIHtcbiAgICBzdGF0ZS5saXN0ZW5lcignY2xvc2UnLCBzdGF0ZSk7XG4gIH1cbiAgcmV0dXJuIHN0YXRlLnRhZyAhPT0gbnVsbCB8fCAgc3RhdGUuYW5jaG9yICE9PSBudWxsIHx8IGhhc0NvbnRlbnQ7XG59XG5cbmZ1bmN0aW9uIHJlYWREb2N1bWVudChzdGF0ZSkge1xuICB2YXIgZG9jdW1lbnRTdGFydCA9IHN0YXRlLnBvc2l0aW9uLFxuICAgICAgX3Bvc2l0aW9uLFxuICAgICAgZGlyZWN0aXZlTmFtZSxcbiAgICAgIGRpcmVjdGl2ZUFyZ3MsXG4gICAgICBoYXNEaXJlY3RpdmVzID0gZmFsc2UsXG4gICAgICBjaDtcblxuICBzdGF0ZS52ZXJzaW9uID0gbnVsbDtcbiAgc3RhdGUuY2hlY2tMaW5lQnJlYWtzID0gc3RhdGUubGVnYWN5O1xuICBzdGF0ZS50YWdNYXAgPSB7fTtcbiAgc3RhdGUuYW5jaG9yTWFwID0ge307XG5cbiAgd2hpbGUgKChjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pKSAhPT0gMCkge1xuICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcblxuICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbik7XG5cbiAgICBpZiAoc3RhdGUubGluZUluZGVudCA+IDAgfHwgY2ggIT09IDB4MjUvKiAlICovKSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBoYXNEaXJlY3RpdmVzID0gdHJ1ZTtcbiAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgICB3aGlsZSAoY2ggIT09IDAgJiYgIWlzX1dTX09SX0VPTChjaCkpIHtcbiAgICAgIGNoID0gc3RhdGUuaW5wdXQuY2hhckNvZGVBdCgrK3N0YXRlLnBvc2l0aW9uKTtcbiAgICB9XG5cbiAgICBkaXJlY3RpdmVOYW1lID0gc3RhdGUuaW5wdXQuc2xpY2UoX3Bvc2l0aW9uLCBzdGF0ZS5wb3NpdGlvbik7XG4gICAgZGlyZWN0aXZlQXJncyA9IFtdO1xuXG4gICAgaWYgKGRpcmVjdGl2ZU5hbWUubGVuZ3RoIDwgMSkge1xuICAgICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2RpcmVjdGl2ZSBuYW1lIG11c3Qgbm90IGJlIGxlc3MgdGhhbiBvbmUgY2hhcmFjdGVyIGluIGxlbmd0aCcpO1xuICAgIH1cblxuICAgIHdoaWxlIChjaCAhPT0gMCkge1xuICAgICAgd2hpbGUgKGlzX1dISVRFX1NQQUNFKGNoKSkge1xuICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaCA9PT0gMHgyMy8qICMgKi8pIHtcbiAgICAgICAgZG8geyBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7IH1cbiAgICAgICAgd2hpbGUgKGNoICE9PSAwICYmICFpc19FT0woY2gpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc19FT0woY2gpKSBicmVhaztcblxuICAgICAgX3Bvc2l0aW9uID0gc3RhdGUucG9zaXRpb247XG5cbiAgICAgIHdoaWxlIChjaCAhPT0gMCAmJiAhaXNfV1NfT1JfRU9MKGNoKSkge1xuICAgICAgICBjaCA9IHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoKytzdGF0ZS5wb3NpdGlvbik7XG4gICAgICB9XG5cbiAgICAgIGRpcmVjdGl2ZUFyZ3MucHVzaChzdGF0ZS5pbnB1dC5zbGljZShfcG9zaXRpb24sIHN0YXRlLnBvc2l0aW9uKSk7XG4gICAgfVxuXG4gICAgaWYgKGNoICE9PSAwKSByZWFkTGluZUJyZWFrKHN0YXRlKTtcblxuICAgIGlmIChfaGFzT3duUHJvcGVydHkuY2FsbChkaXJlY3RpdmVIYW5kbGVycywgZGlyZWN0aXZlTmFtZSkpIHtcbiAgICAgIGRpcmVjdGl2ZUhhbmRsZXJzW2RpcmVjdGl2ZU5hbWVdKHN0YXRlLCBkaXJlY3RpdmVOYW1lLCBkaXJlY3RpdmVBcmdzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3dXYXJuaW5nKHN0YXRlLCAndW5rbm93biBkb2N1bWVudCBkaXJlY3RpdmUgXCInICsgZGlyZWN0aXZlTmFtZSArICdcIicpO1xuICAgIH1cbiAgfVxuXG4gIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcblxuICBpZiAoc3RhdGUubGluZUluZGVudCA9PT0gMCAmJlxuICAgICAgc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbikgICAgID09PSAweDJELyogLSAqLyAmJlxuICAgICAgc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiArIDEpID09PSAweDJELyogLSAqLyAmJlxuICAgICAgc3RhdGUuaW5wdXQuY2hhckNvZGVBdChzdGF0ZS5wb3NpdGlvbiArIDIpID09PSAweDJELyogLSAqLykge1xuICAgIHN0YXRlLnBvc2l0aW9uICs9IDM7XG4gICAgc2tpcFNlcGFyYXRpb25TcGFjZShzdGF0ZSwgdHJ1ZSwgLTEpO1xuXG4gIH0gZWxzZSBpZiAoaGFzRGlyZWN0aXZlcykge1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICdkaXJlY3RpdmVzIGVuZCBtYXJrIGlzIGV4cGVjdGVkJyk7XG4gIH1cblxuICBjb21wb3NlTm9kZShzdGF0ZSwgc3RhdGUubGluZUluZGVudCAtIDEsIENPTlRFWFRfQkxPQ0tfT1VULCBmYWxzZSwgdHJ1ZSk7XG4gIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcblxuICBpZiAoc3RhdGUuY2hlY2tMaW5lQnJlYWtzICYmXG4gICAgICBQQVRURVJOX05PTl9BU0NJSV9MSU5FX0JSRUFLUy50ZXN0KHN0YXRlLmlucHV0LnNsaWNlKGRvY3VtZW50U3RhcnQsIHN0YXRlLnBvc2l0aW9uKSkpIHtcbiAgICB0aHJvd1dhcm5pbmcoc3RhdGUsICdub24tQVNDSUkgbGluZSBicmVha3MgYXJlIGludGVycHJldGVkIGFzIGNvbnRlbnQnKTtcbiAgfVxuXG4gIHN0YXRlLmRvY3VtZW50cy5wdXNoKHN0YXRlLnJlc3VsdCk7XG5cbiAgaWYgKHN0YXRlLnBvc2l0aW9uID09PSBzdGF0ZS5saW5lU3RhcnQgJiYgdGVzdERvY3VtZW50U2VwYXJhdG9yKHN0YXRlKSkge1xuXG4gICAgaWYgKHN0YXRlLmlucHV0LmNoYXJDb2RlQXQoc3RhdGUucG9zaXRpb24pID09PSAweDJFLyogLiAqLykge1xuICAgICAgc3RhdGUucG9zaXRpb24gKz0gMztcbiAgICAgIHNraXBTZXBhcmF0aW9uU3BhY2Uoc3RhdGUsIHRydWUsIC0xKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHN0YXRlLnBvc2l0aW9uIDwgKHN0YXRlLmxlbmd0aCAtIDEpKSB7XG4gICAgdGhyb3dFcnJvcihzdGF0ZSwgJ2VuZCBvZiB0aGUgc3RyZWFtIG9yIGEgZG9jdW1lbnQgc2VwYXJhdG9yIGlzIGV4cGVjdGVkJyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuO1xuICB9XG59XG5cblxuZnVuY3Rpb24gbG9hZERvY3VtZW50cyhpbnB1dCwgb3B0aW9ucykge1xuICBpbnB1dCA9IFN0cmluZyhpbnB1dCk7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIGlmIChpbnB1dC5sZW5ndGggIT09IDApIHtcblxuICAgIC8vIEFkZCB0YWlsaW5nIGBcXG5gIGlmIG5vdCBleGlzdHNcbiAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChpbnB1dC5sZW5ndGggLSAxKSAhPT0gMHgwQS8qIExGICovICYmXG4gICAgICAgIGlucHV0LmNoYXJDb2RlQXQoaW5wdXQubGVuZ3RoIC0gMSkgIT09IDB4MEQvKiBDUiAqLykge1xuICAgICAgaW5wdXQgKz0gJ1xcbic7XG4gICAgfVxuXG4gICAgLy8gU3RyaXAgQk9NXG4gICAgaWYgKGlucHV0LmNoYXJDb2RlQXQoMCkgPT09IDB4RkVGRikge1xuICAgICAgaW5wdXQgPSBpbnB1dC5zbGljZSgxKTtcbiAgICB9XG4gIH1cblxuICB2YXIgc3RhdGUgPSBuZXcgU3RhdGUoaW5wdXQsIG9wdGlvbnMpO1xuXG4gIHZhciBudWxscG9zID0gaW5wdXQuaW5kZXhPZignXFwwJyk7XG5cbiAgaWYgKG51bGxwb3MgIT09IC0xKSB7XG4gICAgc3RhdGUucG9zaXRpb24gPSBudWxscG9zO1xuICAgIHRocm93RXJyb3Ioc3RhdGUsICdudWxsIGJ5dGUgaXMgbm90IGFsbG93ZWQgaW4gaW5wdXQnKTtcbiAgfVxuXG4gIC8vIFVzZSAwIGFzIHN0cmluZyB0ZXJtaW5hdG9yLiBUaGF0IHNpZ25pZmljYW50bHkgc2ltcGxpZmllcyBib3VuZHMgY2hlY2suXG4gIHN0YXRlLmlucHV0ICs9ICdcXDAnO1xuXG4gIHdoaWxlIChzdGF0ZS5pbnB1dC5jaGFyQ29kZUF0KHN0YXRlLnBvc2l0aW9uKSA9PT0gMHgyMC8qIFNwYWNlICovKSB7XG4gICAgc3RhdGUubGluZUluZGVudCArPSAxO1xuICAgIHN0YXRlLnBvc2l0aW9uICs9IDE7XG4gIH1cblxuICB3aGlsZSAoc3RhdGUucG9zaXRpb24gPCAoc3RhdGUubGVuZ3RoIC0gMSkpIHtcbiAgICByZWFkRG9jdW1lbnQoc3RhdGUpO1xuICB9XG5cbiAgcmV0dXJuIHN0YXRlLmRvY3VtZW50cztcbn1cblxuXG5mdW5jdGlvbiBsb2FkQWxsKGlucHV0LCBpdGVyYXRvciwgb3B0aW9ucykge1xuICBpZiAoaXRlcmF0b3IgIT09IG51bGwgJiYgdHlwZW9mIGl0ZXJhdG9yID09PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBvcHRpb25zID0gaXRlcmF0b3I7XG4gICAgaXRlcmF0b3IgPSBudWxsO1xuICB9XG5cbiAgdmFyIGRvY3VtZW50cyA9IGxvYWREb2N1bWVudHMoaW5wdXQsIG9wdGlvbnMpO1xuXG4gIGlmICh0eXBlb2YgaXRlcmF0b3IgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZG9jdW1lbnRzO1xuICB9XG5cbiAgZm9yICh2YXIgaW5kZXggPSAwLCBsZW5ndGggPSBkb2N1bWVudHMubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIGl0ZXJhdG9yKGRvY3VtZW50c1tpbmRleF0pO1xuICB9XG59XG5cblxuZnVuY3Rpb24gbG9hZChpbnB1dCwgb3B0aW9ucykge1xuICB2YXIgZG9jdW1lbnRzID0gbG9hZERvY3VtZW50cyhpbnB1dCwgb3B0aW9ucyk7XG5cbiAgaWYgKGRvY3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAvKmVzbGludC1kaXNhYmxlIG5vLXVuZGVmaW5lZCovXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfSBlbHNlIGlmIChkb2N1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50c1swXTtcbiAgfVxuICB0aHJvdyBuZXcgWUFNTEV4Y2VwdGlvbignZXhwZWN0ZWQgYSBzaW5nbGUgZG9jdW1lbnQgaW4gdGhlIHN0cmVhbSwgYnV0IGZvdW5kIG1vcmUnKTtcbn1cblxuXG5mdW5jdGlvbiBzYWZlTG9hZEFsbChpbnB1dCwgaXRlcmF0b3IsIG9wdGlvbnMpIHtcbiAgaWYgKHR5cGVvZiBpdGVyYXRvciA9PT0gJ29iamVjdCcgJiYgaXRlcmF0b3IgIT09IG51bGwgJiYgdHlwZW9mIG9wdGlvbnMgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgb3B0aW9ucyA9IGl0ZXJhdG9yO1xuICAgIGl0ZXJhdG9yID0gbnVsbDtcbiAgfVxuXG4gIHJldHVybiBsb2FkQWxsKGlucHV0LCBpdGVyYXRvciwgY29tbW9uLmV4dGVuZCh7IHNjaGVtYTogREVGQVVMVF9TQUZFX1NDSEVNQSB9LCBvcHRpb25zKSk7XG59XG5cblxuZnVuY3Rpb24gc2FmZUxvYWQoaW5wdXQsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIGxvYWQoaW5wdXQsIGNvbW1vbi5leHRlbmQoeyBzY2hlbWE6IERFRkFVTFRfU0FGRV9TQ0hFTUEgfSwgb3B0aW9ucykpO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzLmxvYWRBbGwgICAgID0gbG9hZEFsbDtcbm1vZHVsZS5leHBvcnRzLmxvYWQgICAgICAgID0gbG9hZDtcbm1vZHVsZS5leHBvcnRzLnNhZmVMb2FkQWxsID0gc2FmZUxvYWRBbGw7XG5tb2R1bGUuZXhwb3J0cy5zYWZlTG9hZCAgICA9IHNhZmVMb2FkO1xuIiwgIid1c2Ugc3RyaWN0JztcblxuLyplc2xpbnQtZGlzYWJsZSBuby11c2UtYmVmb3JlLWRlZmluZSovXG5cbnZhciBjb21tb24gICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9jb21tb24nKTtcbnZhciBZQU1MRXhjZXB0aW9uICAgICAgID0gcmVxdWlyZSgnLi9leGNlcHRpb24nKTtcbnZhciBERUZBVUxUX0ZVTExfU0NIRU1BID0gcmVxdWlyZSgnLi9zY2hlbWEvZGVmYXVsdF9mdWxsJyk7XG52YXIgREVGQVVMVF9TQUZFX1NDSEVNQSA9IHJlcXVpcmUoJy4vc2NoZW1hL2RlZmF1bHRfc2FmZScpO1xuXG52YXIgX3RvU3RyaW5nICAgICAgID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbnZhciBfaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG52YXIgQ0hBUl9UQUIgICAgICAgICAgICAgICAgICA9IDB4MDk7IC8qIFRhYiAqL1xudmFyIENIQVJfTElORV9GRUVEICAgICAgICAgICAgPSAweDBBOyAvKiBMRiAqL1xudmFyIENIQVJfQ0FSUklBR0VfUkVUVVJOICAgICAgPSAweDBEOyAvKiBDUiAqL1xudmFyIENIQVJfU1BBQ0UgICAgICAgICAgICAgICAgPSAweDIwOyAvKiBTcGFjZSAqL1xudmFyIENIQVJfRVhDTEFNQVRJT04gICAgICAgICAgPSAweDIxOyAvKiAhICovXG52YXIgQ0hBUl9ET1VCTEVfUVVPVEUgICAgICAgICA9IDB4MjI7IC8qIFwiICovXG52YXIgQ0hBUl9TSEFSUCAgICAgICAgICAgICAgICA9IDB4MjM7IC8qICMgKi9cbnZhciBDSEFSX1BFUkNFTlQgICAgICAgICAgICAgID0gMHgyNTsgLyogJSAqL1xudmFyIENIQVJfQU1QRVJTQU5EICAgICAgICAgICAgPSAweDI2OyAvKiAmICovXG52YXIgQ0hBUl9TSU5HTEVfUVVPVEUgICAgICAgICA9IDB4Mjc7IC8qICcgKi9cbnZhciBDSEFSX0FTVEVSSVNLICAgICAgICAgICAgID0gMHgyQTsgLyogKiAqL1xudmFyIENIQVJfQ09NTUEgICAgICAgICAgICAgICAgPSAweDJDOyAvKiAsICovXG52YXIgQ0hBUl9NSU5VUyAgICAgICAgICAgICAgICA9IDB4MkQ7IC8qIC0gKi9cbnZhciBDSEFSX0NPTE9OICAgICAgICAgICAgICAgID0gMHgzQTsgLyogOiAqL1xudmFyIENIQVJfRVFVQUxTICAgICAgICAgICAgICAgPSAweDNEOyAvKiA9ICovXG52YXIgQ0hBUl9HUkVBVEVSX1RIQU4gICAgICAgICA9IDB4M0U7IC8qID4gKi9cbnZhciBDSEFSX1FVRVNUSU9OICAgICAgICAgICAgID0gMHgzRjsgLyogPyAqL1xudmFyIENIQVJfQ09NTUVSQ0lBTF9BVCAgICAgICAgPSAweDQwOyAvKiBAICovXG52YXIgQ0hBUl9MRUZUX1NRVUFSRV9CUkFDS0VUICA9IDB4NUI7IC8qIFsgKi9cbnZhciBDSEFSX1JJR0hUX1NRVUFSRV9CUkFDS0VUID0gMHg1RDsgLyogXSAqL1xudmFyIENIQVJfR1JBVkVfQUNDRU5UICAgICAgICAgPSAweDYwOyAvKiBgICovXG52YXIgQ0hBUl9MRUZUX0NVUkxZX0JSQUNLRVQgICA9IDB4N0I7IC8qIHsgKi9cbnZhciBDSEFSX1ZFUlRJQ0FMX0xJTkUgICAgICAgID0gMHg3QzsgLyogfCAqL1xudmFyIENIQVJfUklHSFRfQ1VSTFlfQlJBQ0tFVCAgPSAweDdEOyAvKiB9ICovXG5cbnZhciBFU0NBUEVfU0VRVUVOQ0VTID0ge307XG5cbkVTQ0FQRV9TRVFVRU5DRVNbMHgwMF0gICA9ICdcXFxcMCc7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MDddICAgPSAnXFxcXGEnO1xuRVNDQVBFX1NFUVVFTkNFU1sweDA4XSAgID0gJ1xcXFxiJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHgwOV0gICA9ICdcXFxcdCc7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MEFdICAgPSAnXFxcXG4nO1xuRVNDQVBFX1NFUVVFTkNFU1sweDBCXSAgID0gJ1xcXFx2JztcbkVTQ0FQRV9TRVFVRU5DRVNbMHgwQ10gICA9ICdcXFxcZic7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4MERdICAgPSAnXFxcXHInO1xuRVNDQVBFX1NFUVVFTkNFU1sweDFCXSAgID0gJ1xcXFxlJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHgyMl0gICA9ICdcXFxcXCInO1xuRVNDQVBFX1NFUVVFTkNFU1sweDVDXSAgID0gJ1xcXFxcXFxcJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHg4NV0gICA9ICdcXFxcTic7XG5FU0NBUEVfU0VRVUVOQ0VTWzB4QTBdICAgPSAnXFxcXF8nO1xuRVNDQVBFX1NFUVVFTkNFU1sweDIwMjhdID0gJ1xcXFxMJztcbkVTQ0FQRV9TRVFVRU5DRVNbMHgyMDI5XSA9ICdcXFxcUCc7XG5cbnZhciBERVBSRUNBVEVEX0JPT0xFQU5TX1NZTlRBWCA9IFtcbiAgJ3knLCAnWScsICd5ZXMnLCAnWWVzJywgJ1lFUycsICdvbicsICdPbicsICdPTicsXG4gICduJywgJ04nLCAnbm8nLCAnTm8nLCAnTk8nLCAnb2ZmJywgJ09mZicsICdPRkYnXG5dO1xuXG5mdW5jdGlvbiBjb21waWxlU3R5bGVNYXAoc2NoZW1hLCBtYXApIHtcbiAgdmFyIHJlc3VsdCwga2V5cywgaW5kZXgsIGxlbmd0aCwgdGFnLCBzdHlsZSwgdHlwZTtcblxuICBpZiAobWFwID09PSBudWxsKSByZXR1cm4ge307XG5cbiAgcmVzdWx0ID0ge307XG4gIGtleXMgPSBPYmplY3Qua2V5cyhtYXApO1xuXG4gIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICB0YWcgPSBrZXlzW2luZGV4XTtcbiAgICBzdHlsZSA9IFN0cmluZyhtYXBbdGFnXSk7XG5cbiAgICBpZiAodGFnLnNsaWNlKDAsIDIpID09PSAnISEnKSB7XG4gICAgICB0YWcgPSAndGFnOnlhbWwub3JnLDIwMDI6JyArIHRhZy5zbGljZSgyKTtcbiAgICB9XG4gICAgdHlwZSA9IHNjaGVtYS5jb21waWxlZFR5cGVNYXBbJ2ZhbGxiYWNrJ11bdGFnXTtcblxuICAgIGlmICh0eXBlICYmIF9oYXNPd25Qcm9wZXJ0eS5jYWxsKHR5cGUuc3R5bGVBbGlhc2VzLCBzdHlsZSkpIHtcbiAgICAgIHN0eWxlID0gdHlwZS5zdHlsZUFsaWFzZXNbc3R5bGVdO1xuICAgIH1cblxuICAgIHJlc3VsdFt0YWddID0gc3R5bGU7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBlbmNvZGVIZXgoY2hhcmFjdGVyKSB7XG4gIHZhciBzdHJpbmcsIGhhbmRsZSwgbGVuZ3RoO1xuXG4gIHN0cmluZyA9IGNoYXJhY3Rlci50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTtcblxuICBpZiAoY2hhcmFjdGVyIDw9IDB4RkYpIHtcbiAgICBoYW5kbGUgPSAneCc7XG4gICAgbGVuZ3RoID0gMjtcbiAgfSBlbHNlIGlmIChjaGFyYWN0ZXIgPD0gMHhGRkZGKSB7XG4gICAgaGFuZGxlID0gJ3UnO1xuICAgIGxlbmd0aCA9IDQ7XG4gIH0gZWxzZSBpZiAoY2hhcmFjdGVyIDw9IDB4RkZGRkZGRkYpIHtcbiAgICBoYW5kbGUgPSAnVSc7XG4gICAgbGVuZ3RoID0gODtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgWUFNTEV4Y2VwdGlvbignY29kZSBwb2ludCB3aXRoaW4gYSBzdHJpbmcgbWF5IG5vdCBiZSBncmVhdGVyIHRoYW4gMHhGRkZGRkZGRicpO1xuICB9XG5cbiAgcmV0dXJuICdcXFxcJyArIGhhbmRsZSArIGNvbW1vbi5yZXBlYXQoJzAnLCBsZW5ndGggLSBzdHJpbmcubGVuZ3RoKSArIHN0cmluZztcbn1cblxuZnVuY3Rpb24gU3RhdGUob3B0aW9ucykge1xuICB0aGlzLnNjaGVtYSAgICAgICAgPSBvcHRpb25zWydzY2hlbWEnXSB8fCBERUZBVUxUX0ZVTExfU0NIRU1BO1xuICB0aGlzLmluZGVudCAgICAgICAgPSBNYXRoLm1heCgxLCAob3B0aW9uc1snaW5kZW50J10gfHwgMikpO1xuICB0aGlzLm5vQXJyYXlJbmRlbnQgPSBvcHRpb25zWydub0FycmF5SW5kZW50J10gfHwgZmFsc2U7XG4gIHRoaXMuc2tpcEludmFsaWQgICA9IG9wdGlvbnNbJ3NraXBJbnZhbGlkJ10gfHwgZmFsc2U7XG4gIHRoaXMuZmxvd0xldmVsICAgICA9IChjb21tb24uaXNOb3RoaW5nKG9wdGlvbnNbJ2Zsb3dMZXZlbCddKSA/IC0xIDogb3B0aW9uc1snZmxvd0xldmVsJ10pO1xuICB0aGlzLnN0eWxlTWFwICAgICAgPSBjb21waWxlU3R5bGVNYXAodGhpcy5zY2hlbWEsIG9wdGlvbnNbJ3N0eWxlcyddIHx8IG51bGwpO1xuICB0aGlzLnNvcnRLZXlzICAgICAgPSBvcHRpb25zWydzb3J0S2V5cyddIHx8IGZhbHNlO1xuICB0aGlzLmxpbmVXaWR0aCAgICAgPSBvcHRpb25zWydsaW5lV2lkdGgnXSB8fCA4MDtcbiAgdGhpcy5ub1JlZnMgICAgICAgID0gb3B0aW9uc1snbm9SZWZzJ10gfHwgZmFsc2U7XG4gIHRoaXMubm9Db21wYXRNb2RlICA9IG9wdGlvbnNbJ25vQ29tcGF0TW9kZSddIHx8IGZhbHNlO1xuICB0aGlzLmNvbmRlbnNlRmxvdyAgPSBvcHRpb25zWydjb25kZW5zZUZsb3cnXSB8fCBmYWxzZTtcblxuICB0aGlzLmltcGxpY2l0VHlwZXMgPSB0aGlzLnNjaGVtYS5jb21waWxlZEltcGxpY2l0O1xuICB0aGlzLmV4cGxpY2l0VHlwZXMgPSB0aGlzLnNjaGVtYS5jb21waWxlZEV4cGxpY2l0O1xuXG4gIHRoaXMudGFnID0gbnVsbDtcbiAgdGhpcy5yZXN1bHQgPSAnJztcblxuICB0aGlzLmR1cGxpY2F0ZXMgPSBbXTtcbiAgdGhpcy51c2VkRHVwbGljYXRlcyA9IG51bGw7XG59XG5cbi8vIEluZGVudHMgZXZlcnkgbGluZSBpbiBhIHN0cmluZy4gRW1wdHkgbGluZXMgKFxcbiBvbmx5KSBhcmUgbm90IGluZGVudGVkLlxuZnVuY3Rpb24gaW5kZW50U3RyaW5nKHN0cmluZywgc3BhY2VzKSB7XG4gIHZhciBpbmQgPSBjb21tb24ucmVwZWF0KCcgJywgc3BhY2VzKSxcbiAgICAgIHBvc2l0aW9uID0gMCxcbiAgICAgIG5leHQgPSAtMSxcbiAgICAgIHJlc3VsdCA9ICcnLFxuICAgICAgbGluZSxcbiAgICAgIGxlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG5cbiAgd2hpbGUgKHBvc2l0aW9uIDwgbGVuZ3RoKSB7XG4gICAgbmV4dCA9IHN0cmluZy5pbmRleE9mKCdcXG4nLCBwb3NpdGlvbik7XG4gICAgaWYgKG5leHQgPT09IC0xKSB7XG4gICAgICBsaW5lID0gc3RyaW5nLnNsaWNlKHBvc2l0aW9uKTtcbiAgICAgIHBvc2l0aW9uID0gbGVuZ3RoO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaW5lID0gc3RyaW5nLnNsaWNlKHBvc2l0aW9uLCBuZXh0ICsgMSk7XG4gICAgICBwb3NpdGlvbiA9IG5leHQgKyAxO1xuICAgIH1cblxuICAgIGlmIChsaW5lLmxlbmd0aCAmJiBsaW5lICE9PSAnXFxuJykgcmVzdWx0ICs9IGluZDtcblxuICAgIHJlc3VsdCArPSBsaW5lO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVOZXh0TGluZShzdGF0ZSwgbGV2ZWwpIHtcbiAgcmV0dXJuICdcXG4nICsgY29tbW9uLnJlcGVhdCgnICcsIHN0YXRlLmluZGVudCAqIGxldmVsKTtcbn1cblxuZnVuY3Rpb24gdGVzdEltcGxpY2l0UmVzb2x2aW5nKHN0YXRlLCBzdHIpIHtcbiAgdmFyIGluZGV4LCBsZW5ndGgsIHR5cGU7XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IHN0YXRlLmltcGxpY2l0VHlwZXMubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIHR5cGUgPSBzdGF0ZS5pbXBsaWNpdFR5cGVzW2luZGV4XTtcblxuICAgIGlmICh0eXBlLnJlc29sdmUoc3RyKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBbMzNdIHMtd2hpdGUgOjo9IHMtc3BhY2UgfCBzLXRhYlxuZnVuY3Rpb24gaXNXaGl0ZXNwYWNlKGMpIHtcbiAgcmV0dXJuIGMgPT09IENIQVJfU1BBQ0UgfHwgYyA9PT0gQ0hBUl9UQUI7XG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiB0aGUgY2hhcmFjdGVyIGNhbiBiZSBwcmludGVkIHdpdGhvdXQgZXNjYXBpbmcuXG4vLyBGcm9tIFlBTUwgMS4yOiBcImFueSBhbGxvd2VkIGNoYXJhY3RlcnMga25vd24gdG8gYmUgbm9uLXByaW50YWJsZVxuLy8gc2hvdWxkIGFsc28gYmUgZXNjYXBlZC4gW0hvd2V2ZXIsXSBUaGlzIGlzblx1MjAxOXQgbWFuZGF0b3J5XCJcbi8vIERlcml2ZWQgZnJvbSBuYi1jaGFyIC0gXFx0IC0gI3g4NSAtICN4QTAgLSAjeDIwMjggLSAjeDIwMjkuXG5mdW5jdGlvbiBpc1ByaW50YWJsZShjKSB7XG4gIHJldHVybiAgKDB4MDAwMjAgPD0gYyAmJiBjIDw9IDB4MDAwMDdFKVxuICAgICAgfHwgKCgweDAwMEExIDw9IGMgJiYgYyA8PSAweDAwRDdGRikgJiYgYyAhPT0gMHgyMDI4ICYmIGMgIT09IDB4MjAyOSlcbiAgICAgIHx8ICgoMHgwRTAwMCA8PSBjICYmIGMgPD0gMHgwMEZGRkQpICYmIGMgIT09IDB4RkVGRiAvKiBCT00gKi8pXG4gICAgICB8fCAgKDB4MTAwMDAgPD0gYyAmJiBjIDw9IDB4MTBGRkZGKTtcbn1cblxuLy8gWzM0XSBucy1jaGFyIDo6PSBuYi1jaGFyIC0gcy13aGl0ZVxuLy8gWzI3XSBuYi1jaGFyIDo6PSBjLXByaW50YWJsZSAtIGItY2hhciAtIGMtYnl0ZS1vcmRlci1tYXJrXG4vLyBbMjZdIGItY2hhciAgOjo9IGItbGluZS1mZWVkIHwgYi1jYXJyaWFnZS1yZXR1cm5cbi8vIFsyNF0gYi1saW5lLWZlZWQgICAgICAgOjo9ICAgICAjeEEgICAgLyogTEYgKi9cbi8vIFsyNV0gYi1jYXJyaWFnZS1yZXR1cm4gOjo9ICAgICAjeEQgICAgLyogQ1IgKi9cbi8vIFszXSAgYy1ieXRlLW9yZGVyLW1hcmsgOjo9ICAgICAjeEZFRkZcbmZ1bmN0aW9uIGlzTnNDaGFyKGMpIHtcbiAgcmV0dXJuIGlzUHJpbnRhYmxlKGMpICYmICFpc1doaXRlc3BhY2UoYylcbiAgICAvLyBieXRlLW9yZGVyLW1hcmtcbiAgICAmJiBjICE9PSAweEZFRkZcbiAgICAvLyBiLWNoYXJcbiAgICAmJiBjICE9PSBDSEFSX0NBUlJJQUdFX1JFVFVSTlxuICAgICYmIGMgIT09IENIQVJfTElORV9GRUVEO1xufVxuXG4vLyBTaW1wbGlmaWVkIHRlc3QgZm9yIHZhbHVlcyBhbGxvd2VkIGFmdGVyIHRoZSBmaXJzdCBjaGFyYWN0ZXIgaW4gcGxhaW4gc3R5bGUuXG5mdW5jdGlvbiBpc1BsYWluU2FmZShjLCBwcmV2KSB7XG4gIC8vIFVzZXMgYSBzdWJzZXQgb2YgbmItY2hhciAtIGMtZmxvdy1pbmRpY2F0b3IgLSBcIjpcIiAtIFwiI1wiXG4gIC8vIHdoZXJlIG5iLWNoYXIgOjo9IGMtcHJpbnRhYmxlIC0gYi1jaGFyIC0gYy1ieXRlLW9yZGVyLW1hcmsuXG4gIHJldHVybiBpc1ByaW50YWJsZShjKSAmJiBjICE9PSAweEZFRkZcbiAgICAvLyAtIGMtZmxvdy1pbmRpY2F0b3JcbiAgICAmJiBjICE9PSBDSEFSX0NPTU1BXG4gICAgJiYgYyAhPT0gQ0hBUl9MRUZUX1NRVUFSRV9CUkFDS0VUXG4gICAgJiYgYyAhPT0gQ0hBUl9SSUdIVF9TUVVBUkVfQlJBQ0tFVFxuICAgICYmIGMgIT09IENIQVJfTEVGVF9DVVJMWV9CUkFDS0VUXG4gICAgJiYgYyAhPT0gQ0hBUl9SSUdIVF9DVVJMWV9CUkFDS0VUXG4gICAgLy8gLSBcIjpcIiAtIFwiI1wiXG4gICAgLy8gLyogQW4gbnMtY2hhciBwcmVjZWRpbmcgKi8gXCIjXCJcbiAgICAmJiBjICE9PSBDSEFSX0NPTE9OXG4gICAgJiYgKChjICE9PSBDSEFSX1NIQVJQKSB8fCAocHJldiAmJiBpc05zQ2hhcihwcmV2KSkpO1xufVxuXG4vLyBTaW1wbGlmaWVkIHRlc3QgZm9yIHZhbHVlcyBhbGxvd2VkIGFzIHRoZSBmaXJzdCBjaGFyYWN0ZXIgaW4gcGxhaW4gc3R5bGUuXG5mdW5jdGlvbiBpc1BsYWluU2FmZUZpcnN0KGMpIHtcbiAgLy8gVXNlcyBhIHN1YnNldCBvZiBucy1jaGFyIC0gYy1pbmRpY2F0b3JcbiAgLy8gd2hlcmUgbnMtY2hhciA9IG5iLWNoYXIgLSBzLXdoaXRlLlxuICByZXR1cm4gaXNQcmludGFibGUoYykgJiYgYyAhPT0gMHhGRUZGXG4gICAgJiYgIWlzV2hpdGVzcGFjZShjKSAvLyAtIHMtd2hpdGVcbiAgICAvLyAtIChjLWluZGljYXRvciA6Oj1cbiAgICAvLyBcdTIwMUMtXHUyMDFEIHwgXHUyMDFDP1x1MjAxRCB8IFx1MjAxQzpcdTIwMUQgfCBcdTIwMUMsXHUyMDFEIHwgXHUyMDFDW1x1MjAxRCB8IFx1MjAxQ11cdTIwMUQgfCBcdTIwMUN7XHUyMDFEIHwgXHUyMDFDfVx1MjAxRFxuICAgICYmIGMgIT09IENIQVJfTUlOVVNcbiAgICAmJiBjICE9PSBDSEFSX1FVRVNUSU9OXG4gICAgJiYgYyAhPT0gQ0hBUl9DT0xPTlxuICAgICYmIGMgIT09IENIQVJfQ09NTUFcbiAgICAmJiBjICE9PSBDSEFSX0xFRlRfU1FVQVJFX0JSQUNLRVRcbiAgICAmJiBjICE9PSBDSEFSX1JJR0hUX1NRVUFSRV9CUkFDS0VUXG4gICAgJiYgYyAhPT0gQ0hBUl9MRUZUX0NVUkxZX0JSQUNLRVRcbiAgICAmJiBjICE9PSBDSEFSX1JJR0hUX0NVUkxZX0JSQUNLRVRcbiAgICAvLyB8IFx1MjAxQyNcdTIwMUQgfCBcdTIwMUMmXHUyMDFEIHwgXHUyMDFDKlx1MjAxRCB8IFx1MjAxQyFcdTIwMUQgfCBcdTIwMUN8XHUyMDFEIHwgXHUyMDFDPVx1MjAxRCB8IFx1MjAxQz5cdTIwMUQgfCBcdTIwMUMnXHUyMDFEIHwgXHUyMDFDXCJcdTIwMURcbiAgICAmJiBjICE9PSBDSEFSX1NIQVJQXG4gICAgJiYgYyAhPT0gQ0hBUl9BTVBFUlNBTkRcbiAgICAmJiBjICE9PSBDSEFSX0FTVEVSSVNLXG4gICAgJiYgYyAhPT0gQ0hBUl9FWENMQU1BVElPTlxuICAgICYmIGMgIT09IENIQVJfVkVSVElDQUxfTElORVxuICAgICYmIGMgIT09IENIQVJfRVFVQUxTXG4gICAgJiYgYyAhPT0gQ0hBUl9HUkVBVEVSX1RIQU5cbiAgICAmJiBjICE9PSBDSEFSX1NJTkdMRV9RVU9URVxuICAgICYmIGMgIT09IENIQVJfRE9VQkxFX1FVT1RFXG4gICAgLy8gfCBcdTIwMUMlXHUyMDFEIHwgXHUyMDFDQFx1MjAxRCB8IFx1MjAxQ2BcdTIwMUQpXG4gICAgJiYgYyAhPT0gQ0hBUl9QRVJDRU5UXG4gICAgJiYgYyAhPT0gQ0hBUl9DT01NRVJDSUFMX0FUXG4gICAgJiYgYyAhPT0gQ0hBUl9HUkFWRV9BQ0NFTlQ7XG59XG5cbi8vIERldGVybWluZXMgd2hldGhlciBibG9jayBpbmRlbnRhdGlvbiBpbmRpY2F0b3IgaXMgcmVxdWlyZWQuXG5mdW5jdGlvbiBuZWVkSW5kZW50SW5kaWNhdG9yKHN0cmluZykge1xuICB2YXIgbGVhZGluZ1NwYWNlUmUgPSAvXlxcbiogLztcbiAgcmV0dXJuIGxlYWRpbmdTcGFjZVJlLnRlc3Qoc3RyaW5nKTtcbn1cblxudmFyIFNUWUxFX1BMQUlOICAgPSAxLFxuICAgIFNUWUxFX1NJTkdMRSAgPSAyLFxuICAgIFNUWUxFX0xJVEVSQUwgPSAzLFxuICAgIFNUWUxFX0ZPTERFRCAgPSA0LFxuICAgIFNUWUxFX0RPVUJMRSAgPSA1O1xuXG4vLyBEZXRlcm1pbmVzIHdoaWNoIHNjYWxhciBzdHlsZXMgYXJlIHBvc3NpYmxlIGFuZCByZXR1cm5zIHRoZSBwcmVmZXJyZWQgc3R5bGUuXG4vLyBsaW5lV2lkdGggPSAtMSA9PiBubyBsaW1pdC5cbi8vIFByZS1jb25kaXRpb25zOiBzdHIubGVuZ3RoID4gMC5cbi8vIFBvc3QtY29uZGl0aW9uczpcbi8vICAgIFNUWUxFX1BMQUlOIG9yIFNUWUxFX1NJTkdMRSA9PiBubyBcXG4gYXJlIGluIHRoZSBzdHJpbmcuXG4vLyAgICBTVFlMRV9MSVRFUkFMID0+IG5vIGxpbmVzIGFyZSBzdWl0YWJsZSBmb3IgZm9sZGluZyAob3IgbGluZVdpZHRoIGlzIC0xKS5cbi8vICAgIFNUWUxFX0ZPTERFRCA9PiBhIGxpbmUgPiBsaW5lV2lkdGggYW5kIGNhbiBiZSBmb2xkZWQgKGFuZCBsaW5lV2lkdGggIT0gLTEpLlxuZnVuY3Rpb24gY2hvb3NlU2NhbGFyU3R5bGUoc3RyaW5nLCBzaW5nbGVMaW5lT25seSwgaW5kZW50UGVyTGV2ZWwsIGxpbmVXaWR0aCwgdGVzdEFtYmlndW91c1R5cGUpIHtcbiAgdmFyIGk7XG4gIHZhciBjaGFyLCBwcmV2X2NoYXI7XG4gIHZhciBoYXNMaW5lQnJlYWsgPSBmYWxzZTtcbiAgdmFyIGhhc0ZvbGRhYmxlTGluZSA9IGZhbHNlOyAvLyBvbmx5IGNoZWNrZWQgaWYgc2hvdWxkVHJhY2tXaWR0aFxuICB2YXIgc2hvdWxkVHJhY2tXaWR0aCA9IGxpbmVXaWR0aCAhPT0gLTE7XG4gIHZhciBwcmV2aW91c0xpbmVCcmVhayA9IC0xOyAvLyBjb3VudCB0aGUgZmlyc3QgbGluZSBjb3JyZWN0bHlcbiAgdmFyIHBsYWluID0gaXNQbGFpblNhZmVGaXJzdChzdHJpbmcuY2hhckNvZGVBdCgwKSlcbiAgICAgICAgICAmJiAhaXNXaGl0ZXNwYWNlKHN0cmluZy5jaGFyQ29kZUF0KHN0cmluZy5sZW5ndGggLSAxKSk7XG5cbiAgaWYgKHNpbmdsZUxpbmVPbmx5KSB7XG4gICAgLy8gQ2FzZTogbm8gYmxvY2sgc3R5bGVzLlxuICAgIC8vIENoZWNrIGZvciBkaXNhbGxvd2VkIGNoYXJhY3RlcnMgdG8gcnVsZSBvdXQgcGxhaW4gYW5kIHNpbmdsZS5cbiAgICBmb3IgKGkgPSAwOyBpIDwgc3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjaGFyID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gICAgICBpZiAoIWlzUHJpbnRhYmxlKGNoYXIpKSB7XG4gICAgICAgIHJldHVybiBTVFlMRV9ET1VCTEU7XG4gICAgICB9XG4gICAgICBwcmV2X2NoYXIgPSBpID4gMCA/IHN0cmluZy5jaGFyQ29kZUF0KGkgLSAxKSA6IG51bGw7XG4gICAgICBwbGFpbiA9IHBsYWluICYmIGlzUGxhaW5TYWZlKGNoYXIsIHByZXZfY2hhcik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIENhc2U6IGJsb2NrIHN0eWxlcyBwZXJtaXR0ZWQuXG4gICAgZm9yIChpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgY2hhciA9IHN0cmluZy5jaGFyQ29kZUF0KGkpO1xuICAgICAgaWYgKGNoYXIgPT09IENIQVJfTElORV9GRUVEKSB7XG4gICAgICAgIGhhc0xpbmVCcmVhayA9IHRydWU7XG4gICAgICAgIC8vIENoZWNrIGlmIGFueSBsaW5lIGNhbiBiZSBmb2xkZWQuXG4gICAgICAgIGlmIChzaG91bGRUcmFja1dpZHRoKSB7XG4gICAgICAgICAgaGFzRm9sZGFibGVMaW5lID0gaGFzRm9sZGFibGVMaW5lIHx8XG4gICAgICAgICAgICAvLyBGb2xkYWJsZSBsaW5lID0gdG9vIGxvbmcsIGFuZCBub3QgbW9yZS1pbmRlbnRlZC5cbiAgICAgICAgICAgIChpIC0gcHJldmlvdXNMaW5lQnJlYWsgLSAxID4gbGluZVdpZHRoICYmXG4gICAgICAgICAgICAgc3RyaW5nW3ByZXZpb3VzTGluZUJyZWFrICsgMV0gIT09ICcgJyk7XG4gICAgICAgICAgcHJldmlvdXNMaW5lQnJlYWsgPSBpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCFpc1ByaW50YWJsZShjaGFyKSkge1xuICAgICAgICByZXR1cm4gU1RZTEVfRE9VQkxFO1xuICAgICAgfVxuICAgICAgcHJldl9jaGFyID0gaSA+IDAgPyBzdHJpbmcuY2hhckNvZGVBdChpIC0gMSkgOiBudWxsO1xuICAgICAgcGxhaW4gPSBwbGFpbiAmJiBpc1BsYWluU2FmZShjaGFyLCBwcmV2X2NoYXIpO1xuICAgIH1cbiAgICAvLyBpbiBjYXNlIHRoZSBlbmQgaXMgbWlzc2luZyBhIFxcblxuICAgIGhhc0ZvbGRhYmxlTGluZSA9IGhhc0ZvbGRhYmxlTGluZSB8fCAoc2hvdWxkVHJhY2tXaWR0aCAmJlxuICAgICAgKGkgLSBwcmV2aW91c0xpbmVCcmVhayAtIDEgPiBsaW5lV2lkdGggJiZcbiAgICAgICBzdHJpbmdbcHJldmlvdXNMaW5lQnJlYWsgKyAxXSAhPT0gJyAnKSk7XG4gIH1cbiAgLy8gQWx0aG91Z2ggZXZlcnkgc3R5bGUgY2FuIHJlcHJlc2VudCBcXG4gd2l0aG91dCBlc2NhcGluZywgcHJlZmVyIGJsb2NrIHN0eWxlc1xuICAvLyBmb3IgbXVsdGlsaW5lLCBzaW5jZSB0aGV5J3JlIG1vcmUgcmVhZGFibGUgYW5kIHRoZXkgZG9uJ3QgYWRkIGVtcHR5IGxpbmVzLlxuICAvLyBBbHNvIHByZWZlciBmb2xkaW5nIGEgc3VwZXItbG9uZyBsaW5lLlxuICBpZiAoIWhhc0xpbmVCcmVhayAmJiAhaGFzRm9sZGFibGVMaW5lKSB7XG4gICAgLy8gU3RyaW5ncyBpbnRlcnByZXRhYmxlIGFzIGFub3RoZXIgdHlwZSBoYXZlIHRvIGJlIHF1b3RlZDtcbiAgICAvLyBlLmcuIHRoZSBzdHJpbmcgJ3RydWUnIHZzLiB0aGUgYm9vbGVhbiB0cnVlLlxuICAgIHJldHVybiBwbGFpbiAmJiAhdGVzdEFtYmlndW91c1R5cGUoc3RyaW5nKVxuICAgICAgPyBTVFlMRV9QTEFJTiA6IFNUWUxFX1NJTkdMRTtcbiAgfVxuICAvLyBFZGdlIGNhc2U6IGJsb2NrIGluZGVudGF0aW9uIGluZGljYXRvciBjYW4gb25seSBoYXZlIG9uZSBkaWdpdC5cbiAgaWYgKGluZGVudFBlckxldmVsID4gOSAmJiBuZWVkSW5kZW50SW5kaWNhdG9yKHN0cmluZykpIHtcbiAgICByZXR1cm4gU1RZTEVfRE9VQkxFO1xuICB9XG4gIC8vIEF0IHRoaXMgcG9pbnQgd2Uga25vdyBibG9jayBzdHlsZXMgYXJlIHZhbGlkLlxuICAvLyBQcmVmZXIgbGl0ZXJhbCBzdHlsZSB1bmxlc3Mgd2Ugd2FudCB0byBmb2xkLlxuICByZXR1cm4gaGFzRm9sZGFibGVMaW5lID8gU1RZTEVfRk9MREVEIDogU1RZTEVfTElURVJBTDtcbn1cblxuLy8gTm90ZTogbGluZSBicmVha2luZy9mb2xkaW5nIGlzIGltcGxlbWVudGVkIGZvciBvbmx5IHRoZSBmb2xkZWQgc3R5bGUuXG4vLyBOQi4gV2UgZHJvcCB0aGUgbGFzdCB0cmFpbGluZyBuZXdsaW5lIChpZiBhbnkpIG9mIGEgcmV0dXJuZWQgYmxvY2sgc2NhbGFyXG4vLyAgc2luY2UgdGhlIGR1bXBlciBhZGRzIGl0cyBvd24gbmV3bGluZS4gVGhpcyBhbHdheXMgd29ya3M6XG4vLyAgICBcdTIwMjIgTm8gZW5kaW5nIG5ld2xpbmUgPT4gdW5hZmZlY3RlZDsgYWxyZWFkeSB1c2luZyBzdHJpcCBcIi1cIiBjaG9tcGluZy5cbi8vICAgIFx1MjAyMiBFbmRpbmcgbmV3bGluZSAgICA9PiByZW1vdmVkIHRoZW4gcmVzdG9yZWQuXG4vLyAgSW1wb3J0YW50bHksIHRoaXMga2VlcHMgdGhlIFwiK1wiIGNob21wIGluZGljYXRvciBmcm9tIGdhaW5pbmcgYW4gZXh0cmEgbGluZS5cbmZ1bmN0aW9uIHdyaXRlU2NhbGFyKHN0YXRlLCBzdHJpbmcsIGxldmVsLCBpc2tleSkge1xuICBzdGF0ZS5kdW1wID0gKGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoc3RyaW5nLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIFwiJydcIjtcbiAgICB9XG4gICAgaWYgKCFzdGF0ZS5ub0NvbXBhdE1vZGUgJiZcbiAgICAgICAgREVQUkVDQVRFRF9CT09MRUFOU19TWU5UQVguaW5kZXhPZihzdHJpbmcpICE9PSAtMSkge1xuICAgICAgcmV0dXJuIFwiJ1wiICsgc3RyaW5nICsgXCInXCI7XG4gICAgfVxuXG4gICAgdmFyIGluZGVudCA9IHN0YXRlLmluZGVudCAqIE1hdGgubWF4KDEsIGxldmVsKTsgLy8gbm8gMC1pbmRlbnQgc2NhbGFyc1xuICAgIC8vIEFzIGluZGVudGF0aW9uIGdldHMgZGVlcGVyLCBsZXQgdGhlIHdpZHRoIGRlY3JlYXNlIG1vbm90b25pY2FsbHlcbiAgICAvLyB0byB0aGUgbG93ZXIgYm91bmQgbWluKHN0YXRlLmxpbmVXaWR0aCwgNDApLlxuICAgIC8vIE5vdGUgdGhhdCB0aGlzIGltcGxpZXNcbiAgICAvLyAgc3RhdGUubGluZVdpZHRoIFx1MjI2NCA0MCArIHN0YXRlLmluZGVudDogd2lkdGggaXMgZml4ZWQgYXQgdGhlIGxvd2VyIGJvdW5kLlxuICAgIC8vICBzdGF0ZS5saW5lV2lkdGggPiA0MCArIHN0YXRlLmluZGVudDogd2lkdGggZGVjcmVhc2VzIHVudGlsIHRoZSBsb3dlciBib3VuZC5cbiAgICAvLyBUaGlzIGJlaGF2ZXMgYmV0dGVyIHRoYW4gYSBjb25zdGFudCBtaW5pbXVtIHdpZHRoIHdoaWNoIGRpc2FsbG93cyBuYXJyb3dlciBvcHRpb25zLFxuICAgIC8vIG9yIGFuIGluZGVudCB0aHJlc2hvbGQgd2hpY2ggY2F1c2VzIHRoZSB3aWR0aCB0byBzdWRkZW5seSBpbmNyZWFzZS5cbiAgICB2YXIgbGluZVdpZHRoID0gc3RhdGUubGluZVdpZHRoID09PSAtMVxuICAgICAgPyAtMSA6IE1hdGgubWF4KE1hdGgubWluKHN0YXRlLmxpbmVXaWR0aCwgNDApLCBzdGF0ZS5saW5lV2lkdGggLSBpbmRlbnQpO1xuXG4gICAgLy8gV2l0aG91dCBrbm93aW5nIGlmIGtleXMgYXJlIGltcGxpY2l0L2V4cGxpY2l0LCBhc3N1bWUgaW1wbGljaXQgZm9yIHNhZmV0eS5cbiAgICB2YXIgc2luZ2xlTGluZU9ubHkgPSBpc2tleVxuICAgICAgLy8gTm8gYmxvY2sgc3R5bGVzIGluIGZsb3cgbW9kZS5cbiAgICAgIHx8IChzdGF0ZS5mbG93TGV2ZWwgPiAtMSAmJiBsZXZlbCA+PSBzdGF0ZS5mbG93TGV2ZWwpO1xuICAgIGZ1bmN0aW9uIHRlc3RBbWJpZ3VpdHkoc3RyaW5nKSB7XG4gICAgICByZXR1cm4gdGVzdEltcGxpY2l0UmVzb2x2aW5nKHN0YXRlLCBzdHJpbmcpO1xuICAgIH1cblxuICAgIHN3aXRjaCAoY2hvb3NlU2NhbGFyU3R5bGUoc3RyaW5nLCBzaW5nbGVMaW5lT25seSwgc3RhdGUuaW5kZW50LCBsaW5lV2lkdGgsIHRlc3RBbWJpZ3VpdHkpKSB7XG4gICAgICBjYXNlIFNUWUxFX1BMQUlOOlxuICAgICAgICByZXR1cm4gc3RyaW5nO1xuICAgICAgY2FzZSBTVFlMRV9TSU5HTEU6XG4gICAgICAgIHJldHVybiBcIidcIiArIHN0cmluZy5yZXBsYWNlKC8nL2csIFwiJydcIikgKyBcIidcIjtcbiAgICAgIGNhc2UgU1RZTEVfTElURVJBTDpcbiAgICAgICAgcmV0dXJuICd8JyArIGJsb2NrSGVhZGVyKHN0cmluZywgc3RhdGUuaW5kZW50KVxuICAgICAgICAgICsgZHJvcEVuZGluZ05ld2xpbmUoaW5kZW50U3RyaW5nKHN0cmluZywgaW5kZW50KSk7XG4gICAgICBjYXNlIFNUWUxFX0ZPTERFRDpcbiAgICAgICAgcmV0dXJuICc+JyArIGJsb2NrSGVhZGVyKHN0cmluZywgc3RhdGUuaW5kZW50KVxuICAgICAgICAgICsgZHJvcEVuZGluZ05ld2xpbmUoaW5kZW50U3RyaW5nKGZvbGRTdHJpbmcoc3RyaW5nLCBsaW5lV2lkdGgpLCBpbmRlbnQpKTtcbiAgICAgIGNhc2UgU1RZTEVfRE9VQkxFOlxuICAgICAgICByZXR1cm4gJ1wiJyArIGVzY2FwZVN0cmluZyhzdHJpbmcsIGxpbmVXaWR0aCkgKyAnXCInO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IFlBTUxFeGNlcHRpb24oJ2ltcG9zc2libGUgZXJyb3I6IGludmFsaWQgc2NhbGFyIHN0eWxlJyk7XG4gICAgfVxuICB9KCkpO1xufVxuXG4vLyBQcmUtY29uZGl0aW9uczogc3RyaW5nIGlzIHZhbGlkIGZvciBhIGJsb2NrIHNjYWxhciwgMSA8PSBpbmRlbnRQZXJMZXZlbCA8PSA5LlxuZnVuY3Rpb24gYmxvY2tIZWFkZXIoc3RyaW5nLCBpbmRlbnRQZXJMZXZlbCkge1xuICB2YXIgaW5kZW50SW5kaWNhdG9yID0gbmVlZEluZGVudEluZGljYXRvcihzdHJpbmcpID8gU3RyaW5nKGluZGVudFBlckxldmVsKSA6ICcnO1xuXG4gIC8vIG5vdGUgdGhlIHNwZWNpYWwgY2FzZTogdGhlIHN0cmluZyAnXFxuJyBjb3VudHMgYXMgYSBcInRyYWlsaW5nXCIgZW1wdHkgbGluZS5cbiAgdmFyIGNsaXAgPSAgICAgICAgICBzdHJpbmdbc3RyaW5nLmxlbmd0aCAtIDFdID09PSAnXFxuJztcbiAgdmFyIGtlZXAgPSBjbGlwICYmIChzdHJpbmdbc3RyaW5nLmxlbmd0aCAtIDJdID09PSAnXFxuJyB8fCBzdHJpbmcgPT09ICdcXG4nKTtcbiAgdmFyIGNob21wID0ga2VlcCA/ICcrJyA6IChjbGlwID8gJycgOiAnLScpO1xuXG4gIHJldHVybiBpbmRlbnRJbmRpY2F0b3IgKyBjaG9tcCArICdcXG4nO1xufVxuXG4vLyAoU2VlIHRoZSBub3RlIGZvciB3cml0ZVNjYWxhci4pXG5mdW5jdGlvbiBkcm9wRW5kaW5nTmV3bGluZShzdHJpbmcpIHtcbiAgcmV0dXJuIHN0cmluZ1tzdHJpbmcubGVuZ3RoIC0gMV0gPT09ICdcXG4nID8gc3RyaW5nLnNsaWNlKDAsIC0xKSA6IHN0cmluZztcbn1cblxuLy8gTm90ZTogYSBsb25nIGxpbmUgd2l0aG91dCBhIHN1aXRhYmxlIGJyZWFrIHBvaW50IHdpbGwgZXhjZWVkIHRoZSB3aWR0aCBsaW1pdC5cbi8vIFByZS1jb25kaXRpb25zOiBldmVyeSBjaGFyIGluIHN0ciBpc1ByaW50YWJsZSwgc3RyLmxlbmd0aCA+IDAsIHdpZHRoID4gMC5cbmZ1bmN0aW9uIGZvbGRTdHJpbmcoc3RyaW5nLCB3aWR0aCkge1xuICAvLyBJbiBmb2xkZWQgc3R5bGUsICRrJCBjb25zZWN1dGl2ZSBuZXdsaW5lcyBvdXRwdXQgYXMgJGsrMSQgbmV3bGluZXNcdTIwMTRcbiAgLy8gdW5sZXNzIHRoZXkncmUgYmVmb3JlIG9yIGFmdGVyIGEgbW9yZS1pbmRlbnRlZCBsaW5lLCBvciBhdCB0aGUgdmVyeVxuICAvLyBiZWdpbm5pbmcgb3IgZW5kLCBpbiB3aGljaCBjYXNlICRrJCBtYXBzIHRvICRrJC5cbiAgLy8gVGhlcmVmb3JlLCBwYXJzZSBlYWNoIGNodW5rIGFzIG5ld2xpbmUocykgZm9sbG93ZWQgYnkgYSBjb250ZW50IGxpbmUuXG4gIHZhciBsaW5lUmUgPSAvKFxcbispKFteXFxuXSopL2c7XG5cbiAgLy8gZmlyc3QgbGluZSAocG9zc2libHkgYW4gZW1wdHkgbGluZSlcbiAgdmFyIHJlc3VsdCA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5leHRMRiA9IHN0cmluZy5pbmRleE9mKCdcXG4nKTtcbiAgICBuZXh0TEYgPSBuZXh0TEYgIT09IC0xID8gbmV4dExGIDogc3RyaW5nLmxlbmd0aDtcbiAgICBsaW5lUmUubGFzdEluZGV4ID0gbmV4dExGO1xuICAgIHJldHVybiBmb2xkTGluZShzdHJpbmcuc2xpY2UoMCwgbmV4dExGKSwgd2lkdGgpO1xuICB9KCkpO1xuICAvLyBJZiB3ZSBoYXZlbid0IHJlYWNoZWQgdGhlIGZpcnN0IGNvbnRlbnQgbGluZSB5ZXQsIGRvbid0IGFkZCBhbiBleHRyYSBcXG4uXG4gIHZhciBwcmV2TW9yZUluZGVudGVkID0gc3RyaW5nWzBdID09PSAnXFxuJyB8fCBzdHJpbmdbMF0gPT09ICcgJztcbiAgdmFyIG1vcmVJbmRlbnRlZDtcblxuICAvLyByZXN0IG9mIHRoZSBsaW5lc1xuICB2YXIgbWF0Y2g7XG4gIHdoaWxlICgobWF0Y2ggPSBsaW5lUmUuZXhlYyhzdHJpbmcpKSkge1xuICAgIHZhciBwcmVmaXggPSBtYXRjaFsxXSwgbGluZSA9IG1hdGNoWzJdO1xuICAgIG1vcmVJbmRlbnRlZCA9IChsaW5lWzBdID09PSAnICcpO1xuICAgIHJlc3VsdCArPSBwcmVmaXhcbiAgICAgICsgKCFwcmV2TW9yZUluZGVudGVkICYmICFtb3JlSW5kZW50ZWQgJiYgbGluZSAhPT0gJydcbiAgICAgICAgPyAnXFxuJyA6ICcnKVxuICAgICAgKyBmb2xkTGluZShsaW5lLCB3aWR0aCk7XG4gICAgcHJldk1vcmVJbmRlbnRlZCA9IG1vcmVJbmRlbnRlZDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8vIEdyZWVkeSBsaW5lIGJyZWFraW5nLlxuLy8gUGlja3MgdGhlIGxvbmdlc3QgbGluZSB1bmRlciB0aGUgbGltaXQgZWFjaCB0aW1lLFxuLy8gb3RoZXJ3aXNlIHNldHRsZXMgZm9yIHRoZSBzaG9ydGVzdCBsaW5lIG92ZXIgdGhlIGxpbWl0LlxuLy8gTkIuIE1vcmUtaW5kZW50ZWQgbGluZXMgKmNhbm5vdCogYmUgZm9sZGVkLCBhcyB0aGF0IHdvdWxkIGFkZCBhbiBleHRyYSBcXG4uXG5mdW5jdGlvbiBmb2xkTGluZShsaW5lLCB3aWR0aCkge1xuICBpZiAobGluZSA9PT0gJycgfHwgbGluZVswXSA9PT0gJyAnKSByZXR1cm4gbGluZTtcblxuICAvLyBTaW5jZSBhIG1vcmUtaW5kZW50ZWQgbGluZSBhZGRzIGEgXFxuLCBicmVha3MgY2FuJ3QgYmUgZm9sbG93ZWQgYnkgYSBzcGFjZS5cbiAgdmFyIGJyZWFrUmUgPSAvIFteIF0vZzsgLy8gbm90ZTogdGhlIG1hdGNoIGluZGV4IHdpbGwgYWx3YXlzIGJlIDw9IGxlbmd0aC0yLlxuICB2YXIgbWF0Y2g7XG4gIC8vIHN0YXJ0IGlzIGFuIGluY2x1c2l2ZSBpbmRleC4gZW5kLCBjdXJyLCBhbmQgbmV4dCBhcmUgZXhjbHVzaXZlLlxuICB2YXIgc3RhcnQgPSAwLCBlbmQsIGN1cnIgPSAwLCBuZXh0ID0gMDtcbiAgdmFyIHJlc3VsdCA9ICcnO1xuXG4gIC8vIEludmFyaWFudHM6IDAgPD0gc3RhcnQgPD0gbGVuZ3RoLTEuXG4gIC8vICAgMCA8PSBjdXJyIDw9IG5leHQgPD0gbWF4KDAsIGxlbmd0aC0yKS4gY3VyciAtIHN0YXJ0IDw9IHdpZHRoLlxuICAvLyBJbnNpZGUgdGhlIGxvb3A6XG4gIC8vICAgQSBtYXRjaCBpbXBsaWVzIGxlbmd0aCA+PSAyLCBzbyBjdXJyIGFuZCBuZXh0IGFyZSA8PSBsZW5ndGgtMi5cbiAgd2hpbGUgKChtYXRjaCA9IGJyZWFrUmUuZXhlYyhsaW5lKSkpIHtcbiAgICBuZXh0ID0gbWF0Y2guaW5kZXg7XG4gICAgLy8gbWFpbnRhaW4gaW52YXJpYW50OiBjdXJyIC0gc3RhcnQgPD0gd2lkdGhcbiAgICBpZiAobmV4dCAtIHN0YXJ0ID4gd2lkdGgpIHtcbiAgICAgIGVuZCA9IChjdXJyID4gc3RhcnQpID8gY3VyciA6IG5leHQ7IC8vIGRlcml2ZSBlbmQgPD0gbGVuZ3RoLTJcbiAgICAgIHJlc3VsdCArPSAnXFxuJyArIGxpbmUuc2xpY2Uoc3RhcnQsIGVuZCk7XG4gICAgICAvLyBza2lwIHRoZSBzcGFjZSB0aGF0IHdhcyBvdXRwdXQgYXMgXFxuXG4gICAgICBzdGFydCA9IGVuZCArIDE7ICAgICAgICAgICAgICAgICAgICAvLyBkZXJpdmUgc3RhcnQgPD0gbGVuZ3RoLTFcbiAgICB9XG4gICAgY3VyciA9IG5leHQ7XG4gIH1cblxuICAvLyBCeSB0aGUgaW52YXJpYW50cywgc3RhcnQgPD0gbGVuZ3RoLTEsIHNvIHRoZXJlIGlzIHNvbWV0aGluZyBsZWZ0IG92ZXIuXG4gIC8vIEl0IGlzIGVpdGhlciB0aGUgd2hvbGUgc3RyaW5nIG9yIGEgcGFydCBzdGFydGluZyBmcm9tIG5vbi13aGl0ZXNwYWNlLlxuICByZXN1bHQgKz0gJ1xcbic7XG4gIC8vIEluc2VydCBhIGJyZWFrIGlmIHRoZSByZW1haW5kZXIgaXMgdG9vIGxvbmcgYW5kIHRoZXJlIGlzIGEgYnJlYWsgYXZhaWxhYmxlLlxuICBpZiAobGluZS5sZW5ndGggLSBzdGFydCA+IHdpZHRoICYmIGN1cnIgPiBzdGFydCkge1xuICAgIHJlc3VsdCArPSBsaW5lLnNsaWNlKHN0YXJ0LCBjdXJyKSArICdcXG4nICsgbGluZS5zbGljZShjdXJyICsgMSk7XG4gIH0gZWxzZSB7XG4gICAgcmVzdWx0ICs9IGxpbmUuc2xpY2Uoc3RhcnQpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdC5zbGljZSgxKTsgLy8gZHJvcCBleHRyYSBcXG4gam9pbmVyXG59XG5cbi8vIEVzY2FwZXMgYSBkb3VibGUtcXVvdGVkIHN0cmluZy5cbmZ1bmN0aW9uIGVzY2FwZVN0cmluZyhzdHJpbmcpIHtcbiAgdmFyIHJlc3VsdCA9ICcnO1xuICB2YXIgY2hhciwgbmV4dENoYXI7XG4gIHZhciBlc2NhcGVTZXE7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICBjaGFyID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gICAgLy8gQ2hlY2sgZm9yIHN1cnJvZ2F0ZSBwYWlycyAocmVmZXJlbmNlIFVuaWNvZGUgMy4wIHNlY3Rpb24gXCIzLjcgU3Vycm9nYXRlc1wiKS5cbiAgICBpZiAoY2hhciA+PSAweEQ4MDAgJiYgY2hhciA8PSAweERCRkYvKiBoaWdoIHN1cnJvZ2F0ZSAqLykge1xuICAgICAgbmV4dENoYXIgPSBzdHJpbmcuY2hhckNvZGVBdChpICsgMSk7XG4gICAgICBpZiAobmV4dENoYXIgPj0gMHhEQzAwICYmIG5leHRDaGFyIDw9IDB4REZGRi8qIGxvdyBzdXJyb2dhdGUgKi8pIHtcbiAgICAgICAgLy8gQ29tYmluZSB0aGUgc3Vycm9nYXRlIHBhaXIgYW5kIHN0b3JlIGl0IGVzY2FwZWQuXG4gICAgICAgIHJlc3VsdCArPSBlbmNvZGVIZXgoKGNoYXIgLSAweEQ4MDApICogMHg0MDAgKyBuZXh0Q2hhciAtIDB4REMwMCArIDB4MTAwMDApO1xuICAgICAgICAvLyBBZHZhbmNlIGluZGV4IG9uZSBleHRyYSBzaW5jZSB3ZSBhbHJlYWR5IHVzZWQgdGhhdCBjaGFyIGhlcmUuXG4gICAgICAgIGkrKzsgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuICAgIGVzY2FwZVNlcSA9IEVTQ0FQRV9TRVFVRU5DRVNbY2hhcl07XG4gICAgcmVzdWx0ICs9ICFlc2NhcGVTZXEgJiYgaXNQcmludGFibGUoY2hhcilcbiAgICAgID8gc3RyaW5nW2ldXG4gICAgICA6IGVzY2FwZVNlcSB8fCBlbmNvZGVIZXgoY2hhcik7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiB3cml0ZUZsb3dTZXF1ZW5jZShzdGF0ZSwgbGV2ZWwsIG9iamVjdCkge1xuICB2YXIgX3Jlc3VsdCA9ICcnLFxuICAgICAgX3RhZyAgICA9IHN0YXRlLnRhZyxcbiAgICAgIGluZGV4LFxuICAgICAgbGVuZ3RoO1xuXG4gIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBvYmplY3QubGVuZ3RoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXggKz0gMSkge1xuICAgIC8vIFdyaXRlIG9ubHkgdmFsaWQgZWxlbWVudHMuXG4gICAgaWYgKHdyaXRlTm9kZShzdGF0ZSwgbGV2ZWwsIG9iamVjdFtpbmRleF0sIGZhbHNlLCBmYWxzZSkpIHtcbiAgICAgIGlmIChpbmRleCAhPT0gMCkgX3Jlc3VsdCArPSAnLCcgKyAoIXN0YXRlLmNvbmRlbnNlRmxvdyA/ICcgJyA6ICcnKTtcbiAgICAgIF9yZXN1bHQgKz0gc3RhdGUuZHVtcDtcbiAgICB9XG4gIH1cblxuICBzdGF0ZS50YWcgPSBfdGFnO1xuICBzdGF0ZS5kdW1wID0gJ1snICsgX3Jlc3VsdCArICddJztcbn1cblxuZnVuY3Rpb24gd3JpdGVCbG9ja1NlcXVlbmNlKHN0YXRlLCBsZXZlbCwgb2JqZWN0LCBjb21wYWN0KSB7XG4gIHZhciBfcmVzdWx0ID0gJycsXG4gICAgICBfdGFnICAgID0gc3RhdGUudGFnLFxuICAgICAgaW5kZXgsXG4gICAgICBsZW5ndGg7XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IG9iamVjdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgLy8gV3JpdGUgb25seSB2YWxpZCBlbGVtZW50cy5cbiAgICBpZiAod3JpdGVOb2RlKHN0YXRlLCBsZXZlbCArIDEsIG9iamVjdFtpbmRleF0sIHRydWUsIHRydWUpKSB7XG4gICAgICBpZiAoIWNvbXBhY3QgfHwgaW5kZXggIT09IDApIHtcbiAgICAgICAgX3Jlc3VsdCArPSBnZW5lcmF0ZU5leHRMaW5lKHN0YXRlLCBsZXZlbCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzdGF0ZS5kdW1wICYmIENIQVJfTElORV9GRUVEID09PSBzdGF0ZS5kdW1wLmNoYXJDb2RlQXQoMCkpIHtcbiAgICAgICAgX3Jlc3VsdCArPSAnLSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBfcmVzdWx0ICs9ICctICc7XG4gICAgICB9XG5cbiAgICAgIF9yZXN1bHQgKz0gc3RhdGUuZHVtcDtcbiAgICB9XG4gIH1cblxuICBzdGF0ZS50YWcgPSBfdGFnO1xuICBzdGF0ZS5kdW1wID0gX3Jlc3VsdCB8fCAnW10nOyAvLyBFbXB0eSBzZXF1ZW5jZSBpZiBubyB2YWxpZCB2YWx1ZXMuXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvd01hcHBpbmcoc3RhdGUsIGxldmVsLCBvYmplY3QpIHtcbiAgdmFyIF9yZXN1bHQgICAgICAgPSAnJyxcbiAgICAgIF90YWcgICAgICAgICAgPSBzdGF0ZS50YWcsXG4gICAgICBvYmplY3RLZXlMaXN0ID0gT2JqZWN0LmtleXMob2JqZWN0KSxcbiAgICAgIGluZGV4LFxuICAgICAgbGVuZ3RoLFxuICAgICAgb2JqZWN0S2V5LFxuICAgICAgb2JqZWN0VmFsdWUsXG4gICAgICBwYWlyQnVmZmVyO1xuXG4gIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBvYmplY3RLZXlMaXN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcblxuICAgIHBhaXJCdWZmZXIgPSAnJztcbiAgICBpZiAoaW5kZXggIT09IDApIHBhaXJCdWZmZXIgKz0gJywgJztcblxuICAgIGlmIChzdGF0ZS5jb25kZW5zZUZsb3cpIHBhaXJCdWZmZXIgKz0gJ1wiJztcblxuICAgIG9iamVjdEtleSA9IG9iamVjdEtleUxpc3RbaW5kZXhdO1xuICAgIG9iamVjdFZhbHVlID0gb2JqZWN0W29iamVjdEtleV07XG5cbiAgICBpZiAoIXdyaXRlTm9kZShzdGF0ZSwgbGV2ZWwsIG9iamVjdEtleSwgZmFsc2UsIGZhbHNlKSkge1xuICAgICAgY29udGludWU7IC8vIFNraXAgdGhpcyBwYWlyIGJlY2F1c2Ugb2YgaW52YWxpZCBrZXk7XG4gICAgfVxuXG4gICAgaWYgKHN0YXRlLmR1bXAubGVuZ3RoID4gMTAyNCkgcGFpckJ1ZmZlciArPSAnPyAnO1xuXG4gICAgcGFpckJ1ZmZlciArPSBzdGF0ZS5kdW1wICsgKHN0YXRlLmNvbmRlbnNlRmxvdyA/ICdcIicgOiAnJykgKyAnOicgKyAoc3RhdGUuY29uZGVuc2VGbG93ID8gJycgOiAnICcpO1xuXG4gICAgaWYgKCF3cml0ZU5vZGUoc3RhdGUsIGxldmVsLCBvYmplY3RWYWx1ZSwgZmFsc2UsIGZhbHNlKSkge1xuICAgICAgY29udGludWU7IC8vIFNraXAgdGhpcyBwYWlyIGJlY2F1c2Ugb2YgaW52YWxpZCB2YWx1ZS5cbiAgICB9XG5cbiAgICBwYWlyQnVmZmVyICs9IHN0YXRlLmR1bXA7XG5cbiAgICAvLyBCb3RoIGtleSBhbmQgdmFsdWUgYXJlIHZhbGlkLlxuICAgIF9yZXN1bHQgKz0gcGFpckJ1ZmZlcjtcbiAgfVxuXG4gIHN0YXRlLnRhZyA9IF90YWc7XG4gIHN0YXRlLmR1bXAgPSAneycgKyBfcmVzdWx0ICsgJ30nO1xufVxuXG5mdW5jdGlvbiB3cml0ZUJsb2NrTWFwcGluZyhzdGF0ZSwgbGV2ZWwsIG9iamVjdCwgY29tcGFjdCkge1xuICB2YXIgX3Jlc3VsdCAgICAgICA9ICcnLFxuICAgICAgX3RhZyAgICAgICAgICA9IHN0YXRlLnRhZyxcbiAgICAgIG9iamVjdEtleUxpc3QgPSBPYmplY3Qua2V5cyhvYmplY3QpLFxuICAgICAgaW5kZXgsXG4gICAgICBsZW5ndGgsXG4gICAgICBvYmplY3RLZXksXG4gICAgICBvYmplY3RWYWx1ZSxcbiAgICAgIGV4cGxpY2l0UGFpcixcbiAgICAgIHBhaXJCdWZmZXI7XG5cbiAgLy8gQWxsb3cgc29ydGluZyBrZXlzIHNvIHRoYXQgdGhlIG91dHB1dCBmaWxlIGlzIGRldGVybWluaXN0aWNcbiAgaWYgKHN0YXRlLnNvcnRLZXlzID09PSB0cnVlKSB7XG4gICAgLy8gRGVmYXVsdCBzb3J0aW5nXG4gICAgb2JqZWN0S2V5TGlzdC5zb3J0KCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHN0YXRlLnNvcnRLZXlzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gQ3VzdG9tIHNvcnQgZnVuY3Rpb25cbiAgICBvYmplY3RLZXlMaXN0LnNvcnQoc3RhdGUuc29ydEtleXMpO1xuICB9IGVsc2UgaWYgKHN0YXRlLnNvcnRLZXlzKSB7XG4gICAgLy8gU29tZXRoaW5nIGlzIHdyb25nXG4gICAgdGhyb3cgbmV3IFlBTUxFeGNlcHRpb24oJ3NvcnRLZXlzIG11c3QgYmUgYSBib29sZWFuIG9yIGEgZnVuY3Rpb24nKTtcbiAgfVxuXG4gIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSBvYmplY3RLZXlMaXN0Lmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICBwYWlyQnVmZmVyID0gJyc7XG5cbiAgICBpZiAoIWNvbXBhY3QgfHwgaW5kZXggIT09IDApIHtcbiAgICAgIHBhaXJCdWZmZXIgKz0gZ2VuZXJhdGVOZXh0TGluZShzdGF0ZSwgbGV2ZWwpO1xuICAgIH1cblxuICAgIG9iamVjdEtleSA9IG9iamVjdEtleUxpc3RbaW5kZXhdO1xuICAgIG9iamVjdFZhbHVlID0gb2JqZWN0W29iamVjdEtleV07XG5cbiAgICBpZiAoIXdyaXRlTm9kZShzdGF0ZSwgbGV2ZWwgKyAxLCBvYmplY3RLZXksIHRydWUsIHRydWUsIHRydWUpKSB7XG4gICAgICBjb250aW51ZTsgLy8gU2tpcCB0aGlzIHBhaXIgYmVjYXVzZSBvZiBpbnZhbGlkIGtleS5cbiAgICB9XG5cbiAgICBleHBsaWNpdFBhaXIgPSAoc3RhdGUudGFnICE9PSBudWxsICYmIHN0YXRlLnRhZyAhPT0gJz8nKSB8fFxuICAgICAgICAgICAgICAgICAgIChzdGF0ZS5kdW1wICYmIHN0YXRlLmR1bXAubGVuZ3RoID4gMTAyNCk7XG5cbiAgICBpZiAoZXhwbGljaXRQYWlyKSB7XG4gICAgICBpZiAoc3RhdGUuZHVtcCAmJiBDSEFSX0xJTkVfRkVFRCA9PT0gc3RhdGUuZHVtcC5jaGFyQ29kZUF0KDApKSB7XG4gICAgICAgIHBhaXJCdWZmZXIgKz0gJz8nO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFpckJ1ZmZlciArPSAnPyAnO1xuICAgICAgfVxuICAgIH1cblxuICAgIHBhaXJCdWZmZXIgKz0gc3RhdGUuZHVtcDtcblxuICAgIGlmIChleHBsaWNpdFBhaXIpIHtcbiAgICAgIHBhaXJCdWZmZXIgKz0gZ2VuZXJhdGVOZXh0TGluZShzdGF0ZSwgbGV2ZWwpO1xuICAgIH1cblxuICAgIGlmICghd3JpdGVOb2RlKHN0YXRlLCBsZXZlbCArIDEsIG9iamVjdFZhbHVlLCB0cnVlLCBleHBsaWNpdFBhaXIpKSB7XG4gICAgICBjb250aW51ZTsgLy8gU2tpcCB0aGlzIHBhaXIgYmVjYXVzZSBvZiBpbnZhbGlkIHZhbHVlLlxuICAgIH1cblxuICAgIGlmIChzdGF0ZS5kdW1wICYmIENIQVJfTElORV9GRUVEID09PSBzdGF0ZS5kdW1wLmNoYXJDb2RlQXQoMCkpIHtcbiAgICAgIHBhaXJCdWZmZXIgKz0gJzonO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYWlyQnVmZmVyICs9ICc6ICc7XG4gICAgfVxuXG4gICAgcGFpckJ1ZmZlciArPSBzdGF0ZS5kdW1wO1xuXG4gICAgLy8gQm90aCBrZXkgYW5kIHZhbHVlIGFyZSB2YWxpZC5cbiAgICBfcmVzdWx0ICs9IHBhaXJCdWZmZXI7XG4gIH1cblxuICBzdGF0ZS50YWcgPSBfdGFnO1xuICBzdGF0ZS5kdW1wID0gX3Jlc3VsdCB8fCAne30nOyAvLyBFbXB0eSBtYXBwaW5nIGlmIG5vIHZhbGlkIHBhaXJzLlxufVxuXG5mdW5jdGlvbiBkZXRlY3RUeXBlKHN0YXRlLCBvYmplY3QsIGV4cGxpY2l0KSB7XG4gIHZhciBfcmVzdWx0LCB0eXBlTGlzdCwgaW5kZXgsIGxlbmd0aCwgdHlwZSwgc3R5bGU7XG5cbiAgdHlwZUxpc3QgPSBleHBsaWNpdCA/IHN0YXRlLmV4cGxpY2l0VHlwZXMgOiBzdGF0ZS5pbXBsaWNpdFR5cGVzO1xuXG4gIGZvciAoaW5kZXggPSAwLCBsZW5ndGggPSB0eXBlTGlzdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgdHlwZSA9IHR5cGVMaXN0W2luZGV4XTtcblxuICAgIGlmICgodHlwZS5pbnN0YW5jZU9mICB8fCB0eXBlLnByZWRpY2F0ZSkgJiZcbiAgICAgICAgKCF0eXBlLmluc3RhbmNlT2YgfHwgKCh0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0JykgJiYgKG9iamVjdCBpbnN0YW5jZW9mIHR5cGUuaW5zdGFuY2VPZikpKSAmJlxuICAgICAgICAoIXR5cGUucHJlZGljYXRlICB8fCB0eXBlLnByZWRpY2F0ZShvYmplY3QpKSkge1xuXG4gICAgICBzdGF0ZS50YWcgPSBleHBsaWNpdCA/IHR5cGUudGFnIDogJz8nO1xuXG4gICAgICBpZiAodHlwZS5yZXByZXNlbnQpIHtcbiAgICAgICAgc3R5bGUgPSBzdGF0ZS5zdHlsZU1hcFt0eXBlLnRhZ10gfHwgdHlwZS5kZWZhdWx0U3R5bGU7XG5cbiAgICAgICAgaWYgKF90b1N0cmluZy5jYWxsKHR5cGUucmVwcmVzZW50KSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJykge1xuICAgICAgICAgIF9yZXN1bHQgPSB0eXBlLnJlcHJlc2VudChvYmplY3QsIHN0eWxlKTtcbiAgICAgICAgfSBlbHNlIGlmIChfaGFzT3duUHJvcGVydHkuY2FsbCh0eXBlLnJlcHJlc2VudCwgc3R5bGUpKSB7XG4gICAgICAgICAgX3Jlc3VsdCA9IHR5cGUucmVwcmVzZW50W3N0eWxlXShvYmplY3QsIHN0eWxlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgWUFNTEV4Y2VwdGlvbignITwnICsgdHlwZS50YWcgKyAnPiB0YWcgcmVzb2x2ZXIgYWNjZXB0cyBub3QgXCInICsgc3R5bGUgKyAnXCIgc3R5bGUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLmR1bXAgPSBfcmVzdWx0O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIFNlcmlhbGl6ZXMgYG9iamVjdGAgYW5kIHdyaXRlcyBpdCB0byBnbG9iYWwgYHJlc3VsdGAuXG4vLyBSZXR1cm5zIHRydWUgb24gc3VjY2Vzcywgb3IgZmFsc2Ugb24gaW52YWxpZCBvYmplY3QuXG4vL1xuZnVuY3Rpb24gd3JpdGVOb2RlKHN0YXRlLCBsZXZlbCwgb2JqZWN0LCBibG9jaywgY29tcGFjdCwgaXNrZXkpIHtcbiAgc3RhdGUudGFnID0gbnVsbDtcbiAgc3RhdGUuZHVtcCA9IG9iamVjdDtcblxuICBpZiAoIWRldGVjdFR5cGUoc3RhdGUsIG9iamVjdCwgZmFsc2UpKSB7XG4gICAgZGV0ZWN0VHlwZShzdGF0ZSwgb2JqZWN0LCB0cnVlKTtcbiAgfVxuXG4gIHZhciB0eXBlID0gX3RvU3RyaW5nLmNhbGwoc3RhdGUuZHVtcCk7XG5cbiAgaWYgKGJsb2NrKSB7XG4gICAgYmxvY2sgPSAoc3RhdGUuZmxvd0xldmVsIDwgMCB8fCBzdGF0ZS5mbG93TGV2ZWwgPiBsZXZlbCk7XG4gIH1cblxuICB2YXIgb2JqZWN0T3JBcnJheSA9IHR5cGUgPT09ICdbb2JqZWN0IE9iamVjdF0nIHx8IHR5cGUgPT09ICdbb2JqZWN0IEFycmF5XScsXG4gICAgICBkdXBsaWNhdGVJbmRleCxcbiAgICAgIGR1cGxpY2F0ZTtcblxuICBpZiAob2JqZWN0T3JBcnJheSkge1xuICAgIGR1cGxpY2F0ZUluZGV4ID0gc3RhdGUuZHVwbGljYXRlcy5pbmRleE9mKG9iamVjdCk7XG4gICAgZHVwbGljYXRlID0gZHVwbGljYXRlSW5kZXggIT09IC0xO1xuICB9XG5cbiAgaWYgKChzdGF0ZS50YWcgIT09IG51bGwgJiYgc3RhdGUudGFnICE9PSAnPycpIHx8IGR1cGxpY2F0ZSB8fCAoc3RhdGUuaW5kZW50ICE9PSAyICYmIGxldmVsID4gMCkpIHtcbiAgICBjb21wYWN0ID0gZmFsc2U7XG4gIH1cblxuICBpZiAoZHVwbGljYXRlICYmIHN0YXRlLnVzZWREdXBsaWNhdGVzW2R1cGxpY2F0ZUluZGV4XSkge1xuICAgIHN0YXRlLmR1bXAgPSAnKnJlZl8nICsgZHVwbGljYXRlSW5kZXg7XG4gIH0gZWxzZSB7XG4gICAgaWYgKG9iamVjdE9yQXJyYXkgJiYgZHVwbGljYXRlICYmICFzdGF0ZS51c2VkRHVwbGljYXRlc1tkdXBsaWNhdGVJbmRleF0pIHtcbiAgICAgIHN0YXRlLnVzZWREdXBsaWNhdGVzW2R1cGxpY2F0ZUluZGV4XSA9IHRydWU7XG4gICAgfVxuICAgIGlmICh0eXBlID09PSAnW29iamVjdCBPYmplY3RdJykge1xuICAgICAgaWYgKGJsb2NrICYmIChPYmplY3Qua2V5cyhzdGF0ZS5kdW1wKS5sZW5ndGggIT09IDApKSB7XG4gICAgICAgIHdyaXRlQmxvY2tNYXBwaW5nKHN0YXRlLCBsZXZlbCwgc3RhdGUuZHVtcCwgY29tcGFjdCk7XG4gICAgICAgIGlmIChkdXBsaWNhdGUpIHtcbiAgICAgICAgICBzdGF0ZS5kdW1wID0gJyZyZWZfJyArIGR1cGxpY2F0ZUluZGV4ICsgc3RhdGUuZHVtcDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd3JpdGVGbG93TWFwcGluZyhzdGF0ZSwgbGV2ZWwsIHN0YXRlLmR1bXApO1xuICAgICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgICAgc3RhdGUuZHVtcCA9ICcmcmVmXycgKyBkdXBsaWNhdGVJbmRleCArICcgJyArIHN0YXRlLmR1bXA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdbb2JqZWN0IEFycmF5XScpIHtcbiAgICAgIHZhciBhcnJheUxldmVsID0gKHN0YXRlLm5vQXJyYXlJbmRlbnQgJiYgKGxldmVsID4gMCkpID8gbGV2ZWwgLSAxIDogbGV2ZWw7XG4gICAgICBpZiAoYmxvY2sgJiYgKHN0YXRlLmR1bXAubGVuZ3RoICE9PSAwKSkge1xuICAgICAgICB3cml0ZUJsb2NrU2VxdWVuY2Uoc3RhdGUsIGFycmF5TGV2ZWwsIHN0YXRlLmR1bXAsIGNvbXBhY3QpO1xuICAgICAgICBpZiAoZHVwbGljYXRlKSB7XG4gICAgICAgICAgc3RhdGUuZHVtcCA9ICcmcmVmXycgKyBkdXBsaWNhdGVJbmRleCArIHN0YXRlLmR1bXA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHdyaXRlRmxvd1NlcXVlbmNlKHN0YXRlLCBhcnJheUxldmVsLCBzdGF0ZS5kdW1wKTtcbiAgICAgICAgaWYgKGR1cGxpY2F0ZSkge1xuICAgICAgICAgIHN0YXRlLmR1bXAgPSAnJnJlZl8nICsgZHVwbGljYXRlSW5kZXggKyAnICcgKyBzdGF0ZS5kdW1wO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnW29iamVjdCBTdHJpbmddJykge1xuICAgICAgaWYgKHN0YXRlLnRhZyAhPT0gJz8nKSB7XG4gICAgICAgIHdyaXRlU2NhbGFyKHN0YXRlLCBzdGF0ZS5kdW1wLCBsZXZlbCwgaXNrZXkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoc3RhdGUuc2tpcEludmFsaWQpIHJldHVybiBmYWxzZTtcbiAgICAgIHRocm93IG5ldyBZQU1MRXhjZXB0aW9uKCd1bmFjY2VwdGFibGUga2luZCBvZiBhbiBvYmplY3QgdG8gZHVtcCAnICsgdHlwZSk7XG4gICAgfVxuXG4gICAgaWYgKHN0YXRlLnRhZyAhPT0gbnVsbCAmJiBzdGF0ZS50YWcgIT09ICc/Jykge1xuICAgICAgc3RhdGUuZHVtcCA9ICchPCcgKyBzdGF0ZS50YWcgKyAnPiAnICsgc3RhdGUuZHVtcDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gZ2V0RHVwbGljYXRlUmVmZXJlbmNlcyhvYmplY3QsIHN0YXRlKSB7XG4gIHZhciBvYmplY3RzID0gW10sXG4gICAgICBkdXBsaWNhdGVzSW5kZXhlcyA9IFtdLFxuICAgICAgaW5kZXgsXG4gICAgICBsZW5ndGg7XG5cbiAgaW5zcGVjdE5vZGUob2JqZWN0LCBvYmplY3RzLCBkdXBsaWNhdGVzSW5kZXhlcyk7XG5cbiAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IGR1cGxpY2F0ZXNJbmRleGVzLmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICBzdGF0ZS5kdXBsaWNhdGVzLnB1c2gob2JqZWN0c1tkdXBsaWNhdGVzSW5kZXhlc1tpbmRleF1dKTtcbiAgfVxuICBzdGF0ZS51c2VkRHVwbGljYXRlcyA9IG5ldyBBcnJheShsZW5ndGgpO1xufVxuXG5mdW5jdGlvbiBpbnNwZWN0Tm9kZShvYmplY3QsIG9iamVjdHMsIGR1cGxpY2F0ZXNJbmRleGVzKSB7XG4gIHZhciBvYmplY3RLZXlMaXN0LFxuICAgICAgaW5kZXgsXG4gICAgICBsZW5ndGg7XG5cbiAgaWYgKG9iamVjdCAhPT0gbnVsbCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0Jykge1xuICAgIGluZGV4ID0gb2JqZWN0cy5pbmRleE9mKG9iamVjdCk7XG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgaWYgKGR1cGxpY2F0ZXNJbmRleGVzLmluZGV4T2YoaW5kZXgpID09PSAtMSkge1xuICAgICAgICBkdXBsaWNhdGVzSW5kZXhlcy5wdXNoKGluZGV4KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb2JqZWN0cy5wdXNoKG9iamVjdCk7XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iamVjdCkpIHtcbiAgICAgICAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IG9iamVjdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgICAgICAgaW5zcGVjdE5vZGUob2JqZWN0W2luZGV4XSwgb2JqZWN0cywgZHVwbGljYXRlc0luZGV4ZXMpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYmplY3RLZXlMaXN0ID0gT2JqZWN0LmtleXMob2JqZWN0KTtcblxuICAgICAgICBmb3IgKGluZGV4ID0gMCwgbGVuZ3RoID0gb2JqZWN0S2V5TGlzdC5sZW5ndGg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XG4gICAgICAgICAgaW5zcGVjdE5vZGUob2JqZWN0W29iamVjdEtleUxpc3RbaW5kZXhdXSwgb2JqZWN0cywgZHVwbGljYXRlc0luZGV4ZXMpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGR1bXAoaW5wdXQsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdmFyIHN0YXRlID0gbmV3IFN0YXRlKG9wdGlvbnMpO1xuXG4gIGlmICghc3RhdGUubm9SZWZzKSBnZXREdXBsaWNhdGVSZWZlcmVuY2VzKGlucHV0LCBzdGF0ZSk7XG5cbiAgaWYgKHdyaXRlTm9kZShzdGF0ZSwgMCwgaW5wdXQsIHRydWUsIHRydWUpKSByZXR1cm4gc3RhdGUuZHVtcCArICdcXG4nO1xuXG4gIHJldHVybiAnJztcbn1cblxuZnVuY3Rpb24gc2FmZUR1bXAoaW5wdXQsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIGR1bXAoaW5wdXQsIGNvbW1vbi5leHRlbmQoeyBzY2hlbWE6IERFRkFVTFRfU0FGRV9TQ0hFTUEgfSwgb3B0aW9ucykpO1xufVxuXG5tb2R1bGUuZXhwb3J0cy5kdW1wICAgICA9IGR1bXA7XG5tb2R1bGUuZXhwb3J0cy5zYWZlRHVtcCA9IHNhZmVEdW1wO1xuIiwgIid1c2Ugc3RyaWN0JztcblxuXG52YXIgbG9hZGVyID0gcmVxdWlyZSgnLi9qcy15YW1sL2xvYWRlcicpO1xudmFyIGR1bXBlciA9IHJlcXVpcmUoJy4vanMteWFtbC9kdW1wZXInKTtcblxuXG5mdW5jdGlvbiBkZXByZWNhdGVkKG5hbWUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Z1bmN0aW9uICcgKyBuYW1lICsgJyBpcyBkZXByZWNhdGVkIGFuZCBjYW5ub3QgYmUgdXNlZC4nKTtcbiAgfTtcbn1cblxuXG5tb2R1bGUuZXhwb3J0cy5UeXBlICAgICAgICAgICAgICAgID0gcmVxdWlyZSgnLi9qcy15YW1sL3R5cGUnKTtcbm1vZHVsZS5leHBvcnRzLlNjaGVtYSAgICAgICAgICAgICAgPSByZXF1aXJlKCcuL2pzLXlhbWwvc2NoZW1hJyk7XG5tb2R1bGUuZXhwb3J0cy5GQUlMU0FGRV9TQ0hFTUEgICAgID0gcmVxdWlyZSgnLi9qcy15YW1sL3NjaGVtYS9mYWlsc2FmZScpO1xubW9kdWxlLmV4cG9ydHMuSlNPTl9TQ0hFTUEgICAgICAgICA9IHJlcXVpcmUoJy4vanMteWFtbC9zY2hlbWEvanNvbicpO1xubW9kdWxlLmV4cG9ydHMuQ09SRV9TQ0hFTUEgICAgICAgICA9IHJlcXVpcmUoJy4vanMteWFtbC9zY2hlbWEvY29yZScpO1xubW9kdWxlLmV4cG9ydHMuREVGQVVMVF9TQUZFX1NDSEVNQSA9IHJlcXVpcmUoJy4vanMteWFtbC9zY2hlbWEvZGVmYXVsdF9zYWZlJyk7XG5tb2R1bGUuZXhwb3J0cy5ERUZBVUxUX0ZVTExfU0NIRU1BID0gcmVxdWlyZSgnLi9qcy15YW1sL3NjaGVtYS9kZWZhdWx0X2Z1bGwnKTtcbm1vZHVsZS5leHBvcnRzLmxvYWQgICAgICAgICAgICAgICAgPSBsb2FkZXIubG9hZDtcbm1vZHVsZS5leHBvcnRzLmxvYWRBbGwgICAgICAgICAgICAgPSBsb2FkZXIubG9hZEFsbDtcbm1vZHVsZS5leHBvcnRzLnNhZmVMb2FkICAgICAgICAgICAgPSBsb2FkZXIuc2FmZUxvYWQ7XG5tb2R1bGUuZXhwb3J0cy5zYWZlTG9hZEFsbCAgICAgICAgID0gbG9hZGVyLnNhZmVMb2FkQWxsO1xubW9kdWxlLmV4cG9ydHMuZHVtcCAgICAgICAgICAgICAgICA9IGR1bXBlci5kdW1wO1xubW9kdWxlLmV4cG9ydHMuc2FmZUR1bXAgICAgICAgICAgICA9IGR1bXBlci5zYWZlRHVtcDtcbm1vZHVsZS5leHBvcnRzLllBTUxFeGNlcHRpb24gICAgICAgPSByZXF1aXJlKCcuL2pzLXlhbWwvZXhjZXB0aW9uJyk7XG5cbi8vIERlcHJlY2F0ZWQgc2NoZW1hIG5hbWVzIGZyb20gSlMtWUFNTCAyLjAueFxubW9kdWxlLmV4cG9ydHMuTUlOSU1BTF9TQ0hFTUEgPSByZXF1aXJlKCcuL2pzLXlhbWwvc2NoZW1hL2ZhaWxzYWZlJyk7XG5tb2R1bGUuZXhwb3J0cy5TQUZFX1NDSEVNQSAgICA9IHJlcXVpcmUoJy4vanMteWFtbC9zY2hlbWEvZGVmYXVsdF9zYWZlJyk7XG5tb2R1bGUuZXhwb3J0cy5ERUZBVUxUX1NDSEVNQSA9IHJlcXVpcmUoJy4vanMteWFtbC9zY2hlbWEvZGVmYXVsdF9mdWxsJyk7XG5cbi8vIERlcHJlY2F0ZWQgZnVuY3Rpb25zIGZyb20gSlMtWUFNTCAxLngueFxubW9kdWxlLmV4cG9ydHMuc2NhbiAgICAgICAgICAgPSBkZXByZWNhdGVkKCdzY2FuJyk7XG5tb2R1bGUuZXhwb3J0cy5wYXJzZSAgICAgICAgICA9IGRlcHJlY2F0ZWQoJ3BhcnNlJyk7XG5tb2R1bGUuZXhwb3J0cy5jb21wb3NlICAgICAgICA9IGRlcHJlY2F0ZWQoJ2NvbXBvc2UnKTtcbm1vZHVsZS5leHBvcnRzLmFkZENvbnN0cnVjdG9yID0gZGVwcmVjYXRlZCgnYWRkQ29uc3RydWN0b3InKTtcbiIsICIndXNlIHN0cmljdCc7XG5cblxudmFyIHlhbWwgPSByZXF1aXJlKCcuL2xpYi9qcy15YW1sLmpzJyk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSB5YW1sO1xuIiwgIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeWFtbCA9IHJlcXVpcmUoJ2pzLXlhbWwnKTtcblxuLyoqXG4gKiBEZWZhdWx0IGVuZ2luZXNcbiAqL1xuXG5jb25zdCBlbmdpbmVzID0gZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzO1xuXG4vKipcbiAqIFlBTUxcbiAqL1xuXG5lbmdpbmVzLnlhbWwgPSB7XG4gIHBhcnNlOiB5YW1sLnNhZmVMb2FkLmJpbmQoeWFtbCksXG4gIHN0cmluZ2lmeTogeWFtbC5zYWZlRHVtcC5iaW5kKHlhbWwpXG59O1xuXG4vKipcbiAqIEpTT05cbiAqL1xuXG5lbmdpbmVzLmpzb24gPSB7XG4gIHBhcnNlOiBKU09OLnBhcnNlLmJpbmQoSlNPTiksXG4gIHN0cmluZ2lmeTogZnVuY3Rpb24ob2JqLCBvcHRpb25zKSB7XG4gICAgY29uc3Qgb3B0cyA9IE9iamVjdC5hc3NpZ24oe3JlcGxhY2VyOiBudWxsLCBzcGFjZTogMn0sIG9wdGlvbnMpO1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShvYmosIG9wdHMucmVwbGFjZXIsIG9wdHMuc3BhY2UpO1xuICB9XG59O1xuXG4vKipcbiAqIEphdmFTY3JpcHRcbiAqL1xuXG5lbmdpbmVzLmphdmFzY3JpcHQgPSB7XG4gIHBhcnNlOiBmdW5jdGlvbiBwYXJzZShzdHIsIG9wdGlvbnMsIHdyYXApIHtcbiAgICAvKiBlc2xpbnQgbm8tZXZhbDogMCAqL1xuICAgIHRyeSB7XG4gICAgICBpZiAod3JhcCAhPT0gZmFsc2UpIHtcbiAgICAgICAgc3RyID0gJyhmdW5jdGlvbigpIHtcXG5yZXR1cm4gJyArIHN0ci50cmltKCkgKyAnO1xcbn0oKSk7JztcbiAgICAgIH1cbiAgICAgIHJldHVybiBldmFsKHN0cikgfHwge307XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBpZiAod3JhcCAhPT0gZmFsc2UgJiYgLyh1bmV4cGVjdGVkfGlkZW50aWZpZXIpL2kudGVzdChlcnIubWVzc2FnZSkpIHtcbiAgICAgICAgcmV0dXJuIHBhcnNlKHN0ciwgb3B0aW9ucywgZmFsc2UpO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IFN5bnRheEVycm9yKGVycik7XG4gICAgfVxuICB9LFxuICBzdHJpbmdpZnk6IGZ1bmN0aW9uKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc3RyaW5naWZ5aW5nIEphdmFTY3JpcHQgaXMgbm90IHN1cHBvcnRlZCcpO1xuICB9XG59O1xuIiwgIi8qIVxuICogc3RyaXAtYm9tLXN0cmluZyA8aHR0cHM6Ly9naXRodWIuY29tL2pvbnNjaGxpbmtlcnQvc3RyaXAtYm9tLXN0cmluZz5cbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUsIDIwMTcsIEpvbiBTY2hsaW5rZXJ0LlxuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBMaWNlbnNlLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzdHIpIHtcbiAgaWYgKHR5cGVvZiBzdHIgPT09ICdzdHJpbmcnICYmIHN0ci5jaGFyQXQoMCkgPT09ICdcXHVmZWZmJykge1xuICAgIHJldHVybiBzdHIuc2xpY2UoMSk7XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBzdHJpcEJvbSA9IHJlcXVpcmUoJ3N0cmlwLWJvbS1zdHJpbmcnKTtcbmNvbnN0IHR5cGVPZiA9IHJlcXVpcmUoJ2tpbmQtb2YnKTtcblxuZXhwb3J0cy5kZWZpbmUgPSBmdW5jdGlvbihvYmosIGtleSwgdmFsKSB7XG4gIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkob2JqLCBrZXksIHtcbiAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgdmFsdWU6IHZhbFxuICB9KTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIGB2YWxgIGlzIGEgYnVmZmVyXG4gKi9cblxuZXhwb3J0cy5pc0J1ZmZlciA9IGZ1bmN0aW9uKHZhbCkge1xuICByZXR1cm4gdHlwZU9mKHZhbCkgPT09ICdidWZmZXInO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYHZhbGAgaXMgYW4gb2JqZWN0XG4gKi9cblxuZXhwb3J0cy5pc09iamVjdCA9IGZ1bmN0aW9uKHZhbCkge1xuICByZXR1cm4gdHlwZU9mKHZhbCkgPT09ICdvYmplY3QnO1xufTtcblxuLyoqXG4gKiBDYXN0IGBpbnB1dGAgdG8gYSBidWZmZXJcbiAqL1xuXG5leHBvcnRzLnRvQnVmZmVyID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgcmV0dXJuIHR5cGVvZiBpbnB1dCA9PT0gJ3N0cmluZycgPyBCdWZmZXIuZnJvbShpbnB1dCkgOiBpbnB1dDtcbn07XG5cbi8qKlxuICogQ2FzdCBgdmFsYCB0byBhIHN0cmluZy5cbiAqL1xuXG5leHBvcnRzLnRvU3RyaW5nID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgaWYgKGV4cG9ydHMuaXNCdWZmZXIoaW5wdXQpKSByZXR1cm4gc3RyaXBCb20oU3RyaW5nKGlucHV0KSk7XG4gIGlmICh0eXBlb2YgaW5wdXQgIT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZXhwZWN0ZWQgaW5wdXQgdG8gYmUgYSBzdHJpbmcgb3IgYnVmZmVyJyk7XG4gIH1cbiAgcmV0dXJuIHN0cmlwQm9tKGlucHV0KTtcbn07XG5cbi8qKlxuICogQ2FzdCBgdmFsYCB0byBhbiBhcnJheS5cbiAqL1xuXG5leHBvcnRzLmFycmF5aWZ5ID0gZnVuY3Rpb24odmFsKSB7XG4gIHJldHVybiB2YWwgPyAoQXJyYXkuaXNBcnJheSh2YWwpID8gdmFsIDogW3ZhbF0pIDogW107XG59O1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBgc3RyYCBzdGFydHMgd2l0aCBgc3Vic3RyYC5cbiAqL1xuXG5leHBvcnRzLnN0YXJ0c1dpdGggPSBmdW5jdGlvbihzdHIsIHN1YnN0ciwgbGVuKSB7XG4gIGlmICh0eXBlb2YgbGVuICE9PSAnbnVtYmVyJykgbGVuID0gc3Vic3RyLmxlbmd0aDtcbiAgcmV0dXJuIHN0ci5zbGljZSgwLCBsZW4pID09PSBzdWJzdHI7XG59O1xuIiwgIid1c2Ugc3RyaWN0JztcblxuY29uc3QgZW5naW5lcyA9IHJlcXVpcmUoJy4vZW5naW5lcycpO1xuY29uc3QgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICBjb25zdCBvcHRzID0gT2JqZWN0LmFzc2lnbih7fSwgb3B0aW9ucyk7XG5cbiAgLy8gZW5zdXJlIHRoYXQgZGVsaW1pdGVycyBhcmUgYW4gYXJyYXlcbiAgb3B0cy5kZWxpbWl0ZXJzID0gdXRpbHMuYXJyYXlpZnkob3B0cy5kZWxpbXMgfHwgb3B0cy5kZWxpbWl0ZXJzIHx8ICctLS0nKTtcbiAgaWYgKG9wdHMuZGVsaW1pdGVycy5sZW5ndGggPT09IDEpIHtcbiAgICBvcHRzLmRlbGltaXRlcnMucHVzaChvcHRzLmRlbGltaXRlcnNbMF0pO1xuICB9XG5cbiAgb3B0cy5sYW5ndWFnZSA9IChvcHRzLmxhbmd1YWdlIHx8IG9wdHMubGFuZyB8fCAneWFtbCcpLnRvTG93ZXJDYXNlKCk7XG4gIG9wdHMuZW5naW5lcyA9IE9iamVjdC5hc3NpZ24oe30sIGVuZ2luZXMsIG9wdHMucGFyc2Vycywgb3B0cy5lbmdpbmVzKTtcbiAgcmV0dXJuIG9wdHM7XG59O1xuIiwgIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihuYW1lLCBvcHRpb25zKSB7XG4gIGxldCBlbmdpbmUgPSBvcHRpb25zLmVuZ2luZXNbbmFtZV0gfHwgb3B0aW9ucy5lbmdpbmVzW2FsaWFzZShuYW1lKV07XG4gIGlmICh0eXBlb2YgZW5naW5lID09PSAndW5kZWZpbmVkJykge1xuICAgIHRocm93IG5ldyBFcnJvcignZ3JheS1tYXR0ZXIgZW5naW5lIFwiJyArIG5hbWUgKyAnXCIgaXMgbm90IHJlZ2lzdGVyZWQnKTtcbiAgfVxuICBpZiAodHlwZW9mIGVuZ2luZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGVuZ2luZSA9IHsgcGFyc2U6IGVuZ2luZSB9O1xuICB9XG4gIHJldHVybiBlbmdpbmU7XG59O1xuXG5mdW5jdGlvbiBhbGlhc2UobmFtZSkge1xuICBzd2l0Y2ggKG5hbWUudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2pzJzpcbiAgICBjYXNlICdqYXZhc2NyaXB0JzpcbiAgICAgIHJldHVybiAnamF2YXNjcmlwdCc7XG4gICAgY2FzZSAnY29mZmVlJzpcbiAgICBjYXNlICdjb2ZmZWVzY3JpcHQnOlxuICAgIGNhc2UgJ2Nzb24nOlxuICAgICAgcmV0dXJuICdjb2ZmZWUnO1xuICAgIGNhc2UgJ3lhbWwnOlxuICAgIGNhc2UgJ3ltbCc6XG4gICAgICByZXR1cm4gJ3lhbWwnO1xuICAgIGRlZmF1bHQ6IHtcbiAgICAgIHJldHVybiBuYW1lO1xuICAgIH1cbiAgfVxufVxuIiwgIid1c2Ugc3RyaWN0JztcblxuY29uc3QgdHlwZU9mID0gcmVxdWlyZSgna2luZC1vZicpO1xuY29uc3QgZ2V0RW5naW5lID0gcmVxdWlyZSgnLi9lbmdpbmUnKTtcbmNvbnN0IGRlZmF1bHRzID0gcmVxdWlyZSgnLi9kZWZhdWx0cycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZpbGUsIGRhdGEsIG9wdGlvbnMpIHtcbiAgaWYgKGRhdGEgPT0gbnVsbCAmJiBvcHRpb25zID09IG51bGwpIHtcbiAgICBzd2l0Y2ggKHR5cGVPZihmaWxlKSkge1xuICAgICAgY2FzZSAnb2JqZWN0JzpcbiAgICAgICAgZGF0YSA9IGZpbGUuZGF0YTtcbiAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ3N0cmluZyc6XG4gICAgICAgIHJldHVybiBmaWxlO1xuICAgICAgZGVmYXVsdDoge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdleHBlY3RlZCBmaWxlIHRvIGJlIGEgc3RyaW5nIG9yIG9iamVjdCcpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHN0ciA9IGZpbGUuY29udGVudDtcbiAgY29uc3Qgb3B0cyA9IGRlZmF1bHRzKG9wdGlvbnMpO1xuICBpZiAoZGF0YSA9PSBudWxsKSB7XG4gICAgaWYgKCFvcHRzLmRhdGEpIHJldHVybiBmaWxlO1xuICAgIGRhdGEgPSBvcHRzLmRhdGE7XG4gIH1cblxuICBjb25zdCBsYW5ndWFnZSA9IGZpbGUubGFuZ3VhZ2UgfHwgb3B0cy5sYW5ndWFnZTtcbiAgY29uc3QgZW5naW5lID0gZ2V0RW5naW5lKGxhbmd1YWdlLCBvcHRzKTtcbiAgaWYgKHR5cGVvZiBlbmdpbmUuc3RyaW5naWZ5ICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZXhwZWN0ZWQgXCInICsgbGFuZ3VhZ2UgKyAnLnN0cmluZ2lmeVwiIHRvIGJlIGEgZnVuY3Rpb24nKTtcbiAgfVxuXG4gIGRhdGEgPSBPYmplY3QuYXNzaWduKHt9LCBmaWxlLmRhdGEsIGRhdGEpO1xuICBjb25zdCBvcGVuID0gb3B0cy5kZWxpbWl0ZXJzWzBdO1xuICBjb25zdCBjbG9zZSA9IG9wdHMuZGVsaW1pdGVyc1sxXTtcbiAgY29uc3QgbWF0dGVyID0gZW5naW5lLnN0cmluZ2lmeShkYXRhLCBvcHRpb25zKS50cmltKCk7XG4gIGxldCBidWYgPSAnJztcblxuICBpZiAobWF0dGVyICE9PSAne30nKSB7XG4gICAgYnVmID0gbmV3bGluZShvcGVuKSArIG5ld2xpbmUobWF0dGVyKSArIG5ld2xpbmUoY2xvc2UpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBmaWxlLmV4Y2VycHQgPT09ICdzdHJpbmcnICYmIGZpbGUuZXhjZXJwdCAhPT0gJycpIHtcbiAgICBpZiAoc3RyLmluZGV4T2YoZmlsZS5leGNlcnB0LnRyaW0oKSkgPT09IC0xKSB7XG4gICAgICBidWYgKz0gbmV3bGluZShmaWxlLmV4Y2VycHQpICsgbmV3bGluZShjbG9zZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1ZiArIG5ld2xpbmUoc3RyKTtcbn07XG5cbmZ1bmN0aW9uIG5ld2xpbmUoc3RyKSB7XG4gIHJldHVybiBzdHIuc2xpY2UoLTEpICE9PSAnXFxuJyA/IHN0ciArICdcXG4nIDogc3RyO1xufVxuIiwgIid1c2Ugc3RyaWN0JztcblxuY29uc3QgZGVmYXVsdHMgPSByZXF1aXJlKCcuL2RlZmF1bHRzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZmlsZSwgb3B0aW9ucykge1xuICBjb25zdCBvcHRzID0gZGVmYXVsdHMob3B0aW9ucyk7XG5cbiAgaWYgKGZpbGUuZGF0YSA9PSBudWxsKSB7XG4gICAgZmlsZS5kYXRhID0ge307XG4gIH1cblxuICBpZiAodHlwZW9mIG9wdHMuZXhjZXJwdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBvcHRzLmV4Y2VycHQoZmlsZSwgb3B0cyk7XG4gIH1cblxuICBjb25zdCBzZXAgPSBmaWxlLmRhdGEuZXhjZXJwdF9zZXBhcmF0b3IgfHwgb3B0cy5leGNlcnB0X3NlcGFyYXRvcjtcbiAgaWYgKHNlcCA9PSBudWxsICYmIChvcHRzLmV4Y2VycHQgPT09IGZhbHNlIHx8IG9wdHMuZXhjZXJwdCA9PSBudWxsKSkge1xuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgY29uc3QgZGVsaW1pdGVyID0gdHlwZW9mIG9wdHMuZXhjZXJwdCA9PT0gJ3N0cmluZydcbiAgICA/IG9wdHMuZXhjZXJwdFxuICAgIDogKHNlcCB8fCBvcHRzLmRlbGltaXRlcnNbMF0pO1xuXG4gIC8vIGlmIGVuYWJsZWQsIGdldCB0aGUgZXhjZXJwdCBkZWZpbmVkIGFmdGVyIGZyb250LW1hdHRlclxuICBjb25zdCBpZHggPSBmaWxlLmNvbnRlbnQuaW5kZXhPZihkZWxpbWl0ZXIpO1xuICBpZiAoaWR4ICE9PSAtMSkge1xuICAgIGZpbGUuZXhjZXJwdCA9IGZpbGUuY29udGVudC5zbGljZSgwLCBpZHgpO1xuICB9XG5cbiAgcmV0dXJuIGZpbGU7XG59O1xuIiwgIid1c2Ugc3RyaWN0JztcblxuY29uc3QgdHlwZU9mID0gcmVxdWlyZSgna2luZC1vZicpO1xuY29uc3Qgc3RyaW5naWZ5ID0gcmVxdWlyZSgnLi9zdHJpbmdpZnknKTtcbmNvbnN0IHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG4vKipcbiAqIE5vcm1hbGl6ZSB0aGUgZ2l2ZW4gdmFsdWUgdG8gZW5zdXJlIGFuIG9iamVjdCBpcyByZXR1cm5lZFxuICogd2l0aCB0aGUgZXhwZWN0ZWQgcHJvcGVydGllcy5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZpbGUpIHtcbiAgaWYgKHR5cGVPZihmaWxlKSAhPT0gJ29iamVjdCcpIHtcbiAgICBmaWxlID0geyBjb250ZW50OiBmaWxlIH07XG4gIH1cblxuICBpZiAodHlwZU9mKGZpbGUuZGF0YSkgIT09ICdvYmplY3QnKSB7XG4gICAgZmlsZS5kYXRhID0ge307XG4gIH1cblxuICAvLyBpZiBmaWxlIHdhcyBwYXNzZWQgYXMgYW4gb2JqZWN0LCBlbnN1cmUgdGhhdFxuICAvLyBcImZpbGUuY29udGVudFwiIGlzIHNldFxuICBpZiAoZmlsZS5jb250ZW50cyAmJiBmaWxlLmNvbnRlbnQgPT0gbnVsbCkge1xuICAgIGZpbGUuY29udGVudCA9IGZpbGUuY29udGVudHM7XG4gIH1cblxuICAvLyBzZXQgbm9uLWVudW1lcmFibGUgcHJvcGVydGllcyBvbiB0aGUgZmlsZSBvYmplY3RcbiAgdXRpbHMuZGVmaW5lKGZpbGUsICdvcmlnJywgdXRpbHMudG9CdWZmZXIoZmlsZS5jb250ZW50KSk7XG4gIHV0aWxzLmRlZmluZShmaWxlLCAnbGFuZ3VhZ2UnLCBmaWxlLmxhbmd1YWdlIHx8ICcnKTtcbiAgdXRpbHMuZGVmaW5lKGZpbGUsICdtYXR0ZXInLCBmaWxlLm1hdHRlciB8fCAnJyk7XG4gIHV0aWxzLmRlZmluZShmaWxlLCAnc3RyaW5naWZ5JywgZnVuY3Rpb24oZGF0YSwgb3B0aW9ucykge1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMubGFuZ3VhZ2UpIHtcbiAgICAgIGZpbGUubGFuZ3VhZ2UgPSBvcHRpb25zLmxhbmd1YWdlO1xuICAgIH1cbiAgICByZXR1cm4gc3RyaW5naWZ5KGZpbGUsIGRhdGEsIG9wdGlvbnMpO1xuICB9KTtcblxuICAvLyBzdHJpcCBCT00gYW5kIGVuc3VyZSB0aGF0IFwiZmlsZS5jb250ZW50XCIgaXMgYSBzdHJpbmdcbiAgZmlsZS5jb250ZW50ID0gdXRpbHMudG9TdHJpbmcoZmlsZS5jb250ZW50KTtcbiAgZmlsZS5pc0VtcHR5ID0gZmFsc2U7XG4gIGZpbGUuZXhjZXJwdCA9ICcnO1xuICByZXR1cm4gZmlsZTtcbn07XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBnZXRFbmdpbmUgPSByZXF1aXJlKCcuL2VuZ2luZScpO1xuY29uc3QgZGVmYXVsdHMgPSByZXF1aXJlKCcuL2RlZmF1bHRzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obGFuZ3VhZ2UsIHN0ciwgb3B0aW9ucykge1xuICBjb25zdCBvcHRzID0gZGVmYXVsdHMob3B0aW9ucyk7XG4gIGNvbnN0IGVuZ2luZSA9IGdldEVuZ2luZShsYW5ndWFnZSwgb3B0cyk7XG4gIGlmICh0eXBlb2YgZW5naW5lLnBhcnNlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignZXhwZWN0ZWQgXCInICsgbGFuZ3VhZ2UgKyAnLnBhcnNlXCIgdG8gYmUgYSBmdW5jdGlvbicpO1xuICB9XG4gIHJldHVybiBlbmdpbmUucGFyc2Uoc3RyLCBvcHRzKTtcbn07XG4iLCAiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG5jb25zdCBzZWN0aW9ucyA9IHJlcXVpcmUoJ3NlY3Rpb24tbWF0dGVyJyk7XG5jb25zdCBkZWZhdWx0cyA9IHJlcXVpcmUoJy4vbGliL2RlZmF1bHRzJyk7XG5jb25zdCBzdHJpbmdpZnkgPSByZXF1aXJlKCcuL2xpYi9zdHJpbmdpZnknKTtcbmNvbnN0IGV4Y2VycHQgPSByZXF1aXJlKCcuL2xpYi9leGNlcnB0Jyk7XG5jb25zdCBlbmdpbmVzID0gcmVxdWlyZSgnLi9saWIvZW5naW5lcycpO1xuY29uc3QgdG9GaWxlID0gcmVxdWlyZSgnLi9saWIvdG8tZmlsZScpO1xuY29uc3QgcGFyc2UgPSByZXF1aXJlKCcuL2xpYi9wYXJzZScpO1xuY29uc3QgdXRpbHMgPSByZXF1aXJlKCcuL2xpYi91dGlscycpO1xuXG4vKipcbiAqIFRha2VzIGEgc3RyaW5nIG9yIG9iamVjdCB3aXRoIGBjb250ZW50YCBwcm9wZXJ0eSwgZXh0cmFjdHNcbiAqIGFuZCBwYXJzZXMgZnJvbnQtbWF0dGVyIGZyb20gdGhlIHN0cmluZywgdGhlbiByZXR1cm5zIGFuIG9iamVjdFxuICogd2l0aCBgZGF0YWAsIGBjb250ZW50YCBhbmQgb3RoZXIgW3VzZWZ1bCBwcm9wZXJ0aWVzXSgjcmV0dXJuZWQtb2JqZWN0KS5cbiAqXG4gKiBgYGBqc1xuICogY29uc3QgbWF0dGVyID0gcmVxdWlyZSgnZ3JheS1tYXR0ZXInKTtcbiAqIGNvbnNvbGUubG9nKG1hdHRlcignLS0tXFxudGl0bGU6IEhvbWVcXG4tLS1cXG5PdGhlciBzdHVmZicpKTtcbiAqIC8vPT4geyBkYXRhOiB7IHRpdGxlOiAnSG9tZSd9LCBjb250ZW50OiAnT3RoZXIgc3R1ZmYnIH1cbiAqIGBgYFxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBgaW5wdXRgIFN0cmluZywgb3Igb2JqZWN0IHdpdGggYGNvbnRlbnRgIHN0cmluZ1xuICogQHBhcmFtIHtPYmplY3R9IGBvcHRpb25zYFxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBtYXR0ZXIoaW5wdXQsIG9wdGlvbnMpIHtcbiAgaWYgKGlucHV0ID09PSAnJykge1xuICAgIHJldHVybiB7IGRhdGE6IHt9LCBjb250ZW50OiBpbnB1dCwgZXhjZXJwdDogJycsIG9yaWc6IGlucHV0IH07XG4gIH1cblxuICBsZXQgZmlsZSA9IHRvRmlsZShpbnB1dCk7XG4gIGNvbnN0IGNhY2hlZCA9IG1hdHRlci5jYWNoZVtmaWxlLmNvbnRlbnRdO1xuXG4gIGlmICghb3B0aW9ucykge1xuICAgIGlmIChjYWNoZWQpIHtcbiAgICAgIGZpbGUgPSBPYmplY3QuYXNzaWduKHt9LCBjYWNoZWQpO1xuICAgICAgZmlsZS5vcmlnID0gY2FjaGVkLm9yaWc7XG4gICAgICByZXR1cm4gZmlsZTtcbiAgICB9XG5cbiAgICAvLyBvbmx5IGNhY2hlIGlmIHRoZXJlIGFyZSBubyBvcHRpb25zIHBhc3NlZC4gaWYgd2UgY2FjaGUgd2hlbiBvcHRpb25zXG4gICAgLy8gYXJlIHBhc3NlZCwgd2Ugd291bGQgbmVlZCB0byBhbHNvIGNhY2hlIG9wdGlvbnMgdmFsdWVzLCB3aGljaCB3b3VsZFxuICAgIC8vIG5lZ2F0ZSBhbnkgcGVyZm9ybWFuY2UgYmVuZWZpdHMgb2YgY2FjaGluZ1xuICAgIG1hdHRlci5jYWNoZVtmaWxlLmNvbnRlbnRdID0gZmlsZTtcbiAgfVxuXG4gIHJldHVybiBwYXJzZU1hdHRlcihmaWxlLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBQYXJzZSBmcm9udCBtYXR0ZXJcbiAqL1xuXG5mdW5jdGlvbiBwYXJzZU1hdHRlcihmaWxlLCBvcHRpb25zKSB7XG4gIGNvbnN0IG9wdHMgPSBkZWZhdWx0cyhvcHRpb25zKTtcbiAgY29uc3Qgb3BlbiA9IG9wdHMuZGVsaW1pdGVyc1swXTtcbiAgY29uc3QgY2xvc2UgPSAnXFxuJyArIG9wdHMuZGVsaW1pdGVyc1sxXTtcbiAgbGV0IHN0ciA9IGZpbGUuY29udGVudDtcblxuICBpZiAob3B0cy5sYW5ndWFnZSkge1xuICAgIGZpbGUubGFuZ3VhZ2UgPSBvcHRzLmxhbmd1YWdlO1xuICB9XG5cbiAgLy8gZ2V0IHRoZSBsZW5ndGggb2YgdGhlIG9wZW5pbmcgZGVsaW1pdGVyXG4gIGNvbnN0IG9wZW5MZW4gPSBvcGVuLmxlbmd0aDtcbiAgaWYgKCF1dGlscy5zdGFydHNXaXRoKHN0ciwgb3Blbiwgb3BlbkxlbikpIHtcbiAgICBleGNlcnB0KGZpbGUsIG9wdHMpO1xuICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgLy8gaWYgdGhlIG5leHQgY2hhcmFjdGVyIGFmdGVyIHRoZSBvcGVuaW5nIGRlbGltaXRlciBpc1xuICAvLyBhIGNoYXJhY3RlciBmcm9tIHRoZSBkZWxpbWl0ZXIsIHRoZW4gaXQncyBub3QgYSBmcm9udC1cbiAgLy8gbWF0dGVyIGRlbGltaXRlclxuICBpZiAoc3RyLmNoYXJBdChvcGVuTGVuKSA9PT0gb3Blbi5zbGljZSgtMSkpIHtcbiAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIC8vIHN0cmlwIHRoZSBvcGVuaW5nIGRlbGltaXRlclxuICBzdHIgPSBzdHIuc2xpY2Uob3Blbkxlbik7XG4gIGNvbnN0IGxlbiA9IHN0ci5sZW5ndGg7XG5cbiAgLy8gdXNlIHRoZSBsYW5ndWFnZSBkZWZpbmVkIGFmdGVyIGZpcnN0IGRlbGltaXRlciwgaWYgaXQgZXhpc3RzXG4gIGNvbnN0IGxhbmd1YWdlID0gbWF0dGVyLmxhbmd1YWdlKHN0ciwgb3B0cyk7XG4gIGlmIChsYW5ndWFnZS5uYW1lKSB7XG4gICAgZmlsZS5sYW5ndWFnZSA9IGxhbmd1YWdlLm5hbWU7XG4gICAgc3RyID0gc3RyLnNsaWNlKGxhbmd1YWdlLnJhdy5sZW5ndGgpO1xuICB9XG5cbiAgLy8gZ2V0IHRoZSBpbmRleCBvZiB0aGUgY2xvc2luZyBkZWxpbWl0ZXJcbiAgbGV0IGNsb3NlSW5kZXggPSBzdHIuaW5kZXhPZihjbG9zZSk7XG4gIGlmIChjbG9zZUluZGV4ID09PSAtMSkge1xuICAgIGNsb3NlSW5kZXggPSBsZW47XG4gIH1cblxuICAvLyBnZXQgdGhlIHJhdyBmcm9udC1tYXR0ZXIgYmxvY2tcbiAgZmlsZS5tYXR0ZXIgPSBzdHIuc2xpY2UoMCwgY2xvc2VJbmRleCk7XG5cbiAgY29uc3QgYmxvY2sgPSBmaWxlLm1hdHRlci5yZXBsYWNlKC9eXFxzKiNbXlxcbl0rL2dtLCAnJykudHJpbSgpO1xuICBpZiAoYmxvY2sgPT09ICcnKSB7XG4gICAgZmlsZS5pc0VtcHR5ID0gdHJ1ZTtcbiAgICBmaWxlLmVtcHR5ID0gZmlsZS5jb250ZW50O1xuICAgIGZpbGUuZGF0YSA9IHt9O1xuICB9IGVsc2Uge1xuXG4gICAgLy8gY3JlYXRlIGZpbGUuZGF0YSBieSBwYXJzaW5nIHRoZSByYXcgZmlsZS5tYXR0ZXIgYmxvY2tcbiAgICBmaWxlLmRhdGEgPSBwYXJzZShmaWxlLmxhbmd1YWdlLCBmaWxlLm1hdHRlciwgb3B0cyk7XG4gIH1cblxuICAvLyB1cGRhdGUgZmlsZS5jb250ZW50XG4gIGlmIChjbG9zZUluZGV4ID09PSBsZW4pIHtcbiAgICBmaWxlLmNvbnRlbnQgPSAnJztcbiAgfSBlbHNlIHtcbiAgICBmaWxlLmNvbnRlbnQgPSBzdHIuc2xpY2UoY2xvc2VJbmRleCArIGNsb3NlLmxlbmd0aCk7XG4gICAgaWYgKGZpbGUuY29udGVudFswXSA9PT0gJ1xccicpIHtcbiAgICAgIGZpbGUuY29udGVudCA9IGZpbGUuY29udGVudC5zbGljZSgxKTtcbiAgICB9XG4gICAgaWYgKGZpbGUuY29udGVudFswXSA9PT0gJ1xcbicpIHtcbiAgICAgIGZpbGUuY29udGVudCA9IGZpbGUuY29udGVudC5zbGljZSgxKTtcbiAgICB9XG4gIH1cblxuICBleGNlcnB0KGZpbGUsIG9wdHMpO1xuXG4gIGlmIChvcHRzLnNlY3Rpb25zID09PSB0cnVlIHx8IHR5cGVvZiBvcHRzLnNlY3Rpb24gPT09ICdmdW5jdGlvbicpIHtcbiAgICBzZWN0aW9ucyhmaWxlLCBvcHRzLnNlY3Rpb24pO1xuICB9XG4gIHJldHVybiBmaWxlO1xufVxuXG4vKipcbiAqIEV4cG9zZSBlbmdpbmVzXG4gKi9cblxubWF0dGVyLmVuZ2luZXMgPSBlbmdpbmVzO1xuXG4vKipcbiAqIFN0cmluZ2lmeSBhbiBvYmplY3QgdG8gWUFNTCBvciB0aGUgc3BlY2lmaWVkIGxhbmd1YWdlLCBhbmRcbiAqIGFwcGVuZCBpdCB0byB0aGUgZ2l2ZW4gc3RyaW5nLiBCeSBkZWZhdWx0LCBvbmx5IFlBTUwgYW5kIEpTT05cbiAqIGNhbiBiZSBzdHJpbmdpZmllZC4gU2VlIHRoZSBbZW5naW5lc10oI2VuZ2luZXMpIHNlY3Rpb24gdG8gbGVhcm5cbiAqIGhvdyB0byBzdHJpbmdpZnkgb3RoZXIgbGFuZ3VhZ2VzLlxuICpcbiAqIGBgYGpzXG4gKiBjb25zb2xlLmxvZyhtYXR0ZXIuc3RyaW5naWZ5KCdmb28gYmFyIGJheicsIHt0aXRsZTogJ0hvbWUnfSkpO1xuICogLy8gcmVzdWx0cyBpbjpcbiAqIC8vIC0tLVxuICogLy8gdGl0bGU6IEhvbWVcbiAqIC8vIC0tLVxuICogLy8gZm9vIGJhciBiYXpcbiAqIGBgYFxuICogQHBhcmFtIHtTdHJpbmd8T2JqZWN0fSBgZmlsZWAgVGhlIGNvbnRlbnQgc3RyaW5nIHRvIGFwcGVuZCB0byBzdHJpbmdpZmllZCBmcm9udC1tYXR0ZXIsIG9yIGEgZmlsZSBvYmplY3Qgd2l0aCBgZmlsZS5jb250ZW50YCBzdHJpbmcuXG4gKiBAcGFyYW0ge09iamVjdH0gYGRhdGFgIEZyb250IG1hdHRlciB0byBzdHJpbmdpZnkuXG4gKiBAcGFyYW0ge09iamVjdH0gYG9wdGlvbnNgIFtPcHRpb25zXSgjb3B0aW9ucykgdG8gcGFzcyB0byBncmF5LW1hdHRlciBhbmQgW2pzLXlhbWxdLlxuICogQHJldHVybiB7U3RyaW5nfSBSZXR1cm5zIGEgc3RyaW5nIGNyZWF0ZWQgYnkgd3JhcHBpbmcgc3RyaW5naWZpZWQgeWFtbCB3aXRoIGRlbGltaXRlcnMsIGFuZCBhcHBlbmRpbmcgdGhhdCB0byB0aGUgZ2l2ZW4gc3RyaW5nLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tYXR0ZXIuc3RyaW5naWZ5ID0gZnVuY3Rpb24oZmlsZSwgZGF0YSwgb3B0aW9ucykge1xuICBpZiAodHlwZW9mIGZpbGUgPT09ICdzdHJpbmcnKSBmaWxlID0gbWF0dGVyKGZpbGUsIG9wdGlvbnMpO1xuICByZXR1cm4gc3RyaW5naWZ5KGZpbGUsIGRhdGEsIG9wdGlvbnMpO1xufTtcblxuLyoqXG4gKiBTeW5jaHJvbm91c2x5IHJlYWQgYSBmaWxlIGZyb20gdGhlIGZpbGUgc3lzdGVtIGFuZCBwYXJzZVxuICogZnJvbnQgbWF0dGVyLiBSZXR1cm5zIHRoZSBzYW1lIG9iamVjdCBhcyB0aGUgW21haW4gZnVuY3Rpb25dKCNtYXR0ZXIpLlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBmaWxlID0gbWF0dGVyLnJlYWQoJy4vY29udGVudC9ibG9nLXBvc3QubWQnKTtcbiAqIGBgYFxuICogQHBhcmFtIHtTdHJpbmd9IGBmaWxlcGF0aGAgZmlsZSBwYXRoIG9mIHRoZSBmaWxlIHRvIHJlYWQuXG4gKiBAcGFyYW0ge09iamVjdH0gYG9wdGlvbnNgIFtPcHRpb25zXSgjb3B0aW9ucykgdG8gcGFzcyB0byBncmF5LW1hdHRlci5cbiAqIEByZXR1cm4ge09iamVjdH0gUmV0dXJucyBbYW4gb2JqZWN0XSgjcmV0dXJuZWQtb2JqZWN0KSB3aXRoIGBkYXRhYCBhbmQgYGNvbnRlbnRgXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbm1hdHRlci5yZWFkID0gZnVuY3Rpb24oZmlsZXBhdGgsIG9wdGlvbnMpIHtcbiAgY29uc3Qgc3RyID0gZnMucmVhZEZpbGVTeW5jKGZpbGVwYXRoLCAndXRmOCcpO1xuICBjb25zdCBmaWxlID0gbWF0dGVyKHN0ciwgb3B0aW9ucyk7XG4gIGZpbGUucGF0aCA9IGZpbGVwYXRoO1xuICByZXR1cm4gZmlsZTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBnaXZlbiBgc3RyaW5nYCBoYXMgZnJvbnQgbWF0dGVyLlxuICogQHBhcmFtICB7U3RyaW5nfSBgc3RyaW5nYFxuICogQHBhcmFtICB7T2JqZWN0fSBgb3B0aW9uc2BcbiAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgZnJvbnQgbWF0dGVyIGV4aXN0cy5cbiAqIEBhcGkgcHVibGljXG4gKi9cblxubWF0dGVyLnRlc3QgPSBmdW5jdGlvbihzdHIsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIHV0aWxzLnN0YXJ0c1dpdGgoc3RyLCBkZWZhdWx0cyhvcHRpb25zKS5kZWxpbWl0ZXJzWzBdKTtcbn07XG5cbi8qKlxuICogRGV0ZWN0IHRoZSBsYW5ndWFnZSB0byB1c2UsIGlmIG9uZSBpcyBkZWZpbmVkIGFmdGVyIHRoZVxuICogZmlyc3QgZnJvbnQtbWF0dGVyIGRlbGltaXRlci5cbiAqIEBwYXJhbSAge1N0cmluZ30gYHN0cmluZ2BcbiAqIEBwYXJhbSAge09iamVjdH0gYG9wdGlvbnNgXG4gKiBAcmV0dXJuIHtPYmplY3R9IE9iamVjdCB3aXRoIGByYXdgIChhY3R1YWwgbGFuZ3VhZ2Ugc3RyaW5nKSwgYW5kIGBuYW1lYCwgdGhlIGxhbmd1YWdlIHdpdGggd2hpdGVzcGFjZSB0cmltbWVkXG4gKi9cblxubWF0dGVyLmxhbmd1YWdlID0gZnVuY3Rpb24oc3RyLCBvcHRpb25zKSB7XG4gIGNvbnN0IG9wdHMgPSBkZWZhdWx0cyhvcHRpb25zKTtcbiAgY29uc3Qgb3BlbiA9IG9wdHMuZGVsaW1pdGVyc1swXTtcblxuICBpZiAobWF0dGVyLnRlc3Qoc3RyKSkge1xuICAgIHN0ciA9IHN0ci5zbGljZShvcGVuLmxlbmd0aCk7XG4gIH1cblxuICBjb25zdCBsYW5ndWFnZSA9IHN0ci5zbGljZSgwLCBzdHIuc2VhcmNoKC9cXHI/XFxuLykpO1xuICByZXR1cm4ge1xuICAgIHJhdzogbGFuZ3VhZ2UsXG4gICAgbmFtZTogbGFuZ3VhZ2UgPyBsYW5ndWFnZS50cmltKCkgOiAnJ1xuICB9O1xufTtcblxuLyoqXG4gKiBFeHBvc2UgYG1hdHRlcmBcbiAqL1xuXG5tYXR0ZXIuY2FjaGUgPSB7fTtcbm1hdHRlci5jbGVhckNhY2hlID0gZnVuY3Rpb24oKSB7XG4gIG1hdHRlci5jYWNoZSA9IHt9O1xufTtcbm1vZHVsZS5leHBvcnRzID0gbWF0dGVyO1xuIiwgIi8qKlxuICogTm90ZSB2YWxpZGF0b3IgZm9yIGN1c3RvbSB0eXBlcyBzeXN0ZW0uXG4gKlxuICogVmFsaWRhdGVzIG5vdGUgbWFya2Rvd24gZmlsZXMgd2l0aCBZQU1MIGZyb250bWF0dGVyLlxuICogUmVxdWlyZWQgZmllbGRzOiBpZCwgYXV0aG9yLCB0aXRsZVxuICogQ29udGVudCBhZnRlciBmcm9udG1hdHRlciBpcyBvcHRpb25hbC5cbiAqXG4gKiBAc3VtbWFyeSBOb3RlIHZhbGlkYXRvciBmb3IgY3VzdG9tIHR5cGVzIHN5c3RlbVxuICovXG5cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgZGVmaW5lVHlwZVZhbGlkYXRvciwgdmFsaWRhdGlvbkVycm9yLCB2YWxpZGF0aW9uU3VjY2VzcyB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbmltcG9ydCBtYXR0ZXIgZnJvbSAnZ3JheS1tYXR0ZXInO1xuXG4vKipcbiAqIE5vdGUgZnJvbnRtYXR0ZXIgc3RydWN0dXJlLlxuICovXG5pbnRlcmZhY2UgTm90ZUZyb250bWF0dGVyIHtcbiAgaWQ6IHN0cmluZztcbiAgYXV0aG9yOiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG59XG5cbi8qKlxuICogVmFsaWRhdGlvbiBlcnJvciB0eXBlIGFsaWFzLlxuICovXG50eXBlIFZhbEVycm9yID0geyBjb2RlOiBzdHJpbmc7IG1lc3NhZ2U6IHN0cmluZzsgZmllbGQ/OiBzdHJpbmcgfTtcblxuLyoqXG4gKiBSZWdleCBwYXR0ZXJuIHRvIHZhbGlkYXRlIHByb3BlciBmcm9udG1hdHRlciBzdHJ1Y3R1cmUuXG4gKiBFbnN1cmVzIGJvdGggb3BlbmluZyBhbmQgY2xvc2luZyBkZWxpbWl0ZXJzIGFyZSBwcmVzZW50LlxuICovXG5jb25zdCBGUk9OVE1BVFRFUl9SRUdFWCA9IC9eLS0tXFxyP1xcbltcXHNcXFNdKj9cXHI/XFxuLS0tLztcblxuLyoqXG4gKiBWYWxpZGF0ZXMgcmVxdWlyZWQgZmllbGQgZXhpc3RzIGFuZCBpcyBhIG5vbi1lbXB0eSBzdHJpbmcuXG4gKlxuICogQHBhcmFtIGZyb250bWF0dGVyIFBhcnNlZCBub3RlIGZyb250bWF0dGVyIG9iamVjdC5cbiAqIEBwYXJhbSBmaWVsZE5hbWUgUmVxdWlyZWQgZnJvbnRtYXR0ZXIgZmllbGQgdG8gdmFsaWRhdGUuXG4gKiBAcmV0dXJucyBBIHZhbGlkYXRpb24gZXJyb3Igd2hlbiBpbnZhbGlkOyBvdGhlcndpc2UgbnVsbC5cbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGVSZXF1aXJlZEZpZWxkKFxuICBmcm9udG1hdHRlcjogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGZpZWxkTmFtZToga2V5b2YgTm90ZUZyb250bWF0dGVyXG4pOiBWYWxFcnJvciB8IG51bGwge1xuICBjb25zdCB2YWx1ZSA9IGZyb250bWF0dGVyW2ZpZWxkTmFtZV07XG5cbiAgLy8gQ2hlY2sgaWYgZmllbGQgaXMgbWlzc2luZ1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiB7IGNvZGU6ICdSRVFVSVJFRCcsIG1lc3NhZ2U6IGBGaWVsZCBcIiR7ZmllbGROYW1lfVwiIGlzIHJlcXVpcmVkYCwgZmllbGQ6IGZpZWxkTmFtZSB9O1xuICB9XG5cbiAgLy8gQ2hlY2sgaWYgZmllbGQgaXMgYSBzdHJpbmdcbiAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4geyBjb2RlOiAnSU5WQUxJRF9UWVBFJywgbWVzc2FnZTogYEZpZWxkIFwiJHtmaWVsZE5hbWV9XCIgbXVzdCBiZSBhIHN0cmluZ2AsIGZpZWxkOiBmaWVsZE5hbWUgfTtcbiAgfVxuXG4gIC8vIENoZWNrIGlmIGZpZWxkIGlzIGVtcHR5IChhZnRlciB0cmltbWluZylcbiAgaWYgKHZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICByZXR1cm4geyBjb2RlOiAnRU1QVFknLCBtZXNzYWdlOiBgRmllbGQgXCIke2ZpZWxkTmFtZX1cIiBjYW5ub3QgYmUgZW1wdHlgLCBmaWVsZDogZmllbGROYW1lIH07XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBUeXBlIHZhbGlkYXRvciBmb3Igbm90ZSBmaWxlcy5cbiAqXG4gKiBWYWxpZGF0ZXMgbWFya2Rvd24gZmlsZXMgd2l0aCBZQU1MIGZyb250bWF0dGVyIGNvbnRhaW5pbmcgcmVxdWlyZWQgZmllbGRzOlxuICogaWQsIGF1dGhvciwgYW5kIHRpdGxlLlxuICovXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVUeXBlVmFsaWRhdG9yKFxuICB7XG4gICAgdHlwZU5hbWU6ICdub3RlJyxcbiAgICBzY2hlbWE6ICdZQU1MIGZyb250bWF0dGVyIChpZCwgYXV0aG9yLCB0aXRsZSkgZm9sbG93ZWQgYnkgbWFya2Rvd24gYm9keScsXG4gICAgZGVzY3JpcHRpb246ICdNYXJrZG93biBub3RlcyB3aXRoIHN0cnVjdHVyZWQgWUFNTCBmcm9udG1hdHRlciBtZXRhZGF0YScsXG4gICAgdGltZW91dDogMzAwMDBcbiAgfSxcbiAgYXN5bmMgKHJlcXVlc3QsIGNvbnRleHQpID0+IHtcbiAgICBjb25zdCBlcnJvcnM6IFZhbEVycm9yW10gPSBbXTtcblxuICAgIGNvbnRleHQubG9nZ2VyLmluZm8oJ1ZhbGlkYXRpbmcgbm90ZScsIHsgZmlsZU5hbWU6IGNvbnRleHQuZmlsZU5hbWUgfSk7XG5cbiAgICAvLyBSZWFkIGNvbnRlbnQgZnJvbSBmaWxlXG4gICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhyZXF1ZXN0LmZpbGVQYXRoLCAndXRmLTgnKTtcblxuICAgIC8vIFZhbGlkYXRlIGZyb250bWF0dGVyIHN0cnVjdHVyZSAobXVzdCBoYXZlIGJvdGggb3BlbmluZyBhbmQgY2xvc2luZyBkZWxpbWl0ZXJzKVxuICAgIGlmICghRlJPTlRNQVRURVJfUkVHRVgudGVzdChjb250ZW50KSkge1xuICAgICAgcmV0dXJuIHZhbGlkYXRpb25FcnJvcihbJ05vdGUgbXVzdCBoYXZlIFlBTUwgZnJvbnRtYXR0ZXInXSk7XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgbWFya2Rvd24gd2l0aCBmcm9udG1hdHRlciB1c2luZyBncmF5LW1hdHRlclxuICAgIGxldCBwYXJzZWQ6IG1hdHRlci5HcmF5TWF0dGVyRmlsZTxzdHJpbmc+O1xuICAgIHRyeSB7XG4gICAgICBwYXJzZWQgPSBtYXR0ZXIoY29udGVudCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnRleHQubG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gcGFyc2UgZnJvbnRtYXR0ZXInLCB7IGVycm9yIH0pO1xuICAgICAgcmV0dXJuIHZhbGlkYXRpb25FcnJvcihbJ0ludmFsaWQgWUFNTCBpbiBmcm9udG1hdHRlciddKTtcbiAgICB9XG5cbiAgICBjb25zdCBmcm9udG1hdHRlciA9IHBhcnNlZC5kYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG4gICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzXG4gICAgY29uc3QgcmVxdWlyZWRGaWVsZHM6IEFycmF5PGtleW9mIE5vdGVGcm9udG1hdHRlcj4gPSBbJ2lkJywgJ2F1dGhvcicsICd0aXRsZSddO1xuICAgIGZvciAoY29uc3QgZmllbGQgb2YgcmVxdWlyZWRGaWVsZHMpIHtcbiAgICAgIGNvbnN0IGVycm9yID0gdmFsaWRhdGVSZXF1aXJlZEZpZWxkKGZyb250bWF0dGVyLCBmaWVsZCk7XG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goZXJyb3IpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJldHVybiB2YWxpZGF0aW9uIGVycm9ycyBpZiBhbnlcbiAgICBpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnRleHQubG9nZ2VyLndhcm4oJ05vdGUgdmFsaWRhdGlvbiBmYWlsZWQnLCB7IGVycm9yQ291bnQ6IGVycm9ycy5sZW5ndGggfSk7XG4gICAgICByZXR1cm4gdmFsaWRhdGlvbkVycm9yKGVycm9ycy5tYXAoKGUpID0+IChlLmZpZWxkID8gYCoqJHtlLmZpZWxkfSoqOiAke2UubWVzc2FnZX1gIDogZS5tZXNzYWdlKSkpO1xuICAgIH1cblxuICAgIC8vIFZhbGlkYXRpb24gc3VjY2VlZGVkXG4gICAgY29udGV4dC5sb2dnZXIuaW5mbygnTm90ZSB2YWxpZGF0aW9uIHN1Y2NlZWRlZCcsIHtcbiAgICAgIG5vdGVJZDogZnJvbnRtYXR0ZXJbJ2lkJ10sXG4gICAgICBhdXRob3I6IGZyb250bWF0dGVyWydhdXRob3InXSxcbiAgICAgIHRpdGxlOiBmcm9udG1hdHRlclsndGl0bGUnXVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHZhbGlkYXRpb25TdWNjZXNzKHsgbm90ZUlkOiBmcm9udG1hdHRlclsnaWQnXSBhcyBzdHJpbmcgfSk7XG4gIH1cbik7XG4iLCAiLyoqXG4gKiBUeXBlIGxpZmVjeWNsZSBob29rIGZhY3Rvcmllcy5cbiAqXG4gKiBUaGVzZSBmYWN0b3JpZXMgY3JlYXRlIHR5cGUtc3BlY2lmaWMgaG9va3MgZm9yIHZhbGlkYXRpb24gYW5kIGxpZmVjeWNsZSBldmVudHMuXG4gKiBUaGV5IHVzZSBTYW1lU2hhcGUgZm9yIGNvbXBpbGUtdGltZSB0eXBvIGRldGVjdGlvbiBhbmQgcHJlc2VydmUgdGhlIHR5cGUgbmFtZVxuICogYXMgYSBnZW5lcmljIHBhcmFtZXRlci5cbiAqXG4gKlxuICogQHN1bW1hcnkgVHlwZSBsaWZlY3ljbGUgaG9vayBmYWN0b3JpZXNcbiAqIEBtb2R1bGUgZmFjdG9yaWVzL3R5cGUtaG9va3NcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFZhbGlkYXRpb25SZXN1bHQgfSBmcm9tICcuLi8uLi9wcm90b2NvbC9pbmRleC5qcyc7XG5pbXBvcnQgdHlwZSB7XG4gIFR5cGVDcmVhdGVDb21tYW5kLFxuICBUeXBlRGVsZXRlQ29tbWFuZCxcbiAgVHlwZVVwZGF0ZUNvbW1hbmQsXG4gIFR5cGVWYWxpZGF0b3JDb21tYW5kXG59IGZyb20gJy4uL2NvbW1hbmQtdHlwZXMuanMnO1xuaW1wb3J0IHR5cGUgeyBUeXBlSG9va0NvbnRleHQsIFR5cGVIb29rSW5wdXQsIFR5cGVWYWxpZGF0b3JDb250ZXh0LCBWYWxpZGF0b3JGaWxlUmVxdWVzdCB9IGZyb20gJy4uL2lucHV0cy5qcyc7XG5pbXBvcnQgdHlwZSB7IFNhbWVTaGFwZSB9IGZyb20gJy4uL3R5cGUtdXRpbHMuanMnO1xuXG4vKipcbiAqIENvbmZpZ3VyYXRpb24gZm9yIHR5cGUgbGlmZWN5Y2xlIGhvb2tzLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFR5cGVDb25maWcge1xuICAvKiogVGhlIHR5cGUgbmFtZSAoZS5nLiwgJ2FkYXB0aXZlLWNhcmQnKS4gKi9cbiAgdHlwZU5hbWU6IHN0cmluZztcbiAgLyoqIE9wdGlvbmFsIHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzLiAqL1xuICB0aW1lb3V0PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBIYW5kbGVyIHNvdXJjZSBmaWxlIHBhdGgsIGluamVjdGVkIGJ5IHRoZSBgaW5qZWN0U291cmNlUGF0aGAgZXNidWlsZFxuICAgKiBwbHVnaW4gZHVyaW5nIGNvbmZpZyBsb2FkaW5nLiBEbyBub3Qgc2V0IG1hbnVhbGx5LlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIHNvdXJjZVBhdGg/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQ29uZmlndXJhdGlvbiBmb3IgdHlwZSB2YWxpZGF0b3JzLCBleHRlbmRpbmcgVHlwZUNvbmZpZyB3aXRoIHNjaGVtYSBtZXRhZGF0YS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBUeXBlVmFsaWRhdG9yQ29uZmlnIGV4dGVuZHMgVHlwZUNvbmZpZyB7XG4gIC8qKiBIdW1hbi1yZWFkYWJsZSBzY2hlbWEgZGVzY3JpYmluZyB0aGUgZXhwZWN0ZWQgZmlsZSBmb3JtYXQuICovXG4gIHNjaGVtYTogc3RyaW5nO1xuICAvKiogRGVzY3JpcHRpb24gb2YgdGhlIHR5cGUncyBwdXJwb3NlLiAqL1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xufVxuXG4vKipcbiAqIEhhbmRsZXIgZnVuY3Rpb24gZm9yIHR5cGUgbGlmZWN5Y2xlIGV2ZW50cyAoY3JlYXRlLCB1cGRhdGUsIGRlbGV0ZSkuXG4gKlxuICogQHBhcmFtIGlucHV0IC0gVHlwZSBob29rIGlucHV0IGNvbnRhaW5pbmcgZmlsZSBtZXRhZGF0YVxuICogQHBhcmFtIGNvbnRleHQgLSBBY3Rpb24gY29udGV4dCB3aXRoIGxvZ2dlciBhbmQgdXRpbGl0aWVzXG4gKi9cbmV4cG9ydCB0eXBlIFR5cGVIYW5kbGVyID0gKGlucHV0OiBUeXBlSG9va0lucHV0LCBjb250ZXh0OiBUeXBlSG9va0NvbnRleHQpID0+IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xuXG4vKipcbiAqIEhhbmRsZXIgZnVuY3Rpb24gZm9yIHR5cGUgdmFsaWRhdG9ycy5cbiAqXG4gKiBSZWNlaXZlcyBhIGZpbGUgcmVxdWVzdCB3aXRoIHRoZSBwYXRoIGFuZCBvcHRpb25hbCBzaWRlY2FyIG1ldGFkYXRhLlxuICogVGhlIGZpbGUgaXMgYWxyZWFkeSBvbiBkaXNrOyB2YWxpZGF0b3JzIHJlYWQgaXQgdGhlbXNlbHZlcy5cbiAqXG4gKiBAcGFyYW0gcmVxdWVzdCAtIEZpbGUgcmVxdWVzdCB3aXRoIHBhdGggYW5kIG9wdGlvbmFsIG1ldGFkYXRhXG4gKiBAcGFyYW0gY29udGV4dCAtIFZhbGlkYXRvciBjb250ZXh0IHdpdGggdHlwZSBtZXRhZGF0YVxuICogQHJldHVybnMgVmFsaWRhdGlvbiByZXN1bHQgaW5kaWNhdGluZyBzdWNjZXNzIG9yIGZhaWx1cmVcbiAqL1xuZXhwb3J0IHR5cGUgVHlwZVZhbGlkYXRvckhhbmRsZXIgPSAoXG4gIHJlcXVlc3Q6IFZhbGlkYXRvckZpbGVSZXF1ZXN0LFxuICBjb250ZXh0OiBUeXBlVmFsaWRhdG9yQ29udGV4dFxuKSA9PiBWYWxpZGF0aW9uUmVzdWx0IHwgUHJvbWlzZTxWYWxpZGF0aW9uUmVzdWx0PjtcblxuLyoqXG4gKiBDcmVhdGVzIGEgdHlwZSB2YWxpZGF0b3IgaG9vayBmb3IgZmlsZSB2YWxpZGF0aW9uLlxuICpcbiAqIFZhbGlkYXRvcnMgcmVjZWl2ZSB0aGUgZmlsZSBwYXRoIGFuZCBvcHRpb25hbCBzaWRlY2FyIG1ldGFkYXRhLlxuICogVGhlIGZpbGUgaXMgYWxyZWFkeSBvbiBkaXNrOyB2YWxpZGF0b3JzIHJlYWQgaXQgdGhlbXNlbHZlcy4gUmV0dXJuIGFcbiAqIGBWYWxpZGF0aW9uUmVzdWx0YCB0byBpbmRpY2F0ZSBzdWNjZXNzIG9yIGZhaWx1cmUuXG4gKlxuICogQHRlbXBsYXRlIFQgLSBDb25maWcgdHlwZSAoaW5mZXJyZWQpXG4gKiBAcGFyYW0gY29uZmlnIC0gVHlwZSBtZXRhZGF0YSBpbmNsdWRpbmcgdGhlIHR5cGUgbmFtZVxuICogQHBhcmFtIGhhbmRsZXIgLSBGdW5jdGlvbiB0aGF0IHZhbGlkYXRlcyB0aGUgZmlsZSBhbmQgcmV0dXJucyBhIHJlc3VsdFxuICogQHJldHVybnMgQSBjb21tYW5kIHdyYXBwZXIgc3VpdGFibGUgZm9yIGRlZmF1bHQgZXhwb3J0XG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIHZhbGlkYXRvcnMvYWRhcHRpdmUtY2FyZC12YWxpZGF0b3IudHNcbiAqIGltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuICogaW1wb3J0IHsgZGVmaW5lVHlwZVZhbGlkYXRvciwgdmFsaWRhdGlvblN1Y2Nlc3MsIHZhbGlkYXRpb25FcnJvciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBkZWZpbmVUeXBlVmFsaWRhdG9yKFxuICogICB7IHR5cGVOYW1lOiAnYWRhcHRpdmUtY2FyZCcgfSxcbiAqICAgYXN5bmMgKHJlcXVlc3QsIGNvbnRleHQpID0+IHtcbiAqICAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKHJlcXVlc3QuZmlsZVBhdGgsICd1dGYtOCcpO1xuICogICAgIGNvbnN0IGNhcmQgPSBKU09OLnBhcnNlKGNvbnRlbnQpIGFzIEFkYXB0aXZlQ2FyZDtcbiAqXG4gKiAgICAgY29uc3QgZXJyb3JzID0gdmFsaWRhdGVBZGFwdGl2ZUNhcmQoY2FyZCk7XG4gKiAgICAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XG4gKiAgICAgICByZXR1cm4gdmFsaWRhdGlvbkVycm9yKGVycm9ycy5tYXAoZSA9PiBlLm1lc3NhZ2UpKTtcbiAqICAgICB9XG4gKlxuICogICAgIGNvbnRleHQubG9nZ2VyLmluZm8oJ1ZhbGlkYXRpb24gcGFzc2VkJywgeyBmaWxlOiBjb250ZXh0LmZpbGVOYW1lIH0pO1xuICogICAgIHJldHVybiB2YWxpZGF0aW9uU3VjY2Vzcyh7IGNhcmRJZDogY2FyZC5pZCB9KTtcbiAqICAgfVxuICogKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmaW5lVHlwZVZhbGlkYXRvcjxUIGV4dGVuZHMgVHlwZVZhbGlkYXRvckNvbmZpZz4oXG4gIGNvbmZpZzogU2FtZVNoYXBlPFR5cGVWYWxpZGF0b3JDb25maWcsIFQ+LFxuICBoYW5kbGVyOiBUeXBlVmFsaWRhdG9ySGFuZGxlclxuKTogVHlwZVZhbGlkYXRvckNvbW1hbmQ8VFsndHlwZU5hbWUnXT4ge1xuICBjb25zdCBmbiA9IGFzeW5jIChyZXF1ZXN0OiBWYWxpZGF0b3JGaWxlUmVxdWVzdCwgY29udGV4dDogVHlwZVZhbGlkYXRvckNvbnRleHQpOiBQcm9taXNlPFZhbGlkYXRpb25SZXN1bHQ+ID0+IHtcbiAgICByZXR1cm4gYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGhhbmRsZXIocmVxdWVzdCwgY29udGV4dCkpO1xuICB9O1xuXG4gIHJldHVybiBPYmplY3QuYXNzaWduKGZuLCB7XG4gICAgZmFjdG9yeVR5cGU6ICd0eXBlVmFsaWRhdG9yJyBhcyBjb25zdCxcbiAgICB0eXBlTmFtZTogY29uZmlnLnR5cGVOYW1lLFxuICAgIHRpbWVvdXQ6IGNvbmZpZy50aW1lb3V0LFxuICAgIHNvdXJjZVBhdGg6IGNvbmZpZy5zb3VyY2VQYXRoLFxuICAgIHNjaGVtYTogY29uZmlnLnNjaGVtYSxcbiAgICBkZXNjcmlwdGlvbjogY29uZmlnLmRlc2NyaXB0aW9uXG4gIH0pIGFzIFR5cGVWYWxpZGF0b3JDb21tYW5kPFRbJ3R5cGVOYW1lJ10+O1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSB0eXBlIGNyZWF0ZSBob29rIGZvciBuZXcgZmlsZSBldmVudHMuXG4gKlxuICogUnVucyBhZnRlciBhIG5ldyB0eXBlZCBmaWxlIHBhc3NlcyB2YWxpZGF0aW9uLiBVc2UgdGhpcyBmb3Igc2lkZSBlZmZlY3RzXG4gKiBsaWtlIGluZGV4aW5nLCBub3RpZmljYXRpb25zLCBvciBzeW5jaW5nIHdpdGggZXh0ZXJuYWwgc3lzdGVtcy5cbiAqXG4gKiBAdGVtcGxhdGUgVCAtIENvbmZpZyB0eXBlIChpbmZlcnJlZClcbiAqIEBwYXJhbSBjb25maWcgLSBUeXBlIG1ldGFkYXRhIGluY2x1ZGluZyB0aGUgdHlwZSBuYW1lXG4gKiBAcGFyYW0gaGFuZGxlciAtIEFzeW5jIGZ1bmN0aW9uIHRoYXQgaGFuZGxlcyB0aGUgY3JlYXRlIGV2ZW50XG4gKiBAcmV0dXJucyBBIGNvbW1hbmQgd3JhcHBlciBzdWl0YWJsZSBmb3IgZGVmYXVsdCBleHBvcnRcbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gdHlwZXMvYWRhcHRpdmUtY2FyZC9jcmVhdGUudHNcbiAqIGltcG9ydCB7IGRlZmluZVR5cGVDcmVhdGUgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogZXhwb3J0IGRlZmF1bHQgZGVmaW5lVHlwZUNyZWF0ZShcbiAqICAgeyB0eXBlTmFtZTogJ2FkYXB0aXZlLWNhcmQnIH0sXG4gKiAgIGFzeW5jIChpbnB1dCwgeyBsb2dnZXIgfSkgPT4ge1xuICogICAgIGxvZ2dlci5pbmZvKCdOZXcgYWRhcHRpdmUgY2FyZCBjcmVhdGVkJywge1xuICogICAgICAgZmlsZTogaW5wdXQuZmlsZU5hbWUsXG4gKiAgICAgICBzaXplOiBpbnB1dC5maWxlU2l6ZVxuICogICAgIH0pO1xuICpcbiAqICAgICAvLyBJbmRleCBmb3Igc2VhcmNoXG4gKiAgICAgYXdhaXQgc2VhcmNoSW5kZXguYWRkKHtcbiAqICAgICAgIGlkOiBpbnB1dC5maWxlU2hhMjU2LFxuICogICAgICAgcGF0aDogaW5wdXQuZmlsZVBhdGgsXG4gKiAgICAgICB0eXBlOiBpbnB1dC50eXBlTmFtZVxuICogICAgIH0pO1xuICogICB9XG4gKiApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZpbmVUeXBlQ3JlYXRlPFQgZXh0ZW5kcyBUeXBlQ29uZmlnPihcbiAgY29uZmlnOiBTYW1lU2hhcGU8VHlwZUNvbmZpZywgVD4sXG4gIGhhbmRsZXI6IFR5cGVIYW5kbGVyXG4pOiBUeXBlQ3JlYXRlQ29tbWFuZDxUWyd0eXBlTmFtZSddPiB7XG4gIGNvbnN0IGZuID0gYXN5bmMgKGlucHV0OiBUeXBlSG9va0lucHV0LCBjb250ZXh0OiBUeXBlSG9va0NvbnRleHQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICBhd2FpdCBoYW5kbGVyKGlucHV0LCBjb250ZXh0KTtcbiAgfTtcblxuICBmbi5mYWN0b3J5VHlwZSA9ICd0eXBlQ3JlYXRlJyBhcyBjb25zdDtcbiAgZm4udHlwZU5hbWUgPSBjb25maWcudHlwZU5hbWU7XG4gIGZuLnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcbiAgZm4uc291cmNlUGF0aCA9IGNvbmZpZy5zb3VyY2VQYXRoO1xuXG4gIHJldHVybiBmbiBhcyBUeXBlQ3JlYXRlQ29tbWFuZDxUWyd0eXBlTmFtZSddPjtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgdHlwZSB1cGRhdGUgaG9vayBmb3IgbW9kaWZpZWQgZmlsZSBldmVudHMuXG4gKlxuICogUnVucyBhZnRlciBhbiBleGlzdGluZyB0eXBlZCBmaWxlIGlzIG1vZGlmaWVkIGFuZCBwYXNzZXMgdmFsaWRhdGlvbi5cbiAqIFRoZSBpbnB1dCBpbmNsdWRlcyB0aGUgbmV3IGZpbGUgaGFzaCwgZW5hYmxpbmcgZWZmaWNpZW50IGNoYW5nZSBkZXRlY3Rpb24uXG4gKlxuICogQHRlbXBsYXRlIFQgLSBDb25maWcgdHlwZSAoaW5mZXJyZWQpXG4gKiBAcGFyYW0gY29uZmlnIC0gVHlwZSBtZXRhZGF0YSBpbmNsdWRpbmcgdGhlIHR5cGUgbmFtZVxuICogQHBhcmFtIGhhbmRsZXIgLSBBc3luYyBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgdGhlIHVwZGF0ZSBldmVudFxuICogQHJldHVybnMgQSBjb21tYW5kIHdyYXBwZXIgc3VpdGFibGUgZm9yIGRlZmF1bHQgZXhwb3J0XG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIC8vIHR5cGVzL2FkYXB0aXZlLWNhcmQvdXBkYXRlLnRzXG4gKiBpbXBvcnQgeyBkZWZpbmVUeXBlVXBkYXRlIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICpcbiAqIGV4cG9ydCBkZWZhdWx0IGRlZmluZVR5cGVVcGRhdGUoXG4gKiAgIHsgdHlwZU5hbWU6ICdhZGFwdGl2ZS1jYXJkJyB9LFxuICogICBhc3luYyAoaW5wdXQsIHsgbG9nZ2VyIH0pID0+IHtcbiAqICAgICBsb2dnZXIuaW5mbygnQWRhcHRpdmUgY2FyZCB1cGRhdGVkJywge1xuICogICAgICAgZmlsZTogaW5wdXQuZmlsZU5hbWUsXG4gKiAgICAgICBuZXdIYXNoOiBpbnB1dC5maWxlU2hhMjU2LnNsaWNlKDAsIDgpXG4gKiAgICAgfSk7XG4gKlxuICogICAgIC8vIFVwZGF0ZSBzZWFyY2ggaW5kZXhcbiAqICAgICBhd2FpdCBzZWFyY2hJbmRleC51cGRhdGUoaW5wdXQuZmlsZVBhdGgsIHtcbiAqICAgICAgIGhhc2g6IGlucHV0LmZpbGVTaGEyNTYsXG4gKiAgICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxuICogICAgIH0pO1xuICogICB9XG4gKiApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZpbmVUeXBlVXBkYXRlPFQgZXh0ZW5kcyBUeXBlQ29uZmlnPihcbiAgY29uZmlnOiBTYW1lU2hhcGU8VHlwZUNvbmZpZywgVD4sXG4gIGhhbmRsZXI6IFR5cGVIYW5kbGVyXG4pOiBUeXBlVXBkYXRlQ29tbWFuZDxUWyd0eXBlTmFtZSddPiB7XG4gIGNvbnN0IGZuID0gYXN5bmMgKGlucHV0OiBUeXBlSG9va0lucHV0LCBjb250ZXh0OiBUeXBlSG9va0NvbnRleHQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICBhd2FpdCBoYW5kbGVyKGlucHV0LCBjb250ZXh0KTtcbiAgfTtcblxuICBmbi5mYWN0b3J5VHlwZSA9ICd0eXBlVXBkYXRlJyBhcyBjb25zdDtcbiAgZm4udHlwZU5hbWUgPSBjb25maWcudHlwZU5hbWU7XG4gIGZuLnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcbiAgZm4uc291cmNlUGF0aCA9IGNvbmZpZy5zb3VyY2VQYXRoO1xuXG4gIHJldHVybiBmbiBhcyBUeXBlVXBkYXRlQ29tbWFuZDxUWyd0eXBlTmFtZSddPjtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgdHlwZSBkZWxldGUgaG9vayBmb3IgZmlsZSByZW1vdmFsIGV2ZW50cy5cbiAqXG4gKiBSdW5zIHdoZW4gYSB0eXBlZCBmaWxlIGlzIGRlbGV0ZWQuIFRoZSBmaWxlIG1heSBhbHJlYWR5IGJlIHJlbW92ZWQgZnJvbVxuICogZGlzayB3aGVuIHRoaXMgaG9vayBleGVjdXRlcywgc28gdXNlIHRoZSBtZXRhZGF0YSBpbiBpbnB1dCByYXRoZXIgdGhhblxuICogYXR0ZW1wdGluZyB0byByZWFkIHRoZSBmaWxlLlxuICpcbiAqIEB0ZW1wbGF0ZSBUIC0gQ29uZmlnIHR5cGUgKGluZmVycmVkKVxuICogQHBhcmFtIGNvbmZpZyAtIFR5cGUgbWV0YWRhdGEgaW5jbHVkaW5nIHRoZSB0eXBlIG5hbWVcbiAqIEBwYXJhbSBoYW5kbGVyIC0gQXN5bmMgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIHRoZSBkZWxldGUgZXZlbnRcbiAqIEByZXR1cm5zIEEgY29tbWFuZCB3cmFwcGVyIHN1aXRhYmxlIGZvciBkZWZhdWx0IGV4cG9ydFxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyB0eXBlcy9hZGFwdGl2ZS1jYXJkL2RlbGV0ZS50c1xuICogaW1wb3J0IHsgZGVmaW5lVHlwZURlbGV0ZSB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiBleHBvcnQgZGVmYXVsdCBkZWZpbmVUeXBlRGVsZXRlKFxuICogICB7IHR5cGVOYW1lOiAnYWRhcHRpdmUtY2FyZCcgfSxcbiAqICAgYXN5bmMgKGlucHV0LCB7IGxvZ2dlciB9KSA9PiB7XG4gKiAgICAgbG9nZ2VyLmluZm8oJ0FkYXB0aXZlIGNhcmQgZGVsZXRlZCcsIHsgZmlsZTogaW5wdXQuZmlsZU5hbWUgfSk7XG4gKlxuICogICAgIC8vIFJlbW92ZSBmcm9tIHNlYXJjaCBpbmRleFxuICogICAgIGF3YWl0IHNlYXJjaEluZGV4LnJlbW92ZShpbnB1dC5maWxlUGF0aCk7XG4gKlxuICogICAgIC8vIENsZWFuIHVwIGFueSBjYWNoZWQgcmVuZGVyc1xuICogICAgIGF3YWl0IHJlbmRlckNhY2hlLmludmFsaWRhdGUoaW5wdXQuZmlsZVNoYTI1Nik7XG4gKiAgIH1cbiAqICk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmluZVR5cGVEZWxldGU8VCBleHRlbmRzIFR5cGVDb25maWc+KFxuICBjb25maWc6IFNhbWVTaGFwZTxUeXBlQ29uZmlnLCBUPixcbiAgaGFuZGxlcjogVHlwZUhhbmRsZXJcbik6IFR5cGVEZWxldGVDb21tYW5kPFRbJ3R5cGVOYW1lJ10+IHtcbiAgY29uc3QgZm4gPSBhc3luYyAoaW5wdXQ6IFR5cGVIb29rSW5wdXQsIGNvbnRleHQ6IFR5cGVIb29rQ29udGV4dCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgIGF3YWl0IGhhbmRsZXIoaW5wdXQsIGNvbnRleHQpO1xuICB9O1xuXG4gIGZuLmZhY3RvcnlUeXBlID0gJ3R5cGVEZWxldGUnIGFzIGNvbnN0O1xuICBmbi50eXBlTmFtZSA9IGNvbmZpZy50eXBlTmFtZTtcbiAgZm4udGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xuICBmbi5zb3VyY2VQYXRoID0gY29uZmlnLnNvdXJjZVBhdGg7XG5cbiAgcmV0dXJuIGZuIGFzIFR5cGVEZWxldGVDb21tYW5kPFRbJ3R5cGVOYW1lJ10+O1xufVxuIiwgIi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAqXG4gKiBUaGUgZXhlY3V0aW9uIHdyYXBwZXIgaW5qZWN0cyBhY3Rpb24gYW5kIHR5cGUgaG9vayBpbnB1dHMgdmlhIHByb2Nlc3MuZW52LlxuICogVGhpcyBtb2R1bGUgcHJvdmlkZXMgc3RyaWN0IGdldHRlcnMgYW5kIHR5cGVkIGV4dHJhY3RvcnMgc28gaGFuZGxlcnMgZG8gbm90XG4gKiBuZWVkIHRvIHBhcnNlIGVudmlyb25tZW50IHZhcmlhYmxlcyBtYW51YWxseS5cbiAqXG4gKiBVc2UgdGhlIGluZGl2aWR1YWwgZ2V0dGVycyB3aGVuIHlvdSBvbmx5IG5lZWQgb25lIHZhbHVlOyB1c2VcbiAqIHtAbGluayBleHRyYWN0QWN0aW9uSW5wdXR9IG9yIHtAbGluayBleHRyYWN0VHlwZUlucHV0fSB3aGVuIHlvdSBuZWVkIGEgZnVsbFxuICogdHlwZWQgcGF5bG9hZCBmb3IgYW4gYWN0aW9uIG9yIHR5cGUgaG9vay5cbiAqXG4gKlxuICogQHN1bW1hcnkgRW52aXJvbm1lbnQgdmFyaWFibGUgdXRpbGl0aWVzIGZvciBDYXJkcyBFeHRlbnNpb24gYWN0aW9ucyBhbmQgdHlwZSBob29rc1xuICogQG1vZHVsZVxuICovXG5cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHR5cGUgeyBBY3Rpb25JbnB1dCwgVHlwZUhvb2tJbnB1dCB9IGZyb20gJy4vaW5wdXRzLmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogRW52aXJvbm1lbnQgdmFyaWFibGUgbmFtZXMgc2V0IGJ5IHRoZSBDYXJkcyBleGVjdXRpb24gd3JhcHBlci5cbiAqXG4gKiBUaGlzIGlzIHRoZSBzaW5nbGUgc291cmNlIG9mIHRydXRoIGZvciBlbnYgdmFyIGtleXMgdXNlZCBieSBhY3Rpb24gYW5kIHR5cGVcbiAqIGhvb2sgcHJvY2Vzc2VzLiBLZWVwIGl0IGluIHN5bmMgd2l0aCB0aGUgd3JhcHBlciB0byBhdm9pZCBzdWJ0bGUgXCJ1bmRlZmluZWRcbiAqIGlucHV0XCIgYnVncy5cbiAqL1xuZXhwb3J0IGNvbnN0IENBUkRTX0VOVl9WQVJTID0ge1xuICAvKipcbiAgICogVW5pcXVlIGlkZW50aWZpZXIgZm9yIHRoZSBjdXJyZW50IGNhcmQuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIENBUkRfSUQ6ICdDQVJEX0lEJyxcblxuICAvKipcbiAgICogVGhlIGVudmlyb25tZW50IG5hbWUgZnJvbSBzZXR0aW5ncy5qc29uLlxuICAgKiBBdmFpbGFibGUgaW4gYWxsIGFjdGlvbnMgYW5kIHR5cGUgaG9va3MuXG4gICAqL1xuICBFTlZJUk9OTUVOVDogJ0VOVklST05NRU5UJyxcblxuICAvKipcbiAgICogRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gYnV0dG9uIHRoYXQgdHJpZ2dlcmVkIHRoaXMgaGFuZGxlci5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgQUNUSU9OX05BTUU6ICdBQ1RJT05fTkFNRScsXG5cbiAgLyoqXG4gICAqIENhcmQncyBleGVjdXRpb24gbW9kZSwgZGV0ZXJtaW5pbmcgVUkgaW50ZXJhY3Rpb24gbW9kZWwuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogVmFsaWQgdmFsdWVzOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnXG4gICAqL1xuICBFWEVDVVRJT05fTU9ERTogJ0VYRUNVVElPTl9NT0RFJyxcblxuICAvKipcbiAgICogQ2FyZHMgc2VydmVyIGJhc2UgVVJMIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9CQVNFX1VSTDogJ0FQSV9CQVNFX1VSTCcsXG5cbiAgLyoqXG4gICAqIEF1dGhlbnRpY2F0aW9uIHRva2VuIGZvciBBUEkgY2FsbHMuXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIEFQSV9BQ0NFU1NfVE9LRU46ICdBUElfQUNDRVNTX1RPS0VOJyxcblxuICAvKipcbiAgICogQ29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkgKG5vdCB0eXBlIGhvb2tzKS5cbiAgICogT3B0aW9uYWwuXG4gICAqL1xuICBDT0RJTkdfQUdFTlQ6ICdDT0RJTkdfQUdFTlQnLFxuXG4gIC8qKlxuICAgKiBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUuXG4gICAqIEF2YWlsYWJsZSBpbiB0eXBlIGhvb2tzIG9ubHkuXG4gICAqL1xuICBUWVBFX05BTUU6ICdUWVBFX05BTUUnLFxuXG4gIC8qKlxuICAgKiBUaGUgdHlwZSdzIHZlcnNpb24gc3RyaW5nIGZyb20gc2V0dGluZ3MuanNvbiBjb25maWd1cmF0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgVFlQRV9WRVJTSU9OOiAnVFlQRV9WRVJTSU9OJyxcblxuICAvKipcbiAgICogVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9OQU1FOiAnRklMRV9OQU1FJyxcblxuICAvKipcbiAgICogRnVsbCBwYXRoIHRvIHRoZSBmaWxlLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9QQVRIOiAnRklMRV9QQVRIJyxcblxuICAvKipcbiAgICogRmlsZSBzaXplIGluIGJ5dGVzLlxuICAgKiBBdmFpbGFibGUgaW4gdHlwZSBob29rcyBvbmx5LlxuICAgKi9cbiAgRklMRV9TSVpFOiAnRklMRV9TSVpFJyxcblxuICAvKipcbiAgICogU0hBMjU2IGhhc2ggb2YgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIFNIQTI1NjogJ1NIQTI1NicsXG5cbiAgLyoqXG4gICAqIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudC5cbiAgICogQXZhaWxhYmxlIGluIHR5cGUgaG9va3Mgb25seS5cbiAgICovXG4gIENPTlRFTlRfVFlQRTogJ0NPTlRFTlRfVFlQRScsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyLlxuICAgKlxuICAgKiBTZXQgYnkgdGhlIGV4dGVuc2lvbiBob3N0IGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgICh3aXRoXG4gICAqIGBFTEVDVFJPTl9SVU5fQVNfTk9ERT0xYCkuIENvbW1hbmRzIGluIHNldHRpbmdzLmpzb24gdXNlXG4gICAqIGAkVlNDT0RFX05PREUgLi9iaW4vLi4uYCBzbyB0aGV5IHdvcmsgcmVnYXJkbGVzcyBvZlxuICAgKiB3aGV0aGVyIGBub2RlYCBpcyBvbiB0aGUgc3lzdGVtIFBBVEguXG4gICAqXG4gICAqIEF2YWlsYWJsZSBpbiBhbGwgYWN0aW9ucyBhbmQgdHlwZSBob29rcy5cbiAgICovXG4gIFZTQ09ERV9OT0RFOiAnVlNDT0RFX05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBOb2RlLmpzIGludGVycHJldGVyIHJ1bm5pbmcgdGhlIHdyYXBwZXIgcHJvY2Vzcy5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSB3cmFwcGVyIGZyb20gYHByb2Nlc3MuZXhlY1BhdGhgLiBVc2UgYCROT0RFYCBpbiBlbWJlZGRlZFxuICAgKiBiYXNoIHN0YXRlbWVudHMgdG8gaW52b2tlIE5vZGUgc2NyaXB0cyBwb3J0YWJseS5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFsbCBhY3Rpb25zLlxuICAgKi9cbiAgTk9ERTogJ05PREUnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBVbml4IGRvbWFpbiBzb2NrZXQgZm9yIHJ1bnRpbWUtdG8tZGlzcGF0Y2hlciBjb21tdW5pY2F0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgU09DS0VUX1BBVEg6ICdTT0NLRVRfUEFUSCcsXG5cbiAgLyoqXG4gICAqIFBhdGggdG8gYSBKU09OIGZpbGUgY29udGFpbmluZyBzd2l0Y2hUb0ludGVyYWN0aXZlIGRhdGEgZnJvbSBhIHByZXZpb3VzIGhhbmRsZXIuXG4gICAqIEF2YWlsYWJsZSBpbiBhY3Rpb25zIG9ubHkuIE9wdGlvbmFsLlxuICAgKi9cbiAgU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSDogJ1NXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIENPTkZJR19QQVRIOiAnQ09ORklHX1BBVEgnLFxuXG4gIC8qKlxuICAgKiBQYXRoIHRvIHRoZSBWUyBDb2RlIHdvcmtzcGFjZSByb290IGRpcmVjdG9yeS5cbiAgICogU2V0IGJ5IHRoZSBhY3Rpb24gaGFuZGxlciAoZS5nLiwgbGF1bmNoLnRzKSB0byB0aGUgd29ya3RyZWUgcGF0aC5cbiAgICogQXZhaWxhYmxlIGluIGhvb2tzIHJ1bm5pbmcgaW5zaWRlIHRoZSBjbGF1ZGUgQ0xJLlxuICAgKi9cbiAgV09SS1NQQUNFX1BBVEg6ICdXT1JLU1BBQ0VfUEFUSCcsXG5cbiAgLyoqXG4gICAqIEFic29sdXRlIHBhdGggdG8gdGhlIG1haW4gZ2l0IHJlcG9zaXRvcnkgcm9vdCAoTk9UIGEgd29ya3RyZWUpLlxuICAgKiBTZXQgYnkgQWN0aW9uRGlzcGF0Y2hlcjsgY29uc3VtZWQgYnkgdGhlIHdyYXBwZXIgYW5kIHdhdGNoZXIgZm9yXG4gICAqIGdpdCBvcGVyYXRpb25zICh3b3JrdHJlZSByZW1vdmFsLCBicmFuY2ggZGVsZXRpb24pIHRoYXQgbXVzdCBydW5cbiAgICogYWdhaW5zdCB0aGUgbWFpbiByZXBvc2l0b3J5LlxuICAgKi9cbiAgUkVQT19ST09UOiAnUkVQT19ST09UJyxcblxuICAvKipcbiAgICogUGF0aCB0byB0aGUgY2FyZCdzIHJlcG9zaXRvcnkgZGlyZWN0b3J5LlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgQ0FSRF9SRVBPX1BBVEg6ICdDQVJEX1JFUE9fUEFUSCcsXG5cbiAgLyoqXG4gICAqIFJlc29sdmVkIHNoZWxsIGNvbW1hbmQgZm9yIHRoZSB3cmFwcGVyIHRvIHNwYXduIGFzIHRoZSBhY3Rpb24gaGFuZGxlci5cbiAgICogU2V0IGJ5IEFjdGlvbkRpc3BhdGNoZXI7IGNvbnN1bWVkIGJ5IHRoZSB3cmFwcGVyIChub3QgYnkgYWN0aW9uIGhhbmRsZXJzKS5cbiAgICovXG4gIEFDVElPTl9DT01NQU5EOiAnQUNUSU9OX0NPTU1BTkQnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIHRoYXQgdGhlIGNhcmQncyB3b3Jrc3BhY2UgYnJhbmNoIHdpbGwgbWVyZ2UgaW50by5cbiAgICogUmVzb2x2ZWQgZnJvbSB0aGUgd29ya3NwYWNlIEhFQUQgYXQgbGF1bmNoIHRpbWUuXG4gICAqIFNldCBieSB0aGUgbGF1bmNoIGFjdGlvbi5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIEJBU0VfQlJBTkNIOiAnQkFTRV9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIGZyb20gd2hpY2ggdGhlIGNhcmQncyB3b3Jrc3BhY2UgYnJhbmNoIHdhcyBjcmVhdGVkLlxuICAgKiBNYXkgZGlmZmVyIGZyb20gQkFTRV9CUkFOQ0ggd2hlbiB0aGUgd29ya3RyZWUgd2FzIGNyZWF0ZWQgYWdhaW5zdFxuICAgKiBhIGRpZmZlcmVudCByZWYgdGhhbiB0aGUgY3VycmVudCB3b3Jrc3BhY2UgSEVBRC5cbiAgICogU2V0IGJ5IHRoZSBsYXVuY2ggYWN0aW9uLlxuICAgKiBBdmFpbGFibGUgaW4gYWN0aW9ucyBvbmx5LlxuICAgKi9cbiAgUEFSRU5UX0JSQU5DSDogJ1BBUkVOVF9CUkFOQ0gnLFxuXG4gIC8qKlxuICAgKiBHaXQgYnJhbmNoIG5hbWUgZm9yIHRoZSBjYXJkJ3Mgd29ya3NwYWNlIGltcGxlbWVudGF0aW9uLlxuICAgKiBTZXQgYnkgdGhlIGxhdW5jaCBhY3Rpb24gYWZ0ZXIgcmVzb2x2aW5nIG9yIGNyZWF0aW5nIHRoZSB3b3JrdHJlZS5cbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seS5cbiAgICovXG4gIFdPUktTUEFDRV9CUkFOQ0g6ICdXT1JLU1BBQ0VfQlJBTkNIJyxcblxuICAvKipcbiAgICogU2Vzc2lvbiBJRCBwZXJzaXN0ZWQgYnkgdGhlIHNlc3Npb24tc3RhcnQgaG9vayB2aWEgYHBlcnNpc3RFbnZWYXJgLlxuICAgKlxuICAgKiBBdmFpbGFibGUgaW4gQmFzaCB0b29sIHNoZWxsIGRlc2NlbmRhbnRzIChjb21tYW5kcywgZ2l0IGhvb2tzKSBhZnRlclxuICAgKiBzZXNzaW9uIHN0YXJ0LiBOT1QgYXZhaWxhYmxlIGluIGhvb2tzIHNwYXduZWQgZGlyZWN0bHkgYnkgQ2xhdWRlIENvZGVcbiAgICogKHN0b3AsIHNlc3Npb24tZW5kLCBldGMuKSBcdTIwMTQgdGhvc2UgcmVjZWl2ZSB0aGUgc2Vzc2lvbiBJRCB2aWEgaG9vayBpbnB1dC5cbiAgICpcbiAgICogVGhlIGNhcmQtcmVwbyBwb3N0LWNvbW1pdCBob29rIHJlYWRzIHRoaXMgdG8gcmVjb3JkIGNvbW1pdHMgZGlyZWN0bHlcbiAgICogd2l0aG91dCBuZWVkaW5nIGEgcHJvY2Vzcy10cmVlIHdhbGsgb3IgUElEIHJlZ2lzdHJ5IGxvb2t1cC5cbiAgICovXG4gIENBUkRTX1NFU1NJT05fSUQ6ICdDQVJEU19TRVNTSU9OX0lEJyxcblxuICAvKipcbiAgICogQWJzb2x1dGUgcGF0aCB0byB0aGUgVlMgQ29kZSBleHRlbnNpb24gaW5zdGFsbGF0aW9uIGRpcmVjdG9yeS5cbiAgICpcbiAgICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBjb250ZXh0LmV4dGVuc2lvblVyaS5mc1BhdGhgIGFuZCBpbmplY3RlZFxuICAgKiBpbnRvIGFsbCBzcGF3bmVkIGFjdGlvbiBwcm9jZXNzZXMuIFVzZSB0aGlzIHRvIGxvY2F0ZSBidW5kbGVkIGFzc2V0cyBzdWNoXG4gICAqIGFzIHRoZSBydW50aW1lIHBsdWdpbiBkaXJlY3RvcnkgKGA8ZXh0ZW5zaW9uUGF0aD4vZGlzdC9wbHVnaW5zL3J1bnRpbWVgKS5cbiAgICpcbiAgICogQXZhaWxhYmxlIGluIGFjdGlvbnMgb25seSAobm90IHR5cGUgaG9va3MpLlxuICAgKi9cbiAgRVhURU5TSU9OX1BBVEg6ICdFWFRFTlNJT05fUEFUSCdcbn0gYXMgY29uc3Q7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEluZGl2aWR1YWwgR2V0dGVyc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFJlYWRzIHRoZSBjYXJkIGlkZW50aWZpZXIgZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhlIGV4ZWN1dGlvbiB3cmFwcGVyIGFsd2F5cyBzZXRzIHRoaXMgZm9yIGV2ZXJ5IGFjdGlvbiBhbmQgdHlwZSBob29rLlxuICogQHJldHVybnMgVGhlIGN1cnJlbnQgY2FyZCBJRFxuICogQHRocm93cyBFcnJvciBpZiBDQVJEX0lEIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBjYXJkSWQgPSBnZXRDYXJkSWQoKTtcbiAqIGNvbnNvbGUubG9nKGBQcm9jZXNzaW5nIGNhcmQ6ICR7Y2FyZElkfWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDYXJkSWQoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DQVJEX0lEXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNBUkRfSUR9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBlbnZpcm9ubWVudCBuYW1lIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgdmFsdWUgbWF0Y2hlcyB0aGUgZW52aXJvbm1lbnQga2V5IGluIHNldHRpbmdzLmpzb24gKGUuZy4sIFwiZGVmYXVsdFwiLCBcInN0YWdpbmdcIikuXG4gKiBAcmV0dXJucyBUaGUgZW52aXJvbm1lbnQgbmFtZVxuICogQHRocm93cyBFcnJvciBpZiBFTlZJUk9OTUVOVCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZW52aXJvbm1lbnQgPSBnZXRFbnZpcm9ubWVudCgpO1xuICogY29uc29sZS5sb2coYEVudmlyb25tZW50OiAke2Vudmlyb25tZW50fWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFbnZpcm9ubWVudCgpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLkVOVklST05NRU5UXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkVOVklST05NRU5UfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgYWN0aW9uIGJ1dHRvbiBuYW1lIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgaXMgdGhlIGRpc3BsYXkgbmFtZSBvZiB0aGUgYWN0aW9uIHRoYXQgdHJpZ2dlcmVkIHRoZSBoYW5kbGVyLCBtYXRjaGluZ1xuICogdGhlIGBhY3Rpb25OYW1lYCBmaWVsZCBmcm9tIGBkZWZpbmVBY3Rpb25gLlxuICogQHJldHVybnMgRGlzcGxheSBuYW1lIG9mIHRoZSBhY3Rpb24gdGhhdCB0cmlnZ2VyZWQgdGhlIGN1cnJlbnQgaGFuZGxlciBydW4uXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFDVElPTl9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBhY3Rpb25OYW1lID0gZ2V0QWN0aW9uTmFtZSgpO1xuICogY29uc29sZS5sb2coYFJ1bm5pbmcgYWN0aW9uOiAke2FjdGlvbk5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGlvbk5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5BQ1RJT05fTkFNRV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BQ1RJT05fTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGV4ZWN1dGlvbiBtb2RlIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIERldGVybWluZXMgdGhlIFVJIGludGVyYWN0aW9uIG1vZGVsIGZvciBhY3Rpb25zLlxuICogQHJldHVybnMgVGhlIGV4ZWN1dGlvbiBtb2RlICgnaW50ZXJhY3RpdmUnIG9yICdiYWNrZ3JvdW5kJylcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRVhFQ1VUSU9OX01PREUgaXMgbWlzc2luZywgZW1wdHksIG9yIGludmFsaWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBtb2RlID0gZ2V0RXhlY3V0aW9uTW9kZSgpO1xuICogaWYgKG1vZGUgPT09ICdpbnRlcmFjdGl2ZScpIHtcbiAqICAgLy8gU2hvdyB1c2VyIHByb21wdHNcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RXhlY3V0aW9uTW9kZSgpOiAnaW50ZXJhY3RpdmUnIHwgJ2JhY2tncm91bmQnIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5FWEVDVVRJT05fTU9ERX1gKTtcbiAgfVxuICBpZiAodmFsdWUgIT09ICdpbnRlcmFjdGl2ZScgJiYgdmFsdWUgIT09ICdiYWNrZ3JvdW5kJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke0NBUkRTX0VOVl9WQVJTLkVYRUNVVElPTl9NT0RFfTogZXhwZWN0ZWQgJ2ludGVyYWN0aXZlJyBvciAnYmFja2dyb3VuZCcsIGdvdCBcIiR7dmFsdWV9XCJgKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIEFQSSBiYXNlIFVSTCBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBVc2UgdGhpcyBhcyB0aGUgYmFzZSBmb3IgY29uc3RydWN0aW5nIEFQSSBlbmRwb2ludHMuIFRoZSBVUkwgZG9lcyBub3QgaW5jbHVkZVxuICogYSB0cmFpbGluZyBzbGFzaC5cbiAqIEByZXR1cm5zIEJhc2UgVVJMIHVzZWQgdG8gY29uc3RydWN0IENhcmRzIEFQSSBlbmRwb2ludHMgZm9yIHRoaXMgZXhlY3V0aW9uLlxuICogQHRocm93cyBFcnJvciBpZiBBUElfQkFTRV9VUkwgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGFwaVVybCA9IGdldEFwaUJhc2VVcmwoKTtcbiAqIGNvbnN0IGVuZHBvaW50ID0gYCR7YXBpVXJsfS9jYXJkcy8ke2NhcmRJZH1gO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlCYXNlVXJsKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQVBJX0JBU0VfVVJMXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkFQSV9CQVNFX1VSTH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIEFQSSBhY2Nlc3MgdG9rZW4gZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogQmVhcmVyIHRva2VuIHZhbGlkIGZvciB0aGUgZHVyYXRpb24gb2YgdGhpcyBhY3Rpb24gb3IgdHlwZSBob29rIGV4ZWN1dGlvbi5cbiAqIEluY2x1ZGUgaW4gQXV0aG9yaXphdGlvbiBoZWFkZXJzIHdoZW4gY2FsbGluZyB0aGUgQ2FyZHMgQVBJLlxuICogQHJldHVybnMgQmVhcmVyIHRva2VuIHRoYXQgYXV0aG9yaXplcyBBUEkgcmVxdWVzdHMgZm9yIHRoaXMgZXhlY3V0aW9uIGNvbnRleHQuXG4gKiBAdGhyb3dzIEVycm9yIGlmIEFQSV9BQ0NFU1NfVE9LRU4gaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHRva2VuID0gZ2V0QXBpQWNjZXNzVG9rZW4oKTtcbiAqIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYXBpVXJsLCB7XG4gKiAgIGhlYWRlcnM6IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3Rva2VufWAgfVxuICogfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaUFjY2Vzc1Rva2VuKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQVBJX0FDQ0VTU19UT0tFTl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5BUElfQUNDRVNTX1RPS0VOfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgY29uZmlndXJlZCBjb2RpbmcgYWdlbnQgaWRlbnRpZmllciBmcm9tIHRoZSBlbnZpcm9ubWVudC5cbiAqXG4gKiBPcHRpb25hbCB2YWx1ZSBmcm9tIGNhcmRzLmNvZGluZ0FnZW50IHNldHRpbmcuIFdoZW4gc2V0LCBpbmRpY2F0ZXMgd2hpY2ggQUlcbiAqIGNvZGluZyBhc3Npc3RhbnQgdGhlIHVzZXIgcHJlZmVycy4gQWN0aW9ucyBjYW4gdXNlIHRoaXMgdG8gY3VzdG9taXplIGJlaGF2aW9yXG4gKiBvciBwcm9tcHRzIGZvciBkaWZmZXJlbnQgYWdlbnRzLlxuICogQHJldHVybnMgVGhlIGNvZGluZyBhZ2VudCBpZGVudGlmaWVyLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvZGluZ0FnZW50ID0gZ2V0Q29kaW5nQWdlbnQoKTtcbiAqIGlmIChjb2RpbmdBZ2VudCA9PT0gJ2NsYXVkZScpIHtcbiAqICAgLy8gQ3VzdG9taXplIGZvciBDbGF1ZGVcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29kaW5nQWdlbnQoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT0RJTkdfQUdFTlRdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWUgZm9yIHR5cGUgaG9va3MuXG4gKlxuICogVGhpcyB2YWx1ZSBpcyBvbmx5IHByZXNlbnQgZm9yIHR5cGUgaG9vayBldmVudHMuXG4gKiBAcmV0dXJucyBUaGUgcmVnaXN0ZXJlZCB0eXBlIG5hbWVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgVFlQRV9OQU1FIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB0eXBlTmFtZSA9IGdldFR5cGVOYW1lKCk7XG4gKiBjb25zb2xlLmxvZyhgVHlwZTogJHt0eXBlTmFtZX1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VHlwZU5hbWUoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5UWVBFX05BTUVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuVFlQRV9OQU1FfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZSB2ZXJzaW9uIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoaXMgdmVyc2lvbiBjb21lcyBmcm9tIHRoZSB0eXBlIGNvbmZpZ3VyYXRpb24gaW4gc2V0dGluZ3MuanNvbi5cbiAqIEByZXR1cm5zIFRoZSB2ZXJzaW9uIHN0cmluZyBmcm9tIHR5cGUgY29uZmlnXG4gKiBAdGhyb3dzIEVycm9yIGlmIFRZUEVfVkVSU0lPTiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgdmVyc2lvbiA9IGdldFR5cGVWZXJzaW9uKCk7XG4gKiBjb25zb2xlLmxvZyhgVmVyc2lvbjogJHt2ZXJzaW9ufWApO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUeXBlVmVyc2lvbigpOiBzdHJpbmcge1xuICBjb25zdCB2YWx1ZSA9IHByb2Nlc3MuZW52W0NBUkRTX0VOVl9WQVJTLlRZUEVfVkVSU0lPTl07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5UWVBFX1ZFUlNJT059YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSB0eXBlZCBmaWxlIG5hbWUgZm9yIHR5cGUgaG9vayBldmVudHMuXG4gKlxuICogVGhpcyBpcyB0aGUgZmlsZSBuYW1lIHJlbGF0aXZlIHRvIHRoZSB0eXBlIGRpcmVjdG9yeSwgbm90IGEgZnVsbCBwYXRoLlxuICogQHJldHVybnMgVGhlIGZpbGUgbmFtZSB3aXRoaW4gdGhlIHR5cGUgZGlyZWN0b3J5XG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfTkFNRSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZmlsZU5hbWUgPSBnZXRGaWxlTmFtZSgpO1xuICogY29uc29sZS5sb2coYEZpbGU6ICR7ZmlsZU5hbWV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVOYW1lKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9OQU1FXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkZJTEVfTkFNRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGFic29sdXRlIHBhdGggdG8gdGhlIHR5cGVkIGZpbGUuXG4gKlxuICogVGhpcyBpcyB0aGUgZnVsbHkgcmVzb2x2ZWQgcGF0aCBvbiBkaXNrIHByb3ZpZGVkIGJ5IHRoZSBleGVjdXRpb24gd3JhcHBlci5cbiAqIEByZXR1cm5zIFRoZSBmdWxsIHBhdGggdG8gdGhlIGZpbGVcbiAqIEB0aHJvd3MgRXJyb3IgaWYgRklMRV9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBmaWxlUGF0aCA9IGdldEZpbGVQYXRoKCk7XG4gKiBjb25zb2xlLmxvZyhgUGF0aDogJHtmaWxlUGF0aH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIfWApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuLyoqXG4gKiBSZWFkcyB0aGUgdHlwZWQgZmlsZSBzaXplIGZyb20gdGhlIGVudmlyb25tZW50LlxuICpcbiAqIFRoZSB2YWx1ZSBpcyBwYXJzZWQgYXMgYSBiYXNlLTEwIGludGVnZXIuXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBzaXplIGluIGJ5dGVzXG4gKiBAdGhyb3dzIEVycm9yIGlmIEZJTEVfU0laRSBpcyBtaXNzaW5nIG9yIG5vdCBhIG51bWJlclxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IHNpemUgPSBnZXRGaWxlU2l6ZSgpO1xuICogY29uc29sZS5sb2coYFNpemU6ICR7c2l6ZX0gYnl0ZXNgKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RmlsZVNpemUoKTogbnVtYmVyIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5GSUxFX1NJWkVdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRklMRV9TSVpFfWApO1xuICB9XG4gIGNvbnN0IHNpemUgPSBOdW1iZXIucGFyc2VJbnQodmFsdWUsIDEwKTtcbiAgaWYgKE51bWJlci5pc05hTihzaXplKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCAke0NBUkRTX0VOVl9WQVJTLkZJTEVfU0laRX06IGV4cGVjdGVkIG51bWJlciwgZ290IFwiJHt2YWx1ZX1cImApO1xuICB9XG4gIHJldHVybiBzaXplO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBTSEEyNTYgaGFzaCBmb3IgdGhlIHR5cGVkIGZpbGUgY29udGVudC5cbiAqXG4gKiBVc2VmdWwgZm9yIGRldGVjdGluZyBjb250ZW50IGNoYW5nZXMgd2l0aG91dCByZWFkaW5nIHRoZSBmaWxlIGFnYWluLlxuICogQHJldHVybnMgVGhlIFNIQTI1NiBoYXNoIG9mIHRoZSBjb250ZW50XG4gKiBAdGhyb3dzIEVycm9yIGlmIFNIQTI1NiBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgaGFzaCA9IGdldFNoYTI1NigpO1xuICogY29uc29sZS5sb2coYEhhc2g6ICR7aGFzaH1gKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2hhMjU2KCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU0hBMjU2XTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLlNIQTI1Nn1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIE1JTUUgdHlwZSBmb3IgdGhlIHR5cGVkIGZpbGUgY29udGVudC5cbiAqXG4gKiBQcm92aWRlZCBmb3IgdHlwZSBob29rIGV2ZW50cyBzbyB2YWxpZGF0b3JzIGNhbiBicmFuY2ggb24gY29udGVudCB0eXBlLlxuICogQHJldHVybnMgVGhlIE1JTUUgdHlwZSBvZiB0aGUgY29udGVudFxuICogQHRocm93cyBFcnJvciBpZiBDT05URU5UX1RZUEUgaXMgbWlzc2luZyBvciBlbXB0eVxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IGNvbnRlbnRUeXBlID0gZ2V0Q29udGVudFR5cGUoKTtcbiAqIGNvbnNvbGUubG9nKGBDb250ZW50IHR5cGU6ICR7Y29udGVudFR5cGV9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbnRlbnRUeXBlKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ09OVEVOVF9UWVBFXTtcbiAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlOiAke0NBUkRTX0VOVl9WQVJTLkNPTlRFTlRfVFlQRX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgYnVuZGxlZCBOb2RlLmpzIGludGVycHJldGVyIHBhdGggZnJvbSB0aGUgZW52aXJvbm1lbnQuXG4gKlxuICogVGhpcyBpcyBzZXQgYnkgdGhlIGV4dGVuc2lvbiBkdXJpbmcgYWN0aXZhdGlvbiBhbmQgaW5qZWN0ZWQgaW50byBhbGxcbiAqIHNwYXduZWQgYWN0aW9uL2hvb2sgcHJvY2Vzc2VzLiBDb25maWd1cmF0aW9uIGF1dGhvcnMgY2FuIHVzZSBpdCB0byBpbnZva2VcbiAqIE5vZGUuanMgd2l0aG91dCByZWx5aW5nIG9uIHRoZSBzeXN0ZW0gUEFUSC5cbiAqXG4gKiBAcmV0dXJucyBUaGUgcGF0aCB0byB0aGUgTm9kZS5qcyBpbnRlcnByZXRlclxuICogQHRocm93cyBFcnJvciBpZiBWU0NPREVfTk9ERSBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3Qgbm9kZVBhdGggPSBnZXRWc2NvZGVOb2RlUGF0aCgpO1xuICogZXhlY0ZpbGVTeW5jKG5vZGVQYXRoLCBbJ3NjcmlwdC5qcyddKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VnNjb2RlTm9kZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERV07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5WU0NPREVfTk9ERX1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFVuaXggZG9tYWluIHNvY2tldCBwYXRoIGZvciBydW50aW1lLXRvLWRpc3BhdGNoZXIgY29tbXVuaWNhdGlvbi5cbiAqXG4gKiBAcmV0dXJucyBVbml4IHNvY2tldCBwYXRoIHVzZWQgdG8gc2VuZCBydW50aW1lIGNvbnRyb2wgbWVzc2FnZXMuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFNPQ0tFVF9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNvY2tldFBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5TT0NLRVRfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIHBhdGggdG8gdGhlIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmaWxlLlxuICpcbiAqIFRoaXMgaXMgb3B0aW9uYWwgXHUyMDE0IHJldHVybnMgdW5kZWZpbmVkIHdoZW4gbm90IHNldCAoaS5lLiwgdGhlIGFjdGlvblxuICogd2FzIG5vdCByZWxhdW5jaGVkIHZpYSBzd2l0Y2hUb0ludGVyYWN0aXZlKS5cbiAqXG4gKiBAcmV0dXJucyBUaGUgZmlsZSBwYXRoLCBvciB1bmRlZmluZWQgaWYgbm90IHNldFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3dpdGNoVG9JbnRlcmFjdGl2ZURhdGFQYXRoKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuU1dJVENIX1RPX0lOVEVSQUNUSVZFX0RBVEFfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBzZXR0aW5ncyBjb25maWd1cmF0aW9uIGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGRpcmVjdG9yeSBjb250YWluaW5nIGdlbmVyYXRlZCBzZXR0aW5ncyBhcnRpZmFjdHMuXG4gKiBAdGhyb3dzIEVycm9yIGlmIENPTkZJR19QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbmZpZ1BhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5DT05GSUdfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5DT05GSUdfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIFZTIENvZGUgd29ya3NwYWNlIHJvb3QgZGlyZWN0b3J5IHBhdGguXG4gKlxuICogQHJldHVybnMgQWJzb2x1dGUgcGF0aCB0byB0aGUgYWN0aXZlIFZTIENvZGUgd29ya3NwYWNlIHJvb3QuXG4gKiBAdGhyb3dzIEVycm9yIGlmIFdPUktTUEFDRV9QQVRIIGlzIG1pc3Npbmcgb3IgZW1wdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFdvcmtzcGFjZVBhdGgoKTogc3RyaW5nIHtcbiAgY29uc3QgdmFsdWUgPSBwcm9jZXNzLmVudltDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSF07XG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSAnJykge1xuICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyByZXF1aXJlZCBlbnZpcm9ubWVudCB2YXJpYWJsZTogJHtDQVJEU19FTlZfVkFSUy5XT1JLU1BBQ0VfUEFUSH1gKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG5cbi8qKlxuICogUmVhZHMgdGhlIGNhcmQncyByZXBvc2l0b3J5IGRpcmVjdG9yeSBwYXRoLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIHJlcG9zaXRvcnkgYXNzb2NpYXRlZCB3aXRoIHRoZSBhY3RpdmUgY2FyZC5cbiAqIEB0aHJvd3MgRXJyb3IgaWYgQ0FSRF9SRVBPX1BBVEggaXMgbWlzc2luZyBvciBlbXB0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FyZFJlcG9QYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuQ0FSRF9SRVBPX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuQ0FSRF9SRVBPX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIHRoZSBWUyBDb2RlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5IHBhdGguXG4gKlxuICogU2V0IGJ5IHRoZSBleHRlbnNpb24gaG9zdCBmcm9tIGBjb250ZXh0LmV4dGVuc2lvblVyaS5mc1BhdGhgIGFuZCBpbmplY3RlZFxuICogaW50byBhbGwgc3Bhd25lZCBhY3Rpb24gcHJvY2Vzc2VzLiBVc2UgdGhpcyB0byBsb2NhdGUgYnVuZGxlZCBhc3NldHMgc3VjaFxuICogYXMgdGhlIHJ1bnRpbWUgcGx1Z2luIGRpcmVjdG9yeSAoYDxleHRlbnNpb25QYXRoPi9kaXN0L3BsdWdpbnMvcnVudGltZWApLlxuICpcbiAqIEByZXR1cm5zIEFic29sdXRlIHBhdGggdG8gdGhlIGV4dGVuc2lvbiBpbnN0YWxsYXRpb24gZGlyZWN0b3J5LlxuICogQHRocm93cyBFcnJvciBpZiBFWFRFTlNJT05fUEFUSCBpcyBtaXNzaW5nIG9yIGVtcHR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFeHRlbnNpb25QYXRoKCk6IHN0cmluZyB7XG4gIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEhdO1xuICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Q0FSRFNfRU5WX1ZBUlMuRVhURU5TSU9OX1BBVEh9YCk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG4vKipcbiAqIFJlYWRzIGFuZCBwYXJzZXMgdGhlIHN3aXRjaFRvSW50ZXJhY3RpdmUgZGF0YSBmaWxlLlxuICpcbiAqIFdoZW4gYFNXSVRDSF9UT19JTlRFUkFDVElWRV9EQVRBX1BBVEhgIGlzIHNldCwgcmVhZHMgdGhlIGZpbGUgYXQgdGhhdCBwYXRoXG4gKiBhbmQgcGFyc2VzIGl0IGFzIEpTT04uIFJldHVybnMgdW5kZWZpbmVkIGlmIHRoZSBlbnYgdmFyIGlzIG5vdCBzZXQuXG4gKlxuICogQHJldHVybnMgVGhlIHBhcnNlZCBkYXRhLCBvciB1bmRlZmluZWQgaWYgdGhlIHBhdGggaXMgbm90IHNldFxuICogQHRocm93cyBFcnJvciBpZiB0aGUgZmlsZSBjYW5ub3QgYmUgcmVhZCBvciBjb250YWlucyBpbnZhbGlkIEpTT05cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YSgpOiB1bmtub3duIHwgdW5kZWZpbmVkIHtcbiAgY29uc3QgZGF0YVBhdGggPSBnZXRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YVBhdGgoKTtcbiAgaWYgKGRhdGFQYXRoID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMoZGF0YVBhdGgsICd1dGYtOCcpO1xuICByZXR1cm4gSlNPTi5wYXJzZShjb250ZW50KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVHlwZWQgSW5wdXQgRXh0cmFjdGlvblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEJ1aWxkcyBhIHR5cGVkIGFjdGlvbiBpbnB1dCBvYmplY3QgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG4gKlxuICogRXh0cmFjdHMgYWxsIGZpZWxkcyByZXF1aXJlZCBmb3IgYWN0aW9uIGhhbmRsZXJzLlxuICpcbiAqIEByZXR1cm5zIFR5cGVkIEFjdGlvbklucHV0IG9iamVjdFxuICogQHRocm93cyBFcnJvciBpZiByZXF1aXJlZCBlbnYgdmFycyBhcmUgbWlzc2luZyBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yIGFuIGFjdGlvbiBoYW5kbGVyXG4gKiBjb25zdCBpbnB1dCA9IGV4dHJhY3RBY3Rpb25JbnB1dCgpO1xuICogY29uc29sZS5sb2coaW5wdXQuY2FyZElkKTtcbiAqIGNvbnNvbGUubG9nKGlucHV0LmV4ZWN1dGlvbk1vZGUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0QWN0aW9uSW5wdXQoKTogQWN0aW9uSW5wdXQge1xuICByZXR1cm4ge1xuICAgIGNhcmRJZDogZ2V0Q2FyZElkKCksXG4gICAgYWN0aW9uTmFtZTogZ2V0QWN0aW9uTmFtZSgpLFxuICAgIGVudmlyb25tZW50OiBnZXRFbnZpcm9ubWVudCgpLFxuICAgIGV4ZWN1dGlvbk1vZGU6IGdldEV4ZWN1dGlvbk1vZGUoKSxcbiAgICBhcGlCYXNlVXJsOiBnZXRBcGlCYXNlVXJsKCksXG4gICAgYXBpQWNjZXNzVG9rZW46IGdldEFwaUFjY2Vzc1Rva2VuKCksXG4gICAgY29kaW5nQWdlbnQ6IGdldENvZGluZ0FnZW50KCksXG4gICAgc3dpdGNoVG9JbnRlcmFjdGl2ZURhdGE6IHJlYWRTd2l0Y2hUb0ludGVyYWN0aXZlRGF0YSgpLFxuICAgIHdvcmtzcGFjZVBhdGg6IGdldFdvcmtzcGFjZVBhdGgoKSxcbiAgICBjYXJkUmVwb1BhdGg6IGdldENhcmRSZXBvUGF0aCgpLFxuICAgIGNvbmZpZ1BhdGg6IGdldENvbmZpZ1BhdGgoKSxcbiAgICBleHRlbnNpb25QYXRoOiBnZXRFeHRlbnNpb25QYXRoKClcbiAgfTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgYSB0eXBlZCB0eXBlIGhvb2sgaW5wdXQgb2JqZWN0IGZyb20gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuICpcbiAqIEV4dHJhY3RzIGFsbCBmaWVsZHMgcmVxdWlyZWQgZm9yIHR5cGUgbGlmZWN5Y2xlIGhvb2tzICh2YWxpZGF0b3IsIGNyZWF0ZSxcbiAqIHVwZGF0ZSwgZGVsZXRlKS5cbiAqXG4gKiBAcmV0dXJucyBUeXBlZCBUeXBlSG9va0lucHV0IG9iamVjdFxuICogQHRocm93cyBFcnJvciBpZiByZXF1aXJlZCBlbnYgdmFycyBhcmUgbWlzc2luZyBvciBpbnZhbGlkXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRm9yIGEgdHlwZSBob29rIGhhbmRsZXJcbiAqIGNvbnN0IGlucHV0ID0gZXh0cmFjdFR5cGVJbnB1dCgpO1xuICogY29uc29sZS5sb2coaW5wdXQudHlwZU5hbWUpO1xuICogY29uc29sZS5sb2coaW5wdXQuZmlsZU5hbWUpO1xuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VHlwZUlucHV0KCk6IFR5cGVIb29rSW5wdXQge1xuICByZXR1cm4ge1xuICAgIGNhcmRJZDogZ2V0Q2FyZElkKCksXG4gICAgZW52aXJvbm1lbnQ6IGdldEVudmlyb25tZW50KCksXG4gICAgdHlwZU5hbWU6IGdldFR5cGVOYW1lKCksXG4gICAgdHlwZVZlcnNpb246IGdldFR5cGVWZXJzaW9uKCksXG4gICAgZmlsZU5hbWU6IGdldEZpbGVOYW1lKCksXG4gICAgZmlsZVBhdGg6IGdldEZpbGVQYXRoKCksXG4gICAgZmlsZVNpemU6IGdldEZpbGVTaXplKCksXG4gICAgZmlsZVNoYTI1NjogZ2V0U2hhMjU2KCksXG4gICAgY29udGVudFR5cGU6IGdldENvbnRlbnRUeXBlKCksXG4gICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgIGFwaUFjY2Vzc1Rva2VuOiBnZXRBcGlBY2Nlc3NUb2tlbigpXG4gIH07XG59XG4iLCAiLyoqXG4gKiBTdHJ1Y3R1cmVkIGxvZ2dpbmcgZm9yIENhcmRzIEV4dGVuc2lvbiBob29rcy5cbiAqXG4gKiBPdXRwdXQgaXMgb3B0LWluOiB0aGUgbG9nZ2VyIG9ubHkgZW1pdHMgdG8gcmVnaXN0ZXJlZCBoYW5kbGVycyBvciBhXG4gKiBjb25maWd1cmVkIGxvZyBmaWxlLiBJZiB5b3UgY29uZmlndXJlIG5vdGhpbmcsIHRoZSBsb2dnZXIgcG9saXRlbHkgc2F5c1xuICogbm90aGluZyBhdCBhbGwuIEl0IG5ldmVyIHdyaXRlcyB0byBzdGRvdXQgYW5kIGF2b2lkcyBzdGRlcnIgdG8ga2VlcCBob29rXG4gKiBwcm90b2NvbHMgY2xlYW4uXG4gKlxuICogQHN1bW1hcnkgU3RydWN0dXJlZCBsb2dnaW5nIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3NcbiAqIEBtb2R1bGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGxvZyBldmVudHNcbiAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICogICBjb25zb2xlLmVycm9yKGBFcnJvciBpbiAke2V2ZW50Lmhvb2tUeXBlfTogJHtldmVudC5tZXNzYWdlfWApO1xuICogfSk7XG4gKlxuICogLy8gTGF0ZXIsIGNsZWFuIHVwXG4gKiB1bnN1YnNjcmliZSgpO1xuICogYGBgXG4gKi9cblxuaW1wb3J0IHsgY2xvc2VTeW5jLCBleGlzdHNTeW5jLCBta2RpclN5bmMsIG9wZW5TeW5jLCB3cml0ZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGRpcm5hbWUgfSBmcm9tICdub2RlOnBhdGgnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2cgTGV2ZWwgVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBBdmFpbGFibGUgbG9nIGxldmVscy5cbiAqXG4gKiB8IExldmVsIHwgU2V2ZXJpdHkgfCBVc2UgQ2FzZSB8XG4gKiB8LS0tLS0tLXwtLS0tLS0tLS0tfC0tLS0tLS0tLS18XG4gKiB8IGBkZWJ1Z2AgfCBMb3dlc3QgfCBEZXRhaWxlZCBkZWJ1Z2dpbmcgaW5mb3JtYXRpb24gfFxuICogfCBgaW5mb2AgfCBMb3cgfCBHZW5lcmFsIG9wZXJhdGlvbmFsIGV2ZW50cyB8XG4gKiB8IGB3YXJuYCB8IE1lZGl1bSB8IFdhcm5pbmcgY29uZGl0aW9ucyB0aGF0IG1heSBpbmRpY2F0ZSBpc3N1ZXMgfFxuICogfCBgZXJyb3JgIHwgSGlnaCB8IEVycm9yIGNvbmRpdGlvbnMgcmVxdWlyaW5nIGF0dGVudGlvbiB8XG4gKi9cbmV4cG9ydCB0eXBlIExvZ0xldmVsID0gJ2RlYnVnJyB8ICdpbmZvJyB8ICd3YXJuJyB8ICdlcnJvcic7XG5cbi8qKlxuICogQWxsIGxvZyBsZXZlbHMgaW4gb3JkZXIgb2Ygc2V2ZXJpdHkgKGxvd2VzdCB0byBoaWdoZXN0KS5cbiAqL1xuZXhwb3J0IGNvbnN0IExPR19MRVZFTFMgPSBbJ2RlYnVnJywgJ2luZm8nLCAnd2FybicsICdlcnJvciddIGFzIGNvbnN0IHNhdGlzZmllcyByZWFkb25seSBMb2dMZXZlbFtdO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBMb2cgRXZlbnQgVHlwZVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFN0cnVjdHVyZWQgbG9nIGV2ZW50IGVtaXR0ZWQgYnkgdGhlIGxvZ2dlci5cbiAqXG4gKiBFdmVudHMgaW5jbHVkZSBjb250ZXh0dWFsIGRldGFpbHMgYWJvdXQgaG9vayBleGVjdXRpb24gYW5kIGFyZSBzdWl0YWJsZSBmb3JcbiAqIGRlYnVnZ2luZywgbW9uaXRvcmluZywgYW5kIGFuYWx5dGljcyBwaXBlbGluZXMuXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogLy8gRXhhbXBsZSBsb2cgZXZlbnRcbiAqIGNvbnN0IGV2ZW50OiBMb2dFdmVudCA9IHtcbiAqICAgdGltZXN0YW1wOiAnMjAyNC0wMS0xNVQxMDozMDowMC4wMDBaJyxcbiAqICAgbGV2ZWw6ICd3YXJuJyxcbiAqICAgaG9va1R5cGU6ICdhY3Rpb24tc3RhcnQnLFxuICogICBtZXNzYWdlOiAnQ2FyZCBzdGFydGVkJyxcbiAqICAgaW5wdXQ6IHsgY2FyZElkOiAnY2FyZC0xMjMnIH1cbiAqIH07XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dFdmVudCB7XG4gIC8qKlxuICAgKiBJU08gODYwMSB0aW1lc3RhbXAgb2Ygd2hlbiB0aGUgZXZlbnQgb2NjdXJyZWQuXG4gICAqIEBleGFtcGxlICcyMDI0LTAxLTE1VDEwOjMwOjAwLjAwMFonXG4gICAqL1xuICB0aW1lc3RhbXA6IHN0cmluZztcblxuICAvKipcbiAgICogU2V2ZXJpdHkgbGV2ZWwgb2YgdGhlIGxvZyBldmVudC5cbiAgICovXG4gIGxldmVsOiBMb2dMZXZlbDtcblxuICAvKipcbiAgICogVHlwZSBvZiBob29rIHRoYXQgZ2VuZXJhdGVkIHRoaXMgZXZlbnQuXG4gICAqIE1heSBiZSB1bmRlZmluZWQgZm9yIGV2ZW50cyBvdXRzaWRlIGhvb2sgY29udGV4dC5cbiAgICovXG4gIGhvb2tUeXBlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBIdW1hbi1yZWFkYWJsZSBkZXNjcmlwdGlvbiBvZiB3aGF0IGhhcHBlbmVkLlxuICAgKi9cbiAgbWVzc2FnZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBIb29rIGlucHV0IGRhdGEgYXQgdGhlIHRpbWUgb2YgbG9nZ2luZy5cbiAgICpcbiAgICogVGhpcyBpcyBwYXJ0aWFsIGJ5IGRlc2lnbiwgc28geW91IGNhbiBhdm9pZCBsb2dnaW5nIGxhcmdlIG9yIHNlbnNpdGl2ZVxuICAgKiBwYXlsb2FkcyB3aGlsZSBzdGlsbCBjYXB0dXJpbmcga2V5IGlkZW50aWZpZXJzLlxuICAgKi9cbiAgaW5wdXQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcblxuICAvKipcbiAgICogRXJyb3IgaW5mb3JtYXRpb24gaWYgdGhpcyBldmVudCByZXByZXNlbnRzIGFuIGVycm9yLlxuICAgKiBDb250YWlucyBzdHJ1Y3R1cmVkIGVycm9yIGRldGFpbHMgZm9yIGFuYWx5c2lzLlxuICAgKi9cbiAgZXJyb3I/OiBMb2dFdmVudEVycm9yO1xuXG4gIC8qKlxuICAgKiBBZGRpdGlvbmFsIGNvbnRleHQgZGF0YSBwcm92aWRlZCBieSB0aGUgY2FsbGVyLlxuICAgKlxuICAgKiBVc2UgdGhpcyBmb3Igc3RydWN0dXJlZCBtZXRhZGF0YSB0aGF0IHlvdSB3YW50IGRvd25zdHJlYW0gaGFuZGxlcnNcbiAgICogdG8gcmVjZWl2ZSAoZS5nLiwgcmVxdWVzdCBJRHMsIHRpbWluZyBkYXRhKS5cbiAgICovXG4gIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuLyoqXG4gKiBTdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uIHdpdGhpbiBhIGxvZyBldmVudC5cbiAqXG4gKiBFcnJvcnMgYXJlIG5vcm1hbGl6ZWQgc28gaGFuZGxlcnMgY2FuIGRlcGVuZCBvbiBjb25zaXN0ZW50IHNoYXBlLCBldmVuIHdoZW5cbiAqIGNhbGxlcnMgdGhyb3cgbm9uLUVycm9yIHZhbHVlcy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dFdmVudEVycm9yIHtcbiAgLyoqXG4gICAqIEVycm9yIG5hbWUgKGUuZy4sICdUeXBlRXJyb3InLCAnVmFsaWRhdGlvbkVycm9yJykuXG4gICAqL1xuICBuYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEVycm9yIG1lc3NhZ2UgZGVzY3JpYmluZyB3aGF0IHdlbnQgd3JvbmcuXG4gICAqL1xuICBtZXNzYWdlOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFN0YWNrIHRyYWNlIGlmIGF2YWlsYWJsZS5cbiAgICovXG4gIHN0YWNrPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBFcnJvciBjYXVzZSBjaGFpbiBpZiB0aGUgZXJyb3Igd2FzIHdyYXBwZWQuXG4gICAqL1xuICBjYXVzZT86IExvZ0V2ZW50RXJyb3I7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV2ZW50IEhhbmRsZXIgVHlwZVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIEhhbmRsZXIgaW52b2tlZCB3aGVuIGEgbG9nIGV2ZW50IGlzIGVtaXR0ZWQuXG4gKlxuICogSGFuZGxlcnMgcnVuIHN5bmNocm9ub3VzbHkuIEVycm9ycyB0aHJvd24gYnkgYSBoYW5kbGVyIGFyZSBzd2FsbG93ZWQgc29cbiAqIGxvZ2dpbmcgY2Fubm90IGJyZWFrIGhvb2sgZXhlY3V0aW9uLlxuICogQHBhcmFtIGV2ZW50IC0gVGhlIGxvZyBldmVudCB0byBoYW5kbGVcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBGb3J3YXJkIHRvIGV4dGVybmFsIGxvZ2dpbmcgc2VydmljZVxuICogY29uc3QgaGFuZGxlcjogTG9nRXZlbnRIYW5kbGVyID0gKGV2ZW50KSA9PiB7XG4gKiAgIGV4dGVybmFsTG9nZ2VyLmxvZyh7XG4gKiAgICAgbGV2ZWw6IGV2ZW50LmxldmVsLFxuICogICAgIG1lc3NhZ2U6IGV2ZW50Lm1lc3NhZ2UsXG4gKiAgICAgbWV0YWRhdGE6IHsgaG9va1R5cGU6IGV2ZW50Lmhvb2tUeXBlIH1cbiAqICAgfSk7XG4gKiB9O1xuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIExvZ0V2ZW50SGFuZGxlciA9IChldmVudDogTG9nRXZlbnQpID0+IHZvaWQ7XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgYSBsb2cgZXZlbnQgaGFuZGxlci5cbiAqXG4gKiBDYWxsIHRoaXMgZnVuY3Rpb24gdG8gc3RvcCByZWNlaXZpbmcgbG9nIGV2ZW50cy4gQWx3YXlzIGNhbGwgdW5zdWJzY3JpYmVcbiAqIHdoZW4gdGhlIGhhbmRsZXIgaXMgbm8gbG9uZ2VyIG5lZWRlZCB0byBwcmV2ZW50IG1lbW9yeSBsZWFrcy5cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCB1bnN1YnNjcmliZSA9IGxvZ2dlci5vbignZXJyb3InLCBoYW5kbGVFcnJvcik7XG4gKiAvLyAuLi4gbGF0ZXJcbiAqIHVuc3Vic2NyaWJlKCk7IC8vIFN0b3AgcmVjZWl2aW5nIGV2ZW50c1xuICogYGBgXG4gKi9cbmV4cG9ydCB0eXBlIFVuc3Vic2NyaWJlID0gKCkgPT4gdm9pZDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIENvbmZpZ3VyYXRpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDb25maWd1cmF0aW9uIG9wdGlvbnMgZm9yIHRoZSBMb2dnZXIuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nZ2VyQ29uZmlnIHtcbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGxvZyBmaWxlIGZvciBKU09OIExpbmVzIG91dHB1dC5cbiAgICpcbiAgICogSWYgbm90IHNldCwgZmlsZSBsb2dnaW5nIGlzIGRpc2FibGVkLiBDYW4gYWxzbyBiZSBzZXQgdmlhIHRoZVxuICAgKiBgQ0FSRFNfSE9PS1NfTE9HX0ZJTEVgIGVudmlyb25tZW50IHZhcmlhYmxlLlxuICAgKi9cbiAgbG9nRmlsZVBhdGg/OiBzdHJpbmc7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIExvZ2dlciBJbnRlcmZhY2UgKGZvciB0ZXN0aW5nIGFuZCB0eXBlIGNvbXBhdGliaWxpdHkpXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogTG9nZ2VyIGludGVyZmFjZSBmb3Igc3RydWN0dXJlZCwgY29udGV4dC1hd2FyZSBsb2dnaW5nLlxuICpcbiAqIFRoaXMgaW50ZXJmYWNlIGRlZmluZXMgdGhlIHB1YmxpYyBBUEkgb2YgdGhlIExvZ2dlciBjbGFzcy4gSXQgZXhpc3RzXG4gKiBwcmltYXJpbHkgZm9yIHR5cGUgY29tcGF0aWJpbGl0eSBhbmQgdGVzdGluZyBwdXJwb3NlcywgYWxsb3dpbmcgdGVzdHNcbiAqIHRvIG1vY2sgdGhlIGxvZ2dlciB3aXRob3V0IG5lZWRpbmcgdG8gaW1wbGVtZW50IGFsbCBpbnRlcm5hbCBtZXRob2RzLlxuICpcbiAqIEZvciBwcm9kdWN0aW9uIHVzZSwgdXNlIHRoZSB7QGxpbmsgTG9nZ2VyfSBjbGFzcyBvciB0aGUge0BsaW5rIGxvZ2dlcn1cbiAqIHNpbmdsZXRvbiBleHBvcnQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSUxvZ2dlciB7XG4gIC8qKlxuICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBEaWFnbm9zdGljIHRleHQgZGVzY3JpYmluZyBsb3ctbGV2ZWwgZXhlY3V0aW9uIGRldGFpbHMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICovXG4gIGRlYnVnKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhbiBpbmZvIG1lc3NhZ2UuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gT3BlcmF0aW9uYWwgbWVzc2FnZSBkZXNjcmliaW5nIG5vcm1hbCBob29rIHByb2dyZXNzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBpbmZvKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcblxuICAvKipcbiAgICogTG9ncyBhIHdhcm5pbmcgbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBXYXJuaW5nIHRleHQgZm9yIHJlY292ZXJhYmxlIG9yIHN1c3BpY2lvdXMgY29uZGl0aW9ucy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgd2FybihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBFcnJvciB0ZXh0IGRlc2NyaWJpbmcgYSBoYW5kbGVkIGZhaWx1cmUgY29uZGl0aW9uLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqL1xuICBlcnJvcihtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQ7XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBzdHJ1Y3R1cmVkIGVycm9yIHdpdGggZnVsbCBlcnJvciBkZXRhaWxzLlxuICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gbG9nXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKi9cbiAgbG9nRXJyb3IoZXJyb3I6IHVua25vd24sIG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZDtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTG9nZ2VyIENsYXNzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogTG9nZ2VyIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3Mgd2l0aCBldmVudCBzdWJzY3JpcHRpb24gYW5kIGZpbGUgb3V0cHV0LlxuICpcbiAqIE91dHB1dCBpcyBvcHQtaW4gYW5kIGJlc3QtZWZmb3J0OlxuICogLSBXaXRoIG5vIGhhbmRsZXJzIGFuZCBubyBsb2cgZmlsZSwgZXZlbnRzIGFyZSBkcm9wcGVkLlxuICogLSBIYW5kbGVyIGVycm9ycyBhcmUgc3dhbGxvd2VkIHNvIGxvZ2dpbmcgY2Fubm90IGJyZWFrIGhvb2tzLlxuICogLSBGaWxlIG91dHB1dCB1c2VzIEpTT04gTGluZXMgYW5kIGlnbm9yZXMgd3JpdGUgZmFpbHVyZXMuXG4gKlxuICogVGhlIGxvZ2dlciBuZXZlciB3cml0ZXMgdG8gc3Rkb3V0IG9yIHN0ZGVyci5cbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBsb2dnZXIgfSBmcm9tICdAY2FyZHMvc2RrL2NvbmZpZyc7XG4gKlxuICogLy8gU3Vic2NyaWJlIHRvIGV2ZW50cyBhdCBzcGVjaWZpYyBsZXZlbFxuICogbG9nZ2VyLm9uKCd3YXJuJywgKGV2ZW50KSA9PiB7XG4gKiAgIHNlbmRBbGVydChldmVudC5tZXNzYWdlKTtcbiAqIH0pO1xuICpcbiAqIC8vIExvZyB3aXRoaW4gYSBob29rIGhhbmRsZXJcbiAqIGxvZ2dlci53YXJuKCdBYm91dCB0byBleGVjdXRlIHRhc2snKTtcbiAqIGBgYFxuICovXG5leHBvcnQgY2xhc3MgTG9nZ2VyIHtcbiAgLyoqXG4gICAqIFJlZ2lzdGVyZWQgZXZlbnQgaGFuZGxlcnMgYnkgbG9nIGxldmVsLlxuICAgKi9cbiAgcHJpdmF0ZSBoYW5kbGVyczogTWFwPExvZ0xldmVsLCBTZXQ8TG9nRXZlbnRIYW5kbGVyPj4gPSBuZXcgTWFwKCk7XG5cbiAgLyoqXG4gICAqIEZpbGUgZGVzY3JpcHRvciBmb3IgbG9nIGZpbGUgb3V0cHV0LlxuICAgKiBMYXppbHkgaW5pdGlhbGl6ZWQgb24gZmlyc3Qgd3JpdGUuXG4gICAqL1xuICBwcml2YXRlIGxvZ0ZpbGVGZDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XG5cbiAgLyoqXG4gICAqIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBpZiBjb25maWd1cmVkLlxuICAgKi9cbiAgcHJpdmF0ZSBsb2dGaWxlUGF0aDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgZmlsZSBpbml0aWFsaXphdGlvbiBoYXMgYmVlbiBhdHRlbXB0ZWQuXG4gICAqL1xuICBwcml2YXRlIGZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiBDdXJyZW50IGhvb2sgY29udGV4dCBmb3IgZW5yaWNoaW5nIGxvZyBldmVudHMuXG4gICAqL1xuICBwcml2YXRlIGN1cnJlbnRIb29rVHlwZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBDdXJyZW50IGhvb2sgaW5wdXQgZm9yIGVucmljaGluZyBsb2cgZXZlbnRzLlxuICAgKi9cbiAgcHJpdmF0ZSBjdXJyZW50SW5wdXQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IExvZ2dlciBpbnN0YW5jZS5cbiAgICpcbiAgICogVHlwaWNhbGx5IHlvdSBzaG91bGQgdXNlIHRoZSBleHBvcnRlZCBgbG9nZ2VyYCBzaW5nbGV0b24gcmF0aGVyIHRoYW5cbiAgICogY3JlYXRpbmcgbmV3IGluc3RhbmNlcy5cbiAgICogQHBhcmFtIGNvbmZpZyAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb25cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBVc2Ugc2luZ2xldG9uIChyZWNvbW1lbmRlZClcbiAgICogaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnQGNhcmRzL3Nkay9jb25maWcnO1xuICAgKlxuICAgKiAvLyBPciBjcmVhdGUgY3VzdG9tIGluc3RhbmNlXG4gICAqIGNvbnN0IGN1c3RvbUxvZ2dlciA9IG5ldyBMb2dnZXIoeyBsb2dGaWxlUGF0aDogJy92YXIvbG9nL2hvb2tzLmxvZycgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgY29uc3RydWN0b3IoY29uZmlnOiBMb2dnZXJDb25maWcgPSB7fSkge1xuICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnMgbWFwIGZvciBlYWNoIGxldmVsXG4gICAgZm9yIChjb25zdCBsZXZlbCBvZiBMT0dfTEVWRUxTKSB7XG4gICAgICB0aGlzLmhhbmRsZXJzLnNldChsZXZlbCwgbmV3IFNldCgpKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgbG9nIGZpbGUgcGF0aCBmcm9tIGNvbmZpZyBvciBlbnZpcm9ubWVudFxuICAgIHRoaXMubG9nRmlsZVBhdGggPSBjb25maWcubG9nRmlsZVBhdGggPz8gcHJvY2Vzcy5lbnZbJ0NBUkRTX0hPT0tTX0xPR19GSUxFJ10gPz8gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGEgZGVidWcgbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBkZXRhaWxlZCBkZWJ1Z2dpbmcgaW5mb3JtYXRpb24gdGhhdCBpcyB0eXBpY2FsbHkgb25seSB1c2VmdWxcbiAgICogZHVyaW5nIGRldmVsb3BtZW50IG9yIHRyb3VibGVzaG9vdGluZy5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBEaWFnbm9zdGljIHRleHQgZGVzY3JpYmluZyBsb3ctbGV2ZWwgZXhlY3V0aW9uIGRldGFpbHMuXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIuZGVidWcoJ1Byb2Nlc3NpbmcgaG9vayBpbnB1dCcsIHsgdGFza0lkOiAndGFzay0xMjMnLCBpbnB1dFNpemU6IDI1NiB9KTtcbiAgICogYGBgXG4gICAqL1xuICBkZWJ1ZyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnZGVidWcnLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGluZm8gbWVzc2FnZS5cbiAgICpcbiAgICogVXNlIGZvciBnZW5lcmFsIG9wZXJhdGlvbmFsIGV2ZW50cyBsaWtlIGhvb2sgaW52b2NhdGlvbnMsIHN1Y2Nlc3NmdWxcbiAgICogY29tcGxldGlvbnMsIG9yIHN0YXRlIGNoYW5nZXMuXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gT3BlcmF0aW9uYWwgbWVzc2FnZSBkZXNjcmliaW5nIG5vcm1hbCBob29rIHByb2dyZXNzLlxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIHN0cnVjdHVyZWQgbWV0YWRhdGEgbWVyZ2VkIGludG8gdGhlIGVtaXR0ZWQgZXZlbnQuXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogbG9nZ2VyLmluZm8oJ1Rhc2sgc3RhcnRlZCcsIHsgdGFza0lkOiAndGFzay0xMjMnLCBjYXJkSWQ6ICdjYXJkLTQ1NicgfSk7XG4gICAqIGBgYFxuICAgKi9cbiAgaW5mbyhtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIHRoaXMuZW1pdCgnaW5mbycsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSB3YXJuaW5nIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgY29uZGl0aW9ucyB0aGF0IG1heSBpbmRpY2F0ZSBjYXJkcyBidXQgZG9uJ3QgcHJldmVudFxuICAgKiBvcGVyYXRpb24sIHN1Y2ggYXMgZGVwcmVjYXRlZCBwYXR0ZXJucyBvciBwZXJmb3JtYW5jZSBjb25jZXJucy5cbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBXYXJuaW5nIHRleHQgZm9yIHJlY292ZXJhYmxlIG9yIHN1c3BpY2lvdXMgY29uZGl0aW9ucy5cbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIGxvZ2dlci53YXJuKCdEZXByZWNhdGVkIGhvb2sgcGF0dGVybiBkZXRlY3RlZCcsIHsgcGF0dGVybjogJ2xlZ2FjeU1hdGNoZXInIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIHdhcm4obWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICB0aGlzLmVtaXQoJ3dhcm4nLCBtZXNzYWdlLCBjb250ZXh0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAqXG4gICAqIFVzZSBmb3IgZXJyb3IgY29uZGl0aW9ucyB0aGF0IHJlcXVpcmUgYXR0ZW50aW9uIGJ1dCB3ZXJlIGhhbmRsZWRcbiAgICogZ3JhY2VmdWxseS4gRm9yIGV4Y2VwdGlvbnMsIHByZWZlciB7QGxpbmsgbG9nRXJyb3J9LlxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIEVycm9yIHRleHQgZGVzY3JpYmluZyBhIGhhbmRsZWQgZmFpbHVyZSBjb25kaXRpb24uXG4gICAqIEBwYXJhbSBjb250ZXh0IC0gT3B0aW9uYWwgc3RydWN0dXJlZCBtZXRhZGF0YSBtZXJnZWQgaW50byB0aGUgZW1pdHRlZCBldmVudC5cbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byB2YWxpZGF0ZSBob29rIGlucHV0JywgeyByZWFzb246ICdlbXB0eSB0YXNrSWQnIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGVycm9yKG1lc3NhZ2U6IHN0cmluZywgY29udGV4dD86IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogdm9pZCB7XG4gICAgdGhpcy5lbWl0KCdlcnJvcicsIG1lc3NhZ2UsIGNvbnRleHQpO1xuICB9XG5cbiAgLyoqXG4gICAqIExvZ3MgYSBzdHJ1Y3R1cmVkIGVycm9yIHdpdGggZnVsbCBlcnJvciBkZXRhaWxzLlxuICAgKlxuICAgKiBVc2UgdGhpcyBmb3IgY2F1Z2h0IGV4Y2VwdGlvbnMuIE5vbi1FcnJvciB2YWx1ZXMgYXJlIG5vcm1hbGl6ZWQgc28gaGFuZGxlcnNcbiAgICogYWx3YXlzIHJlY2VpdmUgYSBjb25zaXN0ZW50IGVycm9yIHNoYXBlLlxuICAgKiBAcGFyYW0gZXJyb3IgLSBUaGUgZXJyb3IgdG8gbG9nXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gSHVtYW4tcmVhZGFibGUgZGVzY3JpcHRpb24gb2Ygd2hhdCBmYWlsZWRcbiAgICogQHBhcmFtIGNvbnRleHQgLSBPcHRpb25hbCBzdHJ1Y3R1cmVkIG1ldGFkYXRhIG1lcmdlZCBpbnRvIHRoZSBlbWl0dGVkIGV2ZW50LlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIHRyeSB7XG4gICAqICAgYXdhaXQgZGFuZ2Vyb3VzT3BlcmF0aW9uKCk7XG4gICAqIH0gY2F0Y2ggKGVycikge1xuICAgKiAgIGxvZ2dlci5sb2dFcnJvcihlcnIsICdGYWlsZWQgdG8gZXhlY3V0ZSBkYW5nZXJvdXMgb3BlcmF0aW9uJywge1xuICAgKiAgICAgb3BlcmF0aW9uOiAnZGVsZXRlJyxcbiAgICogICAgIHRhcmdldDogJy9pbXBvcnRhbnQvZmlsZS50eHQnXG4gICAqICAgfSk7XG4gICAqIH1cbiAgICogYGBgXG4gICAqL1xuICBsb2dFcnJvcihlcnJvcjogdW5rbm93biwgbWVzc2FnZTogc3RyaW5nLCBjb250ZXh0PzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiB2b2lkIHtcbiAgICBjb25zdCBlcnJvckluZm8gPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IpO1xuXG4gICAgY29uc3QgZXZlbnQ6IExvZ0V2ZW50ID0ge1xuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBsZXZlbDogJ2Vycm9yJyxcbiAgICAgIGhvb2tUeXBlOiB0aGlzLmN1cnJlbnRIb29rVHlwZSxcbiAgICAgIG1lc3NhZ2UsXG4gICAgICBpbnB1dDogdGhpcy5jdXJyZW50SW5wdXQsXG4gICAgICBlcnJvcjogZXJyb3JJbmZvLFxuICAgICAgY29udGV4dFxuICAgIH07XG5cbiAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlcyBhIGhhbmRsZXIgdG8gbG9nIGV2ZW50cyBhdCB0aGUgc3BlY2lmaWVkIGxldmVsLlxuICAgKlxuICAgKiBUaGUgaGFuZGxlciB3aWxsIGJlIGNhbGxlZCBmb3IgZXZlcnkgbG9nIGV2ZW50IGF0IHRoZSBzcGVjaWZpZWQgbGV2ZWwuXG4gICAqIFJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgY2FsbGVkIHdoZW4gdGhlIGhhbmRsZXJcbiAgICogaXMgbm8gbG9uZ2VyIG5lZWRlZC4gSGFuZGxlciBlcnJvcnMgYXJlIGlnbm9yZWQgdG8gYXZvaWQgZGlzcnVwdGluZyBob29rcy5cbiAgICogQHBhcmFtIGxldmVsIC0gVGhlIGxvZyBsZXZlbCB0byBzdWJzY3JpYmUgdG9cbiAgICogQHBhcmFtIGhhbmRsZXIgLSBUaGUgaGFuZGxlciBmdW5jdGlvbiB0byBjYWxsIGZvciBlYWNoIGV2ZW50XG4gICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgdGhlIGhhbmRsZXJcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBTdWJzY3JpYmUgdG8gZXJyb3IgZXZlbnRzXG4gICAqIGNvbnN0IHVuc3Vic2NyaWJlID0gbG9nZ2VyLm9uKCdlcnJvcicsIChldmVudCkgPT4ge1xuICAgKiAgIGNvbnNvbGUuZXJyb3IoYFske2V2ZW50Lmhvb2tUeXBlfV0gJHtldmVudC5tZXNzYWdlfWApO1xuICAgKiAgIGlmIChldmVudC5lcnJvcikge1xuICAgKiAgICAgY29uc29sZS5lcnJvcihldmVudC5lcnJvci5zdGFjayk7XG4gICAqICAgfVxuICAgKiB9KTtcbiAgICpcbiAgICogLy8gTGF0ZXIsIGNsZWFuIHVwXG4gICAqIHVuc3Vic2NyaWJlKCk7XG4gICAqIGBgYFxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIC8vIEZvcndhcmQgdG8gZXh0ZXJuYWwgbG9nZ2luZyBsaWJyYXJ5XG4gICAqIGltcG9ydCBwaW5vIGZyb20gJ3Bpbm8nO1xuICAgKiBjb25zdCBwaW5vTG9nZ2VyID0gcGlubygpO1xuICAgKlxuICAgKiBsb2dnZXIub24oJ2luZm8nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIuaW5mbyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgKiBsb2dnZXIub24oJ3dhcm4nLCAoZXZlbnQpID0+IHBpbm9Mb2dnZXIud2FybihldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICAgKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gICAqIGBgYFxuICAgKi9cbiAgb24obGV2ZWw6IExvZ0xldmVsLCBoYW5kbGVyOiBMb2dFdmVudEhhbmRsZXIpOiBVbnN1YnNjcmliZSB7XG4gICAgY29uc3QgbGV2ZWxIYW5kbGVycyA9IHRoaXMuaGFuZGxlcnMuZ2V0KGxldmVsKTtcbiAgICBpZiAobGV2ZWxIYW5kbGVycykge1xuICAgICAgbGV2ZWxIYW5kbGVycy5hZGQoaGFuZGxlcik7XG4gICAgfVxuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGxldmVsSGFuZGxlcnM/LmRlbGV0ZShoYW5kbGVyKTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGN1cnJlbnQgaG9vayBjb250ZXh0IGZvciBlbnJpY2hpbmcgbG9nIGV2ZW50cy5cbiAgICpcbiAgICogVGhpcyBpcyBjYWxsZWQgaW50ZXJuYWxseSBieSB0aGUgcnVudGltZSBiZWZvcmUgaW52b2tpbmcgaG9vayBoYW5kbGVycy5cbiAgICogWW91IHR5cGljYWxseSBkb24ndCBuZWVkIHRvIGNhbGwgdGhpcyBkaXJlY3RseS5cbiAgICogQHBhcmFtIGhvb2tUeXBlIC0gVGhlIHR5cGUgb2YgaG9vayBiZWluZyBleGVjdXRlZFxuICAgKiBAcGFyYW0gaW5wdXQgLSBUaGUgaG9vayBpbnB1dCBkYXRhXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgc2V0Q29udGV4dChob29rVHlwZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBpbnB1dDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCB1bmRlZmluZWQpOiB2b2lkIHtcbiAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IGhvb2tUeXBlO1xuICAgIHRoaXMuY3VycmVudElucHV0ID0gaW5wdXQ7XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXJzIHRoZSBjdXJyZW50IGhvb2sgY29udGV4dC5cbiAgICpcbiAgICogQ2FsbGVkIGludGVybmFsbHkgYnkgdGhlIHJ1bnRpbWUgYWZ0ZXIgaG9vayBleGVjdXRpb24gY29tcGxldGVzLlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIGNsZWFyQ29udGV4dCgpOiB2b2lkIHtcbiAgICB0aGlzLmN1cnJlbnRIb29rVHlwZSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmN1cnJlbnRJbnB1dCA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIGEgZGVmYXVsdCBsb2cgZmlsZSBwYXRoIHRoYXQgb25seSB0YWtlcyBlZmZlY3QgaWYgbm8gb3RoZXIgc291cmNlXG4gICAqIGhhcyBjb25maWd1cmVkIGZpbGUgbG9nZ2luZy5cbiAgICpcbiAgICogVGhpcyBpcyB0aGUgbG93ZXN0LXByaW9yaXR5IGZpbGUgcGF0aCBzb3VyY2UuIEl0IHdpbGwgYmUgaWdub3JlZCBpZlxuICAgKiBhbnkgb2YgdGhlc2UgaGF2ZSBhbHJlYWR5IHNldCBhIHBhdGg6XG4gICAqIC0gYGxvZ0ZpbGVQYXRoYCBpbiB0aGUgY29uc3RydWN0b3IgY29uZmlnXG4gICAqIC0gYENBUkRTX0hPT0tTX0xPR19GSUxFYCBlbnZpcm9ubWVudCB2YXJpYWJsZVxuICAgKiAtIHtAbGluayBzZXRMb2dGaWxlfSBjYWxsZWQgYXQgcnVudGltZVxuICAgKlxuICAgKiBJbnRlbmRlZCBmb3IgdXNlIGJ5IENMSSBlbnRyeSBwb2ludHMgKGUuZy4sIHRoZSBgLS1sb2dgIGZsYWcpLlxuICAgKiBAcGFyYW0gZmlsZVBhdGggLSBEZWZhdWx0IHBhdGggdG8gdGhlIGxvZyBmaWxlXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogLy8gV2lyZSAtLWxvZyBDTEkgYXJndW1lbnQgYXMgYSBmYWxsYmFja1xuICAgKiBpZiAoYXJncy5sb2cpIHtcbiAgICogICBsb2dnZXIuc2V0RGVmYXVsdExvZ0ZpbGUoYXJncy5sb2cpO1xuICAgKiB9XG4gICAqIGBgYFxuICAgKi9cbiAgc2V0RGVmYXVsdExvZ0ZpbGUoZmlsZVBhdGg6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICh0aGlzLmxvZ0ZpbGVQYXRoID09PSBudWxsKSB7XG4gICAgICB0aGlzLmxvZ0ZpbGVQYXRoID0gZmlsZVBhdGg7XG4gICAgICB0aGlzLmZpbGVJbml0aWFsaXplZCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb25maWd1cmVzIHRoZSBsb2cgZmlsZSBwYXRoIGF0IHJ1bnRpbWUuXG4gICAqXG4gICAqIENhbGwgdGhpcyB0byBlbmFibGUgb3IgY2hhbmdlIGZpbGUgbG9nZ2luZy4gU2V0dGluZyB0byBgbnVsbGAgZGlzYWJsZXNcbiAgICogZmlsZSBsb2dnaW5nIGFuZCBjbG9zZXMgYW55IG9wZW4gZmlsZSBoYW5kbGUuIERpcmVjdG9yaWVzIGFyZSBjcmVhdGVkXG4gICAqIG9uIGRlbWFuZCB3aGVuIHRoZSBmaXJzdCB3cml0ZSBvY2N1cnMuXG4gICAqIEBwYXJhbSBmaWxlUGF0aCAtIFBhdGggdG8gdGhlIGxvZyBmaWxlLCBvciBudWxsIHRvIGRpc2FibGVcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiAvLyBFbmFibGUgZmlsZSBsb2dnaW5nIGF0IHJ1bnRpbWVcbiAgICogbG9nZ2VyLnNldExvZ0ZpbGUoJy92YXIvbG9nL2NhcmRzLXNkay5sb2cnKTtcbiAgICpcbiAgICogLy8gRGlzYWJsZSBmaWxlIGxvZ2dpbmdcbiAgICogbG9nZ2VyLnNldExvZ0ZpbGUobnVsbCk7XG4gICAqIGBgYFxuICAgKi9cbiAgc2V0TG9nRmlsZShmaWxlUGF0aDogc3RyaW5nIHwgbnVsbCk6IHZvaWQge1xuICAgIC8vIENsb3NlIGV4aXN0aW5nIGZpbGUgaWYgb3BlblxuICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICB9XG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5sb2dGaWxlUGF0aCA9IGZpbGVQYXRoO1xuICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIGFsbCByZXNvdXJjZXMgaGVsZCBieSB0aGUgbG9nZ2VyLlxuICAgKlxuICAgKiBDYWxsIHRoaXMgZHVyaW5nIGdyYWNlZnVsIHNodXRkb3duIHRvIGVuc3VyZSBhbGwgbG9nIGRhdGEgaXMgZmx1c2hlZC5cbiAgICogU2FmZSB0byBjYWxsIG11bHRpcGxlIHRpbWVzLlxuICAgKiBAZXhhbXBsZVxuICAgKiBgYGB0eXBlc2NyaXB0XG4gICAqIHByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gICAqICAgbG9nZ2VyLmNsb3NlKCk7XG4gICAqIH0pO1xuICAgKiBgYGBcbiAgICovXG4gIGNsb3NlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCAhPT0gbnVsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2xvc2VTeW5jKHRoaXMubG9nRmlsZUZkKTtcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBJZ25vcmUgZXJyb3JzIG9uIGNsb3NlXG4gICAgICB9XG4gICAgICB0aGlzLmxvZ0ZpbGVGZCA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMuZmlsZUluaXRpYWxpemVkID0gZmFsc2U7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZXJlIGFyZSBhbnkgYWN0aXZlIGhhbmRsZXJzIG9yIGRlc3RpbmF0aW9ucy5cbiAgICpcbiAgICogUmV0dXJucyB0cnVlIGlmIGFueSBoYW5kbGVycyBhcmUgcmVnaXN0ZXJlZCBvciBmaWxlIGxvZ2dpbmcgaXMgZW5hYmxlZC5cbiAgICogVXNlZnVsIGZvciBkZWNpZGluZyB3aGV0aGVyIHRvIGNvbXB1dGUgZXhwZW5zaXZlIGxvZyBjb250ZXh0LlxuICAgKiBAcmV0dXJucyBXaGV0aGVyIHRoZSBsb2dnZXIgaGFzIGFueSBhY3RpdmUgb3V0cHV0IGRlc3RpbmF0aW9uc1xuICAgKi9cbiAgaGFzRGVzdGluYXRpb25zKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGhhc0hhbmRsZXJzID0gQXJyYXkuZnJvbSh0aGlzLmhhbmRsZXJzLnZhbHVlcygpKS5zb21lKChoYW5kbGVycykgPT4gaGFuZGxlcnMuc2l6ZSA+IDApO1xuICAgIHJldHVybiBoYXNIYW5kbGVycyB8fCB0aGlzLmxvZ0ZpbGVQYXRoICE9PSBudWxsO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQcml2YXRlIE1ldGhvZHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIC8qKlxuICAgKiBFbWl0cyBhIGxvZyBldmVudC5cbiAgICogQHBhcmFtIGxldmVsIC0gVGhlIHNldmVyaXR5IGxldmVsIG9mIHRoZSBldmVudFxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFRoZSBsb2cgbWVzc2FnZVxuICAgKiBAcGFyYW0gY29udGV4dCAtIE9wdGlvbmFsIGFkZGl0aW9uYWwgY29udGV4dCBkYXRhXG4gICAqL1xuICBwcml2YXRlIGVtaXQobGV2ZWw6IExvZ0xldmVsLCBtZXNzYWdlOiBzdHJpbmcsIGNvbnRleHQ/OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHZvaWQge1xuICAgIGNvbnN0IGV2ZW50OiBMb2dFdmVudCA9IHtcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgbGV2ZWwsXG4gICAgICBob29rVHlwZTogdGhpcy5jdXJyZW50SG9va1R5cGUsXG4gICAgICBtZXNzYWdlLFxuICAgICAgaW5wdXQ6IHRoaXMuY3VycmVudElucHV0LFxuICAgICAgY29udGV4dFxuICAgIH07XG5cbiAgICB0aGlzLmRlbGl2ZXJFdmVudChldmVudCk7XG4gIH1cblxuICAvKipcbiAgICogRGVsaXZlcnMgYW4gZXZlbnQgdG8gYWxsIHJlZ2lzdGVyZWQgZGVzdGluYXRpb25zLlxuICAgKiBAcGFyYW0gZXZlbnQgLSBUaGUgbG9nIGV2ZW50IHRvIGRlbGl2ZXJcbiAgICovXG4gIHByaXZhdGUgZGVsaXZlckV2ZW50KGV2ZW50OiBMb2dFdmVudCk6IHZvaWQge1xuICAgIC8vIERlbGl2ZXIgdG8gZXZlbnQgaGFuZGxlcnNcbiAgICBjb25zdCBsZXZlbEhhbmRsZXJzID0gdGhpcy5oYW5kbGVycy5nZXQoZXZlbnQubGV2ZWwpO1xuICAgIGlmIChsZXZlbEhhbmRsZXJzKSB7XG4gICAgICBmb3IgKGNvbnN0IGhhbmRsZXIgb2YgbGV2ZWxIYW5kbGVycykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGhhbmRsZXIoZXZlbnQpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAvLyBTaWxlbnRseSBpZ25vcmUgaGFuZGxlciBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFdyaXRlIHRvIGZpbGUgaWYgY29uZmlndXJlZFxuICAgIHRoaXMud3JpdGVUb0ZpbGUoZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyBhbiBldmVudCB0byB0aGUgbG9nIGZpbGUuXG4gICAqIEBwYXJhbSBldmVudCAtIFRoZSBsb2cgZXZlbnQgdG8gd3JpdGVcbiAgICovXG4gIHByaXZhdGUgd3JpdGVUb0ZpbGUoZXZlbnQ6IExvZ0V2ZW50KTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmxvZ0ZpbGVQYXRoKSByZXR1cm47XG5cbiAgICAvLyBMYXp5IGluaXRpYWxpemF0aW9uIG9mIGZpbGUgaGFuZGxlXG4gICAgaWYgKCF0aGlzLmZpbGVJbml0aWFsaXplZCkge1xuICAgICAgdGhpcy5pbml0aWFsaXplRmlsZSgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmxvZ0ZpbGVGZCA9PT0gbnVsbCkgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGxpbmUgPSBgJHtKU09OLnN0cmluZ2lmeShldmVudCl9XFxuYDtcbiAgICAgIHdyaXRlU3luYyh0aGlzLmxvZ0ZpbGVGZCwgbGluZSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBTaWxlbnRseSBpZ25vcmUgZmlsZSB3cml0ZSBlcnJvcnMgdG8gbm90IGRpc3J1cHQgaG9vayBleGVjdXRpb25cbiAgICAgIC8vIFRoaXMgZm9sbG93cyB0aGUgcmlzayBtaXRpZ2F0aW9uOiBcIkdyYWNlZnVsIGRlZ3JhZGF0aW9uIC0gbG9nIHdyaXRlXG4gICAgICAvLyBmYWlsdXJlcyBhcmUgc2lsZW50bHkgaWdub3JlZCB0byBub3QgZGlzcnVwdCBob29rIGV4ZWN1dGlvblwiXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHRoZSBsb2cgZmlsZSBmb3Igd3JpdGluZy5cbiAgICovXG4gIHByaXZhdGUgaW5pdGlhbGl6ZUZpbGUoKTogdm9pZCB7XG4gICAgdGhpcy5maWxlSW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gICAgaWYgKCF0aGlzLmxvZ0ZpbGVQYXRoKSByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgLy8gRW5zdXJlIGRpcmVjdG9yeSBleGlzdHNcbiAgICAgIGNvbnN0IGRpciA9IGRpcm5hbWUodGhpcy5sb2dGaWxlUGF0aCk7XG4gICAgICBpZiAoIWV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgICBta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gT3BlbiBmaWxlIGZvciBhcHBlbmRpbmdcbiAgICAgIHRoaXMubG9nRmlsZUZkID0gb3BlblN5bmModGhpcy5sb2dGaWxlUGF0aCwgJ2EnKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIFNpbGVudGx5IGlnbm9yZSBmaWxlIGluaXRpYWxpemF0aW9uIGVycm9yc1xuICAgICAgdGhpcy5sb2dGaWxlRmQgPSBudWxsO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBFeHRyYWN0cyBzdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uIGZyb20gYW4gdW5rbm93biBlcnJvci5cbiAgICogQHBhcmFtIGVycm9yIC0gVGhlIGVycm9yIHRvIGV4dHJhY3QgaW5mb3JtYXRpb24gZnJvbVxuICAgKiBAcmV0dXJucyBTdHJ1Y3R1cmVkIGVycm9yIGluZm9ybWF0aW9uXG4gICAqL1xuICBwcml2YXRlIGV4dHJhY3RFcnJvckluZm8oZXJyb3I6IHVua25vd24pOiBMb2dFdmVudEVycm9yIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgY29uc3QgaW5mbzogTG9nRXZlbnRFcnJvciA9IHtcbiAgICAgICAgbmFtZTogZXJyb3IubmFtZSxcbiAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgc3RhY2s6IGVycm9yLnN0YWNrXG4gICAgICB9O1xuXG4gICAgICAvLyBFeHRyYWN0IGNhdXNlIGNoYWluIGlmIHByZXNlbnRcbiAgICAgIGlmIChlcnJvci5jYXVzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGluZm8uY2F1c2UgPSB0aGlzLmV4dHJhY3RFcnJvckluZm8oZXJyb3IuY2F1c2UpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaW5mbztcbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgbm9uLUVycm9yIHZhbHVlc1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiAnVW5rbm93bkVycm9yJyxcbiAgICAgIG1lc3NhZ2U6IFN0cmluZyhlcnJvcilcbiAgICB9O1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNpbmdsZXRvbiBFeHBvcnRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBHbG9iYWwgbG9nZ2VyIGluc3RhbmNlIGZvciBDYXJkcyBFeHRlbnNpb24gaG9va3MuXG4gKlxuICogVXNlIHRoaXMgc2luZ2xldG9uIGZvciBhbGwgbG9nZ2luZyB3aXRoaW4gaG9va3MuIFRoZSBsb2dnZXIgaXMgY29uZmlndXJlZFxuICogdmlhIGVudmlyb25tZW50IHZhcmlhYmxlcyBhbmQgc3VwcG9ydHMgZXZlbnQgc3Vic2NyaXB0aW9uIGZvciBjdXN0b21cbiAqIGRlc3RpbmF0aW9ucy5cbiAqXG4gKiAjIyBDb25maWd1cmF0aW9uXG4gKlxuICogfCBFbnZpcm9ubWVudCBWYXJpYWJsZSB8IERlc2NyaXB0aW9uIHxcbiAqIHwtLS0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLXxcbiAqIHwgYENBUkRTX0hPT0tTX0xPR19GSUxFYCB8IFBhdGggdG8gbG9nIGZpbGUgKEpTT04gTGluZXMgZm9ybWF0KSB8XG4gKlxuICogIyMgVXNhZ2UgaW4gSG9va3NcbiAqXG4gKiBUaGUgbG9nZ2VyIGNhbiBiZSB1c2VkIGRpcmVjdGx5IHdpdGhpbiBob29rIGhhbmRsZXJzOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiAvLyBJbiBhIGhvb2sgaGFuZGxlclxuICogbG9nZ2VyLndhcm4oJ1Rhc2sgc3RhcnRpbmcgaW4gaW50ZXJhY3RpdmUgbW9kZScpO1xuICogYGBgXG4gKlxuICogIyMgRXh0ZXJuYWwgSW50ZWdyYXRpb25cbiAqXG4gKiBTdWJzY3JpYmUgdG8gZXZlbnRzIHRvIGZvcndhcmQgbG9ncyB0byBleHRlcm5hbCBzeXN0ZW1zOlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqIGltcG9ydCBwaW5vIGZyb20gJ3Bpbm8nO1xuICpcbiAqIGNvbnN0IHBpbm9Mb2dnZXIgPSBwaW5vKHsgbGV2ZWw6ICdkZWJ1ZycgfSk7XG4gKlxuICogbG9nZ2VyLm9uKCdkZWJ1ZycsIChldmVudCkgPT4gcGlub0xvZ2dlci5kZWJ1ZyhldmVudCwgZXZlbnQubWVzc2FnZSkpO1xuICogbG9nZ2VyLm9uKCdpbmZvJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmluZm8oZXZlbnQsIGV2ZW50Lm1lc3NhZ2UpKTtcbiAqIGxvZ2dlci5vbignd2FybicsIChldmVudCkgPT4gcGlub0xvZ2dlci53YXJuKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBsb2dnZXIub24oJ2Vycm9yJywgKGV2ZW50KSA9PiBwaW5vTG9nZ2VyLmVycm9yKGV2ZW50LCBldmVudC5tZXNzYWdlKSk7XG4gKiBgYGBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyBEaXJlY3QgdXNhZ2VcbiAqIGltcG9ydCB7IGxvZ2dlciB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiBsb2dnZXIuaW5mbygnU3RhcnRpbmcgb3BlcmF0aW9uJyk7XG4gKiBsb2dnZXIud2FybignUmVzb3VyY2UgbGltaXQgYXBwcm9hY2hpbmcnLCB7IHVzYWdlOiAwLjkgfSk7XG4gKlxuICogdHJ5IHtcbiAqICAgYXdhaXQgcmlza3lPcGVyYXRpb24oKTtcbiAqIH0gY2F0Y2ggKGVycikge1xuICogICBsb2dnZXIubG9nRXJyb3IoZXJyLCAnUmlza3kgb3BlcmF0aW9uIGZhaWxlZCcpO1xuICogfVxuICogYGBgXG4gKi9cbmV4cG9ydCBjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG4iLCAiLyoqXG4gKiBPdXRwdXQgYnVpbGRlcnMgYW5kIHJ1bnRpbWUgZXhlY3V0b3IgZm9yIGN1c3RvbSB0eXBlIHZhbGlkYXRvcnMuXG4gKlxuICogVmFsaWRhdG9ycyBydW4gYXMgYSBmaWxlLXBhdGggcHJvdG9jb2w6IHRoZXkgcmVhZCBGSUxFX1BBVEggZnJvbSB0aGVcbiAqIGVudmlyb25tZW50LCBvcHRpb25hbGx5IGxvYWQgYSBgLm1ldGEuanNvbmAgc2lkZWNhciwgYW5kIHdyaXRlIGFcbiAqIGBWYWxpZGF0aW9uUmVzdWx0YCBKU09OIG9iamVjdCB0byBzdGRvdXQuIFRoaXMgbW9kdWxlIHByb3ZpZGVzXG4gKiByZXN1bHQgaGVscGVycyBhbmQgdGhlIHJ1bnRpbWUgZXhlY3V0b3IuXG4gKlxuICogQHN1bW1hcnkgT3V0cHV0IGJ1aWxkZXJzIGFuZCBydW50aW1lIGV4ZWN1dG9yIGZvciBjdXN0b20gdHlwZSB2YWxpZGF0b3JzXG4gKiBAbW9kdWxlXG4gKi9cblxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgdHlwZSB7IFZhbGlkYXRpb25SZXN1bHQgfSBmcm9tICcuLi9wcm90b2NvbC9pbmRleC5qcyc7XG5pbXBvcnQgdHlwZSB7IFR5cGVWYWxpZGF0b3JDb21tYW5kIH0gZnJvbSAnLi9jb21tYW5kLXR5cGVzLmpzJztcbmltcG9ydCB7XG4gIENBUkRTX0VOVl9WQVJTLFxuICBnZXRBcGlBY2Nlc3NUb2tlbixcbiAgZ2V0QXBpQmFzZVVybCxcbiAgZ2V0Q2FyZElkLFxuICBnZXRFbnZpcm9ubWVudCxcbiAgZ2V0RmlsZU5hbWUsXG4gIGdldFR5cGVOYW1lLFxuICBnZXRUeXBlVmVyc2lvblxufSBmcm9tICcuL2Vudi5qcyc7XG5pbXBvcnQgdHlwZSB7IFR5cGVWYWxpZGF0b3JDb250ZXh0LCBWYWxpZGF0b3JGaWxlUmVxdWVzdCB9IGZyb20gJy4vaW5wdXRzLmpzJztcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gJy4vbG9nZ2VyLmpzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gT3V0cHV0IEJ1aWxkZXJzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogQ3JlYXRlcyBhIHN1Y2Nlc3NmdWwgdmFsaWRhdGlvbiByZXN1bHQuXG4gKlxuICogVXNlIHdoZW4gdmFsaWRhdGlvbiBwYXNzZXMuIE9wdGlvbmFsbHkgaW5jbHVkZSBtZXRhZGF0YSB0byBzdG9yZSBpbiB0aGVcbiAqIGAubWV0YS5qc29uYCBzaWRlY2FyIGZpbGUuXG4gKiBAcGFyYW0gbWV0YWRhdGEgLSBPcHRpb25hbCBtZXRhZGF0YSB0byBzdG9yZSBpbiAubWV0YS5qc29uXG4gKiBAcmV0dXJucyBWYWxpZGF0aW9uUmVzdWx0IHdpdGggYHZhbGlkOiB0cnVlYFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHJldHVybiB2YWxpZGF0aW9uU3VjY2Vzcyh7IHZlcnNpb246ICcxLjAnLCBjaGVja3N1bTogJ2FiYzEyMycgfSk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRpb25TdWNjZXNzKG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBWYWxpZGF0aW9uUmVzdWx0IHtcbiAgaWYgKG1ldGFkYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4geyB2YWxpZDogdHJ1ZSwgbWV0YWRhdGEgfTtcbiAgfVxuICByZXR1cm4geyB2YWxpZDogdHJ1ZSB9O1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBmYWlsZWQgdmFsaWRhdGlvbiByZXN1bHQuXG4gKlxuICogVXNlIHdoZW4gdmFsaWRhdGlvbiBmYWlscy4gRXJyb3JzIGFyZSBtYXJrZG93bi1mb3JtYXR0ZWQgc3RyaW5ncyBzdXJmYWNlZFxuICogdG8gdGhlIGdpdCBjbGllbnQuXG4gKiBAcGFyYW0gZXJyb3JzIC0gQXJyYXkgb2YgbWFya2Rvd24tZm9ybWF0dGVkIGVycm9yIG1lc3NhZ2VzXG4gKiBAcmV0dXJucyBWYWxpZGF0aW9uUmVzdWx0IHdpdGggYHZhbGlkOiBmYWxzZWBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiByZXR1cm4gdmFsaWRhdGlvbkVycm9yKFtcbiAqICAgJyoqbmFtZSoqIGZpZWxkIGlzIHJlcXVpcmVkJyxcbiAqICAgJ2BhZ2VgIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInXG4gKiBdKTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGlvbkVycm9yKGVycm9yczogc3RyaW5nW10pOiBWYWxpZGF0aW9uUmVzdWx0IHtcbiAgcmV0dXJuIHsgdmFsaWQ6IGZhbHNlLCBlcnJvcnMgfTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUnVudGltZSBFeGVjdXRpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBFeGVjdXRlcyBhIHR5cGUgdmFsaWRhdG9yIGNvbW1hbmQgd2l0aCBmaWxlLXBhdGggcHJvdG9jb2wuXG4gKlxuICogUmVhZHMgdGhlIGZpbGUgcGF0aCBmcm9tIHRoZSBgRklMRV9QQVRIYCBlbnZpcm9ubWVudCB2YXJpYWJsZSwgbG9hZHMgdGhlXG4gKiBgLm1ldGEuanNvbmAgc2lkZWNhciBpZiBwcmVzZW50LCBleHRyYWN0cyB0eXBlIGNvbnRleHQgZnJvbSBlbnZpcm9ubWVudFxuICogdmFyaWFibGVzLCBpbnZva2VzIHRoZSB2YWxpZGF0aW9uIGhhbmRsZXIsIGFuZCB3cml0ZXMgdGhlIEpTT04gcmVzdWx0XG4gKiB0byBzdGRvdXQuIEFsd2F5cyBleGl0cyB3aXRoIGNvZGUgMCBmb3IgYWxsIGNhc2VzLlxuICpcbiAqICMjIFByb3RvY29sXG4gKlxuICogLSAqKklucHV0Kio6IGBGSUxFX1BBVEhgIGVudmlyb25tZW50IHZhcmlhYmxlIHBvaW50aW5nIHRvIHRoZSBmaWxlXG4gKiAtICoqU2lkZWNhcioqOiBge0ZJTEVfUEFUSH0ubWV0YS5qc29uYCBwYXJzZWQgYXMgbWV0YWRhdGEgaWYgcHJlc2VudFxuICogLSAqKkVudmlyb25tZW50Kio6IFR5cGUgbWV0YWRhdGEgZnJvbSBlbnZpcm9ubWVudCB2YXJpYWJsZXNcbiAqIC0gKipPdXRwdXQqKjogYFZhbGlkYXRpb25SZXN1bHRgIEpTT04gb24gc3Rkb3V0XG4gKiAtICoqRXhpdCBDb2RlKio6IDAgZm9yIGFsbCBjYXNlc1xuICpcbiAqICMjIEVycm9yIEhhbmRsaW5nXG4gKlxuICogfCBFcnJvciBUeXBlIHwgT3V0cHV0IHwgRXhpdCBDb2RlIHxcbiAqIHwtLS0tLS0tLS0tLS18LS0tLS0tLS18LS0tLS0tLS0tLS18XG4gKiB8IE1pc3NpbmcgRklMRV9QQVRIIHwgYHsgdmFsaWQ6IGZhbHNlLCBlcnJvcnM6IFsuLi5dIH1gIHwgMCB8XG4gKiB8IFZhbGlkYXRpb24gZmFpbHVyZSB8IGB7IHZhbGlkOiBmYWxzZSwgZXJyb3JzOiBbLi4uXSB9YCB8IDAgfFxuICogfCBIYW5kbGVyIGV4Y2VwdGlvbiB8IGB7IHZhbGlkOiBmYWxzZSwgZXJyb3JzOiBbLi4uXSB9YCB8IDAgfFxuICogfCBWYWxpZGF0aW9uIHN1Y2Nlc3MgfCBgeyB2YWxpZDogdHJ1ZSwgLi4uIH1gIHwgMCB8XG4gKlxuICogQHBhcmFtIHZhbGlkYXRpb24gLSBUaGUgdHlwZSB2YWxpZGF0b3IgY29tbWFuZCB0byBleGVjdXRlXG4gKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyBvbmx5IGlmIHByb2Nlc3MuZXhpdCBpcyBtb2NrZWRcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiAvLyB2YWxpZGF0b3IubWpzXG4gKiBpbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbiAqIGltcG9ydCB7IGRlZmluZVR5cGVWYWxpZGF0b3IsIGV4ZWN1dGVWYWxpZGF0aW9uLCB2YWxpZGF0aW9uU3VjY2VzcyB9IGZyb20gJ0BjYXJkcy9zZGsvY29uZmlnJztcbiAqXG4gKiBjb25zdCB2YWxpZGF0ZSA9IGRlZmluZVR5cGVWYWxpZGF0b3IoXG4gKiAgIHsgdHlwZU5hbWU6ICdub3RlJywgdGltZW91dDogMzAwMDAgfSxcbiAqICAgKHJlcXVlc3QsIGNvbnRleHQpID0+IHtcbiAqICAgICBjb250ZXh0LmxvZ2dlci5pbmZvKCdWYWxpZGF0aW5nIGZpbGUnLCB7IHBhdGg6IHJlcXVlc3QuZmlsZVBhdGggfSk7XG4gKiAgICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhyZXF1ZXN0LmZpbGVQYXRoLCAndXRmLTgnKTtcbiAqICAgICAvLyAuLi4gdmFsaWRhdGlvbiBsb2dpY1xuICogICAgIHJldHVybiB2YWxpZGF0aW9uU3VjY2VzcygpO1xuICogICB9XG4gKiApO1xuICpcbiAqIGV4ZWN1dGVWYWxpZGF0aW9uKHZhbGlkYXRlKTtcbiAqIGBgYFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZVZhbGlkYXRpb24odmFsaWRhdGlvbjogVHlwZVZhbGlkYXRvckNvbW1hbmQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuXG4gIHRyeSB7XG4gICAgLy8gUmVhZCBGSUxFX1BBVEggZnJvbSBlbnZpcm9ubWVudFxuICAgIGNvbnN0IGZpbGVQYXRoID0gcHJvY2Vzcy5lbnZbQ0FSRFNfRU5WX1ZBUlMuRklMRV9QQVRIXTtcbiAgICBpZiAoIWZpbGVQYXRoKSB7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShKU09OLnN0cmluZ2lmeSh7IHZhbGlkOiBmYWxzZSwgZXJyb3JzOiBbJ0ZJTEVfUEFUSCBlbnZpcm9ubWVudCB2YXJpYWJsZSBpcyBub3Qgc2V0J10gfSkpO1xuICAgICAgcmV0dXJuIHByb2Nlc3MuZXhpdCgwKTtcbiAgICB9XG5cbiAgICAvLyBMb29rIGZvciAubWV0YS5qc29uIHNpZGVjYXJcbiAgICBsZXQgbWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgdW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBzaWRlY2FyQ29udGVudCA9IHJlYWRGaWxlU3luYyhgJHtmaWxlUGF0aH0ubWV0YS5qc29uYCwgJ3V0Zi04Jyk7XG4gICAgICBtZXRhZGF0YSA9IEpTT04ucGFyc2Uoc2lkZWNhckNvbnRlbnQpIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gU2lkZWNhciBkb2Vzbid0IGV4aXN0IG9yIGlzIGludmFsaWQgLSBtZXRhZGF0YSBzdGF5cyB1bmRlZmluZWRcbiAgICB9XG5cbiAgICAvLyBCdWlsZCBWYWxpZGF0b3JGaWxlUmVxdWVzdFxuICAgIGNvbnN0IHJlcXVlc3Q6IFZhbGlkYXRvckZpbGVSZXF1ZXN0ID0ge1xuICAgICAgZmlsZVBhdGgsXG4gICAgICBtZXRhZGF0YVxuICAgIH07XG5cbiAgICAvLyBFeHRyYWN0IHR5cGUgY29udGV4dCBmcm9tIGVudmlyb25tZW50IHZhcmlhYmxlc1xuICAgIGNvbnN0IGNvbnRleHQ6IFR5cGVWYWxpZGF0b3JDb250ZXh0ID0ge1xuICAgICAgbG9nZ2VyLFxuICAgICAgY3dkOiBwcm9jZXNzLmN3ZCgpLFxuICAgICAgdHlwZU5hbWU6IGdldFR5cGVOYW1lKCksXG4gICAgICB0eXBlVmVyc2lvbjogZ2V0VHlwZVZlcnNpb24oKSxcbiAgICAgIGZpbGVOYW1lOiBnZXRGaWxlTmFtZSgpLFxuICAgICAgY2FyZElkOiBnZXRDYXJkSWQoKSxcbiAgICAgIGVudmlyb25tZW50OiBnZXRFbnZpcm9ubWVudCgpLFxuICAgICAgYXBpQmFzZVVybDogZ2V0QXBpQmFzZVVybCgpLFxuICAgICAgYXBpQWNjZXNzVG9rZW46IGdldEFwaUFjY2Vzc1Rva2VuKClcbiAgICB9O1xuXG4gICAgLy8gRXhlY3V0ZSBoYW5kbGVyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdmFsaWRhdGlvbihyZXF1ZXN0LCBjb250ZXh0KTtcblxuICAgIC8vIFdyaXRlIHJlc3VsdFxuICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKEpTT04uc3RyaW5naWZ5KHJlc3VsdCkpO1xuICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBVbmhhbmRsZWQgZXJyb3IgLSByZXR1cm4gZmFpbHVyZSByZXN1bHRcbiAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG4gICAgbG9nZ2VyLmVycm9yKCdWYWxpZGF0aW9uIGVycm9yJywgeyBlcnJvcjogZXJyb3JNZXNzYWdlIH0pO1xuICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKEpTT04uc3RyaW5naWZ5KHsgdmFsaWQ6IGZhbHNlLCBlcnJvcnM6IFtlcnJvck1lc3NhZ2VdIH0pKTtcbiAgICBwcm9jZXNzLmV4aXQoMCk7XG4gIH1cbn1cbiIsICJcbmltcG9ydCBoYW5kbGVyIGZyb20gJy4vbm90ZS12YWxpZGF0b3IudHMnO1xuaW1wb3J0IHsgZXhlY3V0ZVZhbGlkYXRpb24gfSBmcm9tICcuLi8uLi8uLi9zZGsvc3JjL2NvbmZpZy92YWxpZGF0aW9uLnRzJztcblxuZXhlY3V0ZVZhbGlkYXRpb24oaGFuZGxlcik7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBLDJDQUFBQSxVQUFBQyxTQUFBO0FBQUEsUUFBSSxXQUFXLE9BQU8sVUFBVTtBQUVo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QUEwQixFQUFFLFlBQVksT0FBTyxPQUFPLENBQUM7QUFDM0UsYUFBTyxnQkFBZ0IsT0FBTyxJQUFJLENBQUMsTUFBTyxFQUFFLFFBQVEsS0FBSyxFQUFFLEtBQUssT0FBTyxFQUFFLE9BQU8sS0FBSyxFQUFFLE9BQVEsQ0FBQztBQUFBLElBQ2xHO0FBR0EsWUFBUSxPQUFPLEtBQUssNkJBQTZCO0FBQUEsTUFDL0MsUUFBUSxZQUFZLElBQUk7QUFBQSxNQUN4QixRQUFRLFlBQVksUUFBUTtBQUFBLE1BQzVCLE9BQU8sWUFBWSxPQUFPO0FBQUEsSUFDNUIsQ0FBQztBQUVELFdBQU8sa0JBQWtCLEVBQUUsUUFBUSxZQUFZLElBQUksRUFBWSxDQUFDO0FBQUEsRUFDbEU7QUFDRjs7O0FLMUhBLGtCQUFrQixzQkFBTzsiLAogICJuYW1lcyI6IFsiZXhwb3J0cyIsICJtb2R1bGUiLCAiZXhwb3J0cyIsICJtb2R1bGUiLCAiZXhwb3J0cyIsICJtb2R1bGUiLCAiZXhwb3J0cyIsICJtb2R1bGUiLCAib3B0aW9ucyIsICJleHBvcnRzIiwgIm1vZHVsZSIsICJleHBvcnRzIiwgIm1vZHVsZSIsICJleHBvcnRzIiwgIm1vZHVsZSIsICJleHBvcnRzIiwgIm1vZHVsZSIsICJvcHRpb25zIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgIm9wdGlvbnMiLCAiZXhwb3J0cyIsICJtb2R1bGUiLCAib3B0aW9ucyIsICJzdHIiLCAic3RyaW5nIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgInJlcXVpcmVfanNfeWFtbCIsICJleHBvcnRzIiwgIm1vZHVsZSIsICJ5YW1sIiwgIm9wdGlvbnMiLCAiZXhwb3J0cyIsICJtb2R1bGUiLCAic3RyIiwgImV4cG9ydHMiLCAic3RyIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgImVuZ2luZXMiLCAib3B0aW9ucyIsICJleHBvcnRzIiwgIm1vZHVsZSIsICJvcHRpb25zIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgIm9wdGlvbnMiLCAic3RyIiwgIm1hdHRlciIsICJleHBvcnRzIiwgIm1vZHVsZSIsICJvcHRpb25zIiwgImV4cG9ydHMiLCAibW9kdWxlIiwgIm9wdGlvbnMiLCAiZXhwb3J0cyIsICJtb2R1bGUiLCAic3RyIiwgIm9wdGlvbnMiLCAiZXhwb3J0cyIsICJtb2R1bGUiLCAiZW5naW5lcyIsICJwYXJzZSIsICJtYXR0ZXIiLCAib3B0aW9ucyIsICJzdHIiLCAicmVhZEZpbGVTeW5jIiwgInJlYWRGaWxlU3luYyIsICJsb2dnZXIiLCAicmVhZEZpbGVTeW5jIiwgInJlYWRGaWxlU3luYyIsICJtYXR0ZXIiXQp9Cg==
