/* MD5 (RFC 1321). Implementación canónica de Paul Johnston.
   Necesaria para la autenticación por token de Subsonic: t = md5(password + salt). */
function md5(string) {
  function RotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); }

  function AddUnsigned(lX, lY) {
    var lX4, lY4, lX8, lY8, lResult;
    lX8 = (lX & 0x80000000);
    lY8 = (lY & 0x80000000);
    lX4 = (lX & 0x40000000);
    lY4 = (lY & 0x40000000);
    lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
      else return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
    } else return (lResult ^ lX8 ^ lY8);
  }

  function F(x, y, z) { return (x & y) | ((~x) & z); }
  function G(x, y, z) { return (x & z) | (y & (~z)); }
  function H(x, y, z) { return (x ^ y ^ z); }
  function I(x, y, z) { return (y ^ (x | (~z))); }

  function FF(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function GG(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function HH(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }
  function II(a, b, c, d, x, s, ac) {
    a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
    return AddUnsigned(RotateLeft(a, s), b);
  }

  function ConvertToWordArray(string) {
    var lWordCount;
    var lMessageLength = string.length;
    var lNumberOfWords_temp1 = lMessageLength + 8;
    var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    var lWordArray = Array(lNumberOfWords - 1);
    var lBytePosition = 0, lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }

  var x = ConvertToWordArray(unescape(encodeURIComponent(string)));
  var a = 1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d = 271733878;
  var AA, BB, CC, DD;
  var k;
  for (k = 0; k < x.length; k += 16) {
    AA = a; BB = b; CC = c; DD = d;
    a = FF(a, b, c, d, x[k + 0], 7, -680876936);
    d = FF(d, a, b, c, x[k + 1], 12, -389564586);
    c = FF(c, d, a, b, x[k + 2], 17, 606105819);
    b = FF(b, c, d, a, x[k + 3], 22, -1044525330);
    a = FF(a, b, c, d, x[k + 4], 7, -176418897);
    d = FF(d, a, b, c, x[k + 5], 12, 1200080426);
    c = FF(c, d, a, b, x[k + 6], 17, -1473231341);
    b = FF(b, c, d, a, x[k + 7], 22, -45705983);
    a = FF(a, b, c, d, x[k + 8], 7, 1770035416);
    d = FF(d, a, b, c, x[k + 9], 12, -1958414417);
    c = FF(c, d, a, b, x[k + 10], 17, -42063);
    b = FF(b, c, d, a, x[k + 11], 22, -1990404162);
    a = FF(a, b, c, d, x[k + 12], 7, 1804603682);
    d = FF(d, a, b, c, x[k + 13], 12, -40341101);
    c = FF(c, d, a, b, x[k + 14], 17, -1502002290);
    b = FF(b, c, d, a, x[k + 15], 22, 1236535329);
    a = GG(a, b, c, d, x[k + 1], 5, -165796510);
    d = GG(d, a, b, c, x[k + 6], 9, -1069501632);
    c = GG(c, d, a, b, x[k + 11], 14, 643717713);
    b = GG(b, c, d, a, x[k + 0], 20, -373897302);
    a = GG(a, b, c, d, x[k + 5], 5, -701558691);
    d = GG(d, a, b, c, x[k + 10], 9, 38016083);
    c = GG(c, d, a, b, x[k + 15], 14, -660478335);
    b = GG(b, c, d, a, x[k + 4], 20, -405537848);
    a = GG(a, b, c, d, x[k + 9], 5, 568446438);
    d = GG(d, a, b, c, x[k + 14], 9, -1019803690);
    c = GG(c, d, a, b, x[k + 3], 14, -187363961);
    b = GG(b, c, d, a, x[k + 8], 20, 1163531501);
    a = GG(a, b, c, d, x[k + 13], 5, -1444681467);
    d = GG(d, a, b, c, x[k + 2], 9, -51403784);
    c = GG(c, d, a, b, x[k + 7], 14, 1735328473);
    b = GG(b, c, d, a, x[k + 12], 20, -1926607734);
    a = HH(a, b, c, d, x[k + 5], 4, -378558);
    d = HH(d, a, b, c, x[k + 8], 11, -2022574463);
    c = HH(c, d, a, b, x[k + 11], 16, 1839030562);
    b = HH(b, c, d, a, x[k + 14], 23, -35309556);
    a = HH(a, b, c, d, x[k + 1], 4, -1530992060);
    d = HH(d, a, b, c, x[k + 4], 11, 1272893353);
    c = HH(c, d, a, b, x[k + 7], 16, -155497632);
    b = HH(b, c, d, a, x[k + 10], 23, -1094730640);
    a = HH(a, b, c, d, x[k + 13], 4, 681279174);
    d = HH(d, a, b, c, x[k + 0], 11, -358537222);
    c = HH(c, d, a, b, x[k + 3], 16, -722521979);
    b = HH(b, c, d, a, x[k + 6], 23, 76029189);
    a = HH(a, b, c, d, x[k + 9], 4, -640364487);
    d = HH(d, a, b, c, x[k + 12], 11, -421815835);
    c = HH(c, d, a, b, x[k + 15], 16, 530742520);
    b = HH(b, c, d, a, x[k + 2], 23, -995338651);
    a = II(a, b, c, d, x[k + 0], 6, -198630844);
    d = II(d, a, b, c, x[k + 7], 10, 1126891415);
    c = II(c, d, a, b, x[k + 14], 15, -1416354905);
    b = II(b, c, d, a, x[k + 5], 21, -57434055);
    a = II(a, b, c, d, x[k + 12], 6, 1700485571);
    d = II(d, a, b, c, x[k + 3], 10, -1894986606);
    c = II(c, d, a, b, x[k + 10], 15, -1051523);
    b = II(b, c, d, a, x[k + 1], 21, -2054922799);
    a = II(a, b, c, d, x[k + 8], 6, 1873313359);
    d = II(d, a, b, c, x[k + 15], 10, -30611744);
    c = II(c, d, a, b, x[k + 6], 15, -1560198380);
    b = II(b, c, d, a, x[k + 13], 21, 1309151649);
    a = II(a, b, c, d, x[k + 4], 6, -145523070);
    d = II(d, a, b, c, x[k + 11], 10, -1120210379);
    c = II(c, d, a, b, x[k + 2], 15, 718787259);
    b = II(b, c, d, a, x[k + 9], 21, -343485551);
    a = AddUnsigned(a, AA);
    b = AddUnsigned(b, BB);
    c = AddUnsigned(c, CC);
    d = AddUnsigned(d, DD);
  }
  var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);
  return temp.toLowerCase();

  function WordToHex(lValue) {
    var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = "0" + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }
}
