/*
 * Created by Tiger on 28/03/2024
 */

export const formatTime = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return (
    [year, month, day].map(formatNumber).join("/") +
    " " +
    [hour, minute, second].map(formatNumber).join(":")
  );
};

const formatNumber = (n: number) => {
  const s = n.toString();
  return s[1] ? s : "0" + s;
};

/**
 * 解析广播数据中的mac地址
 * @param broadcastHex 广播数据
 */
export function parseMAC(rawMac: string): string {
  let mac = "";
  for (let i = rawMac.length; i >= 0; i -= 2) {
    mac += rawMac.substring(i - 2, i);
  }
  return mac2Colon(mac);
}

/**
 * mac地址加冒号:例如：AABBCCDDEEFF -> AA:BB:CC:DD:EE:FF
 */

export function mac2Colon(mac: string) {
  if (mac.includes(":")) return mac;
  return mac
    .toUpperCase()
    .replace(/(.{2})/g, "$1:")
    .slice(0, -1);
}

export function hexString2ArrayArraybuffer(hexString: string | number[]) {
  if (typeof hexString === "object") {
    return new Uint8Array([...hexString]).buffer;
  }
  // 如果字符串长度不是偶数，则在前面补0使其成为偶数
  if (hexString.length % 2 !== 0) {
    hexString = "0" + hexString;
  }

  // 创建一个Uint8Array对象来存储字节
  var arrayBuffer = new Uint8Array(hexString.length / 2);

  // 将每两个字符转换成一个字节，并存储在Uint8Array中
  for (var i = 0; i < hexString.length; i += 2) {
    var byteValue = parseInt(hexString.substr(i, 2), 16);
    arrayBuffer[i / 2] = byteValue;
  }

  return arrayBuffer.buffer;
}

export function uint8Array2hexString(uint8Array: Uint8Array) {
  let result = "";
  uint8Array.forEach(
    (d) => (result += d.toString(16).toUpperCase().padStart(2, "0"))
  );
  return result;
}

export function reversedHex(hex: string) {
  const hexList = [];

  let len = hex.length;
  let cursor = 0;
  while (cursor < len) {
    hexList.unshift(hex.substr(cursor, 2));
    cursor += 2;
  }
  return hexList.join("");
}

/**
 * num 转 hex string
 * @param num
 * @param byteLength 字节长度，用于前补0
 */
export function number2Hex(num: number, byteLength = 1) {
  const hex = num.toString(16).padStart(byteLength * 2, "0");
  return byteLength === 1 ? hex : reversedHex(hex);
}

/**
 * 将有符号整数转换为hexstring
 * @param signedInt
 * @returns
 */
export function signedInt2hexString(signedInt: number, length = 4) {
  // 使用 >>> 0 将有符号整数转换为无符号整数
  // 然后使用 toString(16) 转换为十六进制字符串
  const hex = (signedInt >>> 0)
    .toString(16)
    .padStart(length, "0")
    .slice(-length);
  return reversedHex(hex);
}

/**
 * bytes 转 有符号整数
 */
export function bytes2SignedInt(bytes: Uint8Array) {
  const hexString = bytesToHex(bytes.reverse());
  return hex2SignedInt(hexString);
}

/**
 * hex转有符号整数
 * @param bytes
 * @returns
 */
export function hex2SignedInt(hexString: string) {
  const signedInt = parseInt(hexString, 16);
  return (signedInt << 0) >> 0;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.prototype.map
    .call(bytes, (x) => ("00" + x.toString(16)).slice(-2))
    .join("");
}

function getBytesDecVal(bytes: Uint8Array) {
  return parseInt(bytesToHex(bytes), 16);
}

export function formatBytes(bytes: Uint8Array, format: "hex" | "dec" | "str") {
  if (format === "hex") {
    return bytesToHex(bytes);
  }

  if (format === "dec") {
    console.log("formatBytes：", ...bytes);

    return getBytesDecVal(bytes.reverse());
  }

  return buildUTF8Str(bytes);
}

function buildUTF8Str(data: Uint8Array) {
  return decodeURIComponent(escape(String.fromCharCode(...data)));
}

export function strToBytes(str: string) {
  return unescape(encodeURIComponent(str))
    .split("")
    .map((val) => val.charCodeAt(0));
}

/**
 * 生成随机的token（长度为16的0~255的数字ß）
 */
export function generateToken(): Int8Array {
  const token = new Int8Array(16);
  for (let i = 0; i < 16; i++) {
    token[i] = Math.floor(Math.random() * 255);
  }
  return token;
}
